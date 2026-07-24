import os
import logging
import falcon.asgi
from nightrunner_backend.config.settings import settings
from nightrunner_backend.transport.middleware.auth import AuthMiddleware
from nightrunner_backend.app_context import get_driver, run_migrations, close_driver

from nightrunner_backend.transport.events import EventsResource, EventResource
from nightrunner_backend.transport.patrols import PatrolsResource, PatrolResource

# Configure logging
logging.basicConfig(level=logging.DEBUG if settings.dev_mode else logging.INFO)
logger = logging.getLogger(__name__)

class MigrationMiddleware:
    """
    Falcon middleware to run migrations on application startup.
    """
    async def process_startup(self, scope, event):
        await run_migrations()

    async def process_shutdown(self, scope, event):
        await close_driver()

# Add CORS MiddleWare
cors_middleware = falcon.CORSMiddleware(
    allow_origins= [
        settings.front_end_url
    ],  # Allow requests from the frontend URL
    allow_credentials='*', # Required if your frontend sends cookies or auth headers
)

print(f"CORS frontend URL: {settings.front_end_url}")

app = falcon.asgi.App(
    middleware=[
        cors_middleware,
        MigrationMiddleware(),
        AuthMiddleware()
    ]
)

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

# Events
app.add_route("/events", EventsResource())
app.add_route("/events/{event_id}", EventResource())

# Patrols
app.add_route("/patrols", PatrolsResource())
app.add_route("/patrols/{patrol_id}", PatrolResource())
