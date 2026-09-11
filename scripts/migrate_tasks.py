"""
Migration script to populate station_tasks from legacy JSON blobs in stations and configurations tables.
Supports both SQLite and PostgreSQL backends depending on DATABASE_URL.
Includes --dry-run / DRY_RUN mode to preview migrations without writing database changes.
"""
import argparse
import asyncio
import json
import os
import sys
import uuid6
from nightrunner_backend.drivers.base import DatabaseDriver


async def migrate(dry_run: bool = False):
    db_url = os.getenv("DATABASE_URL", "sqlite:///nightrunner.db")
    mode_str = "[DRY-RUN] " if dry_run else ""
    print(f"{mode_str}Connecting to database at: {db_url}")

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
                    params = {
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
                    }
                    if dry_run:
                        print(f"[DRY-RUN] Would insert/update task '{params['name']}' (ID: {task_id}) for configuration {config_id}")
                    else:
                        await driver.execute("""
                            INSERT INTO station_tasks (id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active)
                            VALUES (:id, :configuration_id, NULL, :name, :description, :type, :instructions, :max_score, :time_limit, :score_value, :score_weight, :active)
                            ON CONFLICT(id) DO UPDATE SET
                                configuration_id=EXCLUDED.configuration_id,
                                name=EXCLUDED.name,
                                description=EXCLUDED.description,
                                type=EXCLUDED.type,
                                instructions=EXCLUDED.instructions,
                                max_score=EXCLUDED.max_score,
                                time_limit=EXCLUDED.time_limit,
                                score_value=EXCLUDED.score_value,
                                score_weight=EXCLUDED.score_weight,
                                active=EXCLUDED.active
                        """, params)
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
                        params = {
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
                        }
                        if dry_run:
                            print(f"[DRY-RUN] Would insert/update task '{params['name']}' (ID: {task_id}) for station {station_id}")
                        else:
                            await driver.execute("""
                                INSERT INTO station_tasks (id, configuration_id, station_id, name, description, type, instructions, max_score, time_limit, score_value, score_weight, active)
                                VALUES (:id, NULL, :station_id, :name, :description, :type, :instructions, :max_score, :time_limit, :score_value, :score_weight, :active)
                                ON CONFLICT(id) DO UPDATE SET
                                    station_id=EXCLUDED.station_id,
                                    name=EXCLUDED.name,
                                    description=EXCLUDED.description,
                                    type=EXCLUDED.type,
                                    instructions=EXCLUDED.instructions,
                                    max_score=EXCLUDED.max_score,
                                    time_limit=EXCLUDED.time_limit,
                                    score_value=EXCLUDED.score_value,
                                    score_weight=EXCLUDED.score_weight,
                                    active=EXCLUDED.active
                            """, params)
                        migrated_station_tasks += 1
            except Exception as err:
                print(f"Error parsing tasks for station {station_id}: {err}")

    if dry_run:
        print(f"[DRY-RUN] Completed simulation! Found {migrated_config_tasks} configuration tasks and {migrated_station_tasks} station tasks that would be migrated.")
    else:
        print(f"Migration completed cleanly! Migrated {migrated_config_tasks} configuration tasks and {migrated_station_tasks} station tasks to station_tasks table.")

    await driver.close()


def main():
    env_dry_run = os.getenv("DRY_RUN", "").lower() in ("true", "1", "yes")
    parser = argparse.ArgumentParser(description="Migrate legacy task JSON blobs to station_tasks table.")
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        default=env_dry_run,
        help="Simulate migration without modifying database (or set DRY_RUN=true)"
    )
    args = parser.parse_args()
    asyncio.run(migrate(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
