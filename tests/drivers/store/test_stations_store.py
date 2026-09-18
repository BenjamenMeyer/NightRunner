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
    assert len(fetched.tasks) == 2
    assert fetched.tasks[0]["id"] == "t1"
    assert fetched.tasks[0]["description"] == "Tying square knot"
    assert fetched.tasks[0]["scoreWeight"] == 1.0
    assert fetched.tasks[1]["id"] == "t2"
    assert fetched.tasks[1]["description"] == "Tying bowline"
    assert fetched.tasks[1]["scoreWeight"] == 2.0

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


@pytest.mark.asyncio
async def test_station_store_list_ordered_alphabetically(stations_store: StationsStore):
    event_id = str(uuid6.uuid7())
    st_z = Station(id=str(uuid6.uuid7()), event_id=event_id, name="Zebra Station")
    st_a = Station(id=str(uuid6.uuid7()), event_id=event_id, name="Alpha Station")
    st_m = Station(id=str(uuid6.uuid7()), event_id=event_id, name="Mango Station")

    await stations_store.create(st_z)
    await stations_store.create(st_a)
    await stations_store.create(st_m)

    ordered = await stations_store.list(event_id=event_id)
    assert len(ordered) == 3
    assert [s.name for s in ordered] == ["Alpha Station", "Mango Station", "Zebra Station"]


@pytest.mark.asyncio
async def test_station_store_empty_string_numeric_tasks(stations_store: StationsStore):
    station_id = str(uuid6.uuid7())
    tasks_with_empty_strings = [
        {
            "id": "t1",
            "name": "Task Empty Strings",
            "maxScore": "",
            "timeLimit": "",
            "scoreWeight": ""
        }
    ]

    station = Station(
        id=station_id,
        event_id="evt-empty-test",
        name="Empty String Task Station",
        tasks=tasks_with_empty_strings
    )

    # Creating station should not raise float("") ValueError
    await stations_store.create(station)

    fetched = await stations_store.get(station_id)
    assert fetched is not None
    assert len(fetched.tasks) == 1
    assert fetched.tasks[0]["maxScore"] == 100.0
    assert fetched.tasks[0]["timeLimit"] == 0.0
    assert fetched.tasks[0]["scoreWeight"] == 1.0


@pytest.mark.asyncio
async def test_station_store_update_tasks_with_existing_scores(stations_store: StationsStore, test_database):
    station_id = str(uuid6.uuid7())
    task_id = str(uuid6.uuid7())
    event_id = str(uuid6.uuid7())
    patrol_id = str(uuid6.uuid7())

    # Create initial station with a task
    station = Station(
        id=station_id,
        event_id=event_id,
        name="Station With Scores",
        tasks=[{"id": task_id, "name": "Task 1", "maxScore": 50.0}]
    )
    await stations_store.create(station)

    # Insert prerequisite records and a score referencing task_id
    await test_database.execute("INSERT INTO events (id, name) VALUES (:id, 'Test Event')", {"id": event_id})
    await test_database.execute("INSERT INTO patrols (id, event_id, name) VALUES (:id, :event_id, 'Patrol 1')", {"id": patrol_id, "event_id": event_id})
    score_id = str(uuid6.uuid7())
    await test_database.execute(
        "INSERT INTO scores (id, event_id, station_id, patrol_id, task_id, score_value, score_weight) VALUES (:id, :event_id, :station_id, :patrol_id, :task_id, 45.0, 1.0)",
        {"id": score_id, "event_id": event_id, "station_id": station_id, "patrol_id": patrol_id, "task_id": task_id}
    )

    # Update station maxScore on existing task_id
    station.tasks[0]["maxScore"] = 100.0
    await stations_store.update(station)

    # Verify update succeeded without FK constraint violation and maxScore is updated
    updated = await stations_store.get(station_id)
    assert updated is not None
    assert len(updated.tasks) == 1
    assert updated.tasks[0]["id"] == task_id
    assert updated.tasks[0]["maxScore"] == 100.0


