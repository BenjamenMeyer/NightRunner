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
async def test_end_to_end_patrol_lifecycle_and_scoring_integration(test_client, dev_mode_enabled):
    """Integration test simulating complete event lifecycle:
    1. Create event, configuration group, configuration, station, and patrol.
    2. Patrol check-in at station.
    3. Start tasks and record scores.
    4. Verify station visit status transition to completed.
    5. Verify attempt locking (check-in rejected).
    6. Reset station visit attempt within 5 minutes.
    7. Re-check-in patrol and verify scoring / event reports update properly.
    """
    # 1. Create Event
    event_payload = {
        "name": "Annual Night Trek 2026",
        "description": "Scout Night Ops Patrol Challenge",
        "theme": "Forest Operations"
    }
    resp = await test_client.simulate_post("/v1/events", json=event_payload)
    assert resp.status == falcon.HTTP_201
    event_id = resp.json["id"]

    # 2. Create Configuration Group & Configuration
    group_payload = {
        "name": "Pioneer Skills Group",
        "description": "Ropework and Knot Tying Challenges"
    }
    resp = await test_client.simulate_post("/v1/configuration-groups", json=group_payload)
    assert resp.status == falcon.HTTP_201
    group_id = resp.json["id"]

    config_payload = {
        "groupId": group_id,
        "name": "Advanced Knot Tying Preset",
        "description": "Square Lashing and Bowline Challenge",
        "stationWeight": 1.5,
        "tasks": [
            {
                "name": "Square Lashing",
                "type": "Timed Challenge",
                "description": "Build a rigid square lashing",
                "maxScore": 50
            },
            {
                "name": "Speed Bowline",
                "type": "Stopwatch",
                "description": "Tie a bowline under 30s",
                "timeLimit": 30
            }
        ]
    }
    resp = await test_client.simulate_post("/v1/configurations", json=config_payload)
    assert resp.status == falcon.HTTP_201
    config_id = resp.json["id"]

    # 3. Create Station with Configuration
    station_payload = {
        "eventId": event_id,
        "name": "Ropework & Knot Station",
        "activeConfigurationId": config_id,
        "stationWeight": 1.5
    }
    resp = await test_client.simulate_post("/v1/stations", json=station_payload)
    assert resp.status == falcon.HTTP_201
    station_id = resp.json["id"]

    # 4. Create Patrol
    patrol_payload = {
        "eventId": event_id,
        "name": "Eagle Patrol",
        "programName": "Troop 101 Eagle Patrol",
        "contactName": "Scoutmaster John",
        "contactPhone": "555-0199"
    }
    resp = await test_client.simulate_post("/v1/patrols", json=patrol_payload)
    assert resp.status == falcon.HTTP_201
    patrol_id = resp.json["id"]

    # 5. Check-In Patrol at Station
    checkin_payload = {
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id
    }
    resp = await test_client.simulate_post("/v1/visits/check-in", json=checkin_payload)
    assert resp.status in (falcon.HTTP_201, falcon.HTTP_200)
    visit = resp.json
    assert visit["status"] == "checked_in"

    # 6. Verify visits listing
    resp = await test_client.simulate_get(f"/v1/visits?eventId={event_id}")
    assert resp.status == falcon.HTTP_200
    visits_list = resp.json.get("visits", [])
    assert len(visits_list) == 1
    assert visits_list[0]["patrolId"] == patrol_id
    assert visits_list[0]["stationId"] == station_id

    # 7. Submit Scores for Patrol at Station
    task1_id = resp.json.get("tasks", [{}])[0].get("id", "task-1")
    score_payload = {
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id,
        "configurationId": config_id,
        "entryMode": "live",
        "scores": [
            {"taskId": task1_id, "scoreValue": 45.0, "scoreWeight": 1.0}
        ],
        "comments": "Great square lashing structure."
    }
    resp = await test_client.simulate_post("/v1/scores", json=score_payload)
    assert resp.status == falcon.HTTP_201

    # 8. Verify visit status transitioned to completed
    resp = await test_client.simulate_get(f"/v1/visits?eventId={event_id}")
    assert resp.status == falcon.HTTP_200
    updated_visit = resp.json["visits"][0]
    assert updated_visit["status"] == "completed"

    # 9. Verify Check-In is BLOCKED (409 Conflict) for completed attempt
    resp = await test_client.simulate_post("/v1/visits/check-in", json=checkin_payload)
    assert resp.status == falcon.HTTP_409

    # 10. Reopen/Reset Station Visit Attempt
    reset_payload = {
        "eventId": event_id,
        "stationId": station_id,
        "patrolId": patrol_id
    }
    resp = await test_client.simulate_post("/v1/visits/reset", json=reset_payload)
    assert resp.status == falcon.HTTP_200
    assert resp.json["status"] == "checked_in"

    # 11. Re-check-in after reset succeeds
    resp = await test_client.simulate_post("/v1/visits/check-in", json=checkin_payload)
    assert resp.status == falcon.HTTP_200
    assert resp.json["status"] == "checked_in"

    # 12. Check-Out Patrol
    resp = await test_client.simulate_post("/v1/visits/check-out", json=checkin_payload)
    assert resp.status == falcon.HTTP_200
    assert resp.json["status"] == "checked_out"

    # 13. Verify Event & Station Reports
    resp = await test_client.simulate_get(f"/v1/reports/events/{event_id}")
    assert resp.status == falcon.HTTP_200
    event_report = resp.json
    assert event_report["eventId"] == event_id

    resp = await test_client.simulate_get(f"/v1/reports/stations/{station_id}?eventId={event_id}")
    assert resp.status == falcon.HTTP_200
    station_report = resp.json
    assert station_report["stationId"] == station_id
