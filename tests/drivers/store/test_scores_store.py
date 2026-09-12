import pytest
from nightrunner_backend.drivers.store.scores import ScoresStore
from nightrunner_backend.models.score import Score

@pytest.fixture
async def store(test_database):
    return ScoresStore(test_database)

@pytest.mark.asyncio
async def test_scores_crud(store):
    # Create a score entry
    score_obj = Score(event_id='e1', station_id='s1', patrol_id='p1', task_id='t1', score_value=85, score_weight=1.0)
    score = await store.create(score_obj)
    assert score.id is not None
    # Retrieve
    fetched = await store.get(score.id)
    assert fetched.score_value == 85
    # Update with valid value
    updated = await store.update(score.id, score_value=90)
    assert updated.score_value == 90
    # Delete
    await store.delete(score.id)
    assert await store.get(score.id) is None

@pytest.mark.asyncio
async def test_scores_aggregation(store):
    from nightrunner_backend.models.patrol import Patrol
    from nightrunner_backend.models.station import Station
    from nightrunner_backend.drivers.store.patrols import PatrolsStore
    from nightrunner_backend.drivers.store.stations import StationsStore

    patrol_store = PatrolsStore(store.driver)
    station_store = StationsStore(store.driver)

    await patrol_store.create(Patrol(id="p1", event_id="e1", name="Alpha Patrol"))
    await station_store.create(Station(id="s1", event_id="e1", name="Station 1"))

    score_obj = Score(event_id="e1", station_id="s1", patrol_id="p1", task_id="t1", score_value=10, score_weight=1.0, active=True)
    await store.create(score_obj)

    # Test aggregate_event (verifies boolean active filter works in SQL queries)
    event_agg = await store.aggregate_event("e1")
    assert len(event_agg) == 1
    assert event_agg[0]["patrol_id"] == "p1"
    assert event_agg[0]["weighted_score"] == 10.0

    # Test aggregate_station
    station_agg = await store.aggregate_station("e1", "s1")
    assert len(station_agg) == 1
    assert station_agg[0]["patrol_id"] == "p1"
    assert station_agg[0]["score_value"] == 10.0

@pytest.mark.asyncio
async def test_deactivate_previous_scores(store):
    score1 = Score(event_id="e1", station_id="s1", patrol_id="p1", task_id="t1", score_value=50.0, active=True)
    await store.create(score1)

    active_before = await store.get_active_scores_for_patrol_station("e1", "s1", "p1")
    assert len(active_before) == 1
    assert active_before[0].score_value == 50.0

    # Deactivate previous score for t1
    await store.deactivate_previous_scores("e1", "s1", "p1", "t1")

    score2 = Score(event_id="e1", station_id="s1", patrol_id="p1", task_id="t1", score_value=95.0, active=True)
    await store.create(score2)

    active_after = await store.get_active_scores_for_patrol_station("e1", "s1", "p1")
    assert len(active_after) == 1
    assert active_after[0].score_value == 95.0

    # Ensure previous score1 still exists in database but active is False
    old_score = await store.get(score1.id)
    assert old_score is not None
    assert not bool(old_score.active)


