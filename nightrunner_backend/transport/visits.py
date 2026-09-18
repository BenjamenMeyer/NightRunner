from datetime import datetime, timezone
import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.station_visits import StationVisitsStore
from nightrunner_backend.transport import visit_actions


class VisitsResource:
    """GET /v1/visits?eventId={eventId} — List visits for an event."""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        event_id = req.get_param("eventId")
        if not event_id:
            raise falcon.HTTPBadRequest(description="eventId query parameter is required.")
        
        store = StationVisitsStore(get_driver())
        visits = await store.list_for_event(event_id)
        resp.media = {"eventId": event_id, "visits": [v.to_api_dict() for v in visits]}
        resp.status = falcon.HTTP_200


class VisitCheckInResource:
    """POST /v1/visits/check-in — Record a patrol check-in at a station."""

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
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

        store = StationVisitsStore(get_driver())
        visit, status = await visit_actions.check_in(
            store,
            event_id=event_id,
            station_id=station_id,
            patrol_id=patrol_id,
            timestamp=payload.get("timestamp"),
            entry_mode=payload.get("entryMode", "live"),
        )
        resp.media = visit.to_api_dict()
        resp.status = status


class VisitCheckOutResource:
    """POST /v1/visits/check-out — Record a patrol check-out from a station."""

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
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

        store = StationVisitsStore(get_driver())
        visit, status = await visit_actions.check_out(
            store,
            event_id=event_id,
            station_id=station_id,
            patrol_id=patrol_id,
            timestamp=payload.get("timestamp"),
            entry_mode=payload.get("entryMode", "live"),
        )
        resp.media = visit.to_api_dict()
        resp.status = status


class VisitResetResource:
    """POST /v1/visits/reset — Reopen/reset a completed station attempt."""

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
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

        store = StationVisitsStore(get_driver())
        latest = await store.get_latest_visit(event_id, station_id, patrol_id)

        if not latest:
            raise falcon.HTTPNotFound(description="No visit record found for this patrol and station.")

        # Check authorization and time constraints
        user = getattr(req.context, "user", None) or {}
        user_roles = getattr(req.context, "roles", []) or []
        is_admin = bool(user.get("isAdmin")) or "admin" in user_roles or "event-admin" in user_roles
        
        # Check if user has station-leader role for event or globally
        event_role = None
        if isinstance(user_roles, dict):
            event_role = user_roles.get(event_id)
        is_station_leader = is_admin or event_role in ("station-leader", "admin", "event-admin") or "station-leader" in user_roles

        # Evaluate 5-minute volunteer window from tasks_completed_at / checked_out_at / created_at
        completed_time_str = latest.tasks_completed_at or latest.checked_out_at or latest.created_at
        within_5_minutes = False
        if completed_time_str:
            try:
                # Handle ISO format strings
                if completed_time_str.endswith("Z"):
                    completed_time_str = completed_time_str[:-1] + "+00:00"
                dt = datetime.fromisoformat(completed_time_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                within_5_minutes = (now - dt).total_seconds() <= 300
            except Exception:
                within_5_minutes = False

        if not within_5_minutes and not is_station_leader:
            raise falcon.HTTPForbidden(
                title="Station Leader Required",
                description="The 5-minute self-reset window has expired. Reopening this station attempt requires a Station Leader or Event Admin."
            )

        # Reopen attempt
        latest.status = "checked_in"
        latest.checked_out_at = None
        latest.unlocked_by = user.get("id") or user.get("username") or "volunteer"
        updated = await store.update(latest)

        resp.media = updated.to_api_dict()
        resp.status = falcon.HTTP_200

