import pytest
import falcon.testing
from nightrunner_backend.main import app


@pytest.fixture
async def client(test_database):
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_api_events_lifecycle(client, dev_mode_enabled):
    event_data = {
        "name": "Night Ops 2026",
        "date": "2026-09-15",
        "description": "Annual event",
        "roundingPrecision": 1000
    }

    resp = await client.simulate_post("/v1/events", json=event_data)
    assert resp.status_code == 201
    created_event = resp.json
    event_id = created_event["id"]
    assert created_event["name"] == "Night Ops 2026"

    # List Events
    resp = await client.simulate_get("/v1/events")
    assert resp.status_code == 200
    assert any(e["id"] == event_id for e in resp.json)

    # Get Event
    resp = await client.simulate_get(f"/v1/events/{event_id}")
    assert resp.status_code == 200
    assert resp.json["name"] == "Night Ops 2026"

    # Update Event
    update_data = {
        "name": "Updated Night Ops",
        "date": "2026-09-16"
    }
    resp = await client.simulate_put(f"/v1/events/{event_id}", json=update_data)
    assert resp.status_code == 200
    assert resp.json["name"] == "Updated Night Ops"

    # Delete Event
    resp = await client.simulate_delete(f"/v1/events/{event_id}")
    assert resp.status_code == 204

    # Verify Deleted
    resp = await client.simulate_get(f"/v1/events/{event_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_api_event_stations_and_organizers(client, dev_mode_enabled, test_database):
    driver = test_database
    event_data = {
        "name": "Station Test Event",
        "date": "2026-10-01",
        "organizers": ["user-org-1"]
    }
    resp = await client.simulate_post("/v1/events", json=event_data)
    assert resp.status_code == 201
    event_id = resp.json["id"]

    # Create station linked to event
    station_payload = {
        "name": "Alpha Station",
        "eventId": event_id
    }
    st_resp = await client.simulate_post("/v1/stations", json=station_payload)
    assert st_resp.status_code == 201
    station_id = st_resp.json["id"]

    # Fetch event and verify stations and organizers list
    get_resp = await client.simulate_get(f"/v1/events/{event_id}")
    assert get_resp.status_code == 200
    ev = get_resp.json
    assert station_id in ev["stations"]
    assert "user-org-1" in ev["organizers"]


@pytest.mark.asyncio
async def test_api_users_management(client, dev_mode_enabled, test_database):
    driver = test_database
    # Insert test user into DB directly
    await driver.execute("""
        INSERT INTO users (id, external_id, username, email, display_name, status, is_admin)
        VALUES ('u-test-1', 'ext-1', 'scout_jane', 'jane@example.com', 'Jane Scout', 'pending', FALSE)
    """)

    # List users
    resp = await client.simulate_get("/v1/users")
    assert resp.status_code == 200
    users = resp.json
    assert any(u["id"] == "u-test-1" and u["status"] == "pending" for u in users)

    # Get single user
    resp = await client.simulate_get("/v1/users/u-test-1")
    assert resp.status_code == 200
    assert resp.json["username"] == "scout_jane"

    # Approve user (update status to 'active')
    resp = await client.simulate_put("/v1/users/u-test-1", json={"status": "active"})
    assert resp.status_code == 200
    assert resp.json["status"] == "active"

    # Block user
    resp = await client.simulate_put("/v1/users/u-test-1", json={"status": "blocked"})
    assert resp.status_code == 200
    assert resp.json["status"] == "blocked"

    # Assign to station
    # First create a station
    st_resp = await client.simulate_post("/v1/stations", json={"name": "Pioneering Station"})
    st_id = st_resp.json["id"]

    assign_resp = await client.simulate_put("/v1/users/u-test-1", json={"stationId": st_id, "stationRole": "staff"})
    assert assign_resp.status_code == 200
    assert any(s["stationId"] == st_id for s in assign_resp.json["stationStaff"])

    # Delete user
    del_resp = await client.simulate_delete("/v1/users/u-test-1")
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_api_patch_user_role(client, dev_mode_enabled, test_database):
    driver = test_database
    await driver.execute("""
        INSERT INTO users (id, external_id, username, email, display_name, status, is_admin)
        VALUES ('u-patch-1', 'ext-patch', 'patch_user', 'patch@example.com', 'Patch User', 'active', FALSE)
    """)

    # 1. Add single event role via PATCH
    patch_resp = await client.simulate_patch("/v1/users/u-patch-1", json={
        "eventId": "evt-101",
        "role": "event-admin",
        "roleAction": "add"
    })
    assert patch_resp.status_code == 200
    user_data = patch_resp.json
    assert user_data["roles"].get("evt-101") == "event-admin"

    # 2. Add second event role via PATCH
    patch_resp2 = await client.simulate_patch("/v1/users/u-patch-1", json={
        "eventId": "evt-102",
        "role": "scorer",
        "roleAction": "add"
    })
    assert patch_resp2.status_code == 200
    assert patch_resp2.json["roles"].get("evt-101") == "event-admin"
    assert patch_resp2.json["roles"].get("evt-102") == "scorer"

    # 3. Remove single event role via PATCH without wiping other roles
    patch_resp3 = await client.simulate_patch("/v1/users/u-patch-1", json={
        "eventId": "evt-101",
        "roleAction": "remove"
    })
    assert patch_resp3.status_code == 200
    assert "evt-101" not in patch_resp3.json["roles"]
    assert patch_resp3.json["roles"].get("evt-102") == "scorer"



