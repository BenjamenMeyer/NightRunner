from datetime import datetime, timezone
from typing import Any, Dict, List

import falcon
import uuid6

from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.patrols import PatrolsStore
from nightrunner_backend.drivers.store.roster import RosterStore
from nightrunner_backend.models.roster import (
    CATEGORIES,
    EventAttendee,
    build_source_key,
    normalise_category,
    normalise_troop_number,
)
from nightrunner_backend.services import roster_import


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_object(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")
    return payload


async def _troop_number_map(store: RosterStore) -> Dict[str, str]:
    troops = await store.list_troops()
    return {troop.id: troop.number for troop in troops}


class TroopsResource:
    """GET /v1/troops — list known troops."""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = RosterStore(get_driver())
        troops = await store.list_troops()
        resp.media = {"troops": [t.to_api_dict() for t in troops]}
        resp.status = falcon.HTTP_200

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        payload = _require_object(await req.get_media())
        number = normalise_troop_number(payload.get("number"))
        if not number:
            raise falcon.HTTPBadRequest(
                description="A troop number in the form AB-0123 is required."
            )

        store = RosterStore(get_driver())
        troop = await store.ensure_troop(number, payload.get("name"))
        resp.media = troop.to_api_dict()
        resp.status = falcon.HTTP_201


class EventAttendeesResource:
    """
    GET  /v1/events/{event_id}/attendees — roster for an event.
    POST /v1/events/{event_id}/attendees — add one attendee by hand.

    Query parameters:
      troopId   restrict to one troop
      category  restrict to one category (exact match)
      q         name search across the whole event
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        store = RosterStore(get_driver())

        troop_id = req.get_param("troopId")
        if troop_id:
            attendees = await store.list_attendees_for_troop(event_id, troop_id)
        else:
            attendees = await store.list_attendees(event_id)

        category = req.get_param("category")
        if category:
            # Exact comparison: 'Non-participant Youth' contains 'Youth' but is
            # not eligible for a patrol.
            attendees = [a for a in attendees if a.category == category]

        query = (req.get_param("q") or "").strip().lower()
        if query:
            attendees = [
                a for a in attendees
                if query in a.first_name.lower()
                or query in a.last_name.lower()
                or query in a.full_name.lower()
            ]

        arrivals = {a.attendee_id: a for a in await store.list_arrivals(event_id)}
        troop_numbers = await _troop_number_map(store)

        # Which patrol each person is already on, so the picker can stop the
        # same child being placed in two patrols.
        assignments = await PatrolsStore(get_driver()).attendee_assignments(event_id)

        resp.media = {
            "eventId": event_id,
            "attendees": [
                {
                    **a.to_api_dict(),
                    "troopNumber": troop_numbers.get(a.troop_id or "", None),
                    "arrival": arrivals[a.id].to_api_dict() if a.id in arrivals else None,
                    "assignment": assignments.get(a.id),
                }
                for a in attendees
            ],
        }
        resp.status = falcon.HTTP_200

    async def on_post(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        payload = _require_object(await req.get_media())

        first_name = (payload.get("firstName") or "").strip()
        last_name = (payload.get("lastName") or "").strip()
        if not first_name or not last_name:
            raise falcon.HTTPBadRequest(description="'firstName' and 'lastName' are required.")

        number = normalise_troop_number(payload.get("troopNumber") or payload.get("troopName"))
        if not number:
            raise falcon.HTTPBadRequest(
                description="A troop number in the form AB-0123 is required."
            )

        category = normalise_category(payload.get("category")) or "Youth"
        if category not in CATEGORIES:
            raise falcon.HTTPBadRequest(description=f"Unknown category '{category}'.")

        store = RosterStore(get_driver())
        troop = await store.ensure_troop(number)
        source_key = build_source_key(number, last_name, first_name)

        # A manually added person may share a name with somebody already on the
        # roster; give them the next ordinal rather than colliding.
        ordinal = await store.count_by_key(event_id, source_key) + 1

        attendee = EventAttendee(
            id=str(uuid6.uuid7()),
            event_id=event_id,
            troop_id=troop.id,
            first_name=first_name,
            last_name=last_name,
            category=category,
            source_category=payload.get("category"),
            phone=payload.get("phone"),
            emergency_contact_1=payload.get("emergencyContact1"),
            emergency_contact_2=payload.get("emergencyContact2"),
            source_key=source_key,
            key_ordinal=ordinal,
            created_at=_now(),
            updated_at=_now(),
        )
        await store.create_attendee(attendee)
        resp.media = attendee.to_api_dict()
        resp.status = falcon.HTTP_201


class EventAttendeeResource:
    """DELETE /v1/events/{event_id}/attendees/{attendee_id}"""

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, event_id: str, attendee_id: str):
        store = RosterStore(get_driver())
        attendee = await store.get_attendee(attendee_id)
        if not attendee or attendee.event_id != event_id:
            raise falcon.HTTPNotFound(description="Attendee not found for this event.")
        await store.delete_attendee(attendee_id)
        resp.status = falcon.HTTP_204


class RosterImportPreviewResource:
    """
    POST /v1/events/{event_id}/roster/preview

    Takes parsed sheet rows and returns a plan. Writes nothing.
    """

    async def on_post(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        payload = _require_object(await req.get_media())
        rows = payload.get("rows")
        if not isinstance(rows, list):
            raise falcon.HTTPBadRequest(description="'rows' must be a list.")

        store = RosterStore(get_driver())
        existing = await store.list_attendees(event_id)
        troop_numbers = await _troop_number_map(store)

        plan = roster_import.build_plan(rows, existing, troop_numbers)
        resp.media = {"eventId": event_id, **plan}
        resp.status = falcon.HTTP_200


class RosterImportApplyResource:
    """
    POST /v1/events/{event_id}/roster/apply

    Applies operator-approved rows. Each row carries the bucket decision made in
    the preview, so ambiguous cases are resolved by a human before anything is
    written. Idempotent: re-applying the same rows updates rather than
    duplicates.
    """

    async def on_post(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        payload = _require_object(await req.get_media())
        rows = payload.get("rows")
        if not isinstance(rows, list):
            raise falcon.HTTPBadRequest(description="'rows' must be a list.")

        store = RosterStore(get_driver())
        created = 0
        updated = 0
        skipped: List[Dict[str, Any]] = []

        for raw in rows:
            parsed = roster_import.parse_row(raw)
            if parsed["error"]:
                skipped.append({"row": raw, "reason": parsed["error"]})
                continue

            troop = await store.ensure_troop(parsed["troopNumber"], parsed["troopNameRaw"])
            source_key = parsed["sourceKey"]
            ordinal = int(raw.get("keyOrdinal") or raw.get("suggestedKeyOrdinal") or 1)

            existing = await store.find_by_key(event_id, source_key, ordinal)
            if existing:
                existing.troop_id = troop.id
                existing.first_name = parsed["firstName"]
                existing.last_name = parsed["lastName"]
                existing.category = parsed["category"]
                existing.source_category = parsed["sourceCategory"]
                existing.phone = parsed["phone"]
                existing.emergency_contact_1 = parsed["emergencyContact1"]
                existing.emergency_contact_2 = parsed["emergencyContact2"]
                existing.updated_at = _now()
                await store.update_attendee(existing)
                updated += 1
                continue

            # An explicit rename decision carries the id of the person to rename.
            rename_id = raw.get("renameAttendeeId")
            if rename_id:
                attendee = await store.get_attendee(rename_id)
                if attendee and attendee.event_id == event_id:
                    attendee.troop_id = troop.id
                    attendee.first_name = parsed["firstName"]
                    attendee.last_name = parsed["lastName"]
                    attendee.category = parsed["category"]
                    attendee.source_category = parsed["sourceCategory"]
                    attendee.phone = parsed["phone"]
                    attendee.emergency_contact_1 = parsed["emergencyContact1"]
                    attendee.emergency_contact_2 = parsed["emergencyContact2"]
                    attendee.source_key = source_key
                    attendee.updated_at = _now()
                    await store.update_attendee(attendee)
                    updated += 1
                    continue

            attendee = EventAttendee(
                id=str(uuid6.uuid7()),
                event_id=event_id,
                troop_id=troop.id,
                first_name=parsed["firstName"],
                last_name=parsed["lastName"],
                category=parsed["category"],
                source_category=parsed["sourceCategory"],
                phone=parsed["phone"],
                emergency_contact_1=parsed["emergencyContact1"],
                emergency_contact_2=parsed["emergencyContact2"],
                source_key=source_key,
                key_ordinal=ordinal,
                created_at=_now(),
                updated_at=_now(),
            )
            await store.create_attendee(attendee)
            created += 1

        resp.media = {
            "eventId": event_id,
            "created": created,
            "updated": updated,
            "skipped": skipped,
        }
        resp.status = falcon.HTTP_200


class ArrivalsResource:
    """
    GET  /v1/events/{event_id}/arrivals — per-troop arrival summary.
    POST /v1/events/{event_id}/arrivals — record an arrival.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        store = RosterStore(get_driver())
        attendees = await store.list_attendees(event_id)
        arrivals = {a.attendee_id: a for a in await store.list_arrivals(event_id)}
        troop_numbers = await _troop_number_map(store)

        by_troop: Dict[str, Dict[str, Any]] = {}
        for attendee in attendees:
            troop_id = attendee.troop_id or ""
            bucket = by_troop.setdefault(troop_id, {
                "troopId": troop_id,
                "troopNumber": troop_numbers.get(troop_id, ""),
                "expected": 0,
                "arrived": 0,
                "attendees": [],
            })
            bucket["expected"] += 1
            arrival = arrivals.get(attendee.id)
            if arrival:
                bucket["arrived"] += 1
            bucket["attendees"].append({
                **attendee.to_api_dict(),
                "arrival": arrival.to_api_dict() if arrival else None,
            })

        troops = sorted(by_troop.values(), key=lambda t: t["troopNumber"])
        for troop in troops:
            troop["missing"] = troop["expected"] - troop["arrived"]

        resp.media = {
            "eventId": event_id,
            "expected": len(attendees),
            "arrived": len(arrivals),
            "missing": len(attendees) - len(arrivals),
            "troops": troops,
        }
        resp.status = falcon.HTTP_200

    async def on_post(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        payload = _require_object(await req.get_media())
        attendee_id = payload.get("attendeeId")
        if not attendee_id:
            raise falcon.HTTPBadRequest(description="'attendeeId' is required.")

        store = RosterStore(get_driver())
        attendee = await store.get_attendee(attendee_id)
        if not attendee or attendee.event_id != event_id:
            raise falcon.HTTPNotFound(description="Attendee not found for this event.")

        # Defaults to now. A supplied arrivedAt is how a paper sheet gets
        # back-filled after a network outage without stamping everyone with the
        # time somebody typed them in.
        arrived_at = payload.get("arrivedAt") or _now()
        recorded_by = getattr(req.context, "user", None)
        recorded_by_id = recorded_by.get("id") if isinstance(recorded_by, dict) else None

        arrival = await store.record_arrival(
            event_id=event_id,
            attendee_id=attendee_id,
            arrived_at=arrived_at,
            recorded_by=recorded_by_id,
        )
        resp.media = arrival.to_api_dict()
        resp.status = falcon.HTTP_200


class ArrivalResource:
    """DELETE /v1/events/{event_id}/arrivals/{attendee_id} — undo a mis-tap."""

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, event_id: str, attendee_id: str):
        store = RosterStore(get_driver())
        attendee = await store.get_attendee(attendee_id)
        if not attendee or attendee.event_id != event_id:
            raise falcon.HTTPNotFound(description="Attendee not found for this event.")
        await store.clear_arrival(attendee_id)
        resp.status = falcon.HTTP_204
