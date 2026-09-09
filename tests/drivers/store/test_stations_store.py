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
