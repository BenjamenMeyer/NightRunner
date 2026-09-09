from typing import Any, Dict, List, Optional


class PatrolMember:
    def __init__(self, id: str, name: str, rank: Optional[str] = None, troop: Optional[str] = None):
        self.id = id
        self.name = name
        self.rank = rank
        self.troop = troop

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "rank": self.rank,
            "troop": self.troop,
        }


class Patrol:
    """Patrol model with a `name` field and communication details."""
    def __init__(
        self,
        id: str,
        event_id: Optional[str] = None,
        name: Optional[str] = None,
        members: Optional[List[PatrolMember]] = None,
        phone_number: Optional[str] = None,
        radio_frequency: Optional[str] = None,
        radio_channel: Optional[str] = None,
        has_radio: bool = False,
        radio_identifier: Optional[str] = None,
    ):
        self.id = id
        self.event_id = event_id
        self.name = name
        self.members = members if members is not None else []
        self.phone_number = phone_number
        self.radio_frequency = radio_frequency
        self.radio_channel = radio_channel
        self.has_radio = has_radio
        self.radio_identifier = radio_identifier

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "eventId": self.event_id,
            "name": self.name,
            "phoneNumber": self.phone_number,
            "radioFrequency": self.radio_frequency,
            "radioChannel": self.radio_channel,
            "hasRadio": bool(self.has_radio),
            "radioIdentifier": self.radio_identifier,
            "members": [m.to_api_dict() for m in self.members],
        }
