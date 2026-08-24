from typing import List, Optional
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.event import Event

LIST_EVENTS_BATCH = """
SELECT
    e.id, e.name, e.date, e.description, e.rounding_precision,
    GROUP_CONCAT(DISTINCT eo.user_id) AS organizers,
    GROUP_CONCAT(DISTINCT s.id) AS stations,
    GROUP_CONCAT(DISTINCT p.id) AS patrols
FROM events e
LEFT JOIN event_organizers eo ON e.id = eo.event_id
LEFT JOIN stations s ON e.id = s.event_id
LEFT JOIN patrols p ON e.id = p.event_id
GROUP BY e.id, e.name, e.date, e.description, e.rounding_precision
"""
GET_EVENT = "SELECT id, name, date, description, rounding_precision FROM events WHERE id = :id"
CREATE_EVENT = """
    INSERT INTO events (id, name, date, description, rounding_precision)
    VALUES (:id, :name, :date, :description, :rounding_precision)
"""
UPDATE_EVENT = """
    UPDATE events
    SET name = :name, date = :date, description = :description, rounding_precision = :rounding_precision
    WHERE id = :id
"""
DELETE_EVENT = "DELETE FROM events WHERE id = :id"

# Many-to-Many queries (only organizers remain M2M)
GET_EVENT_ORGANIZERS = "SELECT user_id FROM event_organizers WHERE event_id = :event_id"
ADD_EVENT_ORGANIZER = "INSERT INTO event_organizers (event_id, user_id) VALUES (:event_id, :user_id)"
DELETE_EVENT_ORGANIZERS = "DELETE FROM event_organizers WHERE event_id = :event_id"

GET_EVENT_STATIONS = "SELECT id FROM stations WHERE event_id = :event_id"
GET_EVENT_PATROLS = "SELECT id FROM patrols WHERE event_id = :event_id"


class EventsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list(self) -> List[Event]:
        """Fetch all events with their relations in a single batched query."""
        rows = await self.driver.execute(LIST_EVENTS_BATCH)
        events = []
        for row in rows:
            event = Event(
                id=row["id"],
                name=row["name"],
                date=row["date"],
                description=row["description"],
                rounding_precision=row["rounding_precision"],
            )
            # GROUP_CONCAT returns a comma-separated string or None when no rows match
            event.organizers = [x for x in (row.get("organizers") or "").split(",") if x]
            event.stations = [x for x in (row.get("stations") or "").split(",") if x]
            event.patrols = [x for x in (row.get("patrols") or "").split(",") if x]
            events.append(event)
        return events

    async def get(self, event_id: str) -> Optional[Event]:
        row = await self.driver.fetch_one(GET_EVENT, {"id": event_id})
        if not row:
            return None
        event = Event(**row)
        event.organizers = [r["user_id"] for r in await self.driver.execute(GET_EVENT_ORGANIZERS, {"event_id": event_id})]
        event.stations = [r["id"] for r in await self.driver.execute(GET_EVENT_STATIONS, {"event_id": event_id})]
        event.patrols = [r["id"] for r in await self.driver.execute(GET_EVENT_PATROLS, {"event_id": event_id})]
        return event

    async def create(self, event: Event) -> None:
        await self.driver.execute(CREATE_EVENT, {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "description": event.description,
            "rounding_precision": event.rounding_precision,
        })
        for user_id in event.organizers:
            await self.driver.execute(ADD_EVENT_ORGANIZER, {"event_id": event.id, "user_id": user_id})

    async def update(self, event: Event) -> None:
        await self.driver.execute(UPDATE_EVENT, {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "description": event.description,
            "rounding_precision": event.rounding_precision,
        })
        # Sync organizers: delete then re-insert
        await self.driver.execute(DELETE_EVENT_ORGANIZERS, {"event_id": event.id})
        for user_id in event.organizers:
            await self.driver.execute(ADD_EVENT_ORGANIZER, {"event_id": event.id, "user_id": user_id})

    async def delete(self, event_id: str) -> None:
        await self.driver.execute(DELETE_EVENT, {"id": event_id})
