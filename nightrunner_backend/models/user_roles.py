"""Helpers for interpreting the role strings stored in `user_roles.role`.

Event roles are persisted as a single string in the form `"<event_id>:<role>"`
(for example `"0198ab...:event-admin"`). Global roles such as `"admin"` or
`"system-admin"` carry no event prefix.

The frontend consumes roles as an `{eventId: role}` map, so every endpoint that
returns roles to a client has to unpack them the same way. Keeping that logic
here stops `/me` and `/users` from disagreeing about the shape.
"""


def roles_to_map(roles):
    """Unpacks stored role strings into an ``{event_id: role}`` mapping.

    Roles without an event prefix are keyed by themselves, so a global
    ``"admin"`` role becomes ``{"admin": "admin"}``.

    :param roles: iterable of stored role strings, or None.
    :returns: dict mapping event ID (or global role name) to role name.
    """
    roles_map = {}

    for role in roles or []:
        if not role:
            continue

        if ":" in role:
            event_id, role_name = role.split(":", 1)
            roles_map[event_id] = role_name
        else:
            roles_map[role] = role

    return roles_map
