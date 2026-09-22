"""
Tests for transport/roster.py endpoints, verifying auth role checks, compliance
validation, and attendee creation endpoints.
"""

import falcon
import pytest
from falcon.testing import ASGITestClient

from nightrunner_backend.app_context import get_driver
from nightrunner_backend.main import app, register_routes


@pytest.fixture
async def test_client():
    register_routes(app)
    async with ASGITestClient(app) as client:
        yield client


async def seed_user(user_id="test-user-id", ext_id="test-user-id", is_admin=False, role=None, event_id="event-1"):
    driver = get_driver()
    await driver.execute(
        """
        INSERT INTO users (id, external_id, username, email, display_name, is_admin, status)
        VALUES (:id, :ext_id, 'testuser', 'test@example.com', 'Test User', :is_admin, 'active')
        """,
        {"id": user_id, "ext_id": ext_id, "is_admin": is_admin},
    )
    if role:
        await driver.execute(
            """
            INSERT INTO user_roles (user_id, role)
            VALUES (:user_id, :role)
            """,
            {"user_id": user_id, "role": role},
        )


class TestRosterAuthAndCompliance:

    async def test_non_admin_forbidden_from_creating_troop(self, test_client, token_factory):
        await seed_user(role="user")
        headers = token_factory(roles={"event-1": "user"}, is_admin=False)
        resp = await test_client.simulate_post(
            "/v1/troops",
            headers=headers,
            json={"number": "GA-0594", "name": "Troop 594"},
        )
        assert resp.status == falcon.HTTP_403

    async def test_event_admin_can_create_troop(self, test_client, token_factory):
        await seed_user(role="event-admin")
        headers = token_factory(roles={"event-1": "event-admin"}, is_admin=False)
        resp = await test_client.simulate_post(
            "/v1/troops",
            headers=headers,
            json={"number": "GA-0594", "name": "Troop 594"},
        )
        assert resp.status == falcon.HTTP_201
        assert resp.json["number"] == "GA-0594"

    async def test_system_admin_can_create_troop(self, test_client, token_factory):
        await seed_user(is_admin=True)
        headers = token_factory(roles={}, is_admin=True)
        resp = await test_client.simulate_post(
            "/v1/troops",
            headers=headers,
            json={"number": "GA-0122", "name": "Troop 122"},
        )
        assert resp.status == falcon.HTTP_201

    async def test_non_admin_forbidden_from_adding_attendee(self, test_client, token_factory):
        await seed_user(role="event-ops")
        headers = token_factory(roles={"event-1": "event-ops"}, is_admin=False)
        resp = await test_client.simulate_post(
            "/v1/events/event-1/attendees",
            headers=headers,
            json={
                "troopNumber": "GA-0594",
                "firstName": "John",
                "lastName": "Doe",
                "category": "Youth",
            },
        )
        assert resp.status == falcon.HTTP_403

    async def test_adult_attendee_requires_member_id_unless_waived(self, test_client, token_factory):
        await seed_user(role="event-admin")
        headers = token_factory(roles={"event-1": "event-admin"}, is_admin=False)
        resp = await test_client.simulate_post(
            "/v1/events/event-1/attendees",
            headers=headers,
            json={
                "troopNumber": "GA-0594",
                "firstName": "Adult",
                "lastName": "Leader",
                "category": "Adult",
                "youthProtectionCompleted": True,
            },
        )
        assert resp.status == falcon.HTTP_400
        assert "Member ID is required" in resp.json["description"]

    async def test_adult_attendee_requires_youth_protection_training(self, test_client, token_factory):
        await seed_user(role="event-admin")
        headers = token_factory(roles={"event-1": "event-admin"}, is_admin=False)
        resp = await test_client.simulate_post(
            "/v1/events/event-1/attendees",
            headers=headers,
            json={
                "troopNumber": "GA-0594",
                "firstName": "Adult",
                "lastName": "Leader",
                "category": "Adult",
                "memberId": "12345",
                "youthProtectionCompleted": False,
            },
        )
        assert resp.status == falcon.HTTP_400
        assert "Youth Protection Training" in resp.json["description"]

    async def test_adult_attendee_created_with_waiver_and_youth_protection(self, test_client, token_factory):
        await seed_user(role="event-admin")
        headers = token_factory(roles={"event-1": "event-admin"}, is_admin=False)
        resp = await test_client.simulate_post(
            "/v1/events/event-1/attendees",
            headers=headers,
            json={
                "troopNumber": "GA-0594",
                "firstName": "Adult",
                "lastName": "Leader",
                "category": "Adult",
                "organizerApprovedMemberIdWaiver": True,
                "youthProtectionCompleted": True,
            },
        )
        assert resp.status == falcon.HTTP_201
        assert resp.json["firstName"] == "Adult"
        assert resp.json["category"] == "Adult"
        assert resp.json["youthProtectionCompleted"] is True
