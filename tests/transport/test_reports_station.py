from datetime import datetime, timezone
import falcon
import falcon.testing
import pytest
from unittest.mock import AsyncMock, patch

from nightrunner_backend.main import app, register_routes


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_station_report_handles_datetime_objects(test_client, token_factory):
    headers = token_factory()
    mock_rows = [
        {
            "score_id": "score-1",
            "patrol_id": "patrol-1",
            "patrol_name": "Alpha Patrol",
            "task_id": "task-1",
            "task_name": "Task 1",
            "score_value": 10.0,
            "score_weight": 1.0,
            "weighted_score": 10.0,
            "active": True,
            "submitted_at": datetime(2026, 9, 16, 5, 0, 0, tzinfo=timezone.utc),
        }
    ]
    with patch("nightrunner_backend.drivers.store.scores.ScoresStore.aggregate_station", AsyncMock(return_value=mock_rows)):
        resp = await test_client.simulate_get(
            "/v1/reports/stations/st-123?eventId=evt-123",
            headers=headers,
        )
        assert resp.status == falcon.HTTP_200
        data = resp.json
        assert data["stationId"] == "st-123"
        assert len(data["patrols"]) == 1
        patrol = data["patrols"][0]
        assert patrol["patrolId"] == "patrol-1"
        assert len(patrol["breakdown"]) == 1
        score_item = patrol["breakdown"][0]
        assert score_item["submittedAt"] == "2026-09-16T05:00:00+00:00"
