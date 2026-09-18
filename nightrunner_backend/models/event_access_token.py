"""Per-event access tokens — the credential behind the public links.

Two scopes exist. A ``progress`` token is read-only and is meant to be shared
widely (a parents' group chat, say). A ``checkin`` token can write station visit
records and must not be. They share one table because they share one lifecycle:
minted against an event, revocable, and expiring on their own.

Only ``token_hash`` is ever persisted. The plaintext is returned once, by the
mint endpoint, and cannot be recovered afterwards.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import hashlib
import secrets

import uuid6

# A progress link is read-only; a checkin link can record visits.
SCOPE_PROGRESS = "progress"
SCOPE_CHECKIN = "checkin"
VALID_SCOPES = (SCOPE_PROGRESS, SCOPE_CHECKIN)

# 32 bytes of entropy renders as 43 URL-safe characters.
TOKEN_BYTES = 32

# How long a link lives when the caller does not say. Events run overnight and
# are looked at the morning after; beyond that a live link is a liability.
DEFAULT_EXPIRY_DAYS_AFTER_EVENT = 2
# Fallback for an event with no date set.
DEFAULT_EXPIRY_DAYS_NO_EVENT_DATE = 30


def generate_token() -> str:
    """Return a fresh plaintext token. Never stored — hash it before saving."""
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_token(token: str) -> str:
    """Hash a plaintext token for storage and lookup.

    SHA-256 without a salt is deliberate: the token is 32 bytes of random, so
    there is no low-entropy secret for a rainbow table to attack, and lookup has
    to be a single indexed read on the hash rather than a scan.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def default_expiry(event_date: Optional[str]) -> str:
    """Work out when a link minted now should stop working.

    ``event_date`` is whatever is on the event, which may be absent or may not
    parse — organisers type these by hand. Either way the link gets a finite
    life rather than an unbounded one.
    """
    if event_date:
        try:
            parsed = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            expires = parsed + timedelta(days=DEFAULT_EXPIRY_DAYS_AFTER_EVENT)
            return expires.replace(hour=23, minute=59, second=0, microsecond=0).isoformat()
        except ValueError:
            # An unparseable date is not worth failing a mint over; fall through
            # to the no-date default.
            pass

    expires = datetime.now(timezone.utc) + timedelta(days=DEFAULT_EXPIRY_DAYS_NO_EVENT_DATE)
    return expires.isoformat()


@dataclass
class EventAccessToken:
    event_id: str
    token_hash: str
    scope: str = SCOPE_PROGRESS
    id: str = field(default_factory=lambda: str(uuid6.uuid7()))
    station_id: Optional[str] = None
    label: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    revoked_at: Optional[str] = None
    last_used_at: Optional[str] = None

    def is_valid(self, now: Optional[datetime] = None) -> bool:
        """True when the token may still be used.

        Revocation and expiry are checked here rather than in SQL so that both
        database backends behave identically regardless of how they compare
        timestamp strings.
        """
        if self.revoked_at:
            return False
        if not self.expires_at:
            return True

        moment = now or datetime.now(timezone.utc)
        try:
            expires = datetime.fromisoformat(self.expires_at.replace("Z", "+00:00"))
        except ValueError:
            # A stored expiry we cannot read is treated as expired. Failing
            # closed is the only safe reading for a credential.
            return False
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return moment <= expires

    def to_api_dict(self) -> Dict[str, Any]:
        """Metadata only. The token itself is never returned by this method —
        the mint endpoint attaches the plaintext to its own response instead.
        """
        return {
            "id": self.id,
            "eventId": self.event_id,
            "scope": self.scope,
            "stationId": self.station_id,
            "label": self.label,
            "createdBy": self.created_by,
            "createdAt": self.created_at,
            "expiresAt": self.expires_at,
            "revokedAt": self.revoked_at,
            "lastUsedAt": self.last_used_at,
            "isValid": self.is_valid(),
        }
