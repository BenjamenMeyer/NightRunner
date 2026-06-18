from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Event:
    id: str
    name: str
    date: Optional[str] = None
    description: Optional[str] = None
    rounding_precision: int = 1000
    organizers: List[str] = field(default_factory=list)
    stations: List[str] = field(default_factory=list)
    patrols: List[str] = field(default_factory=list)
