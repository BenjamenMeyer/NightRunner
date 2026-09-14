import pytest
import falcon
from unittest.mock import patch, AsyncMock
from nightrunner_backend.models.patrol import Patrol, PatrolMember
from nightrunner_backend.models.event import Event


import falcon.testing
from nightrunner_backend.main import app, register_routes


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_event_patrols_pdf_endpoint(test_client, token_factory):
    fake_event = Event(id="evt-123", name="Night Ops 2026")
    fake_patrol = Patrol(
        id="patrol-456",
        event_id="evt-123",
        name="Alpha Patrol",
        number=1,
        members=[
            PatrolMember(id="m1", name="John Doe", rank="First Class", troop="Troop 101")
        ]
    )

    headers = token_factory()
    with patch("nightrunner_backend.drivers.store.events.EventsStore.get", AsyncMock(return_value=fake_event)), \
         patch("nightrunner_backend.drivers.store.patrols.PatrolsStore.list", AsyncMock(return_value=[fake_patrol])):
        resp = await test_client.simulate_get("/v1/reports/events/evt-123/patrols-pdf", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert resp.headers["content-type"] == "application/pdf"
        assert 'filename="event-evt-123-patrols.pdf"' in resp.headers["content-disposition"]
        assert resp.content.startswith(b"%PDF")
