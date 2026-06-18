import os
import logging
import falcon.asgi
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.transport.middleware.auth import AuthMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migrations():
    """
    Discovers and applies pending SQL migrations from the drivers/migrations directory.
    """
    driver = DatabaseDriver()
    migrations_dir = os.path.join(os.path.dirname(__file__), "drivers", "migrations")
    
    try:
        # Ensure _migrations table exists
        await driver.run_migration("""
            CREATE TABLE IF NOT EXISTS _migrations (
                id TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Fetch already applied migrations
        applied_migrations = await driver.execute("SELECT id FROM _migrations")
        applied_ids = set()
        if isinstance(applied_migrations, list):
            for m in applied_migrations:
                if isinstance(m, dict):
                    applied_ids.add(m["id"])
                elif isinstance(m, (list, tuple)):
                    # Fallback for unexpected row formats
                    applied_ids.add(m[0])
        
        if not os.path.exists(migrations_dir):
            logger.warning(f"Migrations directory not found: {migrations_dir}")
            return

        # List and sort migration files
        migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
        
        for filename in migration_files:
            if filename not in applied_ids:
                logger.info(f"Applying migration: {filename}")
                with open(os.path.join(migrations_dir, filename), "r") as f:
                    sql = f.read()
                    await driver.run_migration(sql)
                    await driver.execute("INSERT INTO _migrations (id) VALUES (:id)", {"id": filename})
                logger.info(f"Successfully applied: {filename}")
                
    except Exception as e:
        logger.critical(f"Failed to run migrations. Application may be in inconsistent state. Error: {e}")
        raise

class MigrationMiddleware:
    """
    Falcon middleware to run migrations on application startup.
    """
    async def process_startup(self, scope, event):
        await run_migrations()

app = falcon.asgi.App(middleware=[MigrationMiddleware(), AuthMiddleware()])

class HealthResource:
    """
    Simple health check endpoint.
    """
    async def on_get(self, req, resp):
        resp.media = {"status": "ok"}

app.add_route("/health", HealthResource())

class MeResource:
    """
    Protected endpoint to show current user info.
    """
    async def on_get(self, req, resp):
        if not req.context.user:
            raise falcon.HTTPUnauthorized(description="Authentication required.")
        
        resp.media = {
            "user": req.context.user,
            "roles": req.context.roles
        }

app.add_route("/me", MeResource())
