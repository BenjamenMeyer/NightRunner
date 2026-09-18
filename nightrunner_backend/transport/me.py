import falcon

from nightrunner_backend.models.user_roles import roles_to_map


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

        roles_list = req.context.roles or []

        resp.media = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "displayName": user["display_name"],
            "status": user.get("status", "active"),
            "isAdmin": user.get("is_admin", False) or ("admin" in roles_list) or ("system-admin" in roles_list),
            # Clients index roles by event ID, so return the same unpacked map
            # that /v1/users returns. The raw strings stay available as rolesList.
            "roles": roles_to_map(roles_list),
            "rolesList": roles_list,
        }
        resp.status = falcon.HTTP_200
