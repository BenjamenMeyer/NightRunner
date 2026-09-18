import json
import logging
import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.models.user_roles import roles_to_map

logger = logging.getLogger(__name__)


class UsersResource:
    """GET /v1/users & POST /v1/users
    Lists users and creates new user accounts.
    """

    @property
    def db(self):
        return get_driver()

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        current_user = req.context.user
        if not current_user:
            raise falcon.HTTPUnauthorized(title="Not authenticated", description="Authentication required.")

        # Fetch users with their status, admin status, roles, and station staff assignments
        users_rows = await self.db.execute("""
            SELECT u.id, u.external_id, u.username, u.email, u.display_name, u.is_admin, COALESCE(u.status, 'active') AS status
            FROM users u
        """)
        if not isinstance(users_rows, list):
            users_rows = []

        # Fetch roles per user
        roles_rows = await self.db.execute("SELECT user_id, role FROM user_roles")
        roles_by_user = {}
        roles_map_by_user = {}
        if isinstance(roles_rows, list):
            for r in roles_rows:
                uid = r["user_id"]
                r_val = r["role"]
                if uid not in roles_by_user:
                    roles_by_user[uid] = []
                    roles_map_by_user[uid] = {}
                roles_by_user[uid].append(r_val)
                roles_map_by_user[uid].update(roles_to_map([r_val]))

        # Fetch station staff assignments per user
        staff_rows = await self.db.execute("""
            SELECT ss.user_id, ss.station_id, ss.role, s.name AS station_name, s.event_id
            FROM station_staff ss
            JOIN stations s ON ss.station_id = s.id
        """)
        stations_by_user = {}
        if isinstance(staff_rows, list):
            for s in staff_rows:
                uid = s["user_id"]
                if uid not in stations_by_user:
                    stations_by_user[uid] = []
                stations_by_user[uid].append({
                    "stationId": s["station_id"],
                    "stationName": s["station_name"],
                    "eventId": s["event_id"],
                    "role": s["role"]
                })

        users = []
        for u in users_rows:
            uid = u["id"]
            users.append({
                "id": uid,
                "externalId": u.get("external_id"),
                "username": u.get("username"),
                "email": u.get("email"),
                "displayName": u.get("display_name"),
                "name": u.get("display_name"),
                "isAdmin": bool(u.get("is_admin")),
                "status": u.get("status") or "active",
                "roles": roles_map_by_user.get(uid, {}),
                "rolesList": roles_by_user.get(uid, []),
                "stationStaff": stations_by_user.get(uid, [])
            })

        resp.media = users
        resp.status = falcon.HTTP_200


class UserResource:
    """GET/PUT/DELETE /v1/users/{user_id}
    Retrieves, updates, or deletes a specific user account.
    Also supports station assignments via /v1/users/{user_id}/station.
    """

    @property
    def db(self):
        return get_driver()

    async def on_get(self, req: falcon.Request, resp: falcon.Response, user_id: str):
        row = await self.db.fetch_one("""
            SELECT id, external_id, username, email, display_name, is_admin, COALESCE(status, 'active') AS status
            FROM users WHERE id = :id
        """, {"id": user_id})

        if not row:
            raise falcon.HTTPNotFound(title="User not found", description=f"No user with ID {user_id}")

        roles_rows = await self.db.execute("SELECT role FROM user_roles WHERE user_id = :uid", {"uid": user_id})
        roles_list = [r["role"] for r in roles_rows] if isinstance(roles_rows, list) else []
        roles_map = roles_to_map(roles_list)

        staff_rows = await self.db.execute("""
            SELECT ss.station_id, ss.role, s.name AS station_name, s.event_id
            FROM station_staff ss
            JOIN stations s ON ss.station_id = s.id
            WHERE ss.user_id = :uid
        """, {"uid": user_id})
        station_staff = [{
            "stationId": s["station_id"],
            "stationName": s["station_name"],
            "eventId": s["event_id"],
            "role": s["role"]
        } for s in staff_rows] if isinstance(staff_rows, list) else []

        resp.media = {
            "id": row["id"],
            "externalId": row.get("external_id"),
            "username": row.get("username"),
            "email": row.get("email"),
            "displayName": row.get("display_name"),
            "name": row.get("display_name"),
            "isAdmin": bool(row.get("is_admin")),
            "status": row.get("status") or "active",
            "roles": roles_map,
            "rolesList": roles_list,
            "stationStaff": station_staff
        }
        resp.status = falcon.HTTP_200

    async def on_put(self, req: falcon.Request, resp: falcon.Response, user_id: str):
        payload = await req.get_media()
        
        # Verify user exists
        existing = await self.db.fetch_one("SELECT id, is_admin, status FROM users WHERE id = :id", {"id": user_id})
        if not existing:
            raise falcon.HTTPNotFound(title="User not found", description=f"No user with ID {user_id}")

        # Updatable user fields
        username = payload.get("username")
        email = payload.get("email")
        display_name = payload.get("displayName") or payload.get("name")
        is_admin = payload.get("isAdmin")
        status = payload.get("status")

        if username is not None or email is not None or display_name is not None or is_admin is not None or status is not None:
            query = """
                UPDATE users
                SET username = COALESCE(:username, username),
                    email = COALESCE(:email, email),
                    display_name = COALESCE(:display_name, display_name),
                    is_admin = COALESCE(:is_admin, is_admin),
                    status = COALESCE(:status, status)
                WHERE id = :id
            """
            await self.db.execute(query, {
                "id": user_id,
                "username": username,
                "email": email,
                "display_name": display_name,
                "is_admin": is_admin,
                "status": status
            })

        # Handle event role update if eventId/event and role are passed
        event_id = payload.get("eventId") or payload.get("event")
        role = payload.get("role")
        roles_dict = payload.get("roles")

        if roles_dict is not None and isinstance(roles_dict, dict):
            # Replace all user_roles for this user
            await self.db.execute("DELETE FROM user_roles WHERE user_id = :uid", {"uid": user_id})
            for eid, r in roles_dict.items():
                if r:
                    role_str = f"{eid}:{r}" if ":" not in r else r
                    await self.db.execute("INSERT INTO user_roles (user_id, role) VALUES (:uid, :role)", {
                        "uid": user_id,
                        "role": role_str
                    })
        elif event_id is not None:
            if not role:
                # Delete role for this event
                await self.db.execute("DELETE FROM user_roles WHERE user_id = :uid AND (role = :r1 OR role LIKE :r2)", {
                    "uid": user_id,
                    "r1": f"{event_id}",
                    "r2": f"{event_id}:%"
                })
            else:
                role_str = f"{event_id}:{role}"
                # Remove existing role for this event first
                await self.db.execute("DELETE FROM user_roles WHERE user_id = :uid AND (role = :r1 OR role LIKE :r2)", {
                    "uid": user_id,
                    "r1": f"{event_id}",
                    "r2": f"{event_id}:%"
                })
                await self.db.execute("INSERT INTO user_roles (user_id, role) VALUES (:uid, :role)", {
                    "uid": user_id,
                    "role": role_str
                })

        # Handle station staff assignment update if stationId / stationIds is passed
        station_ids = payload.get("stationIds")
        station_id = payload.get("stationId")
        station_action = payload.get("stationAction") # "add", "remove", or None

        if station_ids is not None:
            # Replace all station assignments with station_ids list
            await self.db.execute("DELETE FROM station_staff WHERE user_id = :uid", {"uid": user_id})
            for sid in station_ids:
                if sid:
                    await self.db.execute("""
                        INSERT INTO station_staff (station_id, user_id, role)
                        VALUES (:sid, :uid, 'staff')
                    """, {"sid": sid, "uid": user_id})
        elif station_id is not None:
            station_role = payload.get("stationRole") or "staff"
            if station_action == "remove" or station_id == "":
                await self.db.execute("DELETE FROM station_staff WHERE user_id = :uid AND station_id = :sid", {
                    "uid": user_id,
                    "sid": station_id
                })
            else:
                await self.db.execute("DELETE FROM station_staff WHERE user_id = :uid AND station_id = :sid", {
                    "uid": user_id,
                    "sid": station_id
                })
                await self.db.execute("""
                    INSERT INTO station_staff (station_id, user_id, role)
                    VALUES (:sid, :uid, :role)
                """, {
                    "sid": station_id,
                    "uid": user_id,
                    "role": station_role
                })

        # Return updated user object
        await self.on_get(req, resp, user_id)

    async def on_patch(self, req: falcon.Request, resp: falcon.Response, user_id: str):
        """PATCH /v1/users/{user_id}
        Incrementally adds or removes a single role or station assignment.
        Supported body parameters:
          - roleAction: "add" | "remove"
          - eventId / event: target event UUID
          - role: role string (e.g. "event-admin", "scorer", "user")
          - stationId: station UUID
          - stationAction: "add" | "remove"
          - status: "active" | "pending" | "blocked"
        """
        payload = await req.get_media()

        existing = await self.db.fetch_one("SELECT id FROM users WHERE id = :id", {"id": user_id})
        if not existing:
            raise falcon.HTTPNotFound(title="User not found", description=f"No user with ID {user_id}")

        role_action = payload.get("roleAction") or payload.get("action") or "add"
        event_id = payload.get("eventId") or payload.get("event")
        role = payload.get("role")

        if event_id:
            role_str = f"{event_id}:{role}" if role and ":" not in role else (role or event_id)
            if role_action == "remove" or not role:
                await self.db.execute("DELETE FROM user_roles WHERE user_id = :uid AND (role = :r1 OR role LIKE :r2)", {
                    "uid": user_id,
                    "r1": role_str,
                    "r2": f"{event_id}:%"
                })
            else:
                # Remove existing role for this event first, then insert new role
                await self.db.execute("DELETE FROM user_roles WHERE user_id = :uid AND (role = :r1 OR role LIKE :r2)", {
                    "uid": user_id,
                    "r1": role_str,
                    "r2": f"{event_id}:%"
                })
                await self.db.execute("INSERT INTO user_roles (user_id, role) VALUES (:uid, :role)", {
                    "uid": user_id,
                    "role": role_str
                })
        elif role and role_action == "remove":
            await self.db.execute("DELETE FROM user_roles WHERE user_id = :uid AND role = :role", {
                "uid": user_id,
                "role": role
            })
        elif role and role_action == "add":
            await self.db.execute("INSERT INTO user_roles (user_id, role) VALUES (:uid, :role)", {
                "uid": user_id,
                "role": role
            })

        # Station staff toggle
        station_id = payload.get("stationId")
        station_action = payload.get("stationAction") or role_action
        if station_id:
            station_role = payload.get("stationRole") or "staff"
            if station_action == "remove":
                await self.db.execute("DELETE FROM station_staff WHERE user_id = :uid AND station_id = :sid", {
                    "uid": user_id,
                    "sid": station_id
                })
            else:
                await self.db.execute("DELETE FROM station_staff WHERE user_id = :uid AND station_id = :sid", {
                    "uid": user_id,
                    "sid": station_id
                })
                await self.db.execute("INSERT INTO station_staff (station_id, user_id, role) VALUES (:sid, :uid, :role)", {
                    "sid": station_id,
                    "uid": user_id,
                    "role": station_role
                })

        # User status toggle
        status = payload.get("status")
        if status:
            await self.db.execute("UPDATE users SET status = :status WHERE id = :id", {
                "id": user_id,
                "status": status
            })

        await self.on_get(req, resp, user_id)

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, user_id: str):
        existing = await self.db.fetch_one("SELECT id FROM users WHERE id = :id", {"id": user_id})
        if not existing:
            raise falcon.HTTPNotFound(title="User not found", description=f"No user with ID {user_id}")

        await self.db.execute("DELETE FROM user_roles WHERE user_id = :id", {"id": user_id})
        await self.db.execute("DELETE FROM station_staff WHERE user_id = :id", {"id": user_id})
        await self.db.execute("DELETE FROM users WHERE id = :id", {"id": user_id})

        resp.status = falcon.HTTP_204
