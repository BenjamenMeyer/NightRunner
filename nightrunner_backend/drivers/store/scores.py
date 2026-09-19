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
        started_at, completed_at, entry_mode, submitted_text, participant_count
    ) VALUES (
        :id, :event_id, :station_id, :patrol_id, :task_id,
        :score_value, :score_weight, :active, CURRENT_TIMESTAMP,
        :started_at, :completed_at, :entry_mode, :submitted_text, :participant_count
    )
"""

# Aggregation queries – we let SQLite/Postgres do the heavy lifting
AGGREGATE_STATION = """
    SELECT
        s.id              AS score_id,
        s.patrol_id,
        p.name            AS patrol_name,
        s.task_id,
        COALESCE(NULLIF(t.name, ''), t.description, s.task_id) AS task_name,
        s.score_value,
        s.score_weight,
        (s.score_value * s.score_weight) AS weighted_score,
        s.active,
        s.submitted_at,
        s.submitted_text,
        s.started_at,
        s.completed_at,
        s.participant_count
    FROM scores s
    JOIN patrols p       ON p.id = s.patrol_id
    LEFT JOIN station_tasks t ON t.id = s.task_id
    WHERE s.event_id = :event_id
      AND s.station_id = :station_id
      AND (s.active = TRUE OR s.active IS TRUE)
    ORDER BY s.patrol_id, s.task_id;
"""

AGGREGATE_EVENT = """
    SELECT
        s.patrol_id,
        p.name            AS patrol_name,
        s.station_id,
        st.name           AS station_name,
        st.station_weight,
        SUM(CASE WHEN s.active = TRUE OR s.active IS TRUE THEN (s.score_value * s.score_weight * COALESCE(st.station_weight, 1.0)) ELSE 0.0 END) AS weighted_score
    FROM scores s
    JOIN patrols p ON p.id = s.patrol_id
    LEFT JOIN stations st ON st.id = s.station_id
    WHERE s.event_id = :event_id
    GROUP BY s.patrol_id, p.name, s.station_id, st.name, st.station_weight;
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

    async def deactivate_previous_scores(self, event_id: str, station_id: str, patrol_id: str, task_id: str) -> None:
        await self.driver.execute(
            "UPDATE scores SET active = FALSE WHERE event_id = :event_id AND station_id = :station_id AND patrol_id = :patrol_id AND task_id = :task_id AND (active = TRUE OR active IS TRUE)",
            {
                "event_id": event_id,
                "station_id": station_id,
                "patrol_id": patrol_id,
                "task_id": task_id,
            }
        )

    async def deactivate_all_active_scores_for_patrol_station(self, event_id: str, station_id: str, patrol_id: str) -> None:
        await self.driver.execute(
            "UPDATE scores SET active = FALSE WHERE event_id = :event_id AND station_id = :station_id AND patrol_id = :patrol_id AND (active = TRUE OR active IS TRUE)",
            {
                "event_id": event_id,
                "station_id": station_id,
                "patrol_id": patrol_id,
            }
        )

    async def get_active_scores_for_patrol_station(self, event_id: str, station_id: str, patrol_id: str) -> List[Score]:
        rows = await self.driver.execute(
            "SELECT * FROM scores WHERE event_id = :event_id AND station_id = :station_id AND patrol_id = :patrol_id AND (active = TRUE OR active IS TRUE)",
            {
                "event_id": event_id,
                "station_id": station_id,
                "patrol_id": patrol_id,
            }
        )
        return [Score(**row) for row in rows]

    async def create(self, score: Score) -> Score:
        await self.driver.execute(CREATE_SCORE, {
            "id": score.id,
            "event_id": score.event_id,
            "station_id": score.station_id,
            "patrol_id": score.patrol_id,
            "task_id": score.task_id,
            "score_value": score.score_value,
            "score_weight": score.score_weight,
            "active": bool(score.active),
            "started_at": score.started_at,
            "completed_at": score.completed_at,
            "entry_mode": score.entry_mode or "live",
            "submitted_text": score.submitted_text,
            "participant_count": int(score.participant_count or 1),
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

    async def save_finalized_results(self, event_id: str, results: List[Dict[str, Any]]) -> None:
        """Replace stored finalized results for an event."""
        import uuid6
        await self.driver.execute("DELETE FROM event_finalized_results WHERE event_id = :event_id", {"event_id": event_id})
        for r in results:
            res_id = str(uuid6.uuid7())
            await self.driver.execute(
                """
                INSERT INTO event_finalized_results (id, event_id, patrol_id, station_id, score_type, score_value, scoring_mode)
                VALUES (:id, :event_id, :patrol_id, :station_id, :score_type, :score_value, :scoring_mode)
                """,
                {
                    "id": res_id,
                    "event_id": event_id,
                    "patrol_id": r["patrolId"],
                    "station_id": r.get("stationId"),
                    "score_type": r.get("scoreType", "final"),
                    "score_value": float(r.get("scoreValue", 0.0)),
                    "scoring_mode": r.get("scoringMode", "absolute")
                }
            )

    async def list_finalized_results(self, event_id: str) -> List[Dict[str, Any]]:
        """List all stored finalized results for an event."""
        rows = await self.driver.execute(
            'SELECT id, event_id AS "eventId", patrol_id AS "patrolId", station_id AS "stationId", score_type AS "scoreType", score_value AS "scoreValue", scoring_mode AS "scoringMode", calculated_at AS "calculatedAt" FROM event_finalized_results WHERE event_id = :event_id',
            {"event_id": event_id}
        )
        if not isinstance(rows, list):
            return []
        cleaned = []
        for r in rows:
            if isinstance(r, dict):
                r_copy = dict(r)
                calc_at = r_copy.get("calculatedAt")
                if hasattr(calc_at, "isoformat"):
                    r_copy["calculatedAt"] = calc_at.isoformat()
                elif calc_at is not None:
                    r_copy["calculatedAt"] = str(calc_at)
                cleaned.append(r_copy)
        return cleaned
