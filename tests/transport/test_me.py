import pytest
import falcon
import falcon.testing
from nightrunner_backend.main import app, register_routes


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


async def _seed_user(test_database):
    """Insert a test user + role row so the middleware can resolve it."""
    await test_database.execute(
        """
        INSERT INTO users (id, external_id, username, email, display_name)
        VALUES ('u-me-test', 'test-user-id', 'testuser', 'test@example.com', 'Test User')
        """,
        {},
    )
    await test_database.execute(
        """
        INSERT INTO user_roles (user_id, role) VALUES ('u-me-test', 'scorer')
        """,
        {},
    )


class TestMeEndpoint:

    async def test_returns_user_profile_and_roles(self, test_client, test_database, token_factory):
        """Authenticated request returns the resolved user profile + roles."""
        await _seed_user(test_database)
        headers = token_factory(roles={"event-1": "scorer"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)

        assert resp.status == falcon.HTTP_200
        data = resp.json
        assert data["id"] == "u-me-test"
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["displayName"] == "Test User"
        assert "scorer" in data["roles"]

    async def test_returns_401_without_auth_header(self, test_client):
        """Request with no Authorization header is rejected."""
        resp = await test_client.simulate_get("/v1/me")
        assert resp.status == falcon.HTTP_401

    async def test_returns_401_with_invalid_token(self, test_client):
        """Request with a malformed token is rejected."""
        resp = await test_client.simulate_get(
            "/v1/me", headers={"Authorization": "Bearer not-a-real-token"}
        )
        assert resp.status == falcon.HTTP_401

    async def test_dev_mode_returns_dev_user(self, test_client, dev_mode_enabled):
        """In dev_mode the synthetic dev user is returned without a token."""
        resp = await test_client.simulate_get("/v1/me")

        assert resp.status == falcon.HTTP_200
        data = resp.json
        assert data["id"] == "dev"
        assert data["username"] == "dev_user"
        assert data["email"] == "dev@example.com"
        assert data["displayName"] == "Dev User"
        assert data["roles"] == []

    async def test_user_with_no_roles(self, test_client, test_database, token_factory):
        """A user with no assigned roles gets an empty roles list."""
        await test_database.execute(
            """
            INSERT INTO users (id, external_id, username, email, display_name)
            VALUES ('u-norole', 'test-user-id', 'noroleuser', 'norole@example.com', 'No Role User')
            """,
            {},
        )
        headers = token_factory()

        resp = await test_client.simulate_get("/v1/me", headers=headers)

        assert resp.status == falcon.HTTP_200
        assert resp.json["roles"] == []

    async def test_unknown_user_returns_401(self, test_client, token_factory):
        """A valid JWT whose sub doesn't match any local user is rejected."""
        # No user seeded — the DB is empty.
        headers = token_factory()
        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_401
