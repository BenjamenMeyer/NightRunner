import falcon.asgi

app = falcon.asgi.App()

class HealthResource:
    async def on_get(self, req, resp):
        resp.media = {"status": "ok"}

app.add_route("/health", HealthResource())
