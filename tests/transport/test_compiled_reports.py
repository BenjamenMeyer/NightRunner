import pytest
import falcon
from unittest.mock import patch, AsyncMock
import falcon.testing
from nightrunner_backend.main import app, register_routes


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_compiled_reports_workflow(test_client, token_factory):
    headers = token_factory()

    # 1. Trigger async report job creation
    resp = await test_client.simulate_post(
        "/v1/events/evt-123/compiled-reports",
        json={"reportType": "patrols-pdf"},
        headers=headers,
    )
    assert resp.status == falcon.HTTP_202
    data = resp.json
    report_id = data["id"]
    assert data["status"] == "generating"

    # 2. List compiled reports for the event
    list_resp = await test_client.simulate_get(
        "/v1/events/evt-123/compiled-reports",
        headers=headers,
    )
    assert list_resp.status == falcon.HTTP_200
    reports = list_resp.json["reports"]
    assert any(r["id"] == report_id for r in reports)

    # 3. Clean up / Delete compiled report
    del_resp = await test_client.simulate_delete(
        f"/v1/compiled-reports/{report_id}",
        headers=headers,
    )
    assert del_resp.status == falcon.HTTP_204
