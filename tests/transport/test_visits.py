from datetime import datetime, timezone
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


@patch("nightrunner_backend.transport.middleware.auth.AuthMiddleware.process_request", AsyncMock(return_value=None))
@pytest.mark.asyncio
async def test_completed_visit_lock_and_reset(test_client, dev_mode_enabled):
    # 0. Initial check-in
    checkin_body = {
        "eventId": "e2",
        "stationId": "s2",
        "patrolId": "p2"
    }
    resp = await test_client.simulate_post("/v1/visits/check-in", json=checkin_body)
    assert resp.status == falcon.HTTP_201

    # 1. Post score to mark visit as completed
    score_body = {
        "eventId": "e2",
        "stationId": "s2",
        "patrolId": "p2",
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "scores": [{"taskId": "t1", "scoreValue": 10.0}]
    }
    resp = await test_client.simulate_post("/v1/scores", json=score_body)
    assert resp.status == falcon.HTTP_201

    # 2. Check-in attempt on completed station visit should return HTTP 409 Conflict
    resp = await test_client.simulate_post("/v1/visits/check-in", json=checkin_body)
    assert resp.status == falcon.HTTP_409

    # 3. Reset visit within 5 minutes succeeds
    reset_body = {
        "eventId": "e2",
        "stationId": "s2",
        "patrolId": "p2"
    }
    resp = await test_client.simulate_post("/v1/visits/reset", json=reset_body)
    assert resp.status == falcon.HTTP_200
    assert resp.json["status"] == "checked_in"

    # 4. Check-in after reset succeeds
    resp = await test_client.simulate_post("/v1/visits/check-in", json=checkin_body)
    assert resp.status == falcon.HTTP_200
    assert resp.json["status"] == "checked_in"


@patch("nightrunner_backend.transport.middleware.auth.AuthMiddleware.process_request", AsyncMock(return_value=None))
@pytest.mark.asyncio
async def test_full_station_lifecycle_workflow(test_client, dev_mode_enabled):
    """Verifies the complete station lifecycle workflow:
    1. Patrol checks in to wait in queue.
    2. Patrol checks out when line is too long (no score submitted) -> visit remains un-locked.
    3. Patrol returns later and checks in again.
    4. Volunteers score patrol activity and submit score.
    5. Backend automatically marks visit as completed AND records checkedOutAt timestamp.
    6. Future check-in attempts on completed visit are blocked (409 Conflict).
    """
    event_id = "evt-flow-1"
    station_id = "st-flow-1"
    patrol_id = "pat-flow-1"

    # Step 1: Check in to queue
    resp = await test_client.simulate_post("/v1/visits/check-in", json={
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id,
        "timestamp": "2026-09-16T19:00:00Z"
    })
    assert resp.status == falcon.HTTP_201

    # Step 2: Line too long -> check out without scoring
    resp = await test_client.simulate_post("/v1/visits/check-out", json={
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id,
        "timestamp": "2026-09-16T19:05:00Z"
    })
    assert resp.status == falcon.HTTP_200
    assert resp.json["checkedOutAt"] == "2026-09-16T19:05:00Z"

    # Step 3: Patrol returns later and re-checks in
    resp = await test_client.simulate_post("/v1/visits/check-in", json={
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id,
        "timestamp": "2026-09-16T20:00:00Z"
    })
    assert resp.status == falcon.HTTP_200 or resp.status == falcon.HTTP_201

    # Step 4: Submit score for the station activity
    completed_time = "2026-09-16T20:25:00Z"
    resp = await test_client.simulate_post("/v1/scores", json={
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id,
        "startedAt": "2026-09-16T20:05:00Z",
        "completedAt": completed_time,
        "scores": [
            {"taskId": "t1", "scoreValue": 8.0, "scoreWeight": 1.0}
        ]
    })
    assert resp.status == falcon.HTTP_201

    # Step 5: Verify visit is now completed AND automatically checked out
    resp = await test_client.simulate_get(f"/v1/visits?eventId={event_id}")
    assert resp.status == falcon.HTTP_200
    visits_list = resp.json["visits"]
    patrol_visits = [v for v in visits_list if v["patrolId"] == patrol_id and v["stationId"] == station_id]
    latest_v = patrol_visits[-1] # Newest visit record
    assert latest_v["status"] == "completed"
    assert latest_v["checkedOutAt"] == completed_time

    # Step 6: Verify attempt is locked against further check-ins
    resp = await test_client.simulate_post("/v1/visits/check-in", json={
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id
    })
    assert resp.status == falcon.HTTP_409



