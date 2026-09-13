from typing import List, Optional
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.patrol import Patrol, PatrolMember

LIST_PATROLS_BATCH = """
SELECT
    p.id AS patrol_id, p.event_id, p.name AS patrol_name, p.number AS patrol_number,
    p.phone_number, p.radio_frequency, p.radio_channel, p.has_radio, p.radio_identifier,
    pm.id AS member_id, pm.name AS member_name, pm.rank, pm.troop, pm.attendee_id
FROM patrols p
LEFT JOIN patrol_members pm ON p.id = pm.patrol_id
ORDER BY p.id
"""
LIST_PATROLS_BATCH_BY_EVENT = """
SELECT
    p.id AS patrol_id, p.event_id, p.name AS patrol_name, p.number AS patrol_number,
    p.phone_number, p.radio_frequency, p.radio_channel, p.has_radio, p.radio_identifier,
    pm.id AS member_id, pm.name AS member_name, pm.rank, pm.troop, pm.attendee_id
FROM patrols p
LEFT JOIN patrol_members pm ON p.id = pm.patrol_id
WHERE p.event_id = :event_id
ORDER BY p.id
"""
GET_PATROL = "SELECT id, event_id, name, number, phone_number, radio_frequency, radio_channel, has_radio, radio_identifier FROM patrols WHERE id = :id"
CREATE_PATROL = """
    INSERT INTO patrols (id, event_id, name, number, phone_number, radio_frequency, radio_channel, has_radio, radio_identifier)
    VALUES (:id, :event_id, :name, :number, :phone_number, :radio_frequency, :radio_channel, :has_radio, :radio_identifier)
"""
UPDATE_PATROL = """
    UPDATE patrols
    SET event_id = :event_id, name = :name, number = :number, phone_number = :phone_number,
        radio_frequency = :radio_frequency, radio_channel = :radio_channel,
        has_radio = :has_radio, radio_identifier = :radio_identifier
    WHERE id = :id
"""
DELETE_PATROL = "DELETE FROM patrols WHERE id = :id"
MAX_PATROL_NUMBER = "SELECT MAX(number) AS max_number FROM patrols WHERE event_id = :event_id"
FIND_ATTENDEE_ASSIGNMENTS = """
SELECT pm.attendee_id, p.id AS patrol_id, p.name AS patrol_name, p.number AS patrol_number
FROM patrol_members pm
JOIN patrols p ON p.id = pm.patrol_id
WHERE p.event_id = :event_id AND pm.attendee_id IS NOT NULL
"""

LIST_PATROL_MEMBERS = "SELECT id, patrol_id, name, rank, troop, attendee_id FROM patrol_members WHERE patrol_id = :patrol_id"
CREATE_PATROL_MEMBER = """
    INSERT INTO patrol_members (id, patrol_id, name, rank, troop, attendee_id)
    VALUES (:id, :patrol_id, :name, :rank, :troop, :attendee_id)
"""
DELETE_PATROL_MEMBERS = "DELETE FROM patrol_members WHERE patrol_id = :patrol_id"


class PatrolsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list(self, event_id: Optional[str] = None) -> List[Patrol]:
        """Fetch all patrols (or patrols filtered by event_id) and their members in a single batched JOIN query."""
        if event_id:
            rows = await self.driver.execute(LIST_PATROLS_BATCH_BY_EVENT, {"event_id": event_id})
        else:
            rows = await self.driver.execute(LIST_PATROLS_BATCH)
        patrols: dict[str, Patrol] = {}
        for row in rows:
            patrol_id = row["patrol_id"]
            if patrol_id not in patrols:
                patrols[patrol_id] = Patrol(
                    id=patrol_id,
                    event_id=row["event_id"],
                    name=row["patrol_name"],
                    number=row.get("patrol_number"),
                    phone_number=row["phone_number"],
                    radio_frequency=row["radio_frequency"],
                    radio_channel=row["radio_channel"],
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
                        attendee_id=row.get("attendee_id"),
                    )
                )
        return list(patrols.values())

    async def next_number(self, event_id: str) -> int:
        """
        The next free patrol number within an event.

        Numbers are per event, so every event starts at 1.
        """
        row = await self.driver.fetch_one(MAX_PATROL_NUMBER, {"event_id": event_id})
        current = (row or {}).get("max_number")
        return int(current) + 1 if current else 1

    async def attendee_assignments(self, event_id: str) -> dict:
        """
        Maps attendee id -> the patrol they are already on, for one event.

        Used to stop the same person being placed in two patrols.
        """
        rows = await self.driver.execute(FIND_ATTENDEE_ASSIGNMENTS, {"event_id": event_id})
        return {
            row["attendee_id"]: {
                "patrolId": row["patrol_id"],
                "patrolName": row["patrol_name"],
                "patrolNumber": row.get("patrol_number"),
            }
            for row in rows or []
            if row.get("attendee_id")
        }

    async def get(self, patrol_id: str) -> Optional[Patrol]:
        row = await self.driver.fetch_one(GET_PATROL, {"id": patrol_id})
        if not row:
            return None
        patrol = Patrol(
            id=row["id"],
            event_id=row["event_id"],
            name=row["name"],
            number=row.get("number"),
            phone_number=row["phone_number"],
            radio_frequency=row["radio_frequency"],
            radio_channel=row["radio_channel"],
            has_radio=bool(row["has_radio"]),
            radio_identifier=row["radio_identifier"],
        )
        member_rows = await self.driver.execute(LIST_PATROL_MEMBERS, {"patrol_id": patrol_id})
        patrol.members = [
            PatrolMember(id=m["id"], name=m["name"], rank=m["rank"], troop=m["troop"], attendee_id=m.get("attendee_id"))
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
                "number": patrol.number,
                "phone_number": patrol.phone_number,
                "radio_frequency": patrol.radio_frequency,
                "radio_channel": patrol.radio_channel,
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
                "attendee_id": member.attendee_id,
            })

    async def update(self, patrol: Patrol) -> None:
        await self.driver.execute(
            UPDATE_PATROL,
            {
                "id": patrol.id,
                "event_id": patrol.event_id,
                "name": patrol.name,
                "number": patrol.number,
                "phone_number": patrol.phone_number,
                "radio_frequency": patrol.radio_frequency,
                "radio_channel": patrol.radio_channel,
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
                "attendee_id": member.attendee_id,
            })

    async def delete(self, patrol_id: str) -> None:
        await self.driver.execute(DELETE_PATROL, {"id": patrol_id})
