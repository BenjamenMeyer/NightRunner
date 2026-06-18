import os
import re
import logging
import asyncio
from typing import Any, Dict, List, Optional, Union
import aiosqlite
import psycopg
from psycopg.rows import dict_row
try:
    from psycopg_pool import AsyncConnectionPool
except ImportError:
    AsyncConnectionPool = None

logger = logging.getLogger(__name__)

class DatabaseDriver:
    """
    Unified database driver supporting SQLite and PostgreSQL with async execution.
    
    Uses :param syntax for placeholders in both SQLite and PostgreSQL.
    """
    _pg_pool: Optional[Any] = None
    _sqlite_conn: Optional[aiosqlite.Connection] = None
    _lock = asyncio.Lock()

    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.getenv("DATABASE_URL", "sqlite:///nightrunner.db")
        self.is_sqlite = self.db_url.startswith("sqlite")
        if self.is_sqlite:
            # sqlite:///path/to/db -> path/to/db
            self.sqlite_path = self.db_url.replace("sqlite:///", "")
        else:
            self.pg_conn_info = self.db_url

    async def _get_sqlite_conn(self) -> aiosqlite.Connection:
        async with self._lock:
            if DatabaseDriver._sqlite_conn is None:
                DatabaseDriver._sqlite_conn = await aiosqlite.connect(self.sqlite_path)
                DatabaseDriver._sqlite_conn.row_factory = aiosqlite.Row
            return DatabaseDriver._sqlite_conn

    def _get_pg_pool(self) -> Any:
        if DatabaseDriver._pg_pool is None:
            if AsyncConnectionPool is None:
                raise ImportError("psycopg_pool is required for PostgreSQL connection pooling")
            # open=True is default, it will start background workers
            DatabaseDriver._pg_pool = AsyncConnectionPool(self.pg_conn_info)
        return DatabaseDriver._pg_pool

    async def _ensure_pool_open(self):
        pool = self._get_pg_pool()
        async with self._lock:
            # We don't have an easy way to check if pool is 'opened' in AsyncConnectionPool 
            # without accessing private members, but we can call open() safely if it's already open.
            # Actually, open() is a no-op if already open in some versions, 
            # but let's just ensure it's called once.
            pass

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
                db = await self._get_sqlite_conn()
                async with db.execute(mapped_sql, params or {}) as cursor:
                    await db.commit()
                    if cursor.description is None:
                        return cursor.rowcount
                    return [dict(row) for row in await cursor.fetchall()]
            else:
                pool = self._get_pg_pool()
                # Ensure pool is initialized/started if not already
                async with pool.connection() as conn:
                    conn.autocommit = False
                    async with conn.cursor(row_factory=dict_row) as cur:
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
                db = await self._get_sqlite_conn()
                await db.executescript(sql)
                await db.commit()
            else:
                pool = self._get_pg_pool()
                async with pool.connection() as conn:
                    async with conn.cursor() as cur:
                        await cur.execute(sql)
                        await conn.commit()
        except Exception as e:
            logger.error(f"Migration error: {e}")
            raise

    @classmethod
    async def close_all(cls):
        """
        Closes all shared connections and pools.
        """
        async with cls._lock:
            if cls._sqlite_conn:
                await cls._sqlite_conn.close()
                cls._sqlite_conn = None
            if cls._pg_pool:
                await cls._pg_pool.close()
                cls._pg_pool = None
