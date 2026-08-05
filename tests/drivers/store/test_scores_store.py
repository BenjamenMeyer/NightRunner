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
