import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.scores import ScoresStore


class StationReportResource:
    """GET /v1/reports/stations/{stationId}?eventId={eventId}
    Returns a detailed scoring breakdown for a single station.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        store = ScoresStore(get_driver())
        event_id = req.get_param('eventId')
        if not event_id:
            raise falcon.HTTPBadRequest(description='eventId query parameter is required')
        rows = await store.aggregate_station(event_id, stationId)
        per_patrol = {}
        for r in rows:
            pid = r['patrol_id']
            patrol = per_patrol.setdefault(pid, {
                'patrolId': pid,
                'patrolName': r.get('patrol_name'),
                'total': 0.0,
                'breakdown': []
            })
            weighted = r['weighted_score']
            submitted_at = r.get('submitted_at')
            if hasattr(submitted_at, 'isoformat'):
                submitted_at = submitted_at.isoformat()
            patrol['breakdown'].append({
                'scoreId': r.get('score_id'),
                'taskId': r['task_id'],
                'taskName': r.get('task_name'),
                'rawScore': r['score_value'],
                'weight': r['score_weight'],
                'weightedScore': weighted,
                'active': bool(r['active']),
                'submittedAt': submitted_at
            })
            patrol['total'] += weighted
        resp.media = {
            'stationId': stationId,
            'eventId': event_id,
            'patrols': list(per_patrol.values())
        }
        resp.status = falcon.HTTP_200
