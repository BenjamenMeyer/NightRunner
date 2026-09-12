"""
Seeds a demo event, troops, and attendees for trying out the roster features
locally.

Deliberately includes the awkward cases the roster is designed around, so they
can be seen working rather than taken on trust:

  - A 'Non-participant Youth' who must NOT appear in the patrol picker, even
    though their category contains the word Youth.
  - Two different children with the same name in the same troop, who must both
    exist (this is what key_ordinal is for).
  - Two different children with the same name in DIFFERENT troops, who are
    simply two people and must never be flagged as duplicates.
  - A 'Staff' member, stored as Adult with the raw value preserved.

Usage, from the repository root:

    python scripts/seed_roster_demo.py

Re-running is safe: it reuses the demo event and troops rather than stacking
up duplicates.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uuid6  # noqa: E402

from nightrunner_backend.app_context import close_driver, get_driver, run_migrations  # noqa: E402
from nightrunner_backend.drivers.store.roster import RosterStore  # noqa: E402
from nightrunner_backend.models.roster import (  # noqa: E402
    EventAttendee,
    build_source_key,
    normalise_category,
)

DEMO_EVENT_ID = "demo-event-0001"
DEMO_EVENT_NAME = "Night Ops Demo Event"

# (troop number, first, last, sheet category)
PEOPLE = [
    ("GA-0594", "Aiden", "Brooks", "Youth"),
    ("GA-0594", "Caleb", "Turner", "Youth"),
    ("GA-0594", "Eli", "Navarro", "Youth"),
    ("GA-0594", "Mason", "Whitfield", "Youth"),
    # Same name, same troop — both must exist.
    ("GA-0594", "John", "Smith", "Youth"),
    ("GA-0594", "John", "Smith", "Youth"),
    # Must not appear in the patrol picker.
    ("GA-0594", "Tobias", "Reed", "Non-participant Youth"),
    ("GA-0594", "Marcus", "Brooks", "Adult"),
    ("GA-0594", "Dana", "Whitfield", "Staff"),

    ("GA-0122", "Owen", "Fletcher", "Youth"),
    ("GA-0122", "Silas", "Monroe", "Youth"),
    ("GA-0122", "Theo", "Lang", "Youth"),
    # Same name as a GA-0594 child — a different person, never a duplicate.
    ("GA-0122", "John", "Smith", "Youth"),
    ("GA-0122", "Priya", "Raman", "Adult"),

    ("TX-0311", "Jonah", "Castellanos", "Youth"),
    ("TX-0311", "Rowan", "Beckett", "Youth"),
    ("TX-0311", "Felix", "Okonkwo", "Youth"),
    ("TX-0311", "Nadia", "Okonkwo", "Adult"),
]


async def ensure_event(driver):
    rows = await driver.execute(
        "SELECT id FROM events WHERE id = :id", {"id": DEMO_EVENT_ID}
    )
    if rows:
        print(f"Event already exists: {DEMO_EVENT_NAME} ({DEMO_EVENT_ID})")
        return

    await driver.execute(
        "INSERT INTO events (id, name, date, description) "
        "VALUES (:id, :name, :date, :description)",
        {
            "id": DEMO_EVENT_ID,
            "name": DEMO_EVENT_NAME,
            "date": "2026-10-17",
            "description": "Seeded by scripts/seed_roster_demo.py",
        },
    )
    print(f"Created event: {DEMO_EVENT_NAME} ({DEMO_EVENT_ID})")


async def seed():
    await run_migrations()
    driver = get_driver()
    store = RosterStore(driver)

    await ensure_event(driver)

    created = 0
    skipped = 0
    ordinals = {}

    for troop_number, first, last, sheet_category in PEOPLE:
        troop = await store.ensure_troop(troop_number)
        source_key = build_source_key(troop_number, last, first)

        # Same name twice in one troop gets the next ordinal, exactly as a
        # confirmed collision would during an import.
        ordinals[source_key] = ordinals.get(source_key, 0) + 1
        ordinal = ordinals[source_key]

        if await store.find_by_key(DEMO_EVENT_ID, source_key, ordinal):
            skipped += 1
            continue

        category = normalise_category(sheet_category)
        attendee = EventAttendee(
            id=str(uuid6.uuid7()),
            event_id=DEMO_EVENT_ID,
            troop_id=troop.id,
            first_name=first,
            last_name=last,
            category=category,
            source_category=sheet_category,
            phone="555-0100" if category == "Adult" else None,
            emergency_contact_1=f"Emergency contact for {first} 555-0199",
            emergency_contact_2=None,
            source_key=source_key,
            key_ordinal=ordinal,
        )
        await store.create_attendee(attendee)
        created += 1

    attendees = await store.list_attendees(DEMO_EVENT_ID)
    youth = [a for a in attendees if a.category == "Youth"]

    print(f"\nCreated {created} attendees ({skipped} already present).")
    print(f"Roster now holds {len(attendees)} people, {len(youth)} of them patrol-eligible Youth.\n")

    troops = await store.list_troops()
    for troop in troops:
        people = await store.list_attendees_for_troop(DEMO_EVENT_ID, troop.id)
        eligible = [p for p in people if p.category == "Youth"]
        print(f"  {troop.number}: {len(people)} people, {len(eligible)} youth")

    print(f"\nEvent ID for the UI: {DEMO_EVENT_ID}")


async def main():
    try:
        await seed()
    finally:
        await close_driver()


if __name__ == "__main__":
    asyncio.run(main())
