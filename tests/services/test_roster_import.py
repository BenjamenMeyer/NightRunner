"""
Matching logic for the roster import.

The failure modes here run in opposite directions and both lose somebody:
merging two people removes a child from the gate list, and splitting one person
creates a phantom who never arrives. Neither is ever decided automatically, so
these tests pin down exactly which cases are surfaced for a human.
"""

import pytest

from nightrunner_backend.models.roster import (
    EventAttendee,
    build_source_key,
    normalise_category,
    normalise_troop_number,
)
from nightrunner_backend.services import roster_import
from nightrunner_backend.services.roster_import import (
    BUCKET_COLLISION,
    BUCKET_EXACT,
    BUCKET_INVALID,
    BUCKET_NEW,
    BUCKET_POSSIBLE_RENAME,
    build_plan,
)

TROOP_A_ID = "troop-a"
TROOP_B_ID = "troop-b"
TROOP_NUMBERS = {TROOP_A_ID: "GA-0594", TROOP_B_ID: "GA-0122"}


def sheet_row(first, last, troop="GA-0594", category="Youth", **extra):
    return {
        "firstName": first,
        "lastName": last,
        "troopName": troop,
        "category": category,
        **extra,
    }


def attendee(first, last, troop_id=TROOP_A_ID, category="Youth", ordinal=1, id=None):
    number = TROOP_NUMBERS[troop_id]
    return EventAttendee(
        id=id or f"{first}-{last}-{ordinal}".lower(),
        event_id="event-1",
        troop_id=troop_id,
        first_name=first,
        last_name=last,
        category=category,
        source_key=build_source_key(number, last, first),
        key_ordinal=ordinal,
    )


def buckets(plan):
    return [row["bucket"] for row in plan["rows"]]


class TestNormalisation:

    @pytest.mark.parametrize("raw,expected", [
        ("GA-0594", "GA-0594"),
        ("ga-0594", "GA-0594"),
        ("GA 0594", "GA-0594"),
        ("ga0594", "GA-0594"),
        ("TL Troop GA-0594", "GA-0594"),
        ("Troop GA_0594 (Marietta)", "GA-0594"),
    ])
    def test_troop_number_is_extracted_from_free_text(self, raw, expected):
        assert normalise_troop_number(raw) == expected

    def test_unreadable_troop_returns_none(self):
        assert normalise_troop_number("Marietta Trail Life") is None

    @pytest.mark.parametrize("raw,expected", [
        ("Youth", "Youth"),
        ("youth", "Youth"),
        ("Adult", "Adult"),
        ("Non-participant Youth", "Non-participant Youth"),
        ("non participant youth", "Non-participant Youth"),
    ])
    def test_categories_normalise(self, raw, expected):
        assert normalise_category(raw) == expected

    def test_staff_maps_to_adult(self):
        assert normalise_category("Staff") == "Adult"

    def test_unknown_category_is_not_guessed(self):
        assert normalise_category("Parent Helper") is None


class TestSourceKey:

    def test_same_name_in_different_troops_does_not_collide(self):
        a = build_source_key("GA-0594", "Smith", "John")
        b = build_source_key("GA-0122", "Smith", "John")
        assert a != b

    def test_key_ignores_case_spacing_and_punctuation(self):
        assert (
            build_source_key("GA-0594", "O'Brien", "Se an")
            == build_source_key("GA-0594", "obrien", "se  an")
        )


class TestBuildPlan:

    def test_unknown_person_is_new(self):
        plan = build_plan([sheet_row("John", "Smith")], [], TROOP_NUMBERS)
        assert buckets(plan) == [BUCKET_NEW]

    def test_known_person_matches_exactly(self):
        existing = [attendee("John", "Smith")]
        plan = build_plan([sheet_row("John", "Smith")], existing, TROOP_NUMBERS)

        assert buckets(plan) == [BUCKET_EXACT]
        assert plan["rows"][0]["existing"]["id"] == existing[0].id

    def test_same_name_different_troops_are_two_people_not_a_collision(self):
        rows = [
            sheet_row("John", "Smith", troop="GA-0594"),
            sheet_row("John", "Smith", troop="GA-0122"),
        ]
        plan = build_plan(rows, [], TROOP_NUMBERS)

        assert buckets(plan) == [BUCKET_NEW, BUCKET_NEW]
        assert plan["counts"][BUCKET_COLLISION] == 0

    def test_same_name_same_troop_is_surfaced_as_a_collision(self):
        rows = [sheet_row("John", "Smith"), sheet_row("John", "Smith")]
        plan = build_plan(rows, [], TROOP_NUMBERS)

        assert buckets(plan) == [BUCKET_COLLISION, BUCKET_COLLISION]
        assert [r["suggestedKeyOrdinal"] for r in plan["rows"]] == [1, 2]

    def test_typo_fix_is_offered_as_a_rename_not_a_duplicate(self):
        existing = [attendee("Jon", "Smith")]
        plan = build_plan([sheet_row("John", "Smith")], existing, TROOP_NUMBERS)

        assert buckets(plan) == [BUCKET_POSSIBLE_RENAME]
        assert plan["rows"][0]["existing"]["id"] == existing[0].id

    def test_a_genuinely_different_first_name_is_new_not_a_rename(self):
        existing = [attendee("Michael", "Smith")]
        plan = build_plan([sheet_row("Jennifer", "Smith")], existing, TROOP_NUMBERS)

        assert buckets(plan) == [BUCKET_NEW]

    def test_roster_person_absent_from_sheet_is_flagged(self):
        existing = [attendee("John", "Smith"), attendee("Jane", "Doe")]
        plan = build_plan([sheet_row("John", "Smith")], existing, TROOP_NUMBERS)

        assert len(plan["missingFromSheet"]) == 1
        assert plan["missingFromSheet"][0]["existing"]["firstName"] == "Jane"

    def test_rows_missing_required_fields_are_reported_not_dropped(self):
        rows = [
            sheet_row("", "Smith"),
            sheet_row("John", "Smith", troop="Marietta Trail Life"),
            sheet_row("Jane", "Doe", category="Parent Helper"),
        ]
        plan = build_plan(rows, [], TROOP_NUMBERS)

        assert plan["counts"][BUCKET_INVALID] == 3
        assert all(r["error"] for r in plan["rows"] if r["bucket"] == BUCKET_INVALID)

    def test_staff_row_is_stored_as_adult_but_keeps_its_raw_value(self):
        plan = build_plan([sheet_row("Dave", "Jones", category="Staff")], [], TROOP_NUMBERS)

        row = plan["rows"][0]
        assert row["category"] == "Adult"
        assert row["sourceCategory"] == "Staff"

    def test_troop_headcounts_expose_a_collapse(self):
        rows = [sheet_row("John", "Smith"), sheet_row("John", "Smith")]
        plan = build_plan(rows, [attendee("John", "Smith")], TROOP_NUMBERS)

        counts = {t["troopNumber"]: t for t in plan["troopHeadcounts"]}
        assert counts["GA-0594"]["sheetRows"] == 2
        assert counts["GA-0594"]["rosterPeople"] == 1


class TestParseRow:

    def test_blank_optional_fields_become_none(self):
        parsed = roster_import.parse_row(sheet_row(
            "John", "Smith", phone="  ", emergencyContact1="", emergencyContact2=None
        ))
        assert parsed["phone"] is None
        assert parsed["emergencyContact1"] is None
        assert parsed["emergencyContact2"] is None

    def test_names_are_trimmed(self):
        parsed = roster_import.parse_row(sheet_row("  John  ", "  Smith "))
        assert parsed["firstName"] == "John"
        assert parsed["lastName"] == "Smith"
