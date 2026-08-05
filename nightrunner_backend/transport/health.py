import falcon

class HealthResource:
    """Simple health check endpoint."""
    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        resp.media = {"status": "ok"}
