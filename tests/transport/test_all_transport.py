import json
import pytest
import falcon
from falcon.testing import TestClient
from unittest.mock import AsyncMock, patch

# Import the app and register routes
from nightrunner_backend.main import app, register_routes

# Helper fixture to set up app with routes and a test client
@pytest.fixture
async def test_client():
    # Ensure routes are registered
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client

# Dummy store classes returning predictable data
class DummyScoresStore:
    def __init__(self, driver=None):
        pass

    async def aggregate_station(self, event_id, station_id):
        return [
            {
                "patrol_id": "p1",
                "patrol_name": "Patrol One",
                "task_id": "t1",
                "task_name": "Task One",
                "score_value": 10,
                "score_weight": 1,
                "weighted_score": 10,
                "active": True,
                "submitted_at": "2023-01-01T00:00:00Z",
            }
        ]

    async def aggregate_event(self, event_id):
        return [
            {
                "patrol_id": "p1",
                "patrol_name": "Patrol One",
                "station_id": "s1",
                "weighted_score": 10,
            }
        ]

class DummyBaseStore:
    def __init__(self, driver=None):
        pass

    async def list(self):
        return []
    async def create(self, data):
        return None
    async def get(self, id):
        return {"id": id, "name": "obj"}
    async def update(self, id_or_obj, data=None):
        return None
    async def delete(self, id):
        return None

# Patch the store imports in transport modules
@patch("nightrunner_backend.transport.reports_station.ScoresStore", DummyScoresStore)
@patch("nightrunner_backend.transport.reports_event.ScoresStore", DummyScoresStore)
@patch("nightrunner_backend.transport.scores.ScoresStore", DummyScoresStore)
@patch("nightrunner_backend.transport.configuration_groups.ConfigurationStore", DummyBaseStore)
@patch("nightrunner_backend.transport.configurations.ConfigurationStore", DummyBaseStore)
@patch("nightrunner_backend.transport.events.EventsStore", DummyBaseStore)
@patch("nightrunner_backend.transport.patrols.PatrolsStore", DummyBaseStore)
@patch("nightrunner_backend.transport.stations.StationsStore", DummyBaseStore)
@patch("nightrunner_backend.transport.station_assign_configuration.StationAssignConfigurationStore", DummyBaseStore)
@patch("nightrunner_backend.transport.station_assign_configuration.StationAssignConfigurationsStore", DummyBaseStore)
@patch("nightrunner_backend.transport.me.MeStore", DummyBaseStore)
@patch("nightrunner_backend.transport.login.LoginResource.__init__", lambda self: None)
@patch("nightrunner_backend.transport.middleware.auth.AuthMiddleware.process_request", AsyncMock(return_value=None))
@pytest.mark.asyncio
async def test_transport_endpoints(test_client, dev_mode_enabled):
    # Test health endpoint
    resp = await test_client.simulate_get("/health")
    assert resp.status == falcon.HTTP_200
    assert json.loads(resp.text) == {"status": "ok"}

    # Test login redirect (stubbed init does nothing, but on_get still works)
    resp = await test_client.simulate_get("/auth/login")
    assert resp.status == falcon.HTTP_302
    assert "Location" in resp.headers

    # Test station report endpoint (uses DummyScoresStore)
    resp = await test_client.simulate_get("/v1/reports/stations/s1?eventId=e1")
    assert resp.status == falcon.HTTP_200
    data = json.loads(resp.text)
    assert data["stationId"] == "s1"
    assert data["eventId"] == "e1"
    assert isinstance(data["patrols"], list)

    # Test event report endpoint
    resp = await test_client.simulate_get("/v1/reports/events/e1")
    assert resp.status == falcon.HTTP_200
    data = json.loads(resp.text)
    assert data["eventId"] == "e1"
    assert isinstance(data["patrols"], list)

    # Test a CRUD resource (stations) – create then get list
    create_body = {"name": "Station A"}
    resp = await test_client.simulate_post("/v1/stations", json=create_body)
    assert resp.status == falcon.HTTP_201
    created = json.loads(resp.text)
    assert created["name"] == "Station A"

    resp = await test_client.simulate_get("/v1/stations")
    assert resp.status == falcon.HTTP_200
    lst = json.loads(resp.text)
    assert isinstance(lst, list)

    # Test me endpoint (returns dummy data)
    resp = await test_client.simulate_get("/v1/me")
    assert resp.status == falcon.HTTP_200
    assert isinstance(json.loads(resp.text), dict)

@pytest.mark.asyncio
async def test_configuration_endpoints(test_client, dev_mode_enabled):
    # ----- Configuration Groups -----
    # List groups (should be empty)
    resp = await test_client.simulate_get("/v1/configuration-groups")
    assert resp.status == falcon.HTTP_200

    # Scores endpoint – POST submission with valid required fields
    score_body = {
        "eventId": "e1",
        "stationId": "s1",
        "patrolId": "p1",
        "scores": [{"taskId": "t1", "scoreValue": 5}]
    }
    resp = await test_client.simulate_post("/v1/scores", json=score_body)
    assert resp.status == falcon.HTTP_201
