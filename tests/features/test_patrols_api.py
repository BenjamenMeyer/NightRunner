import pytest
import uuid6
import falcon.testing
from nightrunner_backend.main import app
from nightrunner_backend.app_context import get_driver, close_driver

@pytest.fixture
async def client(test_database):
    # Use the driver provided by the per-test in-memory DB fixture
    driver = test_database
    # Migrations already applied by fixture
    async with falcon.testing.ASGITestClient(app) as client:
        yield client
    # Cleanup handled by test_database fixture

@pytest.mark.asyncio
async def test_api_patrols_lifecycle(client):
    headers = {"Authorization": "Bearer test-token"}
    
    # Create Patrol
    patrol_data = {
        "name": "Scouts BSA",
        "members": [
            {"name": "Alice", "rank": "Patrol Leader"},
            {"name": "Bob"}
        ]
    }
    
    resp = await client.simulate_post("/patrols", json=patrol_data, headers=headers)
    assert resp.status_code == 201
    created_patrol = resp.json
    patrol_id = created_patrol["id"]
    assert created_patrol["name"] == "Scouts BSA"
    assert len(created_patrol["members"]) == 2
    
    # List Patrols
    resp = await client.simulate_get("/patrols", headers=headers)
    assert resp.status_code == 200
    assert any(p["id"] == patrol_id for p in resp.json)
    
    # Get Patrol
    resp = await client.simulate_get(f"/patrols/{patrol_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json["name"] == "Scouts BSA"
    
    # Update Patrol
    update_data = {
        "name": "Updated Patrol",
        "members": [
            {"name": "Charlie"}
        ]
    }
    resp = await client.simulate_put(f"/patrols/{patrol_id}", json=update_data, headers=headers)
    assert resp.status_code == 200
    assert resp.json["name"] == "Updated Patrol"
    assert len(resp.json["members"]) == 1
    assert resp.json["members"][0]["name"] == "Charlie"
    
    # Delete Patrol
    resp = await client.simulate_delete(f"/patrols/{patrol_id}", headers=headers)
    assert resp.status_code == 204
    
    # Verify Deleted
    resp = await client.simulate_get(f"/patrols/{patrol_id}", headers=headers)
    assert resp.status_code == 404
