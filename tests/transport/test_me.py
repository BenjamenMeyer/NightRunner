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

    async def test_dev_mode_user_is_an_admin(self, test_client, dev_mode_enabled):
        """
        The dev user is an admin so the UI is usable locally.

        Without this the event selector never appears: a non-admin with no
        event assignment has nothing to select, and every event-scoped screen
        is unreachable. Dev mode already skips token verification entirely, so
        this grants nothing that was not already granted.
        """
        resp = await test_client.simulate_get("/v1/me")

        assert resp.json["isAdmin"] is True
        assert "admin" in resp.json["roles"]

    async def test_user_with_no_roles(self, test_client, test_database, token_factory):
        """A user with no assigned roles gets an empty roles map."""
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
        assert resp.json["roles"] == {}

    async def test_unknown_user_auto_provisions(self, test_client, token_factory):
        """A valid JWT whose sub doesn't match any local user is automatically provisioned."""
        # No user seeded — the DB is empty.
        headers = token_factory()
        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert resp.json["id"] is not None
        assert resp.json["roles"] == {}

    async def test_user_with_system_admin_role(self, test_client, test_database, token_factory):
        """User with system-admin role has admin flag set to True in /v1/me response."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-sys', 'test-user-id', 'sysadmin', 'sys@example.com', 'System Admin')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-sys', 'system-admin')", {})
        headers = token_factory(roles={"global": "system-admin"}, is_admin=True)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert resp.json["isAdmin"] is True
        assert "system-admin" in resp.json["roles"]

    async def test_user_with_event_admin_role(self, test_client, test_database, token_factory):
        """User with event-admin role resolves role correctly."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-evt-adm', 'test-user-id', 'evtadmin', 'evtadmin@example.com', 'Event Admin')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-evt-adm', 'event-admin')", {})
        headers = token_factory(roles={"evt-100": "event-admin"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert "event-admin" in resp.json["roles"]

    async def test_user_with_scoring_lead_role(self, test_client, test_database, token_factory):
        """User with scoring-lead role resolves role correctly."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-sc-lead', 'test-user-id', 'sclead', 'sclead@example.com', 'Scoring Lead')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-sc-lead', 'scoring-lead')", {})
        headers = token_factory(roles={"evt-100": "scoring-lead"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert "scoring-lead" in resp.json["roles"]

    async def test_user_with_scoring_center_role(self, test_client, test_database, token_factory):
        """User with scoring-center role gets correct roles payload in /v1/me response."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-sc-1', 'test-user-id', 'scuser', 'sc@example.com', 'Scoring Center User')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-sc-1', 'scoring-center')", {})
        headers = token_factory(roles={"evt-200": "scoring-center"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert "scoring-center" in resp.json["roles"]

    async def test_user_with_scorer_role(self, test_client, test_database, token_factory):
        """User with scorer role resolves role correctly."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-scorer', 'test-user-id', 'scoreruser', 'scorer@example.com', 'Scorer User')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-scorer', 'scorer')", {})
        headers = token_factory(roles={"evt-100": "scorer"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert "scorer" in resp.json["roles"]

    async def test_user_with_station_lead_role(self, test_client, test_database, token_factory):
        """User with station-lead role resolves role correctly."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-st-lead', 'test-user-id', 'stlead', 'stlead@example.com', 'Station Lead')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-st-lead', 'station-lead')", {})
        headers = token_factory(roles={"evt-100": "station-lead"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert "station-lead" in resp.json["roles"]

    async def test_user_with_volunteer_role(self, test_client, test_database, token_factory):
        """User with volunteer role resolves role correctly."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-vol', 'test-user-id', 'volunteeruser', 'vol@example.com', 'Volunteer User')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-vol', 'volunteer')", {})
        headers = token_factory(roles={"evt-100": "volunteer"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert "volunteer" in resp.json["roles"]

    async def test_event_role_is_returned_keyed_by_event_id(self, test_client, test_database, token_factory):
        """Roles stored as "<event_id>:<role>" come back as an {eventId: role} map.

        This is the shape the frontend indexes by event ID. Returning the raw
        "<event_id>:<role>" strings instead left event admins with no event
        access and no event selector.
        """
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-evt-scoped', 'test-user-id', 'evtscoped', 'evtscoped@example.com', 'Scoped Event Admin')",
            {},
        )
        await test_database.execute(
            "INSERT INTO user_roles (user_id, role) VALUES ('u-evt-scoped', 'evt-500:event-admin')",
            {},
        )
        headers = token_factory(roles={"evt-500": "event-admin"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)

        assert resp.status == falcon.HTTP_200
        assert resp.json["roles"] == {"evt-500": "event-admin"}
        assert resp.json["rolesList"] == ["evt-500:event-admin"]

    async def test_multiple_event_roles_are_returned_as_one_map(self, test_client, test_database, token_factory):
        """A user assigned to several events gets one entry per event."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-multi', 'test-user-id', 'multiuser', 'multi@example.com', 'Multi Event User')",
            {},
        )
        await test_database.execute(
            "INSERT INTO user_roles (user_id, role) VALUES ('u-multi', 'evt-600:event-admin')",
            {},
        )
        await test_database.execute(
            "INSERT INTO user_roles (user_id, role) VALUES ('u-multi', 'evt-601:scorer')",
            {},
        )
        headers = token_factory(roles={"evt-600": "event-admin"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)

        assert resp.status == falcon.HTTP_200
        assert resp.json["roles"] == {
            "evt-600": "event-admin",
            "evt-601": "scorer",
        }

    async def test_event_role_does_not_grant_system_admin(self, test_client, test_database, token_factory):
        """An event-scoped admin role must not set the system admin flag."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-evt-only', 'test-user-id', 'evtonly', 'evtonly@example.com', 'Event Admin Only')",
            {},
        )
        await test_database.execute(
            "INSERT INTO user_roles (user_id, role) VALUES ('u-evt-only', 'evt-700:event-admin')",
            {},
        )
        headers = token_factory(roles={"evt-700": "event-admin"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)

        assert resp.status == falcon.HTTP_200
        assert resp.json["isAdmin"] is False

    async def test_user_with_general_user_role(self, test_client, test_database, token_factory):
        """User with general user role resolves role correctly."""
        await test_database.execute(
            "INSERT INTO users (id, external_id, username, email, display_name) VALUES ('u-gen', 'test-user-id', 'genuser', 'gen@example.com', 'General User')",
            {},
        )
        await test_database.execute("INSERT INTO user_roles (user_id, role) VALUES ('u-gen', 'user')", {})
        headers = token_factory(roles={"evt-100": "user"}, is_admin=False)

        resp = await test_client.simulate_get("/v1/me", headers=headers)
        assert resp.status == falcon.HTTP_200
        assert "user" in resp.json["roles"]




