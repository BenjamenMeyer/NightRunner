import json
from typing import List, Optional
import uuid6
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.station import Station

GET_STATIONS = "SELECT id, event_id, name, description, active_configuration_id, station_weight, tasks FROM stations"
GET_STATIONS_BY_EVENT = "SELECT id, event_id, name, description, active_configuration_id, station_weight, tasks FROM stations WHERE event_id = :event_id"
GET_STATION = "SELECT id, event_id, name, description, active_configuration_id, station_weight, tasks FROM stations WHERE id = :id"
CREATE_STATION = """
    INSERT INTO stations (id, event_id, name, description, active_configuration_id, station_weight, tasks)
    VALUES (:id, :event_id, :name, :description, :active_configuration_id, :station_weight, :tasks)
"""
UPDATE_STATION = """
    UPDATE stations
    SET event_id = :event_id, name = :name, description = :description, active_configuration_id = :active_configuration_id, station_weight = :station_weight, tasks = :tasks
    WHERE id = :id
"""
DELETE_STATION = "DELETE FROM stations WHERE id = :id"

LIST_STATION_TASKS = """
    SELECT id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active, divide_by_patrol_size
    FROM station_tasks
    WHERE station_id = :station_id
    ORDER BY id
"""
DELETE_STATION_TASKS = "DELETE FROM station_tasks WHERE station_id = :station_id"
INSERT_STATION_TASK = """
    INSERT INTO station_tasks (id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active, divide_by_patrol_size)
    VALUES (:id, :configuration_id, :station_id, :name, :description, :type, :instructions, :max_score, :time_limit, :score_value, :score_weight, :active, :divide_by_patrol_size)
"""


async def _load_tasks_for_station(driver: DatabaseDriver, station_id: str, fallback_tasks_val: Optional[str]) -> List[dict]:
    rows = await driver.execute(LIST_STATION_TASKS, {"station_id": station_id})
    if rows and isinstance(rows, list):
        tasks = []
        for r in rows:
            score_val = r.get("score_value")
            extra = {}
            if score_val:
                try:
                    parsed_sv = json.loads(score_val)
                    if isinstance(parsed_sv, dict):
                        extra = parsed_sv
                except Exception:
                    pass
            notes_val = extra.get("notes") or extra.get("scorer_notes") or ""
            t = {
                "id": r["id"],
                "name": r.get("name") or r.get("description") or "",
                "description": r.get("description") or r.get("name") or "",
                "type": r.get("type") or "Timed Challenge",
                "instructions": r.get("instructions") or "",
                "notes": notes_val,
                "maxScore": float(r.get("max_score") if r.get("max_score") is not None else 100),
                "timeLimit": float(r.get("time_limit") if r.get("time_limit") is not None else 0),
                "scoreValue": extra,
                "scoreWeight": float(r.get("score_weight") if r.get("score_weight") is not None else 1.0),
                "active": bool(r.get("active", True)),
                "divideByPatrolSize": bool(r.get("divide_by_patrol_size") or extra.get("divideByPatrolSize", False))
            }
            tasks.append(t)
        return tasks

    tasks = []
    if fallback_tasks_val:
        try:
            parsed = json.loads(fallback_tasks_val)
            if isinstance(parsed, list):
                tasks = parsed
        except Exception:
            tasks = []
    return tasks


async def _sync_tasks_for_station(driver: DatabaseDriver, station_id: str, tasks: List[dict]) -> None:
    await driver.execute(DELETE_STATION_TASKS, {"station_id": station_id})
    for t in tasks:
        if not isinstance(t, dict):
            continue
        task_id = t.get("id") or t.get("_id") or str(uuid6.uuid7())
        t["id"] = task_id
        score_val_dict = dict(t.get("scoreValue") or {}) if isinstance(t.get("scoreValue"), dict) else {}
        notes_val = t.get("notes") or t.get("scorer_notes")
        if notes_val:
            score_val_dict["notes"] = notes_val
        divide_flag = bool(t.get("divideByPatrolSize") or t.get("divide_by_patrol_size", False))
        score_val_dict["divideByPatrolSize"] = divide_flag
        score_val_str = json.dumps(score_val_dict)
        def _safe_float(val, default):
            if val is None or val == "":
                return float(default)
            try:
                return float(val)
            except (ValueError, TypeError):
                return float(default)

        await driver.execute(INSERT_STATION_TASK, {
            "id": task_id,
            "configuration_id": None,
            "station_id": station_id,
            "name": t.get("name") or t.get("description") or "Task",
            "description": t.get("description") or t.get("name") or "",
            "type": t.get("type") or "Timed Challenge",
            "instructions": t.get("instructions") or "",
            "max_score": _safe_float(t.get("maxScore"), 100),
            "time_limit": _safe_float(t.get("timeLimit"), 0),
            "score_value": score_val_str,
            "score_weight": _safe_float(t.get("scoreWeight"), 1.0),
            "active": bool(t.get("active", True)),
            "divide_by_patrol_size": divide_flag
        })


class StationsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list(self, event_id: Optional[str] = None) -> List[Station]:
        if event_id:
            rows = await self.driver.execute(GET_STATIONS_BY_EVENT, {"event_id": event_id})
        else:
            rows = await self.driver.execute(GET_STATIONS)
        
        result = []
        for row in rows:
            tasks = await _load_tasks_for_station(self.driver, row["id"], row.get("tasks"))
            st = Station(
                id=row["id"],
                event_id=row.get("event_id"),
                name=row.get("name") or "",
                description=row.get("description"),
                active_configuration_id=row.get("active_configuration_id"),
                station_weight=float(row.get("station_weight") if row.get("station_weight") is not None else 1.0),
                tasks=tasks,
            )
            result.append(st)
        return result

    async def get(self, station_id: str) -> Optional[Station]:
        row = await self.driver.fetch_one(GET_STATION, {"id": station_id})
        if not row:
            return None
        tasks = await _load_tasks_for_station(self.driver, row["id"], row.get("tasks"))
        return Station(
            id=row["id"],
            event_id=row.get("event_id"),
            name=row.get("name") or "",
            description=row.get("description"),
            active_configuration_id=row.get("active_configuration_id"),
            station_weight=float(row.get("station_weight") if row.get("station_weight") is not None else 1.0),
            tasks=tasks,
        )

    async def create(self, station: Station) -> None:
        if station.tasks and isinstance(station.tasks, list):
            new_tasks = []
            for t in station.tasks:
                if isinstance(t, dict):
                    task_copy = dict(t)
                    if not task_copy.get("id"):
                        task_copy["id"] = str(uuid6.uuid7())
                    new_tasks.append(task_copy)
                else:
                    new_tasks.append(t)
            station.tasks = new_tasks

        await self.driver.execute(CREATE_STATION, {
            "id": station.id,
            "event_id": station.event_id,
            "name": station.name,
            "description": station.description,
            "active_configuration_id": station.active_configuration_id,
            "station_weight": station.station_weight,
            "tasks": json.dumps(station.tasks) if station.tasks else None,
        })
        if station.tasks and isinstance(station.tasks, list):
            await _sync_tasks_for_station(self.driver, station.id, station.tasks)

    async def update(self, station: Station) -> None:
        if station.tasks and isinstance(station.tasks, list):
            new_tasks = []
            for t in station.tasks:
                if isinstance(t, dict):
                    task_copy = dict(t)
                    if not task_copy.get("id"):
                        task_copy["id"] = str(uuid6.uuid7())
                    new_tasks.append(task_copy)
                else:
                    new_tasks.append(t)
            station.tasks = new_tasks

        await self.driver.execute(UPDATE_STATION, {
            "id": station.id,
            "event_id": station.event_id,
            "name": station.name,
            "description": station.description,
            "active_configuration_id": station.active_configuration_id,
            "station_weight": station.station_weight,
            "tasks": json.dumps(station.tasks) if station.tasks else None,
        })
        if station.tasks is not None and isinstance(station.tasks, list):
            await _sync_tasks_for_station(self.driver, station.id, station.tasks)

    async def delete(self, station_id: str) -> None:
        await self.driver.execute(DELETE_STATION_TASKS, {"station_id": station_id})
        await self.driver.execute(DELETE_STATION, {"id": station_id})

