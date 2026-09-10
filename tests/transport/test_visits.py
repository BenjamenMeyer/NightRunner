import falcon
import pytest
from unittest.mock import patch, AsyncMock
from nightrunner_backend.main import app, register_routes


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@patch("nightrunner_backend.transport.middleware.auth.AuthMiddleware.process_request", AsyncMock(return_value=None))
@pytest.mark.asyncio
async def test_visits_endpoints(test_client, dev_mode_enabled):
    # Check-in
    checkin_body = {
        "eventId": "e1",
        "stationId": "s1",
        "patrolId": "p1",
        "timestamp": "2026-09-09T20:00:00Z"
    }
    resp = await test_client.simulate_post("/v1/visits/check-in", json=checkin_body)
    assert resp.status == falcon.HTTP_201 or resp.status == falcon.HTTP_200
    visit = resp.json
    assert visit["eventId"] == "e1"
    assert visit["stationId"] == "s1"
    assert visit["patrolId"] == "p1"
    assert visit["checkedInAt"] == "2026-09-09T20:00:00Z"

    # List visits
    resp = await test_client.simulate_get("/v1/visits?eventId=e1")
    assert resp.status == falcon.HTTP_200
    data = resp.json
    assert len(data["visits"]) >= 1

    # Check-out
    checkout_body = {
        "eventId": "e1",
        "stationId": "s1",
        "patrolId": "p1",
        "timestamp": "2026-09-09T20:30:00Z"
    }
    resp = await test_client.simulate_post("/v1/visits/check-out", json=checkout_body)
    assert resp.status == falcon.HTTP_200 or resp.status == falcon.HTTP_201
    updated_visit = resp.json
    assert updated_visit["checkedOutAt"] == "2026-09-09T20:30:00Z"

    # Verify datetime object conversion when to_api_dict() is called
    from datetime import datetime, timezone
    from nightrunner_backend.models.station_visit import StationVisit

    visit_with_dt = StationVisit(
        event_id="e1",
        station_id="s1",
        patrol_id="p1",
        checked_in_at=datetime(2026, 9, 9, 21, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 9, 9, 20, 59, 0, tzinfo=timezone.utc)
    )
    serialized = visit_with_dt.to_api_dict()
    assert isinstance(serialized["checkedInAt"], str)
    assert serialized["checkedInAt"].startswith("2026-09-09T21:00:00")
    assert isinstance(serialized["createdAt"], str)
    assert serialized["createdAt"].startswith("2026-09-09T20:59:00")
