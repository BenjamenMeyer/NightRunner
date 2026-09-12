import pytest
import falcon
from nightrunner_backend.main import app, register_routes

@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client

@pytest.mark.asyncio
async def test_scores_endpoint_and_rescore_deactivation(test_client, dev_mode_enabled):
    # 1. Create a patrol score POST
    payload1 = {
        "eventId": "event-1",
        "stationId": "station-1",
        "patrolId": "patrol-1",
        "scores": [
            {"taskId": "task-1", "scoreValue": 80.0}
        ]
    }
    resp1 = await test_client.simulate_post("/v1/scores", json=payload1)
    assert resp1.status == falcon.HTTP_201

    # 2. Query active scores via GET /v1/scores
    resp_get = await test_client.simulate_get("/v1/scores?eventId=event-1&stationId=station-1&patrolId=patrol-1")
    assert resp_get.status == falcon.HTTP_200
    data_get = resp_get.json
    assert data_get["isAlreadyScored"] is True
    assert len(data_get["scores"]) == 1
    assert data_get["scores"][0]["scoreValue"] == 80.0

    # 3. Rescore patrol (POST new score)
    payload2 = {
        "eventId": "event-1",
        "stationId": "station-1",
        "patrolId": "patrol-1",
        "scores": [
            {"taskId": "task-1", "scoreValue": 100.0}
        ]
    }
    resp2 = await test_client.simulate_post("/v1/scores", json=payload2)
    assert resp2.status == falcon.HTTP_201

    # 4. Query active scores again - should return updated active score (100.0)
    resp_get2 = await test_client.simulate_get("/v1/scores?eventId=event-1&stationId=station-1&patrolId=patrol-1")
    assert resp_get2.status == falcon.HTTP_200
    data_get2 = resp_get2.json
    assert data_get2["isAlreadyScored"] is True
    assert len(data_get2["scores"]) == 1
    assert data_get2["scores"][0]["scoreValue"] == 100.0
