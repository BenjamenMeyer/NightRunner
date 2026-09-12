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


@pytest.mark.asyncio
async def test_scores_complex_payloads(test_client, dev_mode_enabled):
    payload = {
        "eventId": "01a08c71-8529-7455-96e0-633e781d047b",
        "patrolId": "01a08ee6-fb8f-7fd0-8aa4-d2c56ea53f6f",
        "stationId": "01a08efc-1d04-73aa-88d1-ea640e224661",
        "timestamp": "2026-09-12T02:53:31.304Z",
        "entryMode": "live",
        "startedAt": "2026-09-12T02:52:07.179Z",
        "completedAt": "2026-09-12T02:53:28.569Z",
        "scores": [
            {
                "taskId": "task-stopwatch",
                "scoreValue": {
                    "startTime": "2026-09-12T02:52:48.474Z",
                    "endTime": "2026-09-12T02:52:49.785Z"
                }
            },
            {
                "taskId": "task-boolean",
                "scoreValue": True
            },
            {
                "taskId": "task-text",
                "scoreValue": "23fasdfwa"
            },
            {
                "taskId": "task-numeric",
                "scoreValue": 42.5
            }
        ]
    }
    resp = await test_client.simulate_post("/v1/scores", json=payload)
    assert resp.status == falcon.HTTP_201

    resp_get = await test_client.simulate_get("/v1/scores?eventId=01a08c71-8529-7455-96e0-633e781d047b&stationId=01a08efc-1d04-73aa-88d1-ea640e224661&patrolId=01a08ee6-fb8f-7fd0-8aa4-d2c56ea53f6f")
    assert resp_get.status == falcon.HTTP_200
    scores_by_task = {s["taskId"]: s["scoreValue"] for s in resp_get.json["scores"]}
    assert pytest.approx(scores_by_task["task-stopwatch"], 0.01) == 1.311
    assert scores_by_task["task-boolean"] == 1.0
    assert scores_by_task["task-text"] == 1.0
    assert scores_by_task["task-numeric"] == 42.5


@pytest.mark.asyncio
async def test_score_to_dict_datetime_handling():
    from datetime import datetime, timezone
    from nightrunner_backend.models.score import Score
    now = datetime.now(timezone.utc)
    score = Score(
        event_id="e1",
        station_id="s1",
        patrol_id="p1",
        task_id="t1",
        submitted_at=now,
        started_at=now,
        completed_at=now
    )
    score_dict = score.to_dict()
    assert score_dict["submittedAt"] == now.isoformat()
    assert score_dict["startedAt"] == now.isoformat()
    assert score_dict["completedAt"] == now.isoformat()


