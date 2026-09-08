import falcon
from nightrunner_backend.config.settings import settings

class HealthResource:
    """Simple health check endpoint."""
    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        resp.media = {"status": "ok", "version": settings.app_version}
