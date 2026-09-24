"""
Matching logic for the attendee roster import.

The registration sheet has no unique identifier per person and its row order is
not stable, so identity lives in NightRunner rather than in the sheet. An
import therefore has to answer one question per row: is this somebody already
known?

Everything here is pure — it takes parsed rows plus the current roster and
returns a plan. Nothing is written until an operator approves it.
"""

from typing import Any, Dict, List, Optional, Sequence

from nightrunner_backend.models.roster import (
    build_source_key,
    normalise_category,
    normalise_troop_number,
)

# Row outcomes, in the order an operator should review them.
BUCKET_EXACT = "exact"
BUCKET_NEW = "new"
BUCKET_POSSIBLE_RENAME = "possible_rename"
BUCKET_COLLISION = "collision"
BUCKET_MISSING_FROM_SHEET = "missing_from_sheet"
BUCKET_INVALID = "invalid"


def _edit_distance(a: str, b: str) -> int:
    """Levenshtein distance, used only to spot single-character name edits."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)

    previous = list(range(len(b) + 1))
    for i, ch_a in enumerate(a, start=1):
        current = [i]
        for j, ch_b in enumerate(b, start=1):
            current.append(min(
                previous[j] + 1,        # deletion
                current[j - 1] + 1,     # insertion
                previous[j - 1] + (ch_a != ch_b),  # substitution
            ))
        previous = current
    return previous[-1]


def parse_row(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalises one sheet row into the fields the roster stores.

    Returns a dict carrying either a usable row or an `error` explaining why the
    row cannot be imported. Rows are never silently dropped.
    """
    first_name = (raw.get("firstName") or "").strip()
    last_name = (raw.get("lastName") or "").strip()
    troop_raw = raw.get("troopName") or raw.get("troopNumber") or ""
    category_raw = raw.get("category")

    troop_number = normalise_troop_number(troop_raw)
    category = normalise_category(category_raw)

    error: Optional[str] = None
    if not first_name or not last_name:
        error = "Missing participant first or last name."
    elif not troop_number:
        error = f"Could not read a troop code from '{troop_raw}'."
    elif not category:
        error = f"Unrecognised category '{category_raw}'."

    return {
        "firstName": first_name,
        "lastName": last_name,
        "troopNumber": troop_number,
        "troopNameRaw": str(troop_raw).strip(),
        "category": category,
        "sourceCategory": (str(category_raw).strip() if category_raw else None),
        "phone": (raw.get("phone") or "").strip() or None,
        "emergencyContact1": (raw.get("emergencyContact1") or "").strip() or None,
        "emergencyContact2": (raw.get("emergencyContact2") or "").strip() or None,
        "primaryEmail": (raw.get("primaryEmail") or raw.get("primary_email") or raw.get("parentEmail") or raw.get("parent_email") or raw.get("email") or "").strip() or None,
        "secondaryEmail": (raw.get("secondaryEmail") or raw.get("secondary_email") or raw.get("youthEmail") or raw.get("youth_email") or "").strip() or None,
        "sourceKey": (
            build_source_key(troop_number, last_name, first_name)
            if troop_number and first_name and last_name else None
        ),
        "error": error,
    }


def _attendee_summary(attendee) -> Dict[str, Any]:
    return {
        "id": attendee.id,
        "firstName": attendee.first_name,
        "lastName": attendee.last_name,
        "category": attendee.category,
        "keyOrdinal": attendee.key_ordinal,
    }


def build_plan(
    raw_rows: Sequence[Dict[str, Any]],
    existing_attendees: Sequence[Any],
    troop_number_by_id: Dict[str, str],
) -> Dict[str, Any]:
    """
    Sorts every sheet row into a bucket and reports per-troop headcounts.

    `troop_number_by_id` maps the roster's troop IDs back to troop numbers so
    existing attendees can be keyed the same way as incoming rows.
    """
    parsed = [parse_row(row) for row in raw_rows]

    existing_by_key: Dict[str, List[Any]] = {}
    for attendee in existing_attendees:
        troop_number = troop_number_by_id.get(attendee.troop_id or "", "")
        key = build_source_key(troop_number, attendee.last_name, attendee.first_name)
        existing_by_key.setdefault(key, []).append(attendee)
    for bucket in existing_by_key.values():
        bucket.sort(key=lambda a: a.key_ordinal)

    rows_by_key: Dict[str, List[Dict[str, Any]]] = {}
    invalid: List[Dict[str, Any]] = []
    for row in parsed:
        if row["error"]:
            invalid.append({**row, "bucket": BUCKET_INVALID})
            continue
        rows_by_key.setdefault(row["sourceKey"], []).append(row)

    results: List[Dict[str, Any]] = []
    matched_attendee_ids = set()

    for key, rows in rows_by_key.items():
        existing = existing_by_key.get(key, [])

        # More than one sheet row sharing a key: either the same person
        # registered twice, or two different people with the same name in the
        # same troop. Only a human can tell, and guessing either way loses
        # somebody — so this is always surfaced.
        if len(rows) > 1:
            for index, row in enumerate(rows):
                candidate = existing[index] if index < len(existing) else None
                if candidate:
                    matched_attendee_ids.add(candidate.id)
                results.append({
                    **row,
                    "bucket": BUCKET_COLLISION,
                    "duplicateCount": len(rows),
                    "suggestedKeyOrdinal": index + 1,
                    "existing": _attendee_summary(candidate) if candidate else None,
                })
            continue

        row = rows[0]

        if existing:
            attendee = existing[0]
            matched_attendee_ids.add(attendee.id)
            results.append({
                **row,
                "bucket": BUCKET_EXACT,
                "suggestedKeyOrdinal": attendee.key_ordinal,
                "existing": _attendee_summary(attendee),
            })
            continue

        rename_candidate = _find_rename_candidate(row, existing_by_key, matched_attendee_ids)
        if rename_candidate is not None:
            results.append({
                **row,
                "bucket": BUCKET_POSSIBLE_RENAME,
                "suggestedKeyOrdinal": rename_candidate.key_ordinal,
                "existing": _attendee_summary(rename_candidate),
            })
            continue

        results.append({
            **row,
            "bucket": BUCKET_NEW,
            "suggestedKeyOrdinal": 1,
            "existing": None,
        })

    # Anyone on the roster the sheet no longer mentions.
    missing: List[Dict[str, Any]] = []
    for attendee in existing_attendees:
        if attendee.id in matched_attendee_ids:
            continue
        missing.append({
            "bucket": BUCKET_MISSING_FROM_SHEET,
            "existing": _attendee_summary(attendee),
            "troopNumber": troop_number_by_id.get(attendee.troop_id or "", ""),
        })

    return {
        "rows": results + invalid,
        "missingFromSheet": missing,
        "counts": _count_buckets(results, invalid, missing),
        "troopHeadcounts": _troop_headcounts(results, existing_attendees, troop_number_by_id),
    }


def _find_rename_candidate(row, existing_by_key, matched_attendee_ids):
    """
    Looks for an unmatched attendee in the same troop with the same last name
    and a first name one character away — the signature of a typo fix in the
    sheet, which would otherwise silently duplicate a child.
    """
    troop_prefix = f"{row['troopNumber']}|"
    row_last = row["sourceKey"].split("|")[1]
    row_first = row["sourceKey"].split("|")[2]

    for key, attendees in existing_by_key.items():
        if not key.startswith(troop_prefix):
            continue
        parts = key.split("|")
        if len(parts) < 3 or parts[1] != row_last:
            continue
        if _edit_distance(parts[2], row_first) != 1:
            continue
        for attendee in attendees:
            if attendee.id not in matched_attendee_ids:
                return attendee
    return None


def _count_buckets(results, invalid, missing) -> Dict[str, int]:
    counts = {
        BUCKET_EXACT: 0,
        BUCKET_NEW: 0,
        BUCKET_POSSIBLE_RENAME: 0,
        BUCKET_COLLISION: 0,
        BUCKET_INVALID: len(invalid),
        BUCKET_MISSING_FROM_SHEET: len(missing),
    }
    for row in results:
        counts[row["bucket"]] = counts.get(row["bucket"], 0) + 1
    return counts


def _troop_headcounts(results, existing_attendees, troop_number_by_id) -> List[Dict[str, Any]]:
    """
    Per-troop sheet rows versus people matched.

    Two people with the same name in one troop would otherwise collapse into a
    single record; a mismatch here makes that visible before anything is saved.
    """
    sheet_counts: Dict[str, int] = {}
    for row in results:
        troop = row.get("troopNumber") or ""
        sheet_counts[troop] = sheet_counts.get(troop, 0) + 1

    roster_counts: Dict[str, int] = {}
    for attendee in existing_attendees:
        troop = troop_number_by_id.get(attendee.troop_id or "", "")
        roster_counts[troop] = roster_counts.get(troop, 0) + 1

    troops = sorted(set(sheet_counts) | set(roster_counts))
    return [
        {
            "troopNumber": troop,
            "sheetRows": sheet_counts.get(troop, 0),
            "rosterPeople": roster_counts.get(troop, 0),
        }
        for troop in troops
    ]
