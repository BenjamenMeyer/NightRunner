import pytest
import uuid6
import falcon.testing
from nightrunner_backend.main import app
from nightrunner_backend.app_context import get_driver, close_driver

@pytest.fixture
async def client():
    # Ensure we use a clean in-memory DB for API tests
    driver = get_driver()
    # In-memory SQLite might be tricky if get_driver() is called multiple times
    # but for now let's assume it works or we override it.
    await driver.run_migrations()
    async with falcon.testing.ASGITestClient(app) as client:
        yield client
    await close_driver()

@pytest.mark.asyncio
async def test_api_events_lifecycle(client):
    # Create Event
    event_data = {
        "name": "Night Ops 2026",
        "date": "2026-09-15",
        "description": "Annual event",
        "roundingPrecision": 1000
    }
    
    # We need to simulate auth. AuthMiddleware expects a token.
    # For now, let's see how AuthMiddleware works.
    headers = {"Authorization": "Bearer test-token"}
    
    resp = await client.simulate_post("/events", json=event_data, headers=headers)
    assert resp.status_code == 201
    created_event = resp.json
    event_id = created_event["id"]
    assert created_event["name"] == "Night Ops 2026"
    
    # List Events
    resp = await client.simulate_get("/events", headers=headers)
    assert resp.status_code == 200
    assert any(e["id"] == event_id for e in resp.json)
    
    # Get Event
    resp = await client.simulate_get(f"/events/{event_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json["name"] == "Night Ops 2026"
    
    # Update Event
    update_data = {
        "name": "Updated Night Ops",
        "date": "2026-09-16"
    }
    resp = await client.simulate_put(f"/events/{event_id}", json=update_data, headers=headers)
    assert resp.status_code == 200
    assert resp.json["name"] == "Updated Night Ops"
    
    # Delete Event
    resp = await client.simulate_delete(f"/events/{event_id}", headers=headers)
    assert resp.status_code == 204
    
    # Verify Deleted
    resp = await client.simulate_get(f"/events/{event_id}", headers=headers)
    assert resp.status_code == 404
