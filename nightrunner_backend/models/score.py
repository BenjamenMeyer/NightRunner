from dataclasses import dataclass, field
import uuid6
from typing import Optional

@dataclass
class Score:
    """A score entry for a patrol at a specific station during an event.
    Links to the event, station, patrol and the task being scored.
    """
    id: str = field(default_factory=lambda: str(uuid6.uuid7()))
    event_id: str = ""
    station_id: str = ""
    patrol_id: str = ""
    task_id: str = ""
    score_value: float = 0.0
    score_weight: float = 1.0
    active: bool = True
    submitted_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    entry_mode: str = "live"

