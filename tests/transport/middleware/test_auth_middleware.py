import falcon
import pytest
from falcon import testing
from nightrunner_backend.transport.middleware.auth import AuthMiddleware
from nightrunner_backend.transport.me import MeResource

@pytest.fixture
async def client(monkeypatch):
    from nightrunner_backend.config.settings import settings
    settings.dev_mode = False
    app = falcon.asgi.App(middleware=[AuthMiddleware()])
    app.add_route('/me', MeResource())
    async with falcon.testing.ASGITestClient(app) as client:
        yield client

@pytest.mark.asyncio
async def test_missing_token(client):
    result = await client.simulate_get('/me')
    assert result.status == falcon.HTTP_401
