import json
from typing import List, Optional
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.station import Station

GET_STATIONS = "SELECT id, event_id, name, description, active_configuration_id, tasks FROM stations"
GET_STATION = "SELECT id, event_id, name, description, active_configuration_id, tasks FROM stations WHERE id = :id"
CREATE_STATION = """
    INSERT INTO stations (id, event_id, name, description, active_configuration_id, tasks)
    VALUES (:id, :event_id, :name, :description, :active_configuration_id, :tasks)
"""
UPDATE_STATION = """
    UPDATE stations
    SET event_id = :event_id, name = :name, description = :description, active_configuration_id = :active_configuration_id, tasks = :tasks
    WHERE id = :id
"""
DELETE_STATION = "DELETE FROM stations WHERE id = :id"


def _row_to_station(row: dict) -> Station:
    tasks = []
    tasks_val = row.get("tasks")
    if tasks_val:
        try:
            parsed = json.loads(tasks_val)
            if isinstance(parsed, list):
                tasks = parsed
        except Exception:
            tasks = []
    return Station(
        id=row["id"],
        event_id=row.get("event_id"),
        name=row.get("name") or "",
        description=row.get("description"),
        active_configuration_id=row.get("active_configuration_id"),
        tasks=tasks,
    )


class StationsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list(self) -> List[Station]:
        rows = await self.driver.execute(GET_STATIONS)
        return [_row_to_station(row) for row in rows]

    async def get(self, station_id: str) -> Optional[Station]:
        row = await self.driver.fetch_one(GET_STATION, {"id": station_id})
        if not row:
            return None
        return _row_to_station(row)

    async def create(self, station: Station) -> None:
        await self.driver.execute(CREATE_STATION, {
            "id": station.id,
            "event_id": station.event_id,
            "name": station.name,
            "description": station.description,
            "active_configuration_id": station.active_configuration_id,
            "tasks": json.dumps(station.tasks) if station.tasks else None,
        })

    async def update(self, station: Station) -> None:
        await self.driver.execute(UPDATE_STATION, {
            "id": station.id,
            "event_id": station.event_id,
            "name": station.name,
            "description": station.description,
            "active_configuration_id": station.active_configuration_id,
            "tasks": json.dumps(station.tasks) if station.tasks else None,
        })

    async def delete(self, station_id: str) -> None:
        await self.driver.execute(DELETE_STATION, {"id": station_id})
