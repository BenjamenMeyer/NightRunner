import falcon
import pytest
import time
import jwt
from falcon import testing
from nightrunner_backend.transport.middleware.auth import AuthMiddleware
from nightrunner_backend.transport.me import MeResource
from nightrunner_backend.app_context import get_driver

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

@pytest.mark.asyncio
async def test_jit_user_auto_provisioning(client, rsa_keypair):
    private_pem, _ = rsa_keypair
    payload = {
        "sub": "firebase-new-user-123",
        "iss": "http://test-issuer",
        "aud": "test-audience",
        "exp": int(time.time() + 3600),
        "email": "social_user@example.com",
        "name": "Social User",
    }
    token = jwt.encode(payload, private_pem, algorithm="RS256")
    headers = {"X-Forwarded-Authorization": f"Bearer {token}"}

    # First request: User does not exist in DB yet
    result = await client.simulate_get('/me', headers=headers)
    assert result.status == falcon.HTTP_200
    data = result.json
    assert data["email"] == "social_user@example.com"
    assert data["displayName"] == "Social User"

    # Verify user was inserted into DB
    db = get_driver()
    rows = await db.execute(
        "SELECT * FROM users WHERE external_id = :ext_id",
        {"ext_id": "firebase-new-user-123"}
    )
    assert len(rows) == 1
    assert rows[0]["email"] == "social_user@example.com"

@pytest.mark.asyncio
async def test_require_iam_proxy_auth(monkeypatch, rsa_keypair):
    from nightrunner_backend.config.settings import settings
    monkeypatch.setattr(settings, "dev_mode", False)
    monkeypatch.setattr(settings, "require_iam_proxy_auth", True)

    app = falcon.asgi.App(middleware=[AuthMiddleware()])
    app.add_route('/me', MeResource())

    private_pem, _ = rsa_keypair
    payload = {
        "sub": "proxy-user-123",
        "iss": "http://test-issuer",
        "aud": "test-audience",
        "exp": int(time.time() + 3600),
        "email": "proxy@example.com",
    }
    token = jwt.encode(payload, private_pem, algorithm="RS256")

    iam_token = jwt.encode({"sub": "sa-cloud-runner@project.iam.gserviceaccount.com", "exp": int(time.time() + 3600)}, private_pem, algorithm="RS256")

    async with falcon.testing.ASGITestClient(app) as client:
        # Request missing standard Authorization header -> 401
        res = await client.simulate_get('/me', headers={"X-Forwarded-Authorization": f"Bearer {token}"})
        assert res.status == falcon.HTTP_401

        # Request missing X-Forwarded-Authorization header -> 401
        res = await client.simulate_get('/me', headers={"Authorization": f"Bearer {iam_token}"})
        assert res.status == falcon.HTTP_401

        # Both headers present -> 200
        headers = {
            "Authorization": f"Bearer {iam_token}",
            "X-Forwarded-Authorization": f"Bearer {token}"
        }
        res = await client.simulate_get('/me', headers=headers)
        assert res.status == falcon.HTTP_200

