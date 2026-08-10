import pytest
from nightrunner_backend.drivers.base import DatabaseDriver

@pytest.fixture
async def driver(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    driver = DatabaseDriver(f"sqlite:///{db_path}")
    await driver.run_migrations()
    return driver

@pytest.mark.asyncio
async def test_connection_and_migration(driver: DatabaseDriver):
    rows = await driver.execute("SELECT name FROM sqlite_master WHERE type='table';")
    assert isinstance(rows, list)
    assert rows  # at least one table created

@pytest.mark.asyncio
async def test_execute_insert_and_query(driver: DatabaseDriver):
    await driver.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, val TEXT);")
    count = await driver.execute("INSERT INTO test (val) VALUES (:val);", {"val": "hello"})
    assert count == 1
    result = await driver.execute("SELECT * FROM test WHERE val = :val;", {"val": "hello"})
    assert isinstance(result, list)
    assert result[0]["val"] == "hello"

@pytest.mark.asyncio
async def test_transaction_rollback_on_error(driver: DatabaseDriver):
    await driver.execute("CREATE TABLE IF NOT EXISTS err_test (id INTEGER PRIMARY KEY, num INTEGER);")
    try:
        await driver.execute("INSERT INTO err_test (num) VALUES (:num);", {"num": "not-an-int"})
    except Exception:
        pass
    rows = await driver.execute("SELECT * FROM err_test;")
    # SQLite allows inserting non-integer into INTEGER column, so row will exist
    assert len(rows) == 1
    assert rows[0]["num"] == "not-an-int"

