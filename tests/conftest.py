import pytest
import asyncio
import os
import tempfile
from nightrunner_backend.app_context import close_driver, get_driver

# In-memory SQLite DB for each test function
@pytest.fixture(scope="function", autouse=True)
async def test_database():
    """Create an in‑memory SQLite database, run migrations, and provide a fresh driver per test."""
    # Set the DATABASE_URL environment variable to use an in‑memory SQLite DB
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    # Reset the global driver so get_driver creates a new instance
    from nightrunner_backend import app_context
    app_context._driver = None
    driver = app_context.get_driver()
    await driver.run_migrations()
    yield driver
    # Cleanup: close the driver after the test
    await app_context.close_driver()
