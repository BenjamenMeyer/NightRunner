"""Persistence layer for scores with aggregation helpers.
We keep it deliberately simple: scoring is append‑only, so only create and read operations are needed.
"""

from typing import List, Dict, Any, Optional

from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.score import Score

GET_SCORES_FOR_EVENT = "SELECT * FROM scores WHERE event_id = :event_id"
GET_SCORE = "SELECT * FROM scores WHERE id = :id AND event_id = :event_id"
CREATE_SCORE = """
    INSERT INTO scores (
        id, event_id, station_id, patrol_id, task_id,
        score_value, score_weight, active, submitted_at,
        started_at, completed_at, entry_mode
    ) VALUES (
        :id, :event_id, :station_id, :patrol_id, :task_id,
        :score_value, :score_weight, :active, CURRENT_TIMESTAMP,
        :started_at, :completed_at, :entry_mode
    )
"""

# Aggregation queries – we let SQLite/Postgres do the heavy lifting
AGGREGATE_STATION = """
    SELECT
        s.id              AS score_id,
        s.patrol_id,
        p.name            AS patrol_name,
        s.task_id,
        COALESCE(t.description, s.task_id) AS task_name,
        s.score_value,
        s.score_weight,
        (s.score_value * s.score_weight) AS weighted_score,
        s.active,
        s.submitted_at
    FROM scores s
    JOIN patrols p       ON p.id = s.patrol_id
    LEFT JOIN station_tasks t ON t.id = s.task_id
    WHERE s.event_id = :event_id AND s.station_id = :station_id
    ORDER BY s.patrol_id, s.task_id;
"""

AGGREGATE_EVENT = """
    SELECT
        s.patrol_id,
        p.name            AS patrol_name,
        s.station_id,
        st.name           AS station_name,
        st.station_weight,
        SUM(CASE WHEN s.active = 1 OR s.active IS TRUE THEN (s.score_value * s.score_weight * COALESCE(st.station_weight, 1.0)) ELSE 0.0 END) AS weighted_score
    FROM scores s
    JOIN patrols p ON p.id = s.patrol_id
    LEFT JOIN stations st ON st.id = s.station_id
    WHERE s.event_id = :event_id
    GROUP BY s.patrol_id, s.station_id;
"""

class ScoresStore:
    """CRUD + aggregation for the `scores` table.
    Currently we expose list‑for‑event, get, create, and two aggregation helpers.
    """
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list_for_event(self, event_id: str) -> List[Score]:
        rows = await self.driver.execute(GET_SCORES_FOR_EVENT, {"event_id": event_id})
        return [Score(**row) for row in rows]

    async def get(self, score_id: str) -> Optional[Score]:
        row = await self.driver.fetch_one("SELECT * FROM scores WHERE id = :id", {"id": score_id})
        return Score(**row) if row else None

    async def update(self, score_id: str, **fields) -> Score:
        # Build SET clause from provided fields
        set_clause = ", ".join([f"{k} = :{k}" for k in fields.keys()])
        sql = f"UPDATE scores SET {set_clause} WHERE id = :id"
        params = {**fields, "id": score_id}
        await self.driver.execute(sql, params)
        # Return updated score
        return await self.get(score_id)

    async def delete(self, score_id: str) -> None:
        await self.driver.execute("DELETE FROM scores WHERE id = :id", {"id": score_id})

    async def create(self, score: Score) -> Score:
        await self.driver.execute(CREATE_SCORE, {
            "id": score.id,
            "event_id": score.event_id,
            "station_id": score.station_id,
            "patrol_id": score.patrol_id,
            "task_id": score.task_id,
            "score_value": score.score_value,
            "score_weight": score.score_weight,
            "active": int(score.active),
            "started_at": score.started_at,
            "completed_at": score.completed_at,
            "entry_mode": score.entry_mode or "live",
        })
        return score

    async def aggregate_station(self, event_id: str, station_id: str) -> List[Dict[str, Any]]:
        """Return a flat list of rows with patrol, task, raw/weighted scores, timestamps.
        Caller can transform into the desired JSON structure.
        """
        rows = await self.driver.execute(AGGREGATE_STATION, {
            "event_id": event_id,
            "station_id": station_id,
        })
        return rows

    async def aggregate_event(self, event_id: str) -> List[Dict[str, Any]]:
        """Return per‑patrol, per‑station weighted scores for the entire event.
        Caller aggregates totals and ranking.
        """
        rows = await self.driver.execute(AGGREGATE_EVENT, {"event_id": event_id})
        return rows
