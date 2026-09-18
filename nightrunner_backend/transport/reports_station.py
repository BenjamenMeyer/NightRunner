import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.scores import ScoresStore


class StationReportResource:
    """GET /v1/reports/stations/{stationId}?eventId={eventId}
    Returns a detailed scoring breakdown for a single station.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        store = ScoresStore(get_driver())
        from nightrunner_backend.drivers.store.station_visits import StationVisitsStore
        visits_store = StationVisitsStore(get_driver())

        event_id = req.get_param('eventId')
        if not event_id:
            raise falcon.HTTPBadRequest(description='eventId query parameter is required')

        rows = await store.aggregate_station(event_id, stationId)
        visits = await visits_store.list_for_event(event_id)

        # Build visit lookup map by (stationId, patrolId) -> latest visit
        visit_map = {}
        for v in visits:
            if v.station_id == stationId:
                visit_map[v.patrol_id] = v

        per_patrol = {}
        for r in rows:
            pid = r['patrol_id']
            patrol = per_patrol.setdefault(pid, {
                'patrolId': pid,
                'patrolName': r.get('patrol_name'),
                'total': 0.0,
                'breakdown': []
            })

            # Populate visit timing if available
            v = visit_map.get(pid)
            if v:
                c_in = v.checked_in_at.isoformat() if hasattr(v.checked_in_at, 'isoformat') else v.checked_in_at
                c_out = v.checked_out_at.isoformat() if hasattr(v.checked_out_at, 'isoformat') else v.checked_out_at
                t_start = v.tasks_started_at.isoformat() if hasattr(v.tasks_started_at, 'isoformat') else v.tasks_started_at
                t_comp = v.tasks_completed_at.isoformat() if hasattr(v.tasks_completed_at, 'isoformat') else v.tasks_completed_at
                patrol['checkedInAt'] = c_in
                patrol['checkedOutAt'] = c_out
                patrol['tasksStartedAt'] = t_start
                patrol['tasksCompletedAt'] = t_comp

            weighted = r['weighted_score']
            submitted_at = r.get('submitted_at')
            if hasattr(submitted_at, 'isoformat'):
                submitted_at = submitted_at.isoformat()

            started_at = r.get('started_at')
            if hasattr(started_at, 'isoformat'):
                started_at = started_at.isoformat()

            completed_at = r.get('completed_at')
            if hasattr(completed_at, 'isoformat'):
                completed_at = completed_at.isoformat()

            patrol['breakdown'].append({
                'scoreId': r.get('score_id'),
                'taskId': r['task_id'],
                'taskName': r.get('task_name'),
                'rawScore': r['score_value'],
                'submittedText': r.get('submitted_text'),
                'weight': r['score_weight'],
                'weightedScore': weighted,
                'active': bool(r['active']),
                'submittedAt': submitted_at,
                'startedAt': started_at,
                'completedAt': completed_at
            })
            patrol['total'] += weighted

        resp.media = {
            'stationId': stationId,
            'eventId': event_id,
            'patrols': list(per_patrol.values())
        }
        resp.status = falcon.HTTP_200
