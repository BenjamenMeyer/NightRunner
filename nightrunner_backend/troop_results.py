"""Builds the data for the per-troop results report (assessment 2.8, #258).

Pure functions, no database access, so the grouping and ranking rules can be
tested directly. `transport/compiled_reports.py` loads the rows and hands them
in; `reports_troop_results_pdf.py` renders the result.

Scores come only from `event_finalized_results`, so the report can never print
a number the Finalizer did not sign off. The raw entries come from the active
`scores` rows: they are what the volunteer typed, which no weight touches.

Nothing here reads a patrol's phone number or radio fields. These sheets go
home with families.
"""
from typing import Any, Dict, Iterable, List, Optional, Tuple

from nightrunner_backend.models.roster import normalise_troop_number
from nightrunner_backend.reports_scoring_pdf import _assign_rankings

NO_TROOP_KEY = "__none__"

# Mirrors reviewFormat.js so the printed sheet reads like the review screen.
PASS_FAIL_TYPES = {"Pass / Fail", "Completed", "Checkpoint"}
TIMER_TYPES = {"Stopwatch", "Timed Challenge"}
TEXT_TYPES = {"Text Answer", "Secret Cipher / Decoding"}
CHOICE_TYPES = {"Multiple Choice", "MultiChoice"}
DISQUALIFICATION_TYPE = "Automatic Station Disqualification"


def format_duration(seconds: Any) -> str:
    """Seconds as a stopwatch reads: '4:07', or '2:41:58' once past an hour."""
    try:
        total = max(0, round(float(seconds)))
    except (TypeError, ValueError):
        return "—"
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def _format_number(value: Any) -> str:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return "—"
    return str(int(n)) if n.is_integer() else f"{n:g}"


def _task_type(task: Dict[str, Any]) -> str:
    score_value = task.get("scoreValue") if isinstance(task.get("scoreValue"), dict) else {}
    return score_value.get("type") or task.get("type") or ""


def _task_divides(task: Dict[str, Any]) -> bool:
    score_value = task.get("scoreValue") if isinstance(task.get("scoreValue"), dict) else {}
    return bool(task.get("divideByPatrolSize") or score_value.get("divideByPatrolSize"))


def _choice_label(task: Dict[str, Any], raw: Any) -> Optional[str]:
    score_value = task.get("scoreValue") if isinstance(task.get("scoreValue"), dict) else {}
    options = score_value.get("options") or task.get("options") or []
    for option in options:
        value = option.get("value") if isinstance(option, dict) else option
        try:
            if float(value) == float(raw):
                if isinstance(option, dict):
                    return option.get("label") or option.get("name")
                return str(option)
        except (TypeError, ValueError):
            continue
    return None


def format_entry(task: Dict[str, Any], score: Any) -> Dict[str, Optional[str]]:
    """How one stored entry reads on paper: {'text', 'detail'}. No weights."""
    task_type = _task_type(task)
    raw = getattr(score, "score_value", None)
    typed = getattr(score, "submitted_text", None)
    count = int(getattr(score, "participant_count", 1) or 1)
    members_note = f"{count} members" if _task_divides(task) and count > 1 else None

    if task_type in PASS_FAIL_TYPES:
        return {"text": "Pass" if float(raw or 0) > 0 else "Fail", "detail": None}
    if task_type == DISQUALIFICATION_TYPE:
        # Stored as 1 for "not disqualified", 0 for disqualified.
        if float(raw or 0) > 0:
            return {"text": "No", "detail": None}
        return {"text": "Disqualified", "detail": typed or None}
    if task_type in TIMER_TYPES:
        return {"text": format_duration(raw), "detail": members_note}
    if task_type in TEXT_TYPES:
        return {"text": typed or "(blank)", "detail": None}
    if task_type in CHOICE_TYPES:
        label = _choice_label(task, raw)
        if label:
            return {"text": label, "detail": f"{_format_number(raw)} pts"}
    return {"text": _format_number(raw), "detail": members_note}


def patrol_troops(
    patrol: Any,
    attendee_troop_ids: Dict[str, str],
    troops_by_id: Dict[str, Any],
    troops_by_number: Dict[str, Any],
) -> List[Dict[str, Optional[str]]]:
    """The distinct troops a patrol's members belong to, in roster order.

    A member linked to a roster attendee takes the attendee's troop. A member
    typed in by hand falls back to the free-text `troop` field, matched to a
    troop record by its normalised number where possible.
    """
    found: List[Dict[str, Optional[str]]] = []
    seen = set()
    for member in getattr(patrol, "members", []) or []:
        troop = None
        attendee_id = getattr(member, "attendee_id", None)
        if attendee_id and attendee_troop_ids.get(attendee_id) in troops_by_id:
            troop = troops_by_id[attendee_troop_ids[attendee_id]]

        raw = (getattr(member, "troop", None) or "").strip()
        number = normalise_troop_number(raw)
        if troop is None and number:
            troop = troops_by_number.get(number)

        if troop is not None:
            entry = {
                "key": troop.number,
                "troopId": troop.id,
                "number": troop.number,
                "label": f"Troop {troop.number}" + (f" — {troop.name}" if troop.name else ""),
            }
        elif number:
            entry = {"key": number, "troopId": None, "number": number, "label": f"Troop {number}"}
        elif raw:
            entry = {"key": raw, "troopId": None, "number": raw, "label": raw}
        else:
            continue

        if entry["key"] not in seen:
            seen.add(entry["key"])
            found.append(entry)
    return found


def _latest_active_scores(scores: Iterable[Any]) -> Dict[Tuple[str, str, str], Any]:
    """(patrol, station, task) -> the newest active score row."""
    latest: Dict[Tuple[str, str, str], Any] = {}
    for sc in scores:
        if not getattr(sc, "active", True):
            continue
        key = (str(sc.patrol_id), str(sc.station_id), str(sc.task_id))
        current = latest.get(key)
        if current is None or str(sc.submitted_at or "") >= str(current.submitted_at or ""):
            latest[key] = sc
    return latest


def scoring_mode_of(finalized_rows: List[Dict[str, Any]]) -> str:
    for r in finalized_rows:
        if r.get("scoreType") == "station" and r.get("scoringMode") in ("absolute", "relative"):
            return r["scoringMode"]
    return "absolute"


def build_troop_results(
    patrols: List[Any],
    stations: List[Any],
    finalized_rows: List[Dict[str, Any]],
    scores: Iterable[Any],
    attendee_troop_ids: Dict[str, str],
    troops: List[Any],
) -> List[Dict[str, Any]]:
    """One entry per troop, each holding a results page per patrol.

    A patrol with members from two troops appears under both. Patrols with no
    troop on any member are grouped under "No troop listed".
    """
    troops_by_id = {t.id: t for t in troops}
    troops_by_number = {t.number: t for t in troops}

    final_scores: Dict[str, float] = {}
    station_scores: Dict[str, Dict[str, float]] = {}
    for r in finalized_rows:
        pid = str(r["patrolId"])
        sid = r.get("stationId")
        value = float(r.get("scoreValue") or 0.0)
        if r.get("scoreType") == "final" or sid is None:
            final_scores[pid] = value
        else:
            station_scores.setdefault(str(sid), {})[pid] = value

    patrol_count = len(patrols)
    overall_ranks = {
        p["patrolId"]: p["rankStr"]
        for p in _assign_rankings(
            [{"patrolId": str(p.id), "score": final_scores.get(str(p.id), 0.0)} for p in patrols]
        )
    }

    latest = _latest_active_scores(scores)
    attempted = {(pid, sid) for (pid, sid, _tid) in latest}

    station_summaries = {}
    for st in stations:
        sid = str(st.id)
        by_patrol = station_scores.get(sid, {})
        ranks = {
            p["patrolId"]: p["rankStr"]
            for p in _assign_rankings(
                [{"patrolId": str(p.id), "score": by_patrol.get(str(p.id), 0.0)} for p in patrols]
            )
        }
        # Average over patrols that were actually scored here, so a patrol
        # that skipped the station does not drag everyone's average down.
        scored = [v for pid, v in by_patrol.items() if (pid, sid) in attempted]
        station_summaries[sid] = {
            "ranks": ranks,
            "average": sum(scored) / len(scored) if scored else None,
            "best": max(by_patrol.values()) if by_patrol else None,
            "scoredCount": len(scored),
        }

    groups: Dict[str, Dict[str, Any]] = {}
    for patrol in patrols:
        pid = str(patrol.id)
        troop_entries = patrol_troops(patrol, attendee_troop_ids, troops_by_id, troops_by_number)

        station_pages = []
        for st in stations:
            sid = str(st.id)
            summary = station_summaries[sid]
            entries = []
            for task in st.tasks or []:
                if not isinstance(task, dict):
                    continue
                sc = latest.get((pid, sid, str(task.get("id"))))
                if sc is None:
                    continue
                shown = format_entry(task, sc)
                entries.append({
                    "task": task.get("name") or task.get("description") or "Task",
                    "text": shown["text"],
                    "detail": shown["detail"],
                })
            station_pages.append({
                "stationName": st.name,
                "stationWeight": float(getattr(st, "station_weight", 1.0) or 1.0),
                "explanation": (getattr(st, "scoring_explanation", None) or "").strip(),
                "score": station_scores.get(sid, {}).get(pid),
                "rankStr": summary["ranks"].get(pid),
                "average": summary["average"],
                "best": summary["best"],
                "scoredCount": summary["scoredCount"],
                "attempted": (pid, sid) in attempted,
                "entries": entries,
            })

        page = {
            "patrolId": pid,
            "patrolNumber": getattr(patrol, "number", None),
            "patrolName": patrol.name or f"Patrol {pid}",
            "troops": ", ".join(t["number"] for t in troop_entries),
            "members": [m.name for m in (getattr(patrol, "members", []) or []) if getattr(m, "name", None)],
            "overallScore": final_scores.get(pid, 0.0),
            "overallRankStr": overall_ranks.get(pid),
            "patrolCount": patrol_count,
            "stations": station_pages,
        }

        for troop in troop_entries or [{"key": NO_TROOP_KEY, "troopId": None, "number": None, "label": "No troop listed"}]:
            group = groups.setdefault(troop["key"], {
                "troopKey": troop["key"],
                "troopId": troop["troopId"],
                "troopNumber": troop["number"],
                "troopLabel": troop["label"],
                "patrols": [],
            })
            group["patrols"].append(page)

    def _patrol_order(p):
        try:
            num = float(p.get("patrolNumber"))
        except (TypeError, ValueError):
            num = None
        return (num is None, num or 0.0, p.get("patrolName") or "")

    result = []
    for key in sorted(groups, key=lambda k: (k == NO_TROOP_KEY, k)):
        group = groups[key]
        group["patrols"].sort(key=_patrol_order)
        result.append(group)
    return result
