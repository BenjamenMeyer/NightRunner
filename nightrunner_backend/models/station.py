from dataclasses import dataclass, field
from typing import List, Optional

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
    name: str = ""
    description: Optional[str] = None
    active_configuration_id: Optional[str] = None
    members: List[StationMember] = field(default_factory=list)
