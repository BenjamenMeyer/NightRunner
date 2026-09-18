"""Public patrol progress board — read only, authenticated by an event token.

Scores are deliberately absent and no score table is read. Raw rows in `scores`
include superseded and unapplied entries, which the finalizer is what resolves;
publishing them would publish numbers that later change. Results go out through
the printable scoring report instead.
"""

import falcon

from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.public_board import PublicBoardStore
from nightrunner_backend.models.event_access_token import SCOPE_PROGRESS
from nightrunner_backend.transport.public_tokens import resolve_token, touch_token


class PublicProgressResource:
    """GET /v1/public/progress/{token} — everything the spectator board renders.

    The caller supplies no event id. The token names the event, so there is no
    parameter through which another event's data could be requested.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, token: str):
        access = await resolve_token(token, SCOPE_PROGRESS)

        store = PublicBoardStore(get_driver())
        event = await store.get_event(access.event_id)
        if not event:
            # The token outlived its event. Same response as a bad token.
            raise falcon.HTTPNotFound(
                title="Link not found",
                description="This link is not valid. Ask the event organiser for a current one.",
            )

        stations = await store.list_stations(access.event_id)
        patrols = await store.list_patrols(access.event_id)
        visits = await store.list_visits(access.event_id)

        await touch_token(access)

        resp.media = {
            # No event id: nothing public needs it, and leaving it out keeps the
            # id from turning up in a screenshot or a shared link.
            "event": {"name": event.get("name"), "date": event.get("date")},
            "stations": stations,
            "patrols": patrols,
            "visits": visits,
            "expiresAt": access.expires_at,
        }
        resp.status = falcon.HTTP_200
