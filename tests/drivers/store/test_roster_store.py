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


class TestPatrolNumbering:
    """Patrols need a short number to be called by at an event."""

    async def test_numbers_start_at_one_per_event(self):
        from nightrunner_backend.drivers.store.patrols import PatrolsStore

        store = PatrolsStore(get_driver())
        assert await store.next_number("event-1") == 1

    async def test_numbers_increment_within_an_event(self):
        from nightrunner_backend.drivers.store.patrols import PatrolsStore
        from nightrunner_backend.models.patrol import Patrol

        store = PatrolsStore(get_driver())
        await store.create(Patrol(id="p1", event_id="event-1", name="Wolves", number=1))
        await store.create(Patrol(id="p2", event_id="event-1", name="Bears", number=2))

        assert await store.next_number("event-1") == 3

    async def test_numbering_is_scoped_to_the_event(self):
        """Patrol 1 exists at every event."""
        from nightrunner_backend.drivers.store.patrols import PatrolsStore
        from nightrunner_backend.models.patrol import Patrol

        store = PatrolsStore(get_driver())
        await store.create(Patrol(id="p1", event_id="event-1", name="Wolves", number=1))

        assert await store.next_number("event-2") == 1


class TestAttendeeAssignments:
    """Nobody may be placed in two patrols."""

    async def _seed_attendee(self, store, event_id="event-1"):
        troop = await store.ensure_troop("GA-0594")
        attendee = make_attendee(event_id, troop.id, "GA-0594", "John", "Smith")
        await store.create_attendee(attendee)
        return attendee

    async def test_reports_the_patrol_an_attendee_is_on(self):
        from nightrunner_backend.drivers.store.patrols import PatrolsStore
        from nightrunner_backend.models.patrol import Patrol, PatrolMember

        roster = RosterStore(get_driver())
        attendee = await self._seed_attendee(roster)

        patrols = PatrolsStore(get_driver())
        await patrols.create(Patrol(
            id="p1",
            event_id="event-1",
            name="Wolves",
            number=3,
            members=[PatrolMember(
                id="m1", name="John Smith", troop="GA-0594", attendee_id=attendee.id
            )],
        ))

        assignments = await patrols.attendee_assignments("event-1")
        assert assignments[attendee.id]["patrolNumber"] == 3
        assert assignments[attendee.id]["patrolName"] == "Wolves"

    async def test_attendee_id_survives_a_patrol_save(self):
        """
        PatrolStore.update deletes and re-inserts every member, so the link is
        only kept because it is written back. Without this the picker silently
        loses the roster link on every edit.
        """
        from nightrunner_backend.drivers.store.patrols import PatrolsStore
        from nightrunner_backend.models.patrol import Patrol, PatrolMember

        roster = RosterStore(get_driver())
        attendee = await self._seed_attendee(roster)

        patrols = PatrolsStore(get_driver())
        patrol = Patrol(
            id="p1",
            event_id="event-1",
            name="Wolves",
            number=1,
            members=[PatrolMember(
                id="m1", name="John Smith", troop="GA-0594", attendee_id=attendee.id
            )],
        )
        await patrols.create(patrol)

        reloaded = await patrols.get("p1")
        assert reloaded.members[0].attendee_id == attendee.id

        reloaded.name = "Renamed"
        await patrols.update(reloaded)

        again = await patrols.get("p1")
        assert again.members[0].attendee_id == attendee.id

    async def test_unassigned_attendees_are_absent_from_the_map(self):
        from nightrunner_backend.drivers.store.patrols import PatrolsStore

        roster = RosterStore(get_driver())
        attendee = await self._seed_attendee(roster)

        assignments = await PatrolsStore(get_driver()).attendee_assignments("event-1")
        assert attendee.id not in assignments

    async def test_number_survives_an_update_that_does_not_mention_it(self):
        """
        The editor shows the number read-only and omits it from the save
        payload. UPDATE still writes the column, so the value has to be carried
        on the model or a plain rename would wipe it.
        """
        from nightrunner_backend.drivers.store.patrols import PatrolsStore
        from nightrunner_backend.models.patrol import Patrol

        store = PatrolsStore(get_driver())
        await store.create(Patrol(id="p9", event_id="event-1", name="Wolves", number=7))

        loaded = await store.get("p9")
        loaded.name = "Renamed"
        await store.update(loaded)

        assert (await store.get("p9")).number == 7


class TestOrdinalAllocation:
    """
    Ordinals separate two real people who share a name, so they should be
    contiguous. A lone record at ordinal 3 means "person 3 of 3" shows against
    somebody who is the only one.
    """

    async def _troop(self, store):
        return await store.ensure_troop("GA-0594")

    async def test_first_person_with_a_name_gets_ordinal_one(self):
        store = RosterStore(get_driver())
        key = build_source_key("GA-0594", "Smith", "John")

        assert await store.next_free_ordinal("event-1", key) == 1

    async def test_second_person_with_the_same_name_gets_two(self):
        store = RosterStore(get_driver())
        troop = await self._troop(store)
        first = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith", ordinal=1)
        await store.create_attendee(first)

        assert await store.next_free_ordinal("event-1", first.source_key) == 2

    async def test_fills_a_gap_rather_than_climbing(self):
        """A record at 3 with 1 and 2 free must not push the next one to 4."""
        store = RosterStore(get_driver())
        troop = await self._troop(store)
        stray = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith", ordinal=3)
        await store.create_attendee(stray)

        assert await store.next_free_ordinal("event-1", stray.source_key) == 1

    async def test_ordinals_are_scoped_per_name_and_event(self):
        store = RosterStore(get_driver())
        troop = await self._troop(store)
        taken = make_attendee("event-1", troop.id, "GA-0594", "John", "Smith", ordinal=1)
        await store.create_attendee(taken)

        other_name = build_source_key("GA-0594", "Doe", "Jane")
        assert await store.next_free_ordinal("event-1", other_name) == 1
        assert await store.next_free_ordinal("event-2", taken.source_key) == 1
