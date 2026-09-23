import re
import unicodedata
from typing import Any, Dict, Optional


# Categories the roster stores. 'Staff' is deliberately absent: staff are
# adults, and nothing currently distinguishes them. The raw sheet value is kept
# on the attendee as source_category so the distinction stays recoverable.
CATEGORY_YOUTH = "Youth"
CATEGORY_ADULT = "Adult"
CATEGORY_NON_PARTICIPANT_YOUTH = "Non-participant Youth"

CATEGORIES = (
    CATEGORY_YOUTH,
    CATEGORY_ADULT,
    CATEGORY_NON_PARTICIPANT_YOUTH,
)

# Sheet value -> stored category, matched case-insensitively on a squashed form.
_CATEGORY_ALIASES = {
    "youth": CATEGORY_YOUTH,
    "adult": CATEGORY_ADULT,
    "staff": CATEGORY_ADULT,
    "nonparticipantyouth": CATEGORY_NON_PARTICIPANT_YOUTH,
    "nonparticipant": CATEGORY_NON_PARTICIPANT_YOUTH,
}

TROOP_NUMBER_PATTERN = re.compile(r"([A-Za-z]{2})[\s\-_]?(\d{4})")


def normalise_category(raw: Optional[str]) -> Optional[str]:
    """
    Maps a sheet category value onto a stored category.

    Returns None when the value is not recognised, so the caller can surface it
    rather than silently guessing at somebody's category.
    """
    if not raw:
        return None
    squashed = re.sub(r"[^a-z]", "", str(raw).lower())
    return _CATEGORY_ALIASES.get(squashed)


def normalise_troop_number(raw: Optional[str]) -> Optional[str]:
    """
    Extracts a canonical troop code (e.g. GA-0594) from whatever was typed.

    Handles 'GA-0594', 'GA 0594', 'ga0594' and 'TL Troop GA-0594' alike.
    """
    if not raw:
        return None
    match = TROOP_NUMBER_PATTERN.search(str(raw))
    if not match:
        return None
    return f"{match.group(1).upper()}-{match.group(2)}"


def _normalise_name_part(value: Optional[str]) -> str:
    """
    Flattens a name for matching: accents stripped, case folded, punctuation
    removed, internal whitespace collapsed.
    """
    if not value:
        return ""
    decomposed = unicodedata.normalize("NFKD", str(value))
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    lowered = without_accents.lower()
    cleaned = re.sub(r"[^a-z0-9\s]", "", lowered)
    return re.sub(r"\s+", " ", cleaned).strip()


def build_source_key(troop_number: str, last_name: str, first_name: str) -> str:
    """
    The key used to decide whether an imported row is somebody already known.

    Derived from the sheet's own values rather than internal IDs, so an import
    can be previewed before any troop record exists.

    Troop is part of the key, so two different children with the same name in
    different troops never collide — they are simply different people.
    """
    return "|".join([
        str(troop_number or "").upper(),
        _normalise_name_part(last_name),
        _normalise_name_part(first_name),
    ])


class Troop:
    def __init__(self, id: str, number: str, name: Optional[str] = None):
        self.id = id
        self.number = number
        self.name = name

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "number": self.number,
            "name": self.name or self.number,
        }


class EventAttendee:
    def __init__(
        self,
        id: str,
        event_id: str,
        troop_id: Optional[str] = None,
        first_name: str = "",
        last_name: str = "",
        category: str = CATEGORY_YOUTH,
        source_category: Optional[str] = None,
        phone: Optional[str] = None,
        emergency_contact_1: Optional[str] = None,
        emergency_contact_2: Optional[str] = None,
        member_id: Optional[str] = None,
        youth_protection_completed: bool = False,
        status: str = "coming",
        status_note: Optional[str] = None,
        source_key: str = "",
        key_ordinal: int = 1,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
    ):
        self.id = id
        self.event_id = event_id
        self.troop_id = troop_id
        self.first_name = first_name
        self.last_name = last_name
        self.category = category
        self.source_category = source_category
        self.phone = phone
        self.emergency_contact_1 = emergency_contact_1
        self.emergency_contact_2 = emergency_contact_2
        self.member_id = member_id
        self.youth_protection_completed = youth_protection_completed
        self.status = status
        self.status_note = status_note
        self.source_key = source_key
        self.key_ordinal = key_ordinal
        self.created_at = created_at
        self.updated_at = updated_at

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_youth(self) -> bool:
        """
        Eligible to join a patrol.

        Deliberately an exact comparison: 'Non-participant Youth' contains the
        word Youth but must never be offered for a patrol.
        """
        return self.category == CATEGORY_YOUTH

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "eventId": self.event_id,
            "troopId": self.troop_id,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "fullName": self.full_name,
            "category": self.category,
            "sourceCategory": self.source_category,
            "phone": self.phone,
            "emergencyContact1": self.emergency_contact_1,
            "emergencyContact2": self.emergency_contact_2,
            "memberId": self.member_id,
            "youthProtectionCompleted": self.youth_protection_completed,
            "status": self.status,
            "statusNote": self.status_note,
            "keyOrdinal": self.key_ordinal,
        }


class Arrival:
    def __init__(
        self,
        id: str,
        event_id: str,
        attendee_id: str,
        arrived_at: str,
        recorded_by: Optional[str] = None,
    ):
        self.id = id
        self.event_id = event_id
        self.attendee_id = attendee_id
        self.arrived_at = arrived_at
        self.recorded_by = recorded_by

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "eventId": self.event_id,
            "attendeeId": self.attendee_id,
            "arrivedAt": self.arrived_at,
            "recordedBy": self.recorded_by,
        }
