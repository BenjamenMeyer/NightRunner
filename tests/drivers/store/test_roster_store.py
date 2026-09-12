"""
Roster storage against a real database, so migration 017 and the unique
constraints are exercised rather than assumed.
"""

import uuid6

from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.roster import RosterStore
from nightrunner_backend.models.roster import EventAttendee, build_source_key


def make_attendee(event_id, troop_id, troop_number, first, last, ordinal=1, category="Youth"):
    return EventAttendee(
        id=str(uuid6.uuid7()),
        event_id=event_id,
        troop_id=troop_id,
        first_name=first,
        last_name=last,
        category=category,
        source_key=build_source_key(troop_number, last, first),
        key_ordinal=ordinal,
    )


class TestTroops:

    async def test_ensure_troop_creates_once_and_reuses(self):
        store = RosterStore(get_driver())

        first = await store.ensure_troop("GA-0594")
        second = await store.ensure_troop("GA-0594")

        assert first.id == second.id
        assert len(await store.list_troops()) == 1


class TestAttendees:

    async def test_round_trips_an_attendee(self):
        store = RosterStore(get_driver())
        troop = await store.ensure_troop("GA-0594")

        attendee = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith")
        attendee.emergency_contact_1 = "Jane Smith 555-0100"
        attendee.source_category = "Staff"
        attendee.category = "Adult"
        await store.create_attendee(attendee)

        loaded = await store.get_attendee(attendee.id)
        assert loaded.first_name == "John"
        assert loaded.category == "Adult"
        assert loaded.source_category == "Staff"
        assert loaded.emergency_contact_1 == "Jane Smith 555-0100"

    async def test_two_same_named_children_in_one_troop_both_persist(self):
        """
        The case that motivated key_ordinal. Without it the unique constraint
        makes the second child unstorable and the first is overwritten, so a
        child who exists is missing from the gate list.
        """
        store = RosterStore(get_driver())
        troop = await store.ensure_troop("GA-0594")

        first = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith", ordinal=1)
        second = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith", ordinal=2)
        await store.create_attendee(first)
        await store.create_attendee(second)

        assert await store.count_by_key("event-1", first.source_key) == 2
        assert len(await store.list_attendees("event-1")) == 2

    async def test_same_name_in_different_troops_are_separate_people(self):
        store = RosterStore(get_driver())
        troop_a = await store.ensure_troop("GA-0594")
        troop_b = await store.ensure_troop("GA-0122")

        a = make_attendee("event-1", troop_a.id, "GA-0594", "John", "Smith")
        b = make_attendee("event-1", troop_b.id, "GA-0122", "John", "Smith")
        await store.create_attendee(a)
        await store.create_attendee(b)

        assert a.source_key != b.source_key
        assert len(await store.list_attendees("event-1")) == 2

    async def test_lists_are_scoped_to_troop_and_event(self):
        store = RosterStore(get_driver())
        troop_a = await store.ensure_troop("GA-0594")
        troop_b = await store.ensure_troop("GA-0122")

        await store.create_attendee(make_attendee("event-1", troop_a.id, "GA-0594", "John", "Smith"))
        await store.create_attendee(make_attendee("event-1", troop_b.id, "GA-0122", "Jane", "Doe"))
        await store.create_attendee(make_attendee("event-2", troop_a.id, "GA-0594", "Other", "Event"))

        assert len(await store.list_attendees_for_troop("event-1", troop_a.id)) == 1
        assert len(await store.list_attendees("event-1")) == 2

    async def test_find_by_key_distinguishes_ordinals(self):
        store = RosterStore(get_driver())
        troop = await store.ensure_troop("GA-0594")

        first = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith", ordinal=1)
        second = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith", ordinal=2)
        await store.create_attendee(first)
        await store.create_attendee(second)

        found = await store.find_by_key("event-1", first.source_key, 2)
        assert found.id == second.id


class TestArrivals:

    async def test_records_and_reads_back_an_arrival(self):
        store = RosterStore(get_driver())
        troop = await store.ensure_troop("GA-0594")
        attendee = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith")
        await store.create_attendee(attendee)

        await store.record_arrival("event-1", attendee.id, "2026-09-12T17:00:00Z", None)

        arrival = await store.get_arrival(attendee.id)
        assert arrival.arrived_at == "2026-09-12T17:00:00Z"
        assert len(await store.list_arrivals("event-1")) == 1

    async def test_checking_in_twice_updates_rather_than_duplicating(self):
        store = RosterStore(get_driver())
        troop = await store.ensure_troop("GA-0594")
        attendee = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith")
        await store.create_attendee(attendee)

        await store.record_arrival("event-1", attendee.id, "2026-09-12T17:00:00Z", None)
        await store.record_arrival("event-1", attendee.id, "2026-09-12T18:00:00Z", None)

        arrivals = await store.list_arrivals("event-1")
        assert len(arrivals) == 1
        assert arrivals[0].arrived_at == "2026-09-12T18:00:00Z"

    async def test_arrival_can_be_undone(self):
        store = RosterStore(get_driver())
        troop = await store.ensure_troop("GA-0594")
        attendee = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith")
        await store.create_attendee(attendee)

        await store.record_arrival("event-1", attendee.id, "2026-09-12T17:00:00Z", None)
        await store.clear_arrival(attendee.id)

        assert await store.get_arrival(attendee.id) is None


class TestMigration:

    async def test_patrol_members_gained_attendee_id(self):
        """The column patrol members use to point at a roster person."""
        driver = get_driver()
        await driver.execute(
            "INSERT INTO patrols (id, event_id, name) VALUES ('p1', 'event-1', 'Wolves')"
        )
        await driver.execute(
            "INSERT INTO patrol_members (id, patrol_id, name, rank, troop, attendee_id) "
            "VALUES ('m1', 'p1', 'John Smith', NULL, 'GA-0594', 'attendee-1')"
        )

        rows = await driver.execute("SELECT attendee_id FROM patrol_members WHERE id = 'm1'")
        assert rows[0]["attendee_id"] == "attendee-1"

    async def test_patrol_members_attendee_id_is_optional(self):
        """Manual entry must keep working exactly as before."""
        driver = get_driver()
        await driver.execute(
            "INSERT INTO patrols (id, event_id, name) VALUES ('p2', 'event-1', 'Bears')"
        )
        await driver.execute(
            "INSERT INTO patrol_members (id, patrol_id, name, rank, troop) "
            "VALUES ('m2', 'p2', 'Hand Typed', NULL, 'GA-0594')"
        )

        rows = await driver.execute("SELECT attendee_id FROM patrol_members WHERE id = 'm2'")
        assert rows[0]["attendee_id"] is None
