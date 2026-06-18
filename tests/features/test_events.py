import pytest
import uuid6
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.drivers.events_store import EventsStore
from nightrunner_backend.models.event import Event

@pytest.fixture
async def db():
    driver = DatabaseDriver("sqlite:///:memory:")
    await driver.run_migrations()
    yield driver
    await driver.close()

@pytest.mark.asyncio
async def test_create_and_get_event(db):
    store = EventsStore(db)
    event = Event(
        id=str(uuid6.uuid7()),
        name="Night Ops 2026",
        date="2026-09-15",
        description="Annual night operations event",
        rounding_precision=1000
    )
    
    await store.create(event)
    
    fetched = await store.get(event.id)
    assert fetched is not None
    assert fetched.name == event.name
    assert fetched.id == event.id

@pytest.mark.asyncio
async def test_list_events(db):
    store = EventsStore(db)
    event1 = Event(id=str(uuid6.uuid7()), name="Event 1")
    event2 = Event(id=str(uuid6.uuid7()), name="Event 2")
    
    await store.create(event1)
    await store.create(event2)
    
    events = await store.list()
    assert len(events) == 2
    names = [e.name for e in events]
    assert "Event 1" in names
    assert "Event 2" in names

@pytest.mark.asyncio
async def test_update_event(db):
    store = EventsStore(db)
    event = Event(id=str(uuid6.uuid7()), name="Original Name")
    await store.create(event)
    
    event.name = "Updated Name"
    await store.update(event)
    
    fetched = await store.get(event.id)
    assert fetched.name == "Updated Name"

@pytest.mark.asyncio
async def test_delete_event(db):
    store = EventsStore(db)
    event = Event(id=str(uuid6.uuid7()), name="To Be Deleted")
    await store.create(event)
    
    await store.delete(event.id)
    
    fetched = await store.get(event.id)
    assert fetched is None
