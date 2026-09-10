import pytest
import uuid6
from nightrunner_backend.drivers.store.stations import StationsStore
from nightrunner_backend.models.station import Station, StationMember


@pytest.fixture
async def stations_store(test_database):
    return StationsStore(test_database)


@pytest.mark.asyncio
async def test_station_store_crud_and_tasks_persistence(stations_store: StationsStore):
    station_id = str(uuid6.uuid7())
    tasks_data = [
        {"id": "t1", "description": "Tying square knot", "scoreWeight": 1.0},
        {"id": "t2", "description": "Tying bowline", "scoreWeight": 2.0},
    ]

    station = Station(
        id=station_id,
        event_id="evt-100",
        name="Knot Station",
        description="Pioneering knot station",
        active_configuration_id="cfg-1",
        tasks=tasks_data,
    )

    await stations_store.create(station)

    fetched = await stations_store.get(station_id)
    assert fetched is not None
    assert fetched.id == station_id
    assert fetched.name == "Knot Station"
    assert fetched.active_configuration_id == "cfg-1"
    assert fetched.tasks == tasks_data

    # Test list
    all_stations = await stations_store.list()
    assert any(s.id == station_id for s in all_stations)

    # Test update
    fetched.name = "Knot Station Updated"
    fetched.tasks.append({"id": "t3", "description": "Tying clove hitch", "scoreWeight": 1.5})
    await stations_store.update(fetched)

    updated = await stations_store.get(station_id)
    assert updated is not None
    assert updated.name == "Knot Station Updated"
    assert len(updated.tasks) == 3
    assert updated.tasks[2]["id"] == "t3"

    # Test delete
    await stations_store.delete(station_id)
    assert await stations_store.get(station_id) is None


@pytest.mark.asyncio
async def test_station_store_list_filtered_by_event_id(stations_store: StationsStore):
    st1 = Station(id=str(uuid6.uuid7()), event_id="evt-event-A", name="Station Event A")
    st2 = Station(id=str(uuid6.uuid7()), event_id="evt-event-B", name="Station Event B")

    await stations_store.create(st1)
    await stations_store.create(st2)

    stations_A = await stations_store.list(event_id="evt-event-A")
    assert len(stations_A) == 1
    assert stations_A[0].id == st1.id

    stations_B = await stations_store.list(event_id="evt-event-B")
    assert len(stations_B) == 1
    assert stations_B[0].id == st2.id

    stations_all = await stations_store.list()
    assert len(stations_all) >= 2

