import pytest
import falcon.testing
from nightrunner_backend.main import app


@pytest.fixture
async def client(test_database):
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_api_patrols_lifecycle(client, dev_mode_enabled):
    # Create Patrol
    patrol_data = {
        "name": "Scouts BSA",
        "members": [
            {"name": "Alice", "rank": "Patrol Leader"},
            {"name": "Bob"}
        ]
    }

    resp = await client.simulate_post("/patrols", json=patrol_data)
    assert resp.status_code == 201
    created_patrol = resp.json
    patrol_id = created_patrol["id"]
    assert created_patrol["name"] == "Scouts BSA"
    assert len(created_patrol["members"]) == 2

    # List Patrols
    resp = await client.simulate_get("/patrols")
    assert resp.status_code == 200
    assert any(p["id"] == patrol_id for p in resp.json)

    # Get Patrol
    resp = await client.simulate_get(f"/patrols/{patrol_id}")
    assert resp.status_code == 200
    assert resp.json["name"] == "Scouts BSA"

    # Update Patrol
    update_data = {
        "name": "Updated Patrol",
        "members": [
            {"name": "Charlie"}
        ]
    }
    resp = await client.simulate_put(f"/patrols/{patrol_id}", json=update_data)
    assert resp.status_code == 200
    assert resp.json["name"] == "Updated Patrol"
    assert len(resp.json["members"]) == 1
    assert resp.json["members"][0]["name"] == "Charlie"

    # Delete Patrol
    resp = await client.simulate_delete(f"/patrols/{patrol_id}")
    assert resp.status_code == 204

    # Verify Deleted
    resp = await client.simulate_get(f"/patrols/{patrol_id}")
    assert resp.status_code == 404
