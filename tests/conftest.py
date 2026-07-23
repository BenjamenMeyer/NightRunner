import pytest
import asyncio
from nightrunner_backend.app_context import close_driver
from nightrunner_backend.drivers.base import DatabaseDriver

@pytest.fixture(scope="session", autouse=True)
async def cleanup_database():
    """
    Ensure all database connections are closed at the end of the test session.
    """
    yield
    await close_driver()
    # Also close any other potential drivers that might have been created
    # though with the instance-based refactor this is less critical.
