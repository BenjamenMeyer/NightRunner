"""Public station check-in — authenticated by an event token, not a login.

Lets a station volunteer work from their own phone without an account. The token
in the URL is the credential: it names one event, it can be revoked, and it
expires on its own.

Reset is not exposed here. It reopens finalised scoring and keeps its own role
check on the authenticated route.
"""

import falcon

from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.public_board import PublicBoardStore
from nightrunner_backend.drivers.store.station_visits import StationVisitsStore
from nightrunner_backend.models.event_access_token import SCOPE_CHECKIN
from nightrunner_backend.transport import visit_actions
from nightrunner_backend.transport.public_tokens import resolve_token, touch_token


async def _read_ids(req: falcon.Request, event_id: str):
    """Pull stationId and patrolId from the body and prove both belong here.

    The event comes from the token, never the caller. Checking membership stops
    a valid token for event A being used to write visits against event B.
    """
    payload = await req.get_media()
    if not isinstance(payload, dict):
        raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")

    station_id = payload.get("stationId")
    patrol_id = payload.get("patrolId")

    if not station_id:
        raise falcon.HTTPBadRequest(description="'stationId' is required.")
    if not patrol_id:
        raise falcon.HTTPBadRequest(description="'patrolId' is required.")

    board = PublicBoardStore(get_driver())
    if not await board.station_belongs_to_event(station_id, event_id):
        raise falcon.HTTPBadRequest(description="Unknown station for this event.")
    if not await board.patrol_belongs_to_event(patrol_id, event_id):
        raise falcon.HTTPBadRequest(description="Unknown patrol for this event.")

    return station_id, patrol_id, payload


class PublicCheckInBootstrapResource:
    """GET /v1/public/checkin/{token} — everything the volunteer page renders."""

    async def on_get(self, req: falcon.Request, resp: falcon.Response, token: str):
        access = await resolve_token(token, SCOPE_CHECKIN)

        store = PublicBoardStore(get_driver())
        event = await store.get_event(access.event_id)
        if not event:
            raise falcon.HTTPNotFound(
                title="Link not found",
                description="This link is not valid. Ask the event organiser for a current one.",
            )

        stations = await store.list_stations(access.event_id)
        patrols = await store.list_patrols(access.event_id)
        visits = await store.list_visits(access.event_id)

        await touch_token(access)

        resp.media = {
            "event": {"name": event.get("name"), "date": event.get("date")},
            "stations": stations,
            "patrols": patrols,
            "visits": visits,
            # Set when a link is pinned to one station. Null means the volunteer
            # picks, which is every link issued today.
            "stationId": access.station_id,
            "expiresAt": access.expires_at,
        }
        resp.status = falcon.HTTP_200


class PublicCheckInResource:
    """POST /v1/public/checkin/{token}/check-in"""

    async def on_post(self, req: falcon.Request, resp: falcon.Response, token: str):
        access = await resolve_token(token, SCOPE_CHECKIN)
        station_id, patrol_id, payload = await _read_ids(req, access.event_id)

        # A token pinned to one station may only write for that station.
        if access.station_id and access.station_id != station_id:
            raise falcon.HTTPBadRequest(description="This link is limited to a different station.")

        store = StationVisitsStore(get_driver())
        visit, status = await visit_actions.check_in(
            store,
            event_id=access.event_id,
            station_id=station_id,
            patrol_id=patrol_id,
            timestamp=payload.get("timestamp"),
            entry_mode=payload.get("entryMode", "live"),
        )

        await touch_token(access)
        resp.media = visit.to_api_dict()
        resp.status = status


class PublicCheckOutResource:
    """POST /v1/public/checkin/{token}/check-out"""

    async def on_post(self, req: falcon.Request, resp: falcon.Response, token: str):
        access = await resolve_token(token, SCOPE_CHECKIN)
        station_id, patrol_id, payload = await _read_ids(req, access.event_id)

        if access.station_id and access.station_id != station_id:
            raise falcon.HTTPBadRequest(description="This link is limited to a different station.")

        store = StationVisitsStore(get_driver())
        visit, status = await visit_actions.check_out(
            store,
            event_id=access.event_id,
            station_id=station_id,
            patrol_id=patrol_id,
            timestamp=payload.get("timestamp"),
            entry_mode=payload.get("entryMode", "live"),
        )

        await touch_token(access)
        resp.media = visit.to_api_dict()
        resp.status = status
