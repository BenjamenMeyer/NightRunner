import logging
import falcon
import jwt
from jwt import PyJWKClient
from typing import Optional, List, Dict, Any
import asyncio
from nightrunner_backend.config.settings import settings
from nightrunner_backend.app_context import get_driver

logger = logging.getLogger(__name__)

class AuthMiddleware:
    """
    Falcon middleware for JWT Authentication via OIDC/JWKS.
    """
    def __init__(self):
        # Do NOT pre-construct PyJWKClient here; _verify_token builds it lazily
        # so that test fixtures can monkeypatch jwt.PyJWKClient before it is called.
        pass

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

        # CORS preflight requests are not authenticated.
        if req.method == "OPTIONS":
            return

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

        if settings.require_iam_proxy_auth and not settings.dev_mode:
            logger.info("Enforcing strict dual IAM proxy authentication mode.")
            iam_header = req.get_header("Authorization")
            user_header = req.get_header("X-Forwarded-Authorization")

            if not iam_header or not user_header:
                logger.warning(
                    "IAM proxy auth check failed: missing required headers. Authorization present=%s, X-Forwarded-Authorization present=%s",
                    bool(iam_header),
                    bool(user_header)
                )
                raise falcon.HTTPUnauthorized(
                    title="Missing or invalid Authorization header",
                    description="A valid Bearer token is required."
                )

            if not iam_header.startswith("Bearer "):
                logger.warning("IAM proxy auth check failed: Authorization header does not start with 'Bearer '.")
                raise falcon.HTTPUnauthorized(
                    title="Missing or invalid Authorization header",
                    description="A valid Bearer token is required."
                )

            iam_token = iam_header.split(" ")[1]
            try:
                await self._verify_iam_token(iam_token)
                logger.info("Successfully verified GCP IAM proxy token.")
            except Exception as e:
                logger.warning(f"GCP IAM token validation failed: {e}")
                raise falcon.HTTPUnauthorized(
                    title="Missing or invalid Authorization header",
                    description="A valid Bearer token is required."
                )

            auth_header = user_header
        else:
            logger.debug("Standard auth mode (require_iam_proxy_auth=False). Resolving user auth header.")
            auth_header = req.get_header("X-Forwarded-Authorization") or req.get_header("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("User auth check failed: missing or invalid user Bearer header.")
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

            # Optimized query to fetch user, status, and roles in one go
            rows = await self.db.execute(
                """
                SELECT u.id, u.username, u.email, u.display_name, u.is_admin, COALESCE(u.status, 'active') AS status, r.role
                FROM users u
                LEFT JOIN user_roles r ON u.id = r.user_id
                WHERE u.external_id = :ext_id
                """,
                {"ext_id": external_id}
            )

            if not rows or not isinstance(rows, list):
                # Just-In-Time (JIT) auto-provisioning for Firebase / Social Auth users
                email = payload.get("email", f"{external_id}@auth.local")
                name = payload.get("name") or payload.get("preferred_username") or email.split("@")[0]
                username = payload.get("preferred_username") or email.split("@")[0]
                
                import uuid
                new_user_id = str(uuid.uuid4())

                try:
                    await self.db.execute(
                        """
                        INSERT INTO users (id, external_id, username, email, display_name, is_admin, status)
                        VALUES (:id, :ext_id, :username, :email, :display_name, FALSE, 'pending')
                        """,
                        {
                            "id": new_user_id,
                            "ext_id": external_id,
                            "username": username,
                            "email": email,
                            "display_name": name
                        }
                    )
                    rows = [{
                        "id": new_user_id,
                        "username": username,
                        "email": email,
                        "display_name": name,
                        "is_admin": False,
                        "status": "pending",
                        "role": None
                    }]
                except Exception as ex:
                    logger.exception(f"Failed to auto-provision user {external_id}: {ex}")
                    raise falcon.HTTPUnauthorized(title="User not found", description="No local account for this identity.")

            user_status = rows[0].get("status") or "active"
            if user_status == "blocked":
                raise falcon.HTTPForbidden(title="Account Blocked", description="Your account has been blocked by an administrator.")

            # First row has user info (same for all rows)
            user = {
                "id": rows[0]["id"],
                "username": rows[0]["username"],
                "email": rows[0]["email"],
                "display_name": rows[0]["display_name"],
                "is_admin": bool(rows[0].get("is_admin")),
                "status": user_status
            }
            # Collect all non-null roles from rows
            roles = [row["role"] for row in rows if row.get("role")]


            req.context.user = user
            req.context.roles = roles

        except jwt.PyJWTError as e:
            logger.warning(f"JWT validation failed: {e}")
            raise falcon.HTTPUnauthorized(title="Invalid token", description=str(e))
        except falcon.HTTPError:
            raise
        except Exception as e:
            logger.exception("Unexpected error in AuthMiddleware")
            raise falcon.HTTPInternalServerError(description="Internal authentication error.")

    async def _verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verifies the JWT signature and claims.
        The JWKS client is constructed lazily on each call so that test fixtures
        can monkeypatch jwt.PyJWKClient before it is ever instantiated.
        """
        if not settings.jwks_url:
            if settings.dev_mode:
                logger.warning("JWKS not configured. Using UNVERIFIED token (DEV MODE ONLY).")
                return jwt.decode(token, options={"verify_signature": False})

            raise jwt.PyJWTError("OIDC configured but JWKS client missing and not in dev_mode.")

        jwks_client = jwt.PyJWKClient(settings.jwks_url)

        # PyJWKClient.get_signing_key_from_jwt is synchronous and makes a network
        # request — run it in a thread pool to avoid blocking the event loop.
        loop = asyncio.get_event_loop()
        signing_key = await loop.run_in_executor(
            None, jwks_client.get_signing_key_from_jwt, token
        )

        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer
        )

    async def _verify_iam_token(self, token: str) -> Dict[str, Any]:
        """
        Verifies the GCP IAM OIDC token signature and claims.
        """
        if settings.dev_mode or not settings.gcp_iam_jwks_url:
            return jwt.decode(token, options={"verify_signature": False})

        loop = asyncio.get_event_loop()
        signing_key = None

        unverified_header = jwt.get_unverified_header(token)
        unverified_payload = jwt.decode(token, options={"verify_signature": False})

        kid = unverified_header.get("kid")
        candidates = [
            unverified_payload.get("email"),
            unverified_payload.get("sub"),
            unverified_payload.get("iss")
        ]
        sa_email = next((c for c in candidates if c and "@" in c and not c.startswith("http")), None)

        try:
            jwks_client = jwt.PyJWKClient(settings.gcp_iam_jwks_url)
            signing_key = await loop.run_in_executor(
                None, jwks_client.get_signing_key_from_jwt, token
            )
            logger.warning(f"GCP IAM token verified using default JWKS endpoint (kid: {kid}).")
        except Exception as err:
            logger.warning(
                f"Default GCP IAM JWKS lookup failed for kid '{kid}' ({err}); attempting SA JWKS lookup for sa_email='{sa_email}'."
            )
            
            if sa_email:
                sa_jwks_url = f"https://www.googleapis.com/service_accounts/v1/jwk/{sa_email}"
                logger.warning(f"Attempting GCP IAM token verification via SA JWKS URL: {sa_jwks_url} for kid: '{kid}'")
                jwks_client = jwt.PyJWKClient(sa_jwks_url)
                signing_key = await loop.run_in_executor(
                    None, jwks_client.get_signing_key_from_jwt, token
                )
            else:
                logger.error(f"Could not find valid Service Account email in IAM token payload claims: {unverified_payload}")
                raise

        decode_kwargs = {
            "algorithms": ["RS256"],
            "options": {"verify_iss": False}
        }
        if settings.gcp_iam_audience:
            decode_kwargs["audience"] = settings.gcp_iam_audience
        else:
            decode_kwargs["options"]["verify_aud"] = False

        return jwt.decode(token, signing_key.key, **decode_kwargs)


