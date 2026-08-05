import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.scores import ScoresStore
from nightrunner_backend.models.score import Score

class ScoresResource:
    """Endpoint to submit scores for a patrol at a station.
    Expects a payload matching the `ScoreSubmission` schema from the OpenAPI spec.
    """

    def __init__(self):
        self.store = ScoresStore(get_driver())

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        payload = await req.get_media()
        # Validate required top‑level fields (eventId, stationId, patrolId, scores)
        event_id = payload.get("eventId")
        station_id = payload.get("stationId")
        patrol_id = payload.get("patrolId")
        scores = payload.get("scores", [])
        if not all([event_id, station_id, patrol_id, isinstance(scores, list)]):
            raise falcon.HTTPBadRequest(description="Missing required fields in ScoreSubmission")

        created = []
        for s in scores:
            task_id = s.get("taskId")
            score_value = s.get("scoreValue")
            if task_id is None or score_value is None:
                raise falcon.HTTPBadRequest(description="Each score must contain taskId and scoreValue")
            # Optional fields
            weight = s.get("scoreWeight", 1.0)
            active = s.get("active", True)
            score = Score(
                event_id=event_id,
                station_id=station_id,
                patrol_id=patrol_id,
                task_id=task_id,
                score_value=score_value,
                score_weight=weight,
                active=active,
            )
            await self.store.create(score)
            created.append({"id": score.id})

        resp.status = falcon.HTTP_201
        resp.media = {"created": created}
