import os
import re
import logging
from typing import Any, Dict, List, Optional, Union
import aiosqlite
import psycopg
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)

class DatabaseDriver:
    """
    Unified database driver supporting SQLite and PostgreSQL with async execution.
    
    Uses :param syntax for placeholders in both SQLite and PostgreSQL.
    """
    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.getenv("DATABASE_URL", "sqlite:///nightrunner.db")
        self.is_sqlite = self.db_url.startswith("sqlite")
        if self.is_sqlite:
            # sqlite:///path/to/db -> path/to/db
            self.sqlite_path = self.db_url.replace("sqlite:///", "")
        else:
            self.pg_conn_info = self.db_url

    def _map_sql(self, sql: str) -> str:
        """
        Maps :param syntax to PostgreSQL %(param)s syntax if needed.
        """
        if self.is_sqlite:
            return sql # aiosqlite supports :param natively
        # For Postgres, map :param to %(param)s
        return re.sub(r':(\w+)', r'%(\1)s', sql)

    async def execute(self, sql: str, params: Optional[Dict[str, Any]] = None) -> Union[List[Dict[str, Any]], int]:
        """
        Executes a SQL query and returns results as a list of dicts or row count.
        """
        mapped_sql = self._map_sql(sql)
        try:
            if self.is_sqlite:
                async with aiosqlite.connect(self.sqlite_path) as db:
                    db.row_factory = aiosqlite.Row
                    async with db.execute(mapped_sql, params or {}) as cursor:
                        await db.commit()
                        if cursor.description is None:
                            return cursor.rowcount
                        return [dict(row) for row in await cursor.fetchall()]
            else:
                async with await psycopg.AsyncConnection.connect(self.pg_conn_info, row_factory=dict_row) as conn:
                    async with conn.cursor() as cur:
                        await cur.execute(mapped_sql, params or {})
                        await conn.commit()
                        if cur.description is None:
                            return cur.rowcount
                        return await cur.fetchall()
        except Exception as e:
            logger.error(f"Database error executing query: {sql}. Error: {e}")
            raise

    async def fetch_one(self, sql: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Executes a SQL query and returns the first result row as a dict, or None.
        """
        results = await self.execute(sql, params)
        if isinstance(results, list) and len(results) > 0:
            return results[0]
        return None

    async def run_migration(self, sql: str) -> None:
        """
        Executes a multi-statement SQL script (typically for migrations).
        """
        try:
            if self.is_sqlite:
                async with aiosqlite.connect(self.sqlite_path) as db:
                    await db.executescript(sql)
                    await db.commit()
            else:
                async with await psycopg.AsyncConnection.connect(self.pg_conn_info) as conn:
                    async with conn.cursor() as cur:
                        await cur.execute(sql)
                        await conn.commit()
        except Exception as e:
            logger.error(f"Migration error: {e}")
            raise
