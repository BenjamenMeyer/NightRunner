"""Shared token resolution for the public, token-authenticated routes.

Every rejection here raises the same bare 404. Unknown, revoked, expired and
wrong-scope tokens are indistinguishable from outside, so the endpoints cannot be
used to work out which tokens exist or what state one is in.
"""

import falcon

from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.event_access_tokens import EventAccessTokensStore
from nightrunner_backend.models.event_access_token import EventAccessToken, hash_token

# One message for every failure mode. Do not make this more helpful.
NOT_FOUND_DESCRIPTION = (
    "This link is not valid. Ask the event organiser for a current one."
)


def _not_found() -> falcon.HTTPNotFound:
    return falcon.HTTPNotFound(title="Link not found", description=NOT_FOUND_DESCRIPTION)


async def resolve_token(token: str, expected_scope: str) -> EventAccessToken:
    """Return the token row when it is usable at `expected_scope`, else 404.

    The scope check is what stops a progress link — which is meant to be shared
    publicly — from being replayed against the check-in routes to write visit
    records.
    """
    if not token:
        raise _not_found()

    store = EventAccessTokensStore(get_driver())
    resolved = await store.get_by_hash(hash_token(token))

    if not resolved:
        raise _not_found()
    if resolved.scope != expected_scope:
        raise _not_found()
    if not resolved.is_valid():
        raise _not_found()

    return resolved


async def touch_token(token: EventAccessToken) -> None:
    """Record use, so an organiser can see whether a link is live and being used.

    Never allowed to fail the request: this is bookkeeping, and a volunteer
    mid-shift should not lose a check-in because the update lost a race.
    """
    try:
        store = EventAccessTokensStore(get_driver())
        await store.touch(token.id)
    except Exception:  # pragma: no cover - defensive
        pass
