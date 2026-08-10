import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.scores import ScoresStore


class EventReportResource:
    """GET /v1/reports/events/{eventId}
    Returns the final event scoring report: totals per patrol, per-station breakdowns, and ranking.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, eventId: str):
        store = ScoresStore(get_driver())
        rows = await store.aggregate_event(eventId)
        # Build per-patrol aggregation
        patrols = {}
        for r in rows:
            pid = r["patrol_id"]
            p = patrols.setdefault(pid, {
                "patrolId": pid,
                "patrolName": r.get("patrol_name"),
                "eventTotal": 0.0,
                "stationTotals": {}
            })
            station_id = r["station_id"]
            weighted = r["weighted_score"]
            p["eventTotal"] += weighted
            p["stationTotals"][station_id] = p["stationTotals"].get(station_id, 0) + weighted
        # Ranking
        sorted_patrols = sorted(patrols.values(), key=lambda x: x["eventTotal"], reverse=True)
        for rank, p in enumerate(sorted_patrols, start=1):
            p["rank"] = rank
        resp.media = {"eventId": eventId, "patrols": sorted_patrols}
        resp.status = falcon.HTTP_200
