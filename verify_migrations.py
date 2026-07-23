import asyncio
import os
import sqlite3
from nightrunner_backend.main import run_migrations

async def verify():
    # Set DATABASE_URL to a test sqlite db
    db_file = "test_nightrunner.db"
    if os.path.exists(db_file):
        os.remove(db_file)
    
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"
    
    print("Running migrations...")
    await run_migrations()
    
    # Check if tables exist
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = {row[0] for row in cursor.fetchall()}
    print(f"Tables found: {tables}")
    
    assert "_migrations" in tables
    assert "users" in tables
    
    cursor.execute("SELECT id FROM _migrations;")
    applied = {row[0] for row in cursor.fetchall()}
    print(f"Applied migrations: {applied}")
    assert "001_initial.sql" in applied
    
    conn.close()
    os.remove(db_file)
    print("Verification SUCCESS")

if __name__ == "__main__":
    asyncio.run(verify())
