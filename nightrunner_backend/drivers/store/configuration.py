import json
from typing import List, Optional
import uuid6
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.configuration import ConfigurationGroup, Configuration

# SQL statements for ConfigurationGroup
LIST_GROUPS = "SELECT id, name, description FROM configuration_groups"
GET_GROUP = "SELECT id, name, description FROM configuration_groups WHERE id = :id"
CREATE_GROUP = """
    INSERT INTO configuration_groups (id, name, description)
    VALUES (:id, :name, :description)
"""
UPDATE_GROUP = """
    UPDATE configuration_groups
    SET name = :name, description = :description
    WHERE id = :id
"""
DELETE_GROUP = "DELETE FROM configuration_groups WHERE id = :id"

# SQL statements for Configuration
LIST_CONFIGS = "SELECT id, group_id, key, value, description, station_weight FROM configurations"
GET_CONFIG = "SELECT id, group_id, key, value, description, station_weight FROM configurations WHERE id = :id"
CREATE_CONFIG = """
    INSERT INTO configurations (id, group_id, key, value, description, station_weight)
    VALUES (:id, :group_id, :key, :value, :description, :station_weight)
"""
UPDATE_CONFIG = """
    UPDATE configurations
    SET group_id = :group_id, key = :key, value = :value, description = :description, station_weight = :station_weight
    WHERE id = :id
"""
DELETE_CONFIG = "DELETE FROM configurations WHERE id = :id"

# SQL statements for station_tasks
LIST_CONFIG_TASKS = """
    SELECT id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active
    FROM station_tasks
    WHERE configuration_id = :configuration_id
    ORDER BY id
"""
DELETE_CONFIG_TASKS = "DELETE FROM station_tasks WHERE configuration_id = :configuration_id"
INSERT_STATION_TASK = """
    INSERT INTO station_tasks (id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active)
    VALUES (:id, :configuration_id, :station_id, :name, :description, :type, :instructions, :max_score, :time_limit, :score_value, :score_weight, :active)
"""


async def _load_tasks_for_config(driver: DatabaseDriver, config_id: str, fallback_val: str) -> List[dict]:
    rows = await driver.execute(LIST_CONFIG_TASKS, {"configuration_id": config_id})
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
            t = {
                "id": r["id"],
                "name": r.get("name") or r.get("description") or "",
                "description": r.get("description") or r.get("name") or "",
                "type": r.get("type") or "Timed Challenge",
                "instructions": r.get("instructions") or "",
                "maxScore": float(r.get("max_score") if r.get("max_score") is not None else 100),
                "timeLimit": float(r.get("time_limit") if r.get("time_limit") is not None else 0),
                "scoreValue": extra,
                "scoreWeight": float(r.get("score_weight") if r.get("score_weight") is not None else 1.0),
                "active": bool(r.get("active", True))
            }
            tasks.append(t)
        return tasks

    # Fallback to JSON blob if no rows in station_tasks
    tasks = []
    if fallback_val:
        try:
            parsed = json.loads(fallback_val)
            if isinstance(parsed, list):
                tasks = parsed
            elif isinstance(parsed, dict) and "tasks" in parsed:
                tasks = parsed["tasks"]
        except Exception:
            tasks = []
    return tasks


async def _sync_tasks_for_config(driver: DatabaseDriver, config_id: str, tasks: List[dict]) -> None:
    await driver.execute(DELETE_CONFIG_TASKS, {"configuration_id": config_id})
    for t in tasks:
        task_id = t.get("id") or t.get("_id") or str(uuid6.uuid7())
        t["id"] = task_id
        score_val_str = json.dumps(t.get("scoreValue") or {})
        await driver.execute(INSERT_STATION_TASK, {
            "id": task_id,
            "configuration_id": config_id,
            "station_id": None,
            "name": t.get("name") or t.get("description") or "Task",
            "description": t.get("description") or t.get("name") or "",
            "type": t.get("type") or "Timed Challenge",
            "instructions": t.get("instructions") or "",
            "max_score": float(t.get("maxScore") if t.get("maxScore") is not None else 100),
            "time_limit": float(t.get("timeLimit") if t.get("timeLimit") is not None else 0),
            "score_value": score_val_str,
            "score_weight": float(t.get("scoreWeight") if t.get("scoreWeight") is not None else 1.0),
            "active": bool(t.get("active", True))
        })


class ConfigurationStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    # ConfigurationGroup methods
    async def list_groups(self) -> List[ConfigurationGroup]:
        rows = await self.driver.execute(LIST_GROUPS)
        return [ConfigurationGroup(**row) for row in rows]

    async def get_group(self, group_id: str) -> Optional[ConfigurationGroup]:
        row = await self.driver.fetch_one(GET_GROUP, {"id": group_id})
        return ConfigurationGroup(**row) if row else None

    async def create_group(self, group: ConfigurationGroup) -> None:
        await self.driver.execute(CREATE_GROUP, {
            "id": group.id,
            "name": group.name,
            "description": group.description,
        })

    async def update_group(self, group: ConfigurationGroup) -> None:
        await self.driver.execute(UPDATE_GROUP, {
            "id": group.id,
            "name": group.name,
            "description": group.description,
        })

    async def delete_group(self, group_id: str) -> None:
        await self.driver.execute(DELETE_GROUP, {"id": group_id})

    # Configuration methods
    async def list_configurations(self) -> List[Configuration]:
        rows = await self.driver.execute(LIST_CONFIGS)
        result = []
        for row in rows:
            tasks = await _load_tasks_for_config(self.driver, row["id"], row.get("value") or "")
            raw_weight = row.get("station_weight")
            station_weight = float(raw_weight) if raw_weight is not None else 1.0
            cfg = Configuration(
                id=row["id"],
                group_id=row.get("group_id"),
                key=row.get("key") or "",
                value=row.get("value") or "",
                description=row.get("description"),
                tasks=tasks,
                station_weight=station_weight
            )
            result.append(cfg)
        return result

    async def get_configuration(self, config_id: str) -> Optional[Configuration]:
        row = await self.driver.fetch_one(GET_CONFIG, {"id": config_id})
        if not row:
            return None
        tasks = await _load_tasks_for_config(self.driver, row["id"], row.get("value") or "")
        raw_weight = row.get("station_weight")
        station_weight = float(raw_weight) if raw_weight is not None else 1.0
        return Configuration(
            id=row["id"],
            group_id=row.get("group_id"),
            key=row.get("key") or "",
            value=row.get("value") or "",
            description=row.get("description"),
            tasks=tasks,
            station_weight=station_weight
        )

    async def create_configuration(self, config: Configuration) -> None:
        # Guarantee every task has a unique UUIDv7 ID
        if config.tasks and isinstance(config.tasks, list):
            new_tasks = []
            for t in config.tasks:
                if isinstance(t, dict):
                    task_copy = dict(t)
                    task_copy["id"] = str(uuid6.uuid7())
                    new_tasks.append(task_copy)
                else:
                    new_tasks.append(t)
            config.tasks = new_tasks

        val = json.dumps(config.tasks) if config.tasks else config.value
        await self.driver.execute(CREATE_CONFIG, {
            "id": config.id,
            "group_id": config.group_id if config.group_id else None,
            "key": config.key,
            "value": val,
            "description": config.description,
            "station_weight": float(config.station_weight) if config.station_weight is not None else 1.0,
        })
        if config.tasks and isinstance(config.tasks, list):
            await _sync_tasks_for_config(self.driver, config.id, config.tasks)

    async def update_configuration(self, config: Configuration) -> None:
        # Guarantee every task has a unique UUIDv7 ID
        if config.tasks and isinstance(config.tasks, list):
            new_tasks = []
            for t in config.tasks:
                if isinstance(t, dict):
                    task_copy = dict(t)
                    if not task_copy.get("id"):
                        task_copy["id"] = str(uuid6.uuid7())
                    new_tasks.append(task_copy)
                else:
                    new_tasks.append(t)
            config.tasks = new_tasks

        val = json.dumps(config.tasks) if config.tasks else config.value
        await self.driver.execute(UPDATE_CONFIG, {
            "id": config.id,
            "group_id": config.group_id if config.group_id else None,
            "key": config.key,
            "value": val,
            "description": config.description,
            "station_weight": float(config.station_weight) if config.station_weight is not None else 1.0,
        })
        if config.tasks is not None and isinstance(config.tasks, list):
            await _sync_tasks_for_config(self.driver, config.id, config.tasks)

    async def delete_configuration(self, config_id: str) -> None:
        await self.driver.execute(DELETE_CONFIG_TASKS, {"configuration_id": config_id})
        await self.driver.execute(DELETE_CONFIG, {"id": config_id})

