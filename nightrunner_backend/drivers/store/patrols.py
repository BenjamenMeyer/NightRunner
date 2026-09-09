from typing import List, Optional
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.patrol import Patrol, PatrolMember

LIST_PATROLS_BATCH = """
SELECT
    p.id AS patrol_id, p.event_id, p.name AS patrol_name,
    p.phone_number, p.radio_frequency, p.has_radio, p.radio_identifier,
    pm.id AS member_id, pm.name AS member_name, pm.rank, pm.troop
FROM patrols p
LEFT JOIN patrol_members pm ON p.id = pm.patrol_id
ORDER BY p.id
"""
GET_PATROL = "SELECT id, event_id, name, phone_number, radio_frequency, has_radio, radio_identifier FROM patrols WHERE id = :id"
CREATE_PATROL = """
    INSERT INTO patrols (id, event_id, name, phone_number, radio_frequency, has_radio, radio_identifier)
    VALUES (:id, :event_id, :name, :phone_number, :radio_frequency, :has_radio, :radio_identifier)
"""
UPDATE_PATROL = """
    UPDATE patrols
    SET event_id = :event_id, name = :name, phone_number = :phone_number,
        radio_frequency = :radio_frequency, has_radio = :has_radio, radio_identifier = :radio_identifier
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
        """Fetch all patrols and their members in a single batched JOIN query."""
        rows = await self.driver.execute(LIST_PATROLS_BATCH)
        patrols: dict[str, Patrol] = {}
        for row in rows:
            patrol_id = row["patrol_id"]
            if patrol_id not in patrols:
                patrols[patrol_id] = Patrol(
                    id=patrol_id,
                    event_id=row["event_id"],
                    name=row["patrol_name"],
                    phone_number=row["phone_number"],
                    radio_frequency=row["radio_frequency"],
                    has_radio=bool(row["has_radio"]),
                    radio_identifier=row["radio_identifier"],
                )
            if row["member_id"]:
                patrols[patrol_id].members.append(
                    PatrolMember(
                        id=row["member_id"],
                        name=row["member_name"],
                        rank=row["rank"],
                        troop=row["troop"],
                    )
                )
        return list(patrols.values())

    async def get(self, patrol_id: str) -> Optional[Patrol]:
        row = await self.driver.fetch_one(GET_PATROL, {"id": patrol_id})
        if not row:
            return None
        patrol = Patrol(
            id=row["id"],
            event_id=row["event_id"],
            name=row["name"],
            phone_number=row["phone_number"],
            radio_frequency=row["radio_frequency"],
            has_radio=bool(row["has_radio"]),
            radio_identifier=row["radio_identifier"],
        )
        member_rows = await self.driver.execute(LIST_PATROL_MEMBERS, {"patrol_id": patrol_id})
        patrol.members = [
            PatrolMember(id=m["id"], name=m["name"], rank=m["rank"], troop=m["troop"])
            for m in member_rows
        ]
        return patrol

    async def create(self, patrol: Patrol) -> None:
        await self.driver.execute(
            CREATE_PATROL,
            {
                "id": patrol.id,
                "event_id": patrol.event_id,
                "name": patrol.name,
                "phone_number": patrol.phone_number,
                "radio_frequency": patrol.radio_frequency,
                "has_radio": patrol.has_radio,
                "radio_identifier": patrol.radio_identifier,
            },
        )
        for member in patrol.members:
            await self.driver.execute(CREATE_PATROL_MEMBER, {
                "id": member.id,
                "patrol_id": patrol.id,
                "name": member.name,
                "rank": member.rank,
                "troop": member.troop,
            })

    async def update(self, patrol: Patrol) -> None:
        await self.driver.execute(
            UPDATE_PATROL,
            {
                "id": patrol.id,
                "event_id": patrol.event_id,
                "name": patrol.name,
                "phone_number": patrol.phone_number,
                "radio_frequency": patrol.radio_frequency,
                "has_radio": patrol.has_radio,
                "radio_identifier": patrol.radio_identifier,
            },
        )
        # Sync members: delete then re-insert
        await self.driver.execute(DELETE_PATROL_MEMBERS, {"patrol_id": patrol.id})
        for member in patrol.members:
            await self.driver.execute(CREATE_PATROL_MEMBER, {
                "id": member.id,
                "patrol_id": patrol.id,
                "name": member.name,
                "rank": member.rank,
                "troop": member.troop,
            })

    async def delete(self, patrol_id: str) -> None:
        await self.driver.execute(DELETE_PATROL, {"id": patrol_id})
