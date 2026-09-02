import os
import logging
import falcon.asgi
from nightrunner_backend.config.settings import settings
from nightrunner_backend.transport.middleware.auth import AuthMiddleware
from nightrunner_backend.app_context import get_driver, run_migrations, close_driver

from nightrunner_backend.transport.events import EventsResource, EventResource
from nightrunner_backend.transport.health import HealthResource
from nightrunner_backend.transport.me import MeResource
from nightrunner_backend.transport.patrols import PatrolsResource, PatrolResource
from nightrunner_backend.transport.configuration_groups import ConfigurationGroupsResource, ConfigurationGroupResource
from nightrunner_backend.transport.configurations import ConfigurationsResource, ConfigurationResource
from nightrunner_backend.transport.stations import StationsResource, StationResource
from nightrunner_backend.transport.scores import ScoresResource
from nightrunner_backend.transport.reports_event import EventReportResource
from nightrunner_backend.transport.reports_station import StationReportResource
from nightrunner_backend.transport.login import LoginResource

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
#cors_middleware = falcon.CORSMiddleware(
#    allow_origins= [
#        settings.front_end_url
#    ],  # Allow requests from the frontend URL
#    allow_credentials='*', # Required if your frontend sends cookies or auth headers
#)

#print(f"CORS frontend URL: {settings.front_end_url}")

app = falcon.asgi.App(cors_enable=True,
    middleware=[
        #cors_middleware,
        MigrationMiddleware(),
        AuthMiddleware()
    ]
)



_routes_registered = False

def register_routes(app):
    global _routes_registered
    if _routes_registered:
        return
    _routes_registered = True
    # Add authentication login endpoint
    app.add_route("/auth/login", LoginResource())
    app.add_route("/v1/auth/login", LoginResource())
    app.add_route("/v1/scores", ScoresResource())
    app.add_route("/health", HealthResource())
    app.add_route("/v1/me", MeResource())
    app.add_route("/v1/events", EventsResource())
    app.add_route("/v1/events/{event_id}", EventResource())
    app.add_route("/v1/patrols", PatrolsResource())
    app.add_route("/v1/patrols/{patrol_id}", PatrolResource())
    app.add_route("/v1/configuration-groups", ConfigurationGroupsResource())
    app.add_route("/v1/configuration-groups/{groupId}", ConfigurationGroupResource())
    app.add_route("/v1/configurations", ConfigurationsResource())
    app.add_route("/v1/configurations/{configId}", ConfigurationResource())
    app.add_route("/v1/stations", StationsResource())
    app.add_route("/v1/stations/{stationId}", StationResource())
    app.add_route("/v1/reports/stations/{stationId}", StationReportResource())
    app.add_route("/v1/reports/events/{eventId}", EventReportResource())
    # Non‑versioned aliases required by tests (GET/POST/PUT/DELETE on root paths)
    app.add_route("/events", EventsResource())
    app.add_route("/events/{event_id}", EventResource())
    app.add_route("/patrols", PatrolsResource())
    app.add_route("/patrols/{patrol_id}", PatrolResource())
    # login route moved to top level
register_routes(app)
