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
            )
            await store.create(score)
            created.append({"id": score.id})

        resp.status = falcon.HTTP_201
        resp.media = {"created": created}
