from typing import List, Optional
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.patrol import Patrol, PatrolMember

LIST_PATROLS = "SELECT id, program_name FROM patrols"
GET_PATROL = "SELECT id, program_name FROM patrols WHERE id = :id"
CREATE_PATROL = """
    INSERT INTO patrols (id, program_name)
    VALUES (:id, :program_name)
"""
UPDATE_PATROL = """
    UPDATE patrols
    SET program_name = :program_name
    WHERE id = :id
"""
DELETE_PATROL = "DELETE FROM patrols WHERE id = :id"

LIST_PATROL_MEMBERS = "SELECT id, patrol_id, name, rank, troop FROM patrol_members WHERE patrol_id = :patrol_id"
CREATE_PATROL_MEMBER = """
    INSERT INTO patrol_members (id, patrol_id, name, rank, troop)
    VALUES (:id, :patrol_id, :name, :rank, :troop)
"""
DELETE_PATROL_MEMBERS = "DELETE FROM patrol_members WHERE patrol_id = :patrol_id"

class PatrolsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list(self) -> List[Patrol]:
        rows = await self.driver.execute(LIST_PATROLS)
        patrols = []
        for row in rows:
            patrol = Patrol(id=row["id"], program_name=row["program_name"])
            member_rows = await self.driver.execute(LIST_PATROL_MEMBERS, {"patrol_id": patrol.id})
            patrol.members = [
                PatrolMember(
                    id=m["id"],
                    name=m["name"],
                    rank=m["rank"],
                    troop=m["troop"]
                ) for m in member_rows
            ]
            patrols.append(patrol)
        return patrols

    async def get(self, patrol_id: str) -> Optional[Patrol]:
        row = await self.driver.fetch_one(GET_PATROL, {"id": patrol_id})
        if not row:
            return None
        patrol = Patrol(id=row["id"], program_name=row["program_name"])
        member_rows = await self.driver.execute(LIST_PATROL_MEMBERS, {"patrol_id": patrol_id})
        patrol.members = [
            PatrolMember(
                id=m["id"],
                name=m["name"],
                rank=m["rank"],
                troop=m["troop"]
            ) for m in member_rows
        ]
        return patrol

    async def create(self, patrol: Patrol) -> None:
        await self.driver.execute(CREATE_PATROL, {
            "id": patrol.id,
            "program_name": patrol.program_name
        })
        for member in patrol.members:
            await self.driver.execute(CREATE_PATROL_MEMBER, {
                "id": member.id,
                "patrol_id": patrol.id,
                "name": member.name,
                "rank": member.rank,
                "troop": member.troop
            })

    async def update(self, patrol: Patrol) -> None:
        await self.driver.execute(UPDATE_PATROL, {
            "id": patrol.id,
            "program_name": patrol.program_name
        })
        # Simple sync for members: delete and re-insert
        await self.driver.execute(DELETE_PATROL_MEMBERS, {"patrol_id": patrol.id})
        for member in patrol.members:
            await self.driver.execute(CREATE_PATROL_MEMBER, {
                "id": member.id,
                "patrol_id": patrol.id,
                "name": member.name,
                "rank": member.rank,
                "troop": member.troop
            })

    async def delete(self, patrol_id: str) -> None:
        # Cascade should handle member deletion
        await self.driver.execute(DELETE_PATROL, {"id": patrol_id})
