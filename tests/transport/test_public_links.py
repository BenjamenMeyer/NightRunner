"""Tests for the public, token-authenticated event links.

Covers both scopes: the read-only progress board and the volunteer check-in
page. The privacy assertions here are deliberately written as assertions about
*absence* — if someone later widens the public projection to return the full
patrol record, these fail rather than quietly leaking phone numbers, radio
details or youth names.
"""

from datetime import datetime, timedelta, timezone

import falcon
import pytest
import uuid6

from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.event_access_tokens import EventAccessTokensStore
from nightrunner_backend.main import app, register_routes
from nightrunner_backend.models.event_access_token import (
    SCOPE_CHECKIN,
    SCOPE_PROGRESS,
    EventAccessToken,
    generate_token,
    hash_token,
)

EVENT_ID = "evt-public-1"
OTHER_EVENT_ID = "evt-public-2"


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


async def _seed_event(driver, event_id=EVENT_ID, name="Night Runner 2026", theme="night-ops"):
    await driver.execute(
        "INSERT INTO events (id, name, date, theme) VALUES (:id, :name, :date, :theme)",
        {"id": event_id, "name": name, "date": "2026-10-10", "theme": theme},
    )


async def _seed_station(driver, station_id, event_id=EVENT_ID, name="First Aid"):
    await driver.execute(
        "INSERT INTO stations (id, event_id, name) VALUES (:id, :event_id, :name)",
        {"id": station_id, "event_id": event_id, "name": name},
    )


async def _seed_patrol(driver, patrol_id, event_id=EVENT_ID, name="Eagles", number=7):
    await driver.execute(
        """INSERT INTO patrols (id, event_id, name, number, phone_number,
                                radio_frequency, radio_channel, radio_identifier)
           VALUES (:id, :event_id, :name, :number, :phone, :freq, :chan, :ident)""",
        {
            "id": patrol_id,
            "event_id": event_id,
            "name": name,
            "number": number,
            # Seeded precisely so the privacy assertions have something to catch.
            "phone": "555-0100",
            "freq": "146.520",
            "chan": "3",
            "ident": "EAGLE-ACTUAL",
        },
    )


async def _seed_member(driver, patrol_id, name, troop):
    await driver.execute(
        "INSERT INTO patrol_members (id, patrol_id, name, troop) VALUES (:id, :pid, :name, :troop)",
        {"id": str(uuid6.uuid7()), "pid": patrol_id, "name": name, "troop": troop},
    )


async def _mint(scope, event_id=EVENT_ID, expires_at=None, revoked_at=None, station_id=None):
    """Create a token directly in the store and hand back the plaintext."""
    plaintext = generate_token()
    token = EventAccessToken(
        event_id=event_id,
        token_hash=hash_token(plaintext),
        scope=scope,
        station_id=station_id,
        expires_at=expires_at,
        revoked_at=revoked_at,
    )
    await EventAccessTokensStore(get_driver()).create(token)
    return plaintext, token


# --------------------------------------------------------------------------
# Progress board
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_progress_returns_board_without_any_login(test_client, test_database):
    await _seed_event(test_database)
    await _seed_station(test_database, "st-1")
    await _seed_patrol(test_database, "pat-1")
    await _seed_member(test_database, "pat-1", "Alex Youth", "GA-0594")
    plaintext, _ = await _mint(SCOPE_PROGRESS)

    # No Authorization header of any kind.
    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")

    assert resp.status == falcon.HTTP_200
    body = resp.json
    assert body["event"]["name"] == "Night Runner 2026"
    assert [s["name"] for s in body["stations"]] == ["First Aid"]
    assert body["patrols"][0]["number"] == 7
    assert body["patrols"][0]["name"] == "Eagles"


@pytest.mark.asyncio
async def test_progress_derives_troops_and_handles_mixed_patrols(test_client, test_database):
    await _seed_event(test_database)
    await _seed_patrol(test_database, "pat-1")
    await _seed_patrol(test_database, "pat-2", name="Hawks", number=8)
    # A mixed-troop patrol, which is the common case at this event.
    await _seed_member(test_database, "pat-1", "Alex Youth", "GA-0612")
    await _seed_member(test_database, "pat-1", "Sam Youth", "GA-0594")
    await _seed_member(test_database, "pat-1", "Jo Youth", "GA-0594")  # duplicate troop
    plaintext, _ = await _mint(SCOPE_PROGRESS)

    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")
    patrols = {p["name"]: p for p in resp.json["patrols"]}

    # Distinct, sorted, no duplicates.
    assert patrols["Eagles"]["troops"] == ["GA-0594", "GA-0612"]
    # A patrol with no member troop data is empty, not an error.
    assert patrols["Hawks"]["troops"] == []


@pytest.mark.asyncio
async def test_progress_never_exposes_contact_details_or_member_names(test_client, test_database):
    await _seed_event(test_database)
    await _seed_patrol(test_database, "pat-1")
    await _seed_member(test_database, "pat-1", "Alex Youth", "GA-0594")
    plaintext, _ = await _mint(SCOPE_PROGRESS)

    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")
    raw = resp.text

    # Assert on the serialized body, so a field nested anywhere is still caught.
    assert "555-0100" not in raw
    assert "146.520" not in raw
    assert "EAGLE-ACTUAL" not in raw
    assert "Alex Youth" not in raw
    for forbidden in ("phoneNumber", "phone_number", "radioFrequency", "radio_frequency",
                      "radioChannel", "radioIdentifier", "members"):
        assert forbidden not in raw


@pytest.mark.asyncio
async def test_progress_carries_no_scores(test_client, test_database):
    await _seed_event(test_database)
    await _seed_patrol(test_database, "pat-1")
    plaintext, _ = await _mint(SCOPE_PROGRESS)

    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")
    raw = resp.text.lower()

    assert "score" not in raw


@pytest.mark.asyncio
async def test_progress_is_scoped_to_its_own_event(test_client, test_database):
    await _seed_event(test_database)
    await _seed_event(test_database, OTHER_EVENT_ID, name="Some Other Event")
    await _seed_station(test_database, "st-1", EVENT_ID, "First Aid")
    await _seed_station(test_database, "st-2", OTHER_EVENT_ID, "Secret Station")
    await _seed_patrol(test_database, "pat-1", EVENT_ID, "Eagles", 7)
    await _seed_patrol(test_database, "pat-2", OTHER_EVENT_ID, "Otters", 9)
    plaintext, _ = await _mint(SCOPE_PROGRESS, EVENT_ID)

    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")
    raw = resp.text

    assert "Secret Station" not in raw
    assert "Otters" not in raw
    assert "Some Other Event" not in raw


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_token_kind", ["unknown", "revoked", "expired", "wrong_scope"])
async def test_progress_rejects_bad_tokens_identically(test_client, test_database, bad_token_kind):
    """Every failure mode must be indistinguishable from outside."""
    await _seed_event(test_database)

    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    if bad_token_kind == "unknown":
        plaintext = generate_token()
    elif bad_token_kind == "revoked":
        plaintext, _ = await _mint(SCOPE_PROGRESS, revoked_at=past)
    elif bad_token_kind == "expired":
        plaintext, _ = await _mint(SCOPE_PROGRESS, expires_at=past)
    else:
        # A valid check-in token replayed against the progress route.
        plaintext, _ = await _mint(SCOPE_CHECKIN)

    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")

    assert resp.status == falcon.HTTP_404
    assert resp.json["title"] == "Link not found"
    assert resp.json["description"] == (
        "This link is not valid. Ask the event organiser for a current one."
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("theme", ["night-ops", "trail-life", "ahg"])
async def test_progress_returns_the_events_theme(test_client, test_database, theme):
    """The page needs this to render the event's palette.

    Without it the public page falls back to whatever branding the browser last
    stored — and since night-ops is dark while trail-life and ahg are light,
    guessing wrong puts light text on a light background.
    """
    await _seed_event(test_database, theme=theme)
    plaintext, _ = await _mint(SCOPE_PROGRESS)

    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")

    assert resp.json["event"]["theme"] == theme


@pytest.mark.asyncio
async def test_checkin_returns_the_events_theme(test_client, test_database):
    await _seed_event(test_database, theme="ahg")
    plaintext, _ = await _mint(SCOPE_CHECKIN)

    resp = await test_client.simulate_get(f"/v1/public/checkin/{plaintext}")

    assert resp.json["event"]["theme"] == "ahg"


@pytest.mark.asyncio
async def test_event_with_no_theme_falls_back(test_client, test_database):
    await test_database.execute(
        "INSERT INTO events (id, name, date) VALUES (:id, :name, :date)",
        {"id": "evt-no-theme", "name": "Themeless", "date": "2026-10-10"},
    )
    plaintext, _ = await _mint(SCOPE_PROGRESS, "evt-no-theme")

    resp = await test_client.simulate_get(f"/v1/public/progress/{plaintext}")

    assert resp.json["event"]["theme"] == "night-ops"


@pytest.mark.asyncio
async def test_progress_records_last_used(test_client, test_database):
    await _seed_event(test_database)
    plaintext, token = await _mint(SCOPE_PROGRESS)

    store = EventAccessTokensStore(get_driver())
    assert (await store.get(token.id)).last_used_at is None

    await test_client.simulate_get(f"/v1/public/progress/{plaintext}")

    assert (await store.get(token.id)).last_used_at is not None


# --------------------------------------------------------------------------
# Volunteer check-in
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_checkin_bootstrap_and_round_trip(test_client, test_database):
    await _seed_event(test_database)
    await _seed_station(test_database, "st-1")
    await _seed_patrol(test_database, "pat-1")
    plaintext, _ = await _mint(SCOPE_CHECKIN)

    bootstrap = await test_client.simulate_get(f"/v1/public/checkin/{plaintext}")
    assert bootstrap.status == falcon.HTTP_200
    assert bootstrap.json["stations"][0]["id"] == "st-1"

    checked_in = await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/check-in",
        json={"stationId": "st-1", "patrolId": "pat-1", "timestamp": "2026-10-10T20:00:00Z"},
    )
    assert checked_in.status in (falcon.HTTP_200, falcon.HTTP_201)
    assert checked_in.json["checkedInAt"] == "2026-10-10T20:00:00Z"
    assert checked_in.json["status"] == "checked_in"

    checked_out = await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/check-out",
        json={"stationId": "st-1", "patrolId": "pat-1", "timestamp": "2026-10-10T20:30:00Z"},
    )
    assert checked_out.status in (falcon.HTTP_200, falcon.HTTP_201)
    assert checked_out.json["checkedOutAt"] == "2026-10-10T20:30:00Z"
    assert checked_out.json["status"] == "checked_out"


@pytest.mark.asyncio
async def test_checkin_rejects_ids_from_another_event(test_client, test_database):
    await _seed_event(test_database)
    await _seed_event(test_database, OTHER_EVENT_ID, name="Some Other Event")
    await _seed_station(test_database, "st-1", EVENT_ID)
    await _seed_station(test_database, "st-other", OTHER_EVENT_ID, "Their Station")
    await _seed_patrol(test_database, "pat-1", EVENT_ID)
    await _seed_patrol(test_database, "pat-other", OTHER_EVENT_ID, "Otters", 9)
    plaintext, _ = await _mint(SCOPE_CHECKIN, EVENT_ID)

    foreign_station = await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/check-in",
        json={"stationId": "st-other", "patrolId": "pat-1"},
    )
    assert foreign_station.status == falcon.HTTP_400

    foreign_patrol = await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/check-in",
        json={"stationId": "st-1", "patrolId": "pat-other"},
    )
    assert foreign_patrol.status == falcon.HTTP_400


@pytest.mark.asyncio
async def test_progress_token_cannot_write_visits(test_client, test_database):
    """The whole point of the scope column."""
    await _seed_event(test_database)
    await _seed_station(test_database, "st-1")
    await _seed_patrol(test_database, "pat-1")
    plaintext, _ = await _mint(SCOPE_PROGRESS)

    resp = await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/check-in",
        json={"stationId": "st-1", "patrolId": "pat-1"},
    )

    assert resp.status == falcon.HTTP_404


@pytest.mark.asyncio
async def test_checkin_refuses_a_completed_attempt(test_client, test_database):
    """The public route inherits the guard from the shared visit logic."""
    await _seed_event(test_database)
    await _seed_station(test_database, "st-1")
    await _seed_patrol(test_database, "pat-1")
    plaintext, _ = await _mint(SCOPE_CHECKIN)

    await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/check-in",
        json={"stationId": "st-1", "patrolId": "pat-1"},
    )
    await test_database.execute(
        "UPDATE station_visits SET status = 'completed' WHERE patrol_id = :pid",
        {"pid": "pat-1"},
    )

    resp = await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/check-in",
        json={"stationId": "st-1", "patrolId": "pat-1"},
    )

    assert resp.status == falcon.HTTP_409


@pytest.mark.asyncio
async def test_no_public_reset_route_exists(test_client, test_database):
    """Reset reopens finalised scoring and must stay unreachable publicly."""
    await _seed_event(test_database)
    plaintext, _ = await _mint(SCOPE_CHECKIN)

    resp = await test_client.simulate_post(
        f"/v1/public/checkin/{plaintext}/reset",
        json={"stationId": "st-1", "patrolId": "pat-1"},
    )

    assert resp.status == falcon.HTTP_404


# --------------------------------------------------------------------------
# Middleware
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_non_public_paths_still_require_authentication(test_client, test_database):
    """The bypass must be confined to /v1/public/."""
    resp = await test_client.simulate_get("/v1/events")
    assert resp.status == falcon.HTTP_401


@pytest.mark.asyncio
async def test_public_path_prefix_is_exact():
    """A path merely containing the prefix must not be treated as public."""
    from nightrunner_backend.transport.middleware.auth import is_public_path

    assert is_public_path("/v1/public/progress/abc")
    assert not is_public_path("/v1/events")
    assert not is_public_path("/v1/not/v1/public/sneaky")
