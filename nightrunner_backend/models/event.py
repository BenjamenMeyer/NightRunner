from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


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

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "date": self.date,
            "description": self.description,
            "roundingPrecision": self.rounding_precision,
            "organizers": self.organizers,
            "stations": self.stations,
            "patrols": self.patrols,
        }
