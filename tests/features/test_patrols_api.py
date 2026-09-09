import pytest
import falcon.testing
from nightrunner_backend.main import app


@pytest.fixture
async def client(test_database):
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_api_patrols_lifecycle(client, dev_mode_enabled):
    # Create Event first
    event_resp = await client.simulate_post("/v1/events", json={"name": "Test Event"})
    assert event_resp.status_code == 201
    event_id = event_resp.json["id"]

    # Create Patrol
    patrol_data = {
        "eventId": event_id,
        "name": "Trail Life Patrol",
        "phoneNumber": "555-867-5309",
        "radioFrequency": "462.5625 MHz",
        "radioChannel": "Channel 1",
        "hasRadio": True,
        "radioIdentifier": "Radio-01",
        "members": [
            {"name": "Alice", "rank": "Patrol Leader"},
            {"name": "Bob"}
        ]
    }

    resp = await client.simulate_post("/v1/patrols", json=patrol_data)
    assert resp.status_code == 201
    created_patrol = resp.json
    patrol_id = created_patrol["id"]
    assert created_patrol["name"] == "Trail Life Patrol"
    assert created_patrol["eventId"] == event_id
    assert created_patrol["phoneNumber"] == "555-867-5309"
    assert created_patrol["radioFrequency"] == "462.5625 MHz"
    assert created_patrol["radioChannel"] == "Channel 1"
    assert created_patrol["hasRadio"] is True
    assert created_patrol["radioIdentifier"] == "Radio-01"
    assert len(created_patrol["members"]) == 2

    # List Patrols
    resp = await client.simulate_get("/v1/patrols")
    assert resp.status_code == 200
    p = next(item for item in resp.json if item["id"] == patrol_id)
    assert p["phoneNumber"] == "555-867-5309"
    assert p["radioFrequency"] == "462.5625 MHz"
    assert p["radioChannel"] == "Channel 1"
    assert p["hasRadio"] is True
    assert p["radioIdentifier"] == "Radio-01"

    # Get Patrol
    resp = await client.simulate_get(f"/v1/patrols/{patrol_id}")
    assert resp.status_code == 200
    assert resp.json["name"] == "Trail Life Patrol"
    assert resp.json["phoneNumber"] == "555-867-5309"
    assert resp.json["radioChannel"] == "Channel 1"

    # Update Patrol
    update_data = {
        "name": "Updated Patrol",
        "phoneNumber": "555-999-0000",
        "radioFrequency": "467.5625 MHz",
        "hasRadio": False,
        "radioIdentifier": None,
        "members": [
            {"name": "Charlie"}
        ]
    }
    resp = await client.simulate_put(f"/v1/patrols/{patrol_id}", json=update_data)
    assert resp.status_code == 200
    assert resp.json["name"] == "Updated Patrol"
    assert resp.json["phoneNumber"] == "555-999-0000"
    assert resp.json["radioFrequency"] == "467.5625 MHz"
    assert resp.json["hasRadio"] is False
    assert resp.json["radioIdentifier"] is None
    assert len(resp.json["members"]) == 1
    assert resp.json["members"][0]["name"] == "Charlie"

    # Delete Patrol
    resp = await client.simulate_delete(f"/v1/patrols/{patrol_id}")
    assert resp.status_code == 204

    # Verify Deleted
    resp = await client.simulate_get(f"/v1/patrols/{patrol_id}")
    assert resp.status_code == 404
