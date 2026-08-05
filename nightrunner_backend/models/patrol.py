from typing import List, Optional

class PatrolMember:
    def __init__(self, id: str, name: str, rank: Optional[str] = None, troop: Optional[str] = None):
        self.id = id
        self.name = name
        self.rank = rank
        self.troop = troop

class Patrol:
    """Patrol model with a `name` field."""
    def __init__(self, id: str, name: Optional[str] = None, members: Optional[List[PatrolMember]] = None):
        self.id = id
        self.name = name
        self.members = members if members is not None else []
