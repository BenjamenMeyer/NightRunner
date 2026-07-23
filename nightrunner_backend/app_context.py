import os
import logging
from typing import Optional
from nightrunner_backend.drivers.base import DatabaseDriver

logger = logging.getLogger(__name__)

# Global driver instance for the application
_driver: Optional[DatabaseDriver] = None

def get_driver() -> DatabaseDriver:
    """
    Returns the shared DatabaseDriver instance.
    """
    global _driver
    if _driver is None:
        _driver = DatabaseDriver()
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
