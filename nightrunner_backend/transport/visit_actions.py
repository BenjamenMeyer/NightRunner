"""Check-in and check-out logic, shared by the authenticated and public routes.

Extracted from transport/visits.py so that the public volunteer link and the
signed-in page cannot drift apart. A rule added here — the completed-attempt
guard, say — applies to both by construction.

Reset is deliberately not here. It reopens finalised scoring, has its own role
check, and must stay unreachable from a public link.
"""

from datetime import datetime, timezone
from typing import Optional

import falcon
import uuid6

from nightrunner_backend.drivers.store.station_visits import StationVisitsStore
from nightrunner_backend.models.station_visit import StationVisit


async def check_in(
    store: StationVisitsStore,
    event_id: str,
    station_id: str,
    patrol_id: str,
    timestamp: Optional[str] = None,
    entry_mode: str = "live",
):
    """Record a patrol arriving at a station.

    Returns (visit, status). Raises HTTPConflict when the attempt has already
    been scored and closed — reopening that is a station leader's job.
    """
    timestamp = timestamp or datetime.now(timezone.utc).isoformat()

    latest = await store.get_latest_visit(event_id, station_id, patrol_id)
    if latest and latest.status == "completed":
        raise falcon.HTTPConflict(
            title="Station Attempt Completed",
            description=(
                "This patrol has already completed scoring for this station. "
                "A station leader or admin must reopen the station attempt "
                "before re-checking in."
            ),
        )

    existing = await store.get_active_visit(event_id, station_id, patrol_id)
    if existing:
        existing.checked_in_at = timestamp
        existing.status = "checked_in"
        updated = await store.update(existing)
        return updated, falcon.HTTP_200

    visit = StationVisit(
        id=str(uuid6.uuid7()),
        event_id=event_id,
        station_id=station_id,
        patrol_id=patrol_id,
        checked_in_at=timestamp,
        entry_mode=entry_mode,
        status="checked_in",
    )
    created = await store.create(visit)
    return created, falcon.HTTP_201


async def check_out(
    store: StationVisitsStore,
    event_id: str,
    station_id: str,
    patrol_id: str,
    timestamp: Optional[str] = None,
    entry_mode: str = "live",
):
    """Record a patrol leaving a station. Returns (visit, status)."""
    timestamp = timestamp or datetime.now(timezone.utc).isoformat()

    existing = await store.get_active_visit(event_id, station_id, patrol_id)
    if existing:
        existing.checked_out_at = timestamp
        # A completed attempt keeps its status: checking out must not walk back
        # a station that has already been scored.
        if existing.status != "completed":
            existing.status = "checked_out"
        updated = await store.update(existing)
        return updated, falcon.HTTP_200

    visit = StationVisit(
        id=str(uuid6.uuid7()),
        event_id=event_id,
        station_id=station_id,
        patrol_id=patrol_id,
        checked_out_at=timestamp,
        entry_mode=entry_mode,
        status="checked_out",
    )
    created = await store.create(visit)
    return created, falcon.HTTP_201
