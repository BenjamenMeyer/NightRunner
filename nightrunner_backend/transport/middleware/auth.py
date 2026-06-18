import logging
import falcon
import jwt
from jwt import PyJWKClient
from typing import Optional, List, Dict, Any
from nightrunner_backend.config.settings import settings
from nightrunner_backend.drivers.base import DatabaseDriver

logger = logging.getLogger(__name__)

class AuthMiddleware:
    """
    Falcon middleware for JWT Authentication via OIDC/JWKS.
    """
    def __init__(self):
        self.jwks_client: Optional[PyJWKClient] = None
        if settings.jwks_url:
            self.jwks_client = PyJWKClient(settings.jwks_url)
        self.db = DatabaseDriver()

    async def process_request(self, req: falcon.Request, resp: falcon.Response):
        """
        Validates the Bearer token in the Authorization header.
        """
        # Skip auth for health check or if OIDC is not configured
        if req.path == "/health" or not settings.oidc_issuer:
            req.context.user = None
            req.context.roles = []
            return

        auth_header = req.get_header("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise falcon.HTTPUnauthorized(
                title="Missing or invalid Authorization header",
                description="A valid Bearer token is required."
            )

        token = auth_header.split(" ")[1]
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
                logger.warning("JWKS not configured. Skipping signature verification (DEV MODE).")
                return jwt.decode(token, options={"verify_signature": False})
            
            # This should ideally be caught by settings validation, but as a safety:
            raise falcon.HTTPInternalServerError(
                description="OIDC configured but JWKS client missing and not in dev_mode."
            )

        signing_key = self.jwks_client.get_signing_key_from_jwt(token)
        
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer
        )
