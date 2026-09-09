from dataclasses import dataclass, field
from typing import Any, Dict, Optional
import uuid6


@dataclass
class ConfigurationGroup:
    """A logical grouping of configurations, e.g., 'Ropework Configuration Group'."""
    id: str = field(default_factory=lambda: str(uuid6.uuid7()))
    name: str = ""
    description: Optional[str] = None

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }


@dataclass
class Configuration:
    """A single configuration that belongs to a group."""
    id: str = field(default_factory=lambda: str(uuid6.uuid7()))
    group_id: Optional[str] = None
    key: str = ""
    value: str = ""
    description: Optional[str] = None

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "group_id": self.group_id,
            "groupId": self.group_id,
            "key": self.key,
            "name": self.key,
            "value": self.value,
            "description": self.description,
        }
