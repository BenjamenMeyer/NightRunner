from typing import Any

import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.scores import ScoresStore
from nightrunner_backend.models.score import Score


def _parse_numeric_score_value(val: Any) -> float:
    """Helper to convert complex task score values into a float.
    Handles dicts (stopwatch timestamps / elapsedSeconds), booleans, numeric strings, and text inputs.
    """
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, bool):
        return 1.0 if val else 0.0
    if isinstance(val, dict):
        if "elapsedSeconds" in val and isinstance(val["elapsedSeconds"], (int, float)):
            return float(val["elapsedSeconds"])
        if "startTime" in val and "endTime" in val:
            try:
                from datetime import datetime
                st = datetime.fromisoformat(str(val["startTime"]).replace("Z", "+00:00"))
                et = datetime.fromisoformat(str(val["endTime"]).replace("Z", "+00:00"))
                return (et - st).total_seconds()
            except Exception:
                return 0.0
        return 0.0
    if isinstance(val, str):
        try:
            return float(val)
        except ValueError:
            return 1.0 if val.strip() else 0.0
    return 0.0


class ScoresResource:
    """POST /v1/scores — submit scores for a patrol at a station.

    Expected payload::

        {
            "eventId":   "<str>",
            "stationId": "<str>",
            "patrolId":  "<str>",
            "scores": [
                {"taskId": "<str>", "scoreValue": <float|dict|bool|str>, "scoreWeight": <float>, "active": <bool>},
                ...
            ]
        }
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = ScoresStore(get_driver())
        event_id = req.get_param("eventId")
        station_id = req.get_param("stationId")
        patrol_id = req.get_param("patrolId")

        if event_id and station_id and patrol_id:
            scores = await store.get_active_scores_for_patrol_station(event_id, station_id, patrol_id)
            resp.status = falcon.HTTP_200
            resp.media = {
                "scores": [s.to_dict() for s in scores],
                "isAlreadyScored": len(scores) > 0,
                "lastScoredAt": scores[0].submitted_at if scores else None
            }
            return

        if event_id:
            scores = await store.list_for_event(event_id)
            resp.status = falcon.HTTP_200
            resp.media = [s.to_dict() for s in scores]
            return

        raise falcon.HTTPBadRequest(description="'eventId' query parameter is required.")

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = ScoresStore(get_driver())
        payload = await req.get_media()

        if not isinstance(payload, dict):
            raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")

        event_id = payload.get("eventId")
        station_id = payload.get("stationId")
        patrol_id = payload.get("patrolId")

        if not event_id:
            raise falcon.HTTPBadRequest(description="'eventId' is required.")
        if not station_id:
            raise falcon.HTTPBadRequest(description="'stationId' is required.")
        if not patrol_id:
            raise falcon.HTTPBadRequest(description="'patrolId' is required.")

        scores_data = payload.get("scores", [])
        if not isinstance(scores_data, list):
            raise falcon.HTTPBadRequest(description="'scores' must be a list.")

        created = []
        for s in scores_data:
            task_id = s.get("taskId")
            raw_score_value = s.get("scoreValue")
            if task_id is None or raw_score_value is None:
                raise falcon.HTTPBadRequest(
                    description="Each score entry must include 'taskId' and 'scoreValue'."
                )
            score = Score(
                event_id=event_id,
                station_id=station_id,
                patrol_id=patrol_id,
                task_id=task_id,
                score_value=_parse_numeric_score_value(raw_score_value),
                score_weight=float(s.get("scoreWeight", 1.0)),
                active=bool(s.get("active", True)),
                started_at=s.get("startedAt") or payload.get("startedAt"),
                completed_at=s.get("completedAt") or payload.get("completedAt"),
                entry_mode=payload.get("entryMode", "live"),
            )
            # Deactivate previous active score for this same task to avoid double counting while preserving history
            await store.deactivate_previous_scores(event_id, station_id, patrol_id, task_id)
            await store.create(score)
            created.append({"id": score.id})

        # Mark station visit as completed
        from nightrunner_backend.drivers.store.station_visits import StationVisitsStore
        visit_store = StationVisitsStore(get_driver())
        active_visit = await visit_store.get_active_visit(event_id, station_id, patrol_id)
        if not active_visit:
            active_visit = await visit_store.get_latest_visit(event_id, station_id, patrol_id)
        if active_visit:
            active_visit.status = "completed"
            active_visit.tasks_completed_at = payload.get("completedAt") or active_visit.tasks_completed_at
            await visit_store.update(active_visit)

        resp.status = falcon.HTTP_201
        resp.media = {"created": created}



class ScoreResource:
    """PATCH /v1/scores/{scoreId} — adjust active status or scoreWeight for tie-breaking."""

    async def on_patch(self, req: falcon.Request, resp: falcon.Response, scoreId: str):
        store = ScoresStore(get_driver())
        existing = await store.get(scoreId)
        if not existing:
            raise falcon.HTTPNotFound()

        payload = await req.get_media()
        if not isinstance(payload, dict):
            raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")

        fields = {}
        if "active" in payload:
            fields["active"] = 1 if payload["active"] else 0
        if "scoreWeight" in payload:
            fields["score_weight"] = float(payload["scoreWeight"])
        if "scoreValue" in payload:
            fields["score_value"] = float(payload["scoreValue"])

        if fields:
            updated = await store.update(scoreId, **fields)
            resp.media = updated.to_dict()
        else:
            resp.media = existing.to_dict()

        resp.status = falcon.HTTP_200
