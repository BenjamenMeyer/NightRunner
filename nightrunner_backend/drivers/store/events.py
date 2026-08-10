from typing import List, Optional
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.event import Event

LIST_EVENTS_BATCH = """
SELECT
    e.id, e.name, e.date, e.description, e.rounding_precision,
    GROUP_CONCAT(DISTINCT eo.user_id) AS organizers,
    GROUP_CONCAT(DISTINCT es.station_id) AS stations,
    GROUP_CONCAT(DISTINCT ep.patrol_id) AS patrols
FROM events e
LEFT JOIN event_organizers eo ON e.id = eo.event_id
LEFT JOIN event_stations es ON e.id = es.event_id
LEFT JOIN event_patrols ep ON e.id = ep.event_id
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

# Many-to-Many queries
GET_EVENT_ORGANIZERS = "SELECT user_id FROM event_organizers WHERE event_id = :event_id"
ADD_EVENT_ORGANIZER = "INSERT INTO event_organizers (event_id, user_id) VALUES (:event_id, :user_id)"
DELETE_EVENT_ORGANIZERS = "DELETE FROM event_organizers WHERE event_id = :event_id"

GET_EVENT_STATIONS = "SELECT station_id FROM event_stations WHERE event_id = :event_id"
ADD_EVENT_STATION = "INSERT INTO event_stations (event_id, station_id) VALUES (:event_id, :station_id)"
DELETE_EVENT_STATIONS = "DELETE FROM event_stations WHERE event_id = :event_id"

GET_EVENT_PATROLS = "SELECT patrol_id FROM event_patrols WHERE event_id = :event_id"
ADD_EVENT_PATROL = "INSERT INTO event_patrols (event_id, patrol_id) VALUES (:event_id, :patrol_id)"
DELETE_EVENT_PATROLS = "DELETE FROM event_patrols WHERE event_id = :event_id"


class EventsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list(self) -> List[Event]:
        """Fetch all events with their M2M relations in a single batched query."""
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
        event.stations = [r["station_id"] for r in await self.driver.execute(GET_EVENT_STATIONS, {"event_id": event_id})]
        event.patrols = [r["patrol_id"] for r in await self.driver.execute(GET_EVENT_PATROLS, {"event_id": event_id})]
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
        for station_id in event.stations:
            await self.driver.execute(ADD_EVENT_STATION, {"event_id": event.id, "station_id": station_id})
        for patrol_id in event.patrols:
            await self.driver.execute(ADD_EVENT_PATROL, {"event_id": event.id, "patrol_id": patrol_id})

    async def update(self, event: Event) -> None:
        await self.driver.execute(UPDATE_EVENT, {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "description": event.description,
            "rounding_precision": event.rounding_precision,
        })
        # Sync M2M: delete then re-insert
        await self.driver.execute(DELETE_EVENT_ORGANIZERS, {"event_id": event.id})
        for user_id in event.organizers:
            await self.driver.execute(ADD_EVENT_ORGANIZER, {"event_id": event.id, "user_id": user_id})
        await self.driver.execute(DELETE_EVENT_STATIONS, {"event_id": event.id})
        for station_id in event.stations:
            await self.driver.execute(ADD_EVENT_STATION, {"event_id": event.id, "station_id": station_id})
        await self.driver.execute(DELETE_EVENT_PATROLS, {"event_id": event.id})
        for patrol_id in event.patrols:
            await self.driver.execute(ADD_EVENT_PATROL, {"event_id": event.id, "patrol_id": patrol_id})

    async def delete(self, event_id: str) -> None:
        await self.driver.execute(DELETE_EVENT, {"id": event_id})
