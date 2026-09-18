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
    submitted_text: Optional[str] = None
    participant_count: int = 1

    def to_dict(self) -> dict:
        def _to_iso(val):
            if hasattr(val, "isoformat"):
                return val.isoformat()
            return str(val) if val is not None else None

        return {
            "id": str(self.id) if self.id is not None else "",
            "eventId": str(self.event_id) if self.event_id is not None else "",
            "stationId": str(self.station_id) if self.station_id is not None else "",
            "patrolId": str(self.patrol_id) if self.patrol_id is not None else "",
            "taskId": str(self.task_id) if self.task_id is not None else "",
            "scoreValue": self.score_value,
            "submittedText": self.submitted_text,
            "participantCount": int(self.participant_count or 1),
            "scoreWeight": self.score_weight,
            "active": bool(self.active),
            "submittedAt": _to_iso(self.submitted_at),
            "startedAt": _to_iso(self.started_at),
            "completedAt": _to_iso(self.completed_at),
            "entryMode": self.entry_mode
        }

