from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class PatrolMember:
    id: str
    name: str
    rank: Optional[str] = None
    troop: Optional[str] = None

@dataclass
class Patrol:
    id: str
    program_name: str
    members: List[PatrolMember] = field(default_factory=list)
