import os
import logging
from typing import Optional
from nightrunner_backend.drivers.base import DatabaseDriver

logger = logging.getLogger(__name__)

# Global driver instance for the application
_driver: Optional[DatabaseDriver] = None

def get_driver() -> DatabaseDriver:
    """Return a DatabaseDriver instance that matches the current DATABASE_URL.
    If a driver already exists but its connection string differs from the
    environment variable, a new driver is created. This ensures each test that
    sets a temporary SQLite file gets its own isolated driver instance."""
    global _driver
    # Resolve the database URL from the environment (or default)
    current_url = os.getenv("DATABASE_URL", "sqlite:///nightrunner.db")
    if _driver is None or getattr(_driver, "db_url", None) != current_url:
        # Close existing driver if it exists to free resources
        if _driver is not None:
            # Note: close is async; callers should await close_driver() before
            # calling get_driver again. Here we simply discard the old instance.
            _driver = None
        _driver = DatabaseDriver(current_url)
    return _driver

async def run_migrations():
    """
    Discovers and applies pending SQL migrations.
    """
    driver = get_driver()
    await driver.run_migrations()

async def close_driver():
    """
    Closes the shared DatabaseDriver instance.
    """
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
