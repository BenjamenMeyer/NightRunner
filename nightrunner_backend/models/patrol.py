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
    """Patrol model with a `name` field."""
    def __init__(self, id: str, event_id: Optional[str] = None, name: Optional[str] = None, members: Optional[List[PatrolMember]] = None):
        self.id = id
        self.event_id = event_id
        self.name = name
        self.members = members if members is not None else []

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "eventId": self.event_id,
            "name": self.name,
            "members": [m.to_api_dict() for m in self.members],
        }
