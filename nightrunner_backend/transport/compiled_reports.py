import uuid6
import asyncio
import logging
import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.compiled_reports import ReportsStore
from nightrunner_backend.drivers.store.patrols import PatrolsStore
from nightrunner_backend.drivers.store.events import EventsStore
from nightrunner_backend.reports_patrol_pdf import generate_patrol_qr_pdf
from nightrunner_backend.reports_gcs import upload_report_bytes, download_report_bytes, delete_report_bytes

from nightrunner_backend.drivers.store.scores import ScoresStore
from nightrunner_backend.reports_scoring_pdf import generate_event_scoring_pdf

from nightrunner_backend.reports_attendance_pdf import generate_attendance_report_pdf
from nightrunner_backend.drivers.store.roster import RosterStore

logger = logging.getLogger(__name__)


async def _background_generate_attendance_pdf(report_id: str, event_id: str, event_name: str):
    driver = get_driver()
    reports_store = ReportsStore(driver)
    roster_store = RosterStore(driver)
    try:
        arrivals_data = await roster_store.list_arrivals(event_id)
        attendees = await roster_store.list_attendees(event_id)
        troops = await roster_store.list_troops_for_event(event_id)
        audit_logs = await roster_store.list_audit_logs_for_event(event_id)

        # Build arrival lookup map
        arrivals_map = {arr.attendee_id: arr.to_api_dict() for arr in arrivals_data}

        # Build troops dictionary with attendees
        troops_dict = {t.id: {"troopId": t.id, "troopNumber": t.number, "name": t.name, "attendees": []} for t in troops}

        for att in attendees:
            att_dict = att.to_api_dict()
            if att.id in arrivals_map:
                att_dict["arrival"] = arrivals_map[att.id]
            t_entry = troops_dict.get(att.troop_id)
            if t_entry:
                t_entry["attendees"].append(att_dict)
            else:
                # Fallback for unassigned troop
                unassigned = troops_dict.setdefault("unassigned", {"troopId": "unassigned", "troopNumber": "—", "name": "Unassigned", "attendees": []})
                unassigned["attendees"].append(att_dict)

        pdf_bytes = generate_attendance_report_pdf(
            event_name=event_name,
            troops_data=list(troops_dict.values()),
            audit_logs=audit_logs,
        )
        file_key = f"events/{event_id}/reports/{report_id}-attendance.pdf"
        upload_report_bytes(file_key, pdf_bytes, content_type="application/pdf")
        await reports_store.mark_report_ready(report_id, file_key, len(pdf_bytes))
    except Exception as ex:
        logger.exception(f"Failed generating attendance report {report_id}: {ex}")
        await reports_store.mark_report_failed(report_id, str(ex))


def _patrol_identity_maps(patrols):
    """Builds patrolId -> patrol number and patrolId -> joined troop list.

    Troop lives on each patrol member, so a patrol's "troops" is the distinct
    set of troops across its members, in roster order.
    """
    number_map = {}
    troops_map = {}
    for p in patrols:
        number_map[p.id] = getattr(p, "number", None)
        seen = []
        for m in getattr(p, "members", []) or []:
            troop = (getattr(m, "troop", None) or "").strip()
            if troop and troop not in seen:
                seen.append(troop)
        troops_map[p.id] = ", ".join(seen)
    return number_map, troops_map


async def _background_generate_patrol_qr_pdf(report_id: str, event_id: str, event_name: str):
    driver = get_driver()
    reports_store = ReportsStore(driver)
    patrols_store = PatrolsStore(driver)
    try:
        patrols = await patrols_store.list(event_id=event_id)
        pdf_bytes = generate_patrol_qr_pdf(patrols, event_name=event_name)
        file_key = f"events/{event_id}/reports/{report_id}-patrol-qr-sheets.pdf"
        upload_report_bytes(file_key, pdf_bytes, content_type="application/pdf")
        await reports_store.mark_report_ready(report_id, file_key, len(pdf_bytes))
    except Exception as ex:
        logger.exception(f"Failed generating report {report_id}: {ex}")
        await reports_store.mark_report_failed(report_id, str(ex))


async def _background_generate_scoring_pdf(report_id: str, event_id: str, event_name: str, is_draft: bool = False):
    driver = get_driver()
    reports_store = ReportsStore(driver)
    scores_store = ScoresStore(driver)
    from nightrunner_backend.drivers.store.stations import StationsStore
    from nightrunner_backend.drivers.store.patrols import PatrolsStore
    stations_store = StationsStore(driver)
    patrols_store = PatrolsStore(driver)

    try:
        # 1. Fetch saved finalized results if available, otherwise aggregate
        finalized_rows = await scores_store.list_finalized_results(event_id)
        stations = await stations_store.list(event_id=event_id)
        patrols = await patrols_store.list(event_id=event_id)

        patrol_name_map = {p.id: p.name for p in patrols}
        patrol_number_map, patrol_troops_map = _patrol_identity_maps(patrols)
        station_name_map = {s.id: s.name for s in stations}
        station_weight_map = {s.id: getattr(s, "station_weight", 1.0) for s in stations}

        overall_patrols = []
        station_breakdowns = []

        if finalized_rows:
            # Group by patrol & station from stored finalized results
            final_scores = {}
            st_scores = {} # station_id -> {patrol_id: score}

            for r in finalized_rows:
                pid = r["patrolId"]
                sid = r.get("stationId")
                score_val = float(r.get("scoreValue", 0.0))
                if r.get("scoreType") == "final" or sid is None:
                    final_scores[pid] = score_val
                else:
                    st_scores.setdefault(sid, {})[pid] = score_val

            for pid, p_name in patrol_name_map.items():
                overall_patrols.append({
                    "patrolId": pid,
                    "patrolName": p_name,
                    "patrolNumber": patrol_number_map.get(pid),
                    "troops": patrol_troops_map.get(pid, ""),
                    "totalScore": final_scores.get(pid, 0.0)
                })

            for st in stations:
                sid = st.id
                st_p_scores = st_scores.get(sid, {})
                st_patrols_list = []
                for pid, p_name in patrol_name_map.items():
                    st_patrols_list.append({
                        "patrolId": pid,
                        "patrolName": p_name,
                        "patrolNumber": patrol_number_map.get(pid),
                        "troops": patrol_troops_map.get(pid, ""),
                        "score": st_p_scores.get(pid, 0.0)
                    })
                station_breakdowns.append({
                    "stationId": sid,
                    "stationName": st.name,
                    "stationWeight": getattr(st, "station_weight", 1.0),
                    "patrols": st_patrols_list
                })
        else:
            # Fallback to database score aggregation
            rows = await scores_store.aggregate_event(event_id)
            patrols_acc = {}
            st_acc = {} # station_id -> {patrol_id: weighted_score}

            for r in rows:
                pid = r["patrol_id"]
                sid = r["station_id"]
                weighted = float(r.get("weighted_score", 0.0))
                p_entry = patrols_acc.setdefault(pid, {
                    "patrolId": pid,
                    "patrolName": r.get("patrol_name") or patrol_name_map.get(pid, f"Patrol {pid}"),
                    "patrolNumber": patrol_number_map.get(pid),
                    "troops": patrol_troops_map.get(pid, ""),
                    "totalScore": 0.0
                })
                p_entry["totalScore"] += weighted
                st_acc.setdefault(sid, {})[pid] = weighted

            for pid, p_name in patrol_name_map.items():
                if pid not in patrols_acc:
                    patrols_acc[pid] = {
                        "patrolId": pid,
                        "patrolName": p_name,
                        "patrolNumber": patrol_number_map.get(pid),
                        "troops": patrol_troops_map.get(pid, ""),
                        "totalScore": 0.0
                    }

            overall_patrols = list(patrols_acc.values())

            for st in stations:
                sid = st.id
                st_p_scores = st_acc.get(sid, {})
                st_patrols_list = []
                for pid, p_name in patrol_name_map.items():
                    st_patrols_list.append({
                        "patrolId": pid,
                        "patrolName": p_name,
                        "patrolNumber": patrol_number_map.get(pid),
                        "troops": patrol_troops_map.get(pid, ""),
                        "score": st_p_scores.get(pid, 0.0)
                    })
                station_breakdowns.append({
                    "stationId": sid,
                    "stationName": st.name,
                    "stationWeight": getattr(st, "station_weight", 1.0),
                    "patrols": st_patrols_list
                })

        pdf_bytes = generate_event_scoring_pdf(
            event_name=event_name,
            overall_patrols=overall_patrols,
            station_breakdowns=station_breakdowns,
            is_draft=is_draft
        )

        file_prefix = "draft-scoring" if is_draft else "final-scoring"
        file_key = f"events/{event_id}/reports/{report_id}-{file_prefix}.pdf"
        upload_report_bytes(file_key, pdf_bytes, content_type="application/pdf")
        await reports_store.mark_report_ready(report_id, file_key, len(pdf_bytes))
    except Exception as ex:
        logger.exception(f"Failed generating scoring report {report_id}: {ex}")
        await reports_store.mark_report_failed(report_id, str(ex))


from nightrunner_backend.reports_scoring_ods import generate_event_scoring_ods


async def _background_generate_scoring_ods(report_id: str, event_id: str, event_name: str):
    driver = get_driver()
    reports_store = ReportsStore(driver)
    scores_store = ScoresStore(driver)
    from nightrunner_backend.drivers.store.stations import StationsStore
    from nightrunner_backend.drivers.store.patrols import PatrolsStore
    stations_store = StationsStore(driver)
    patrols_store = PatrolsStore(driver)

    try:
        finalized_rows = await scores_store.list_finalized_results(event_id)
        stations = await stations_store.list(event_id=event_id)
        patrols = await patrols_store.list(event_id=event_id)

        patrol_name_map = {p.id: p.name for p in patrols}
        patrol_number_map, patrol_troops_map = _patrol_identity_maps(patrols)
        overall_patrols = []
        station_breakdowns = []
        # The Finalizer stores the mode it was set to on every station row. Without
        # this the export always labelled itself absolute, even for relative events.
        scoring_mode = "absolute"

        if finalized_rows:
            final_scores = {}
            st_scores = {}
            for r in finalized_rows:
                pid = r["patrolId"]
                sid = r.get("stationId")
                score_val = float(r.get("scoreValue", 0.0))
                if r.get("scoreType") == "final" or sid is None:
                    final_scores[pid] = score_val
                else:
                    st_scores.setdefault(sid, {})[pid] = score_val
                    row_mode = r.get("scoringMode")
                    if row_mode in ("absolute", "relative"):
                        scoring_mode = row_mode

            for pid, p_name in patrol_name_map.items():
                overall_patrols.append({
                    "patrolId": pid,
                    "patrolName": p_name,
                    "patrolNumber": patrol_number_map.get(pid),
                    "troops": patrol_troops_map.get(pid, ""),
                    "totalScore": final_scores.get(pid, 0.0)
                })

            for st in stations:
                sid = st.id
                st_p_scores = st_scores.get(sid, {})
                st_patrols_list = []
                for pid, p_name in patrol_name_map.items():
                    st_patrols_list.append({
                        "patrolId": pid,
                        "patrolName": p_name,
                        "patrolNumber": patrol_number_map.get(pid),
                        "troops": patrol_troops_map.get(pid, ""),
                        "score": st_p_scores.get(pid, 0.0)
                    })
                station_breakdowns.append({
                    "stationId": sid,
                    "stationName": st.name,
                    "stationWeight": getattr(st, "station_weight", 1.0),
                    "patrols": st_patrols_list
                })
        else:
            events_store = EventsStore(driver)
            evt = await events_store.get(event_id)
            if evt and getattr(evt, "scoring_mode", None) in ("absolute", "relative"):
                scoring_mode = evt.scoring_mode

            rows = await scores_store.aggregate_event(event_id)
            patrols_acc = {}
            st_acc = {}

            for r in rows:
                pid = r["patrol_id"]
                sid = r["station_id"]
                weighted = float(r.get("weighted_score", 0.0))
                p_entry = patrols_acc.setdefault(pid, {
                    "patrolId": pid,
                    "patrolName": r.get("patrol_name") or patrol_name_map.get(pid, f"Patrol {pid}"),
                    "patrolNumber": patrol_number_map.get(pid),
                    "troops": patrol_troops_map.get(pid, ""),
                    "totalScore": 0.0
                })
                p_entry["totalScore"] += weighted
                st_acc.setdefault(sid, {})[pid] = weighted

            for pid, p_name in patrol_name_map.items():
                if pid not in patrols_acc:
                    patrols_acc[pid] = {
                        "patrolId": pid,
                        "patrolName": p_name,
                        "patrolNumber": patrol_number_map.get(pid),
                        "troops": patrol_troops_map.get(pid, ""),
                        "totalScore": 0.0
                    }

            overall_patrols = list(patrols_acc.values())

            for st in stations:
                sid = st.id
                st_p_scores = st_acc.get(sid, {})
                st_patrols_list = []
                for pid, p_name in patrol_name_map.items():
                    st_patrols_list.append({
                        "patrolId": pid,
                        "patrolName": p_name,
                        "patrolNumber": patrol_number_map.get(pid),
                        "troops": patrol_troops_map.get(pid, ""),
                        "score": st_p_scores.get(pid, 0.0)
                    })
                station_breakdowns.append({
                    "stationId": sid,
                    "stationName": st.name,
                    "stationWeight": getattr(st, "station_weight", 1.0),
                    "patrols": st_patrols_list
                })

        ods_bytes = generate_event_scoring_ods(
            event_name=event_name,
            overall_patrols=overall_patrols,
            station_breakdowns=station_breakdowns,
            scoring_mode=scoring_mode
        )

        file_key = f"events/{event_id}/reports/{report_id}-scoring.ods"
        upload_report_bytes(file_key, ods_bytes, content_type="application/vnd.oasis.opendocument.spreadsheet")
        await reports_store.mark_report_ready(report_id, file_key, len(ods_bytes))
    except Exception as ex:
        logger.exception(f"Failed generating ODS report {report_id}: {ex}")
        await reports_store.mark_report_failed(report_id, str(ex))


class CompiledReportsResource:
    """GET /v1/events/{eventId}/compiled-reports
    Lists all compiled reports for an event.

    POST /v1/events/{eventId}/compiled-reports
    Triggers asynchronous generation of a report (e.g. reportType="patrols-pdf", "event-scoring", "event-scoring-draft", or "event-scoring-ods").
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        driver = get_driver()
        store = ReportsStore(driver)
        reports = await store.list_reports(event_id)
        resp.media = {"reports": reports}
        resp.status = falcon.HTTP_200

    async def on_post(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        driver = get_driver()
        store = ReportsStore(driver)
        events_store = EventsStore(driver)

        body = await req.get_media() or {}
        report_type = body.get("reportType", "patrols-pdf")
        
        event = await events_store.get(event_id)
        event_name = event.name if event else "Event"

        report_id = f"rep-{uuid6.uuid7().hex[:12]}"
        if report_type == "event-scoring-draft":
            report_name = f"Draft Scoring Report ({event_name})"
        elif report_type == "event-scoring":
            report_name = f"Final Scoring Report ({event_name})"
        elif report_type == "event-scoring-ods":
            report_name = f"Scoring Spreadsheet ODS ({event_name})"
        elif report_type == "attendance-pdf":
            report_name = f"Event Attendance Report ({event_name})"
        else:
            report_name = f"Patrol QR Badges ({event_name})"

        job = await store.create_report_job(report_id, event_id, report_type, report_name)

        # Trigger async background generation
        if report_type == "event-scoring-ods":
            asyncio.create_task(_background_generate_scoring_ods(report_id, event_id, event_name))
        elif report_type in ("event-scoring", "event-scoring-draft"):
            is_draft = (report_type == "event-scoring-draft")
            asyncio.create_task(_background_generate_scoring_pdf(report_id, event_id, event_name, is_draft=is_draft))
        elif report_type == "attendance-pdf":
            asyncio.create_task(_background_generate_attendance_pdf(report_id, event_id, event_name))
        else:
            asyncio.create_task(_background_generate_patrol_qr_pdf(report_id, event_id, event_name))

        resp.media = job
        resp.status = falcon.HTTP_202


class CompiledReportDownloadResource:
    """GET /v1/compiled-reports/{reportId}/download
    Retrieves a ready compiled report PDF from private storage and streams it to the user.

    DELETE /v1/compiled-reports/{reportId}
    Deletes a report from storage and DB.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, reportId: str):
        driver = get_driver()
        store = ReportsStore(driver)
        report = await store.get_report(reportId)

        if not report:
            raise falcon.HTTPNotFound(title="Report Not Found", description="The requested report does not exist.")

        if report["status"] == "generating":
            resp.media = {"status": "generating", "message": "Report is still being generated. Please wait."}
            resp.status = falcon.HTTP_202
            return

        if report["status"] == "failed":
            raise falcon.HTTPBadRequest(title="Report Generation Failed", description=report.get("error_message") or "Report generation failed.")

        file_key = report.get("file_key")
        if not file_key:
            raise falcon.HTTPNotFound(title="Report File Missing", description="The report file key is missing.")

        file_bytes = download_report_bytes(file_key)
        if not file_bytes:
            raise falcon.HTTPNotFound(title="File Not Found", description="Report file could not be found in storage.")

        resp.content_type = report.get("content_type", "application/pdf")
        ext = "ods" if (file_key.endswith(".ods") or "opendocument.spreadsheet" in resp.content_type) else "pdf"
        filename = f"{report['id']}.{ext}"
        resp.append_header("Content-Disposition", f'inline; filename="{filename}"')
        resp.data = file_bytes
        resp.status = falcon.HTTP_200

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, reportId: str):
        driver = get_driver()
        store = ReportsStore(driver)
        report = await store.get_report(reportId)
        if report:
            if report.get("file_key"):
                delete_report_bytes(report["file_key"])
            await store.delete_report(reportId)
        resp.status = falcon.HTTP_204
