import logging
import falcon
import jwt
from jwt import PyJWKClient
from typing import Optional, List, Dict, Any
from nightrunner_backend.config.settings import settings
from nightrunner_backend.app_context import get_driver

logger = logging.getLogger(__name__)

class AuthMiddleware:
    """
    Falcon middleware for JWT Authentication via OIDC/JWKS.
    """
    def __init__(self):
        self.jwks_client: Optional[PyJWKClient] = None
        if settings.jwks_url:
            self.jwks_client = PyJWKClient(settings.jwks_url)
        # We don't call get_driver() here to avoid early initialization at module load time if possible,
        # but AuthMiddleware is instantiated in main.py. 
        # Actually, it's better to get it when needed.

    @property
    def db(self):
        return get_driver()

    async def process_request(self, req: falcon.Request, resp: falcon.Response):
        """
        Validates the Bearer token in the Authorization header.
        """
        # Initialise context with safe defaults; overwritten below as appropriate.
        req.context.user = None
        req.context.roles = []

        # Skip auth for health endpoint
        if req.path == "/health":
            return
        # Skip auth for login endpoint
        if req.path.startswith("/auth/login") or req.path.startswith("/v1/auth/login"):
            return

        # In development mode, bypass authentication entirely
        if settings.dev_mode:
            req.context.user = {"id": "dev", "username": "dev_user", "email": "dev@example.com", "display_name": "Dev User"}
            req.context.roles = []
            return

        # Validate Authorization header
        auth_header = req.get_header("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise falcon.HTTPUnauthorized(
                title="Missing or invalid Authorization header",
                description="A valid Bearer token is required."
            )

        token = auth_header.split(" ")[1]
        if settings.dev_mode and token == "test-token":
            # Convenience bypass for test suite — only active in dev_mode
            req.context.user = {"id": "test", "username": "test_user", "email": "test@example.com", "display_name": "Test User"}
            req.context.roles = []
            return

        try:
            payload = await self._verify_token(token)
            external_id = payload.get("sub")
            
            if not external_id:
                raise falcon.HTTPUnauthorized(title="Invalid token", description="Token missing 'sub' claim.")

            # Optimized query to fetch user and roles in one go
            rows = await self.db.execute(
                """
                SELECT u.id, u.username, u.email, u.display_name, r.role
                FROM users u
                LEFT JOIN user_roles r ON u.id = r.user_id
                WHERE u.external_id = :ext_id
                """,
                {"ext_id": external_id}
            )

            if not rows or not isinstance(rows, list):
                raise falcon.HTTPUnauthorized(title="User not found", description="No local account for this identity.")

            # First row has user info (same for all rows)
            user = {
                "id": rows[0]["id"],
                "username": rows[0]["username"],
                "email": rows[0]["email"],
                "display_name": rows[0]["display_name"]
            }
            # Collect all non-null roles from rows
            roles = [row["role"] for row in rows if row.get("role")]

            req.context.user = user
            req.context.roles = roles

        except jwt.PyJWTError as e:
            logger.warning(f"JWT validation failed: {e}")
            raise falcon.HTTPUnauthorized(title="Invalid token", description=str(e))
        except Exception as e:
            logger.exception("Unexpected error in AuthMiddleware")
            raise falcon.HTTPInternalServerError(description="Internal authentication error.")

    async def _verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verifies the JWT signature and claims.
        """
        if not self.jwks_client:
            if settings.dev_mode:
                logger.warning("JWKS not configured. Using UNVERIFIED token (DEV MODE ONLY).")
                return jwt.decode(token, options={"verify_signature": False})
            
            raise jwt.PyJWTError("OIDC configured but JWKS client missing and not in dev_mode.")

        # PyJWKClient.get_signing_key_from_jwt is synchronous and makes a network
        # request — run it in a thread pool to avoid blocking the event loop.
        loop = asyncio.get_event_loop()
        signing_key = await loop.run_in_executor(
            None, self.jwks_client.get_signing_key_from_jwt, token
        )
        
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer
        )
