from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class StationMember:
    """Member of a station (e.g., a user with a role)."""
    user_id: str
    role: str


@dataclass
class Station:
    """Station entity.
    active_configuration_id links to a Configuration.
    members is a list of StationMember.
    """
    id: str = field(default_factory=lambda: "")
    event_id: Optional[str] = None
    name: str = ""
    description: Optional[str] = None
    # How the station is scored, in plain English for families. Printed on the
    # per-troop results report; `description` is written for volunteers.
    scoring_explanation: Optional[str] = None
    active_configuration_id: Optional[str] = None
    station_weight: float = 1.0
    members: List[StationMember] = field(default_factory=list)
    tasks: list = field(default_factory=list)

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "eventId": self.event_id,
            "name": self.name,
            "description": self.description,
            "scoringExplanation": self.scoring_explanation,
            "activeConfigurationId": self.active_configuration_id,
            "stationWeight": self.station_weight,
            "members": self.members,
            "tasks": self.tasks,
        }
