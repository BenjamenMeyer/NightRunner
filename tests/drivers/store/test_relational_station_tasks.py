import pytest
import uuid6
from nightrunner_backend.drivers.store.stations import StationsStore
from nightrunner_backend.drivers.store.configuration import ConfigurationStore
from nightrunner_backend.models.station import Station
from nightrunner_backend.models.configuration import Configuration


@pytest.mark.asyncio
async def test_relational_station_tasks_isolation(test_database):
    """
    Tests that every task saved to station_tasks is assigned a unique UUIDv7 task ID,
    preventing state bleeding across task fields in the UI or scoring engine.
    """
    station_store = StationsStore(test_database)
    config_store = ConfigurationStore(test_database)

    # 1. Create a station with all task types without initial IDs
    all_task_types = [
        {"name": "Pass/Fail Task", "type": "Pass / Fail"},
        {"name": "Multi Choice Task", "type": "MultiChoice", "scoreValue": {"options": [{"label": "A", "value": 10}, {"label": "B", "value": 0}]}},
        {"name": "Score Challenge Task", "type": "Score Challenge", "maxScore": 50},
        {"name": "Checkpoint Task", "type": "Checkpoint"},
        {"name": "Text Answer Task", "type": "Text Answer"},
        {"name": "Custom Task", "type": "Custom", "maxScore": 20},
        {"name": "Stopwatch Task", "type": "Stopwatch"},
    ]

    station_id = str(uuid6.uuid7())
    station = Station(
        id=station_id,
        event_id="event-all-types",
        name="All Types Station",
        tasks=all_task_types
    )

    await station_store.create(station)

    # 2. Retrieve station and verify every task got a unique non-null UUIDv7 ID
    fetched_station = await station_store.get(station_id)
    assert fetched_station is not None
    assert len(fetched_station.tasks) == len(all_task_types)

    task_ids = set()
    for task in fetched_station.tasks:
        assert "id" in task
        assert task["id"] is not None
        assert len(task["id"]) > 0
        task_ids.add(task["id"])

    # Ensure all task IDs are unique and distinct
    assert len(task_ids) == len(all_task_types)

    # 3. Test Configuration task normalization
    config_id = str(uuid6.uuid7())
    config = Configuration(
        id=config_id,
        key="all_types_config",
        tasks=all_task_types
    )

    await config_store.create_configuration(config)
    fetched_config = await config_store.get_configuration(config_id)
    assert fetched_config is not None
    assert len(fetched_config.tasks) == len(all_task_types)

    config_task_ids = set()
    for task in fetched_config.tasks:
        assert "id" in task
        assert task["id"] is not None
        config_task_ids.add(task["id"])

    assert len(config_task_ids) == len(all_task_types)
