"""
Migration script to populate station_tasks from legacy JSON blobs in stations and configurations tables.
Supports both SQLite and PostgreSQL backends depending on DATABASE_URL.
"""
import os
import json
import asyncio
import uuid6
from nightrunner_backend.drivers.base import DatabaseDriver


async def migrate():
    db_url = os.getenv("DATABASE_URL", "sqlite:///nightrunner.db")
    print(f"Connecting to database at: {db_url}")
    driver = DatabaseDriver(db_url)
    await driver.run_migrations()

    # 1. Migrate Configuration tasks
    configs = await driver.execute("SELECT id, value FROM configurations")
    migrated_config_tasks = 0
    if configs and isinstance(configs, list):
        for cfg in configs:
            config_id = cfg["id"]
            val = cfg.get("value") or ""
            if not val:
                continue
            try:
                parsed = json.loads(val)
                tasks = []
                if isinstance(parsed, list):
                    tasks = parsed
                elif isinstance(parsed, dict) and "tasks" in parsed:
                    tasks = parsed["tasks"]
                
                for t in tasks:
                    if not isinstance(t, dict):
                        continue
                    task_id = t.get("id") or t.get("_id") or str(uuid6.uuid7())
                    score_val_str = json.dumps(t.get("scoreValue") or {})
                    await driver.execute("""
                        INSERT INTO station_tasks (id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active)
                        VALUES (:id, :configuration_id, NULL, :name, :description, :type, :instructions, :max_score, :time_limit, :score_value, :score_weight, :active)
                        ON CONFLICT(id) DO UPDATE SET
                            name=EXCLUDED.name,
                            description=EXCLUDED.description,
                            type=EXCLUDED.type,
                            instructions=EXCLUDED.instructions,
                            max_score=EXCLUDED.max_score,
                            time_limit=EXCLUDED.time_limit,
                            score_value=EXCLUDED.score_value,
                            score_weight=EXCLUDED.score_weight,
                            active=EXCLUDED.active
                    """, {
                        "id": task_id,
                        "configuration_id": config_id,
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
                    migrated_config_tasks += 1
            except Exception as err:
                print(f"Error parsing tasks for configuration {config_id}: {err}")

    # 2. Migrate Station custom tasks
    stations = await driver.execute("SELECT id, tasks FROM stations")
    migrated_station_tasks = 0
    if stations and isinstance(stations, list):
        for st in stations:
            station_id = st["id"]
            tasks_val = st.get("tasks")
            if not tasks_val:
                continue
            try:
                tasks = json.loads(tasks_val)
                if isinstance(tasks, list):
                    for t in tasks:
                        if not isinstance(t, dict):
                            continue
                        task_id = t.get("id") or t.get("_id") or str(uuid6.uuid7())
                        score_val_str = json.dumps(t.get("scoreValue") or {})
                        await driver.execute("""
                            INSERT INTO station_tasks (id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active)
                            VALUES (:id, NULL, :station_id, :name, :description, :type, :instructions, :max_score, :time_limit, :score_value, :score_weight, :active)
                            ON CONFLICT(id) DO UPDATE SET
                                name=EXCLUDED.name,
                                description=EXCLUDED.description,
                                type=EXCLUDED.type,
                                instructions=EXCLUDED.instructions,
                                max_score=EXCLUDED.max_score,
                                time_limit=EXCLUDED.time_limit,
                                score_value=EXCLUDED.score_value,
                                score_weight=EXCLUDED.score_weight,
                                active=EXCLUDED.active
                        """, {
                            "id": task_id,
                            "station_id": station_id,
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
                        migrated_station_tasks += 1
            except Exception as err:
                print(f"Error parsing tasks for station {station_id}: {err}")

    print(f"Migration completed cleanly! Migrated {migrated_config_tasks} configuration tasks and {migrated_station_tasks} station tasks to station_tasks table.")
    await driver.close()


if __name__ == "__main__":
    asyncio.run(migrate())
