from typing import Any, Dict, List, Optional

import uuid6

from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.roster import Arrival, EventAttendee, Troop

LIST_TROOPS = "SELECT * FROM troops ORDER BY number ASC"
GET_TROOP = "SELECT * FROM troops WHERE id = :id"
GET_TROOP_BY_NUMBER = "SELECT * FROM troops WHERE number = :number"
CREATE_TROOP = "INSERT INTO troops (id, number, name) VALUES (:id, :number, :name)"

ATTENDEE_COLUMNS = """
    id, event_id, troop_id, first_name, last_name, category, source_category,
    phone, emergency_contact_1, emergency_contact_2, source_key, key_ordinal,
    created_at, updated_at
"""

LIST_ATTENDEES_FOR_EVENT = f"""
    SELECT {ATTENDEE_COLUMNS} FROM event_attendees
    WHERE event_id = :event_id
    ORDER BY last_name ASC, first_name ASC
"""

LIST_ATTENDEES_FOR_TROOP = f"""
    SELECT {ATTENDEE_COLUMNS} FROM event_attendees
    WHERE event_id = :event_id AND troop_id = :troop_id
    ORDER BY last_name ASC, first_name ASC
"""

GET_ATTENDEE = f"SELECT {ATTENDEE_COLUMNS} FROM event_attendees WHERE id = :id"

GET_ATTENDEE_BY_KEY = f"""
    SELECT {ATTENDEE_COLUMNS} FROM event_attendees
    WHERE event_id = :event_id AND source_key = :source_key AND key_ordinal = :key_ordinal
"""

COUNT_ATTENDEES_BY_KEY = """
    SELECT COUNT(*) AS total FROM event_attendees
    WHERE event_id = :event_id AND source_key = :source_key
"""

LIST_ORDINALS_BY_KEY = """
    SELECT key_ordinal FROM event_attendees
    WHERE event_id = :event_id AND source_key = :source_key
    ORDER BY key_ordinal ASC
"""

CREATE_ATTENDEE = """
    INSERT INTO event_attendees (
        id, event_id, troop_id, first_name, last_name, category, source_category,
        phone, emergency_contact_1, emergency_contact_2, source_key, key_ordinal,
        created_at, updated_at
    ) VALUES (
        :id, :event_id, :troop_id, :first_name, :last_name, :category, :source_category,
        :phone, :emergency_contact_1, :emergency_contact_2, :source_key, :key_ordinal,
        :created_at, :updated_at
    )
"""

UPDATE_ATTENDEE = """
    UPDATE event_attendees
    SET troop_id = :troop_id,
        first_name = :first_name,
        last_name = :last_name,
        category = :category,
        source_category = :source_category,
        phone = :phone,
        emergency_contact_1 = :emergency_contact_1,
        emergency_contact_2 = :emergency_contact_2,
        updated_at = :updated_at
    WHERE id = :id
"""

DELETE_ATTENDEE = "DELETE FROM event_attendees WHERE id = :id"

LIST_ARRIVALS_FOR_EVENT = "SELECT * FROM arrivals WHERE event_id = :event_id"
GET_ARRIVAL_FOR_ATTENDEE = "SELECT * FROM arrivals WHERE attendee_id = :attendee_id"
CREATE_ARRIVAL = """
    INSERT INTO arrivals (id, event_id, attendee_id, arrived_at, recorded_by)
    VALUES (:id, :event_id, :attendee_id, :arrived_at, :recorded_by)
"""
UPDATE_ARRIVAL = """
    UPDATE arrivals SET arrived_at = :arrived_at, recorded_by = :recorded_by
    WHERE attendee_id = :attendee_id
"""
DELETE_ARRIVAL = "DELETE FROM arrivals WHERE attendee_id = :attendee_id"


class RosterStore:
    """
    Storage for troops, per-event attendees, and gate arrivals.
    """

    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    #
    # Troops
    #

    def _row_to_troop(self, row: Dict[str, Any]) -> Troop:
        return Troop(id=row["id"], number=row["number"], name=row.get("name"))

    async def list_troops(self) -> List[Troop]:
        rows = await self.driver.execute(LIST_TROOPS)
        return [self._row_to_troop(row) for row in rows or []]

    async def get_troop(self, troop_id: str) -> Optional[Troop]:
        row = await self.driver.fetch_one(GET_TROOP, {"id": troop_id})
        return self._row_to_troop(row) if row else None

    async def get_troop_by_number(self, number: str) -> Optional[Troop]:
        row = await self.driver.fetch_one(GET_TROOP_BY_NUMBER, {"number": number})
        return self._row_to_troop(row) if row else None

    async def ensure_troop(self, number: str, name: Optional[str] = None) -> Troop:
        """
        Returns the troop with this number, creating it if it does not exist.
        """
        existing = await self.get_troop_by_number(number)
        if existing:
            return existing

        troop = Troop(id=str(uuid6.uuid7()), number=number, name=name or number)
        await self.driver.execute(CREATE_TROOP, {
            "id": troop.id,
            "number": troop.number,
            "name": troop.name,
        })
        return troop

    #
    # Attendees
    #

    def _row_to_attendee(self, row: Dict[str, Any]) -> EventAttendee:
        return EventAttendee(
            id=row["id"],
            event_id=row["event_id"],
            troop_id=row.get("troop_id"),
            first_name=row.get("first_name") or "",
            last_name=row.get("last_name") or "",
            category=row.get("category") or "Youth",
            source_category=row.get("source_category"),
            phone=row.get("phone"),
            emergency_contact_1=row.get("emergency_contact_1"),
            emergency_contact_2=row.get("emergency_contact_2"),
            source_key=row.get("source_key") or "",
            key_ordinal=int(row.get("key_ordinal") or 1),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )

    async def list_attendees(self, event_id: str) -> List[EventAttendee]:
        rows = await self.driver.execute(LIST_ATTENDEES_FOR_EVENT, {"event_id": event_id})
        return [self._row_to_attendee(row) for row in rows or []]

    async def list_attendees_for_troop(self, event_id: str, troop_id: str) -> List[EventAttendee]:
        rows = await self.driver.execute(
            LIST_ATTENDEES_FOR_TROOP,
            {"event_id": event_id, "troop_id": troop_id},
        )
        return [self._row_to_attendee(row) for row in rows or []]

    async def get_attendee(self, attendee_id: str) -> Optional[EventAttendee]:
        row = await self.driver.fetch_one(GET_ATTENDEE, {"id": attendee_id})
        return self._row_to_attendee(row) if row else None

    async def find_by_key(
        self, event_id: str, source_key: str, key_ordinal: int = 1
    ) -> Optional[EventAttendee]:
        row = await self.driver.fetch_one(GET_ATTENDEE_BY_KEY, {
            "event_id": event_id,
            "source_key": source_key,
            "key_ordinal": key_ordinal,
        })
        return self._row_to_attendee(row) if row else None

    async def count_by_key(self, event_id: str, source_key: str) -> int:
        row = await self.driver.fetch_one(COUNT_ATTENDEES_BY_KEY, {
            "event_id": event_id,
            "source_key": source_key,
        })
        if not row:
            return 0
        return int(row.get("total") or 0)

    async def next_free_ordinal(self, event_id: str, source_key: str) -> int:
        """
        The lowest ordinal not already used for this match key.

        Ordinals exist to separate two real people who share a name, so they
        should be contiguous: 1, then 2. Trusting a caller-supplied ordinal
        lets a record land at 3 with nothing at 1 or 2 — which happens when an
        operator approves only some of a set of duplicate sheet rows. Harmless,
        but it makes "person 3 of 3" show against somebody who is the only one.
        """
        rows = await self.driver.execute(LIST_ORDINALS_BY_KEY, {
            "event_id": event_id,
            "source_key": source_key,
        })
        taken = {int(row["key_ordinal"]) for row in rows or []}

        candidate = 1
        while candidate in taken:
            candidate += 1
        return candidate

    async def create_attendee(self, attendee: EventAttendee) -> EventAttendee:
        await self.driver.execute(CREATE_ATTENDEE, {
            "id": attendee.id,
            "event_id": attendee.event_id,
            "troop_id": attendee.troop_id,
            "first_name": attendee.first_name,
            "last_name": attendee.last_name,
            "category": attendee.category,
            "source_category": attendee.source_category,
            "phone": attendee.phone,
            "emergency_contact_1": attendee.emergency_contact_1,
            "emergency_contact_2": attendee.emergency_contact_2,
            "source_key": attendee.source_key,
            "key_ordinal": attendee.key_ordinal,
            "created_at": attendee.created_at,
            "updated_at": attendee.updated_at,
        })
        return attendee

    async def update_attendee(self, attendee: EventAttendee) -> EventAttendee:
        await self.driver.execute(UPDATE_ATTENDEE, {
            "id": attendee.id,
            "troop_id": attendee.troop_id,
            "first_name": attendee.first_name,
            "last_name": attendee.last_name,
            "category": attendee.category,
            "source_category": attendee.source_category,
            "phone": attendee.phone,
            "emergency_contact_1": attendee.emergency_contact_1,
            "emergency_contact_2": attendee.emergency_contact_2,
            "updated_at": attendee.updated_at,
        })
        return attendee

    async def delete_attendee(self, attendee_id: str) -> None:
        await self.driver.execute(DELETE_ATTENDEE, {"id": attendee_id})

    #
    # Arrivals
    #

    def _row_to_arrival(self, row: Dict[str, Any]) -> Arrival:
        return Arrival(
            id=row["id"],
            event_id=row["event_id"],
            attendee_id=row["attendee_id"],
            arrived_at=row["arrived_at"],
            recorded_by=row.get("recorded_by"),
        )

    async def list_arrivals(self, event_id: str) -> List[Arrival]:
        rows = await self.driver.execute(LIST_ARRIVALS_FOR_EVENT, {"event_id": event_id})
        return [self._row_to_arrival(row) for row in rows or []]

    async def get_arrival(self, attendee_id: str) -> Optional[Arrival]:
        row = await self.driver.fetch_one(GET_ARRIVAL_FOR_ATTENDEE, {"attendee_id": attendee_id})
        return self._row_to_arrival(row) if row else None

    async def record_arrival(
        self,
        event_id: str,
        attendee_id: str,
        arrived_at: str,
        recorded_by: Optional[str] = None,
    ) -> Arrival:
        """
        Records an arrival. Checking somebody in who is already checked in
        updates the existing row rather than failing or duplicating.
        """
        existing = await self.get_arrival(attendee_id)
        if existing:
            existing.arrived_at = arrived_at
            existing.recorded_by = recorded_by
            await self.driver.execute(UPDATE_ARRIVAL, {
                "attendee_id": attendee_id,
                "arrived_at": arrived_at,
                "recorded_by": recorded_by,
            })
            return existing

        arrival = Arrival(
            id=str(uuid6.uuid7()),
            event_id=event_id,
            attendee_id=attendee_id,
            arrived_at=arrived_at,
            recorded_by=recorded_by,
        )
        await self.driver.execute(CREATE_ARRIVAL, {
            "id": arrival.id,
            "event_id": arrival.event_id,
            "attendee_id": arrival.attendee_id,
            "arrived_at": arrival.arrived_at,
            "recorded_by": arrival.recorded_by,
        })
        return arrival

    async def clear_arrival(self, attendee_id: str) -> None:
        await self.driver.execute(DELETE_ARRIVAL, {"attendee_id": attendee_id})
