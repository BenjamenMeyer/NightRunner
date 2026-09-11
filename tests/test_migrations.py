import pytest
import os
import aiosqlite
from nightrunner_backend.drivers.base import DatabaseDriver

@pytest.fixture
async def db():
    db_path = "test_migrations.db"
    if os.path.exists(db_path):
        os.remove(db_path)
    driver = DatabaseDriver(f"sqlite:///{db_path}")
    yield driver
    if os.path.exists(db_path):
        os.remove(db_path)

@pytest.mark.asyncio
async def test_run_migrations(db):
    # This should fail because run_migrations is not implemented
    await db.run_migrations()
    
    # Check if _migrations table exists and has entries
    res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
    assert len(res) > 0
    
    # Check if users table exists (from 001_initial.sql)
    res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    assert len(res) > 0

    # Check if user_roles table exists (from 002_user_roles.sql)
    res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_roles'")
    assert len(res) > 0

@pytest.mark.asyncio
async def test_migrate_tasks_dry_run(monkeypatch, tmp_path):
    from scripts.migrate_tasks import migrate
    db_file = tmp_path / "dry_run_test.db"
    db_url = f"sqlite:///{db_file}"
    monkeypatch.setenv("DATABASE_URL", db_url)

    driver = DatabaseDriver(db_url)
    await driver.run_migrations()
    await driver.execute("INSERT INTO configurations (id, key, value) VALUES ('cfg-1', 'test_key', '{\"tasks\": [{\"id\": \"t-1\", \"name\": \"Knot Tying\"}]}')")

    # Run in dry-run mode
    await migrate(dry_run=True)

    # Verify no tasks were written to station_tasks table
    rows = await driver.execute("SELECT * FROM station_tasks")
    assert len(rows) == 0
    await driver.close()

@pytest.mark.asyncio
async def test_migrate_tasks_upsert(monkeypatch, tmp_path):
    from scripts.migrate_tasks import migrate
    db_file = tmp_path / "upsert_test.db"
    db_url = f"sqlite:///{db_file}"
    monkeypatch.setenv("DATABASE_URL", db_url)

    driver = DatabaseDriver(db_url)
    await driver.run_migrations()
    await driver.execute("INSERT INTO configurations (id, key, value) VALUES ('cfg-1', 'key-1', '{\"tasks\": [{\"id\": \"t-1\", \"name\": \"Initial Task\", \"maxScore\": 50}]}')")

    # Initial migration run
    await migrate(dry_run=False)
    rows = await driver.execute("SELECT name, max_score FROM station_tasks WHERE id = 't-1'")
    assert len(rows) == 1
    assert rows[0]["name"] == "Initial Task"
    assert rows[0]["max_score"] == 50.0

    # Update configuration JSON blob with modified task name and score
    await driver.execute("UPDATE configurations SET value = '{\"tasks\": [{\"id\": \"t-1\", \"name\": \"Updated Task\", \"maxScore\": 100}]}' WHERE id = 'cfg-1'")

    # Second migration run (upsert)
    await migrate(dry_run=False)
    updated_rows = await driver.execute("SELECT name, max_score FROM station_tasks WHERE id = 't-1'")
    assert len(updated_rows) == 1
    assert updated_rows[0]["name"] == "Updated Task"
    assert updated_rows[0]["max_score"] == 100.0
    await driver.close()



