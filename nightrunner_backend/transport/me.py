import falcon


class MeResource:
    """GET /v1/me
    Returns the currently authenticated user's profile and roles.
    User data is resolved by AuthMiddleware and stored in req.context.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        user = req.context.user
        if not user:
            raise falcon.HTTPUnauthorized(
                title="Not authenticated",
                description="A valid authenticated session is required.",
            )

        resp.media = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "displayName": user["display_name"],
            "status": user.get("status", "active"),
            "isAdmin": user.get("is_admin", False) or ("admin" in req.context.roles) or ("system-admin" in req.context.roles),
            "roles": req.context.roles,
        }
        resp.status = falcon.HTTP_200
