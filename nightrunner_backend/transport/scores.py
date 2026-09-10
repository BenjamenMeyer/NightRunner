import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.scores import ScoresStore
from nightrunner_backend.models.score import Score


class ScoresResource:
    """POST /v1/scores — submit scores for a patrol at a station.

    Expected payload::

        {
            "eventId":   "<str>",
            "stationId": "<str>",
            "patrolId":  "<str>",
            "scores": [
                {"taskId": "<str>", "scoreValue": <float>, "scoreWeight": <float>, "active": <bool>},
                ...
            ]
        }
    """

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
            score_value = s.get("scoreValue")
            if task_id is None or score_value is None:
                raise falcon.HTTPBadRequest(
                    description="Each score entry must include 'taskId' and 'scoreValue'."
                )
            score = Score(
                event_id=event_id,
                station_id=station_id,
                patrol_id=patrol_id,
                task_id=task_id,
                score_value=float(score_value),
                score_weight=float(s.get("scoreWeight", 1.0)),
                active=bool(s.get("active", True)),
                started_at=s.get("startedAt") or payload.get("startedAt"),
                completed_at=s.get("completedAt") or payload.get("completedAt"),
                entry_mode=payload.get("entryMode", "live"),
            )
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
