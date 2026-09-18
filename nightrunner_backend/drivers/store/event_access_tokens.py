from datetime import datetime, timezone
from typing import List, Optional

from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.event_access_token import EventAccessToken

CREATE_TOKEN = """
    INSERT INTO event_access_tokens (
        id, event_id, token_hash, scope, station_id, label,
        created_by, created_at, expires_at, revoked_at, last_used_at
    ) VALUES (
        :id, :event_id, :token_hash, :scope, :station_id, :label,
        :created_by, :created_at, :expires_at, :revoked_at, :last_used_at
    )
"""

LIST_TOKENS_FOR_EVENT = """
    SELECT * FROM event_access_tokens
    WHERE event_id = :event_id
    ORDER BY created_at DESC
"""

LIST_TOKENS_FOR_EVENT_BY_SCOPE = """
    SELECT * FROM event_access_tokens
    WHERE event_id = :event_id AND scope = :scope
    ORDER BY created_at DESC
"""

GET_TOKEN_BY_HASH = "SELECT * FROM event_access_tokens WHERE token_hash = :token_hash"

GET_TOKEN = "SELECT * FROM event_access_tokens WHERE id = :id"

REVOKE_TOKEN = "UPDATE event_access_tokens SET revoked_at = :revoked_at WHERE id = :id"

TOUCH_TOKEN = "UPDATE event_access_tokens SET last_used_at = :last_used_at WHERE id = :id"


class EventAccessTokensStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    def _row_to_token(self, row: dict) -> EventAccessToken:
        return EventAccessToken(
            id=row["id"],
            event_id=row["event_id"],
            token_hash=row["token_hash"],
            scope=row.get("scope") or "progress",
            station_id=row.get("station_id"),
            label=row.get("label"),
            created_by=row.get("created_by"),
            created_at=row.get("created_at"),
            expires_at=row.get("expires_at"),
            revoked_at=row.get("revoked_at"),
            last_used_at=row.get("last_used_at"),
        )

    async def create(self, token: EventAccessToken) -> EventAccessToken:
        token.created_at = token.created_at or datetime.now(timezone.utc).isoformat()
        await self.driver.execute(CREATE_TOKEN, {
            "id": token.id,
            "event_id": token.event_id,
            "token_hash": token.token_hash,
            "scope": token.scope,
            "station_id": token.station_id,
            "label": token.label,
            "created_by": token.created_by,
            "created_at": token.created_at,
            "expires_at": token.expires_at,
            "revoked_at": token.revoked_at,
            "last_used_at": token.last_used_at,
        })
        return token

    async def list_for_event(self, event_id: str, scope: Optional[str] = None) -> List[EventAccessToken]:
        if scope:
            rows = await self.driver.execute(
                LIST_TOKENS_FOR_EVENT_BY_SCOPE,
                {"event_id": event_id, "scope": scope},
            )
        else:
            rows = await self.driver.execute(LIST_TOKENS_FOR_EVENT, {"event_id": event_id})
        return [self._row_to_token(row) for row in rows]

    async def get_by_hash(self, token_hash: str) -> Optional[EventAccessToken]:
        """Return the row whatever state it is in.

        Revoked and expired tokens come back too. Deciding validity is the
        caller's job — specifically ``resolve_token`` — so that every rejection
        reason produces the same response and none of them can be told apart
        from outside.
        """
        row = await self.driver.fetch_one(GET_TOKEN_BY_HASH, {"token_hash": token_hash})
        return self._row_to_token(row) if row else None

    async def get(self, token_id: str) -> Optional[EventAccessToken]:
        row = await self.driver.fetch_one(GET_TOKEN, {"id": token_id})
        return self._row_to_token(row) if row else None

    async def revoke(self, token_id: str, at: Optional[str] = None) -> None:
        """Mark a token dead. The row survives so the audit trail does."""
        await self.driver.execute(REVOKE_TOKEN, {
            "id": token_id,
            "revoked_at": at or datetime.now(timezone.utc).isoformat(),
        })

    async def touch(self, token_id: str, at: Optional[str] = None) -> None:
        await self.driver.execute(TOUCH_TOKEN, {
            "id": token_id,
            "last_used_at": at or datetime.now(timezone.utc).isoformat(),
        })
