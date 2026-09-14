import asyncio
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

    # 1. Trigger first async report job creation
    resp1 = await test_client.simulate_post(
        "/v1/events/evt-123/compiled-reports",
        json={"reportType": "patrols-pdf"},
        headers=headers,
    )
    assert resp1.status == falcon.HTTP_202
    data1 = resp1.json
    report_id1 = data1["id"]
    assert data1["status"] == "generating"

    # 2. Trigger second async report job creation of the SAME type
    await asyncio.sleep(0.01)
    resp2 = await test_client.simulate_post(
        "/v1/events/evt-123/compiled-reports",
        json={"reportType": "patrols-pdf"},
        headers=headers,
    )
    assert resp2.status == falcon.HTTP_202
    data2 = resp2.json
    report_id2 = data2["id"]
    assert report_id1 != report_id2

    # 3. List compiled reports for the event - both versions should coexist, newest first
    list_resp = await test_client.simulate_get(
        "/v1/events/evt-123/compiled-reports",
        headers=headers,
    )
    assert list_resp.status == falcon.HTTP_200
    reports = list_resp.json["reports"]
    assert len(reports) >= 2
    report_ids = [r["id"] for r in reports]
    assert report_id2 in report_ids
    assert report_id1 in report_ids
    # Verify newest report (report_id2) appears BEFORE older report (report_id1)
    assert report_ids.index(report_id2) < report_ids.index(report_id1)

    # 4. Clean up / Delete compiled reports
    await test_client.simulate_delete(f"/v1/compiled-reports/{report_id1}", headers=headers)
    await test_client.simulate_delete(f"/v1/compiled-reports/{report_id2}", headers=headers)
