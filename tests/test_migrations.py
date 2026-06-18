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
