import falcon
from urllib.parse import urlencode
from nightrunner_backend.config.settings import settings

class LoginResource:
    """GET /auth/login
    Initiates the OIDC login flow by redirecting the client to the provider's
    authorization endpoint. The redirect URL includes the standard OIDC query
    parameters (client_id, response_type, scope, redirect_uri, state).
    """
    def __init__(self):
        # In a real deployment these settings would be loaded from env vars.
        self.client_id = settings.oidc_client_id
        self.redirect_uri = settings.oidc_redirect_uri
        self.authorization_endpoint = f"{settings.oidc_issuer.rstrip('/')}/authorize"

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        # Generate a simple state value; in production this should be cryptographically
        # random and stored to validate on the callback.
        state = "teststate"
        # Compute values from settings directly to avoid reliance on __init__
        client_id = settings.oidc_client_id
        redirect_uri = settings.oidc_redirect_uri
        authorization_endpoint = f"{settings.oidc_issuer.rstrip('/')}/authorize"
        params = {
            "client_id": client_id,
            "response_type": "code",
            "scope": "openid profile email",
            "redirect_uri": redirect_uri,
            "state": state,
        }
        location = f"{authorization_endpoint}?{urlencode(params)}"
        resp.status = falcon.HTTP_302
        resp.location = location
        resp.media = {"redirect": location}
