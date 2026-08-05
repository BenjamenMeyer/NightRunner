from dataclasses import dataclass, field
import uuid6
from typing import Optional

@dataclass
class ConfigurationGroup:
    """A logical grouping of configurations, e.g., "Ropework Configuration Group"."""
    id: str = field(default_factory=lambda: str(uuid6.uuid7()))
    name: str = ""
    description: Optional[str] = None

@dataclass
class Configuration:
    """A single configuration that belongs to a group."""
    id: str = field(default_factory=lambda: str(uuid6.uuid7()))
    group_id: str = ""
    key: str = ""
    value: str = ""
    description: Optional[str] = None
