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
    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.getenv("DATABASE_URL", "sqlite:///nightrunner.db")
        self.is_sqlite = self.db_url.startswith("sqlite")
        self._sqlite_conn: Optional[aiosqlite.Connection] = None
        self._pg_pool = None
        self._lock: Optional[asyncio.Lock] = None
        
        if self.is_sqlite:
            # sqlite:///path/to/db -> path/to/db
            self.sqlite_path = self.db_url.replace("sqlite:///", "")
        else:
            self.pg_conn_info = self.db_url

    # No longer keep a persistent SQLite connection; each execute will open its own.

    async def _get_sqlite_conn(self) -> aiosqlite.Connection:
        """Return a persistent SQLite connection for in‑memory databases.
        For file‑based databases we open a fresh connection per operation to avoid locks.
        """
        if self._sqlite_conn is None:
            self._sqlite_conn = await aiosqlite.connect(self.sqlite_path)
            self._sqlite_conn.row_factory = aiosqlite.Row
        return self._sqlite_conn
    async def _get_pg_pool(self) -> Any:
        if self._pg_pool is None:
            if AsyncConnectionPool is None:
                raise ImportError("psycopg_pool is required for PostgreSQL connection pooling")
            self._pg_pool = AsyncConnectionPool(self.pg_conn_info)
            await self._pg_pool.open()
        return self._pg_pool

    def _map_sql(self, sql: str) -> str:
        """
        Maps :param syntax to PostgreSQL %(param)s syntax if needed.
        """
        if self.is_sqlite:
            return sql # aiosqlite supports :param natively
        # For Postgres, map :param to %(param)s (ignoring PostgreSQL type casts like ::text) and translate GROUP_CONCAT
        sql = re.sub(r'(?<!:):([a-zA-Z_]\w*)', r'%(\1)s', sql)
        # Case insensitive mapping of GROUP_CONCAT(DISTINCT ...) or GROUP_CONCAT(...)
        sql = re.sub(
            r'(?i)\bgroup_concat\s*\(\s*(distinct\s+)?([^)]+)\)',
            r"string_agg(\1\2, ',')",
            sql
        )
        return sql

    async def execute(self, sql: str, params: Optional[Dict[str, Any]] = None) -> Union[List[Dict[str, Any]], int]:
        """Executes a SQL query and returns results as a list of dicts or row count."""
        mapped_sql = self._map_sql(sql)
        if self._lock is None:
            self._lock = asyncio.Lock()
        try:
            async with self._lock:
                if self.is_sqlite:
                    # Use a fresh connection for file‑based SQLite databases to avoid locking.
                    # For in‑memory databases, reuse a single connection so that schema persists across calls.
                    if self.sqlite_path == ":memory:":
                        db = await self._get_sqlite_conn()
                        async with db.execute(mapped_sql, params or {}) as cursor:
                            if cursor.description is None:
                                await db.commit()
                                return cursor.rowcount
                            rows = await cursor.fetchall()
                            await db.commit()
                            results = [{key: row[key] for key in row.keys()} for row in rows]
                            return results
                    else:
                        async with aiosqlite.connect(self.sqlite_path) as db:
                            db.row_factory = aiosqlite.Row
                            async with db.execute(mapped_sql, params or {}) as cursor:
                                if cursor.description is None:
                                    await db.commit()
                                    return cursor.rowcount
                                rows = await cursor.fetchall()
                                await db.commit()
                                results = [{key: row[key] for key in row.keys()} for row in rows]
                                return results
                else:
                    pool = await self._get_pg_pool()
                    async with pool.connection() as conn:
                        async with conn.cursor(row_factory=dict_row) as cur:
                            await cur.execute(mapped_sql, params or {})
                            await conn.commit()
                            if cur.description is None:
                                return cur.rowcount
                            return await cur.fetchall()
        except Exception as e:
            logger.error(f"SQL Error: {e}\nSQL: {mapped_sql}\nParams: {params}")
            raise

    async def run_migrations(self):
        """
        Runs all migration files found in the migrations directory.
        """
        migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
        if not os.path.exists(migrations_dir):
            logger.warning(f"Migrations directory not found: {migrations_dir}")
            return

        # Ensure _migrations table exists
        await self.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                id TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        files = await asyncio.to_thread(
            lambda: sorted(f for f in os.listdir(migrations_dir) if f.endswith(".sql"))
        )
        for filename in files:
            # Check if migration already applied
            rows = await self.execute("SELECT id FROM _migrations WHERE id = :id", {"id": filename})
            if rows:
                continue

            logger.info(f"Applying migration: {filename}")
            filepath = os.path.join(migrations_dir, filename)
            sql = await asyncio.to_thread(lambda: open(filepath, "r").read())

            try:
                if self.is_sqlite:
                    # Use a fresh connection for migration scripts to avoid locking issues
                    if self.sqlite_path == ":memory:":
                        db = await self._get_sqlite_conn()
                        await db.executescript(sql)
                        await db.commit()
                    else:
                        async with aiosqlite.connect(self.sqlite_path) as db:
                            db.row_factory = aiosqlite.Row
                            await db.executescript(sql)
                            await db.commit()
                else:
                    # Postgres psycopg executes multi-statement SQL files reliably when statements are split by semicolon
                    statements = [stmt.strip() for stmt in sql.split(";") if stmt.strip()]
                    for stmt in statements:
                        await self.execute(stmt)
                
                # Record migration
                await self.execute("INSERT INTO _migrations (id) VALUES (:id)", {"id": filename})
            except Exception as e:
                logger.error(f"Failed to apply migration {filename}: {e}")
                raise

    async def close(self):
        """
        Closes database connections/pools.
        """
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            if self._sqlite_conn:
                await self._sqlite_conn.close()
                self._sqlite_conn = None
            if self._pg_pool:
                await self._pg_pool.close()
                self._pg_pool = None

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
                    db.row_factory = aiosqlite.Row
                    await db.executescript(sql)
                    await db.commit()
            else:
                pool = await self._get_pg_pool()
                async with pool.connection() as conn:
                    async with conn.cursor() as cur:
                        await cur.execute(sql)
                        await conn.commit()
        except Exception as e:
            logger.error(f"Migration error: {e}")
            raise
