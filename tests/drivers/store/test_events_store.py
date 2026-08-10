import pytest
import uuid6
from datetime import datetime, UTC

from nightrunner_backend.drivers.store.events import EventsStore
from nightrunner_backend.models.event import Event

@pytest.fixture
async def events_store(test_database):
    driver = test_database
    await driver.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            name TEXT,
            date TEXT,
            description TEXT,
            rounding_precision INTEGER
        );
    """)
    await driver.execute("""
        CREATE TABLE IF NOT EXISTS event_organizers (
            event_id TEXT,
            user_id TEXT,
            PRIMARY KEY (event_id, user_id)
        );
    """)
    await driver.execute("""
        CREATE TABLE IF NOT EXISTS event_stations (
            event_id TEXT,
            station_id TEXT,
            PRIMARY KEY (event_id, station_id)
        );
    """)
    await driver.execute("""
        CREATE TABLE IF NOT EXISTS event_patrols (
            event_id TEXT,
            patrol_id TEXT,
            PRIMARY KEY (event_id, patrol_id)
        );
    """)
    return EventsStore(driver)

@pytest.mark.asyncio
async def test_event_crud(events_store: EventsStore):
    ev = Event(
        id=str(uuid6.uuid7()),
        name="Test Event",
        date=datetime.now(UTC).isoformat(),
        description="A test event",
        rounding_precision=2,
        organizers=["u1", "u2"],
        stations=["s1"],
        patrols=["p1", "p2"]
    )
    await events_store.create(ev)
    fetched = await events_store.get(ev.id)
    assert fetched is not None
    assert fetched.id == ev.id
    assert fetched.name == "Test Event"
    assert set(fetched.organizers) == {"u1", "u2"}
    assert fetched.stations == ["s1"]
    assert set(fetched.patrols) == {"p1", "p2"}
    all_events = await events_store.list()
    assert any(e.id == ev.id for e in all_events)
    ev.name = "Updated Event"
    ev.organizers = ["u3"]
    ev.stations = ["s2", "s3"]
    ev.patrols = ["p3"]
    await events_store.update(ev)
    updated = await events_store.get(ev.id)
    assert updated.name == "Updated Event"
    assert updated.organizers == ["u3"]
    assert set(updated.stations) == {"s2", "s3"}
    assert updated.patrols == ["p3"]
    await events_store.delete(ev.id)
    assert await events_store.get(ev.id) is None

@pytest.mark.asyncio
async def test_duplicate_event_id(events_store: EventsStore):
    ev = Event(
        id="dup-id",
        name="First",
        date=datetime.now(UTC).isoformat(),
        description="first",
        rounding_precision=1,
        organizers=[],
        stations=[],
        patrols=[]
    )
    await events_store.create(ev)
    dup = Event(
        id="dup-id",
        name="Second",
        date=datetime.now(UTC).isoformat(),
        description="second",
        rounding_precision=1,
        organizers=[],
        stations=[],
        patrols=[]
    )
    try:
        await events_store.create(dup)
    except Exception:
        pass
    events = await events_store.list()
    assert len([e for e in events if e.id == "dup-id"]) == 1
