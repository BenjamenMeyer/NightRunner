import pytest
import os
from nightrunner_backend.drivers.base import DatabaseDriver

@pytest.fixture
async def db():
    db_path = "test_db.db"
    if os.path.exists(db_path):
        os.remove(db_path)
    driver = DatabaseDriver(f"sqlite:///{db_path}")
    yield driver
    await driver.close()
    if os.path.exists(db_path):
        os.remove(db_path)

@pytest.mark.asyncio
async def test_execute_and_fetch(db):
    # Create table
    await db.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
    
    # Insert
    count = await db.execute("INSERT INTO test (name) VALUES (:name)", {"name": "test1"})
    assert count == 1
    
    # Fetch all
    rows = await db.execute("SELECT * FROM test")
    assert len(rows) == 1
    assert rows[0]["name"] == "test1"
    
    # Fetch one
    row = await db.fetch_one("SELECT * FROM test WHERE name = :name", {"name": "test1"})
    assert row is not None
    assert row["name"] == "test1"

@pytest.mark.asyncio
async def test_map_sql(db):
    # Test internal mapping logic (though it's tested implicitly above)
    driver = DatabaseDriver("postgresql://user:pass@localhost/db")
    sql = "SELECT * FROM users WHERE id = :id"
    mapped = driver._map_sql(sql)
    assert mapped == "SELECT * FROM users WHERE id = %(id)s"
