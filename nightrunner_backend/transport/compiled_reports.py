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

logger = logging.getLogger(__name__)


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


class CompiledReportsResource:
    """GET /v1/events/{eventId}/compiled-reports
    Lists all compiled reports for an event.

    POST /v1/events/{eventId}/compiled-reports
    Triggers asynchronous generation of a report (e.g. reportType="patrols-pdf").
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
        event_name = event.name if event else "Event Patrol Badges"

        report_id = f"rep-{uuid6.uuid7().hex[:12]}"
        report_name = f"Patrol QR Badges ({event_name})" if report_type == "patrols-pdf" else "Event Scoring Report"

        job = await store.create_report_job(report_id, event_id, report_type, report_name)

        # Trigger async background generation
        if report_type == "patrols-pdf":
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

        pdf_bytes = download_report_bytes(file_key)
        if not pdf_bytes:
            raise falcon.HTTPNotFound(title="File Not Found", description="Report file could not be found in storage.")

        resp.content_type = report.get("content_type", "application/pdf")
        filename = f"{report['id']}.pdf"
        resp.append_header("Content-Disposition", f'inline; filename="{filename}"')
        resp.data = pdf_bytes
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
