# NightRunner Backend — AGENTS.md

This file is the canonical guide for autonomous AI agents (and developers) working on the NightRunner backend. Read it in full before making any changes.

---

## Project Overview

NightRunner is an **async Python backend** built on [Falcon ASGI](https://falcon.readthedocs.io/) + [aiosqlite](https://aiosqlite.omnilib.dev/) / PostgreSQL. It exposes a REST API for managing events, patrols, stations, configurations, and scoring.

---

## Stack & Dependencies

| Component | Library/Tool |
|-----------|-------------|
| HTTP framework | `falcon[asgi]` |
| ASGI server | `uvicorn` |
| Database (dev) | `aiosqlite` (SQLite in-memory or file) |
| Database (prod) | `psycopg[binary]` + `psycopg-pool` (PostgreSQL) |
| JWT auth | `pyjwt[crypto]` |
| Settings | `pydantic-settings` |
| Testing | `pytest` + `pytest-asyncio` (auto mode) |
| HTTP client | `httpx` |

---

## Repository Layout

```
nightrunner_backend/
├── main.py                     # Falcon ASGI app, route registration, middleware wiring
├── app_context.py              # DB driver lifecycle (get_driver, run_migrations, close_driver)
├── config/
│   └── settings.py             # Pydantic Settings (dev_mode, OIDC/JWKS, etc.)
├── models/                     # Pydantic data models
├── drivers/                    # DB driver implementations (SQLite / Postgres)
└── transport/
    ├── middleware/
    │   └── auth.py             # AuthMiddleware — JWT validation, req.context injection
    ├── events.py
    ├── patrols.py
    ├── stations.py
    ├── configurations.py
    ├── configuration_groups.py
    ├── scores.py
    ├── reports_event.py
    ├── reports_station.py
    ├── me.py
    ├── health.py
    └── login.py

tests/
├── conftest.py                 # Shared fixtures (DB, RSA keypair, token_factory, dev_mode_enabled)
├── drivers/store/              # Store-level unit tests
└── transport/                  # HTTP-layer tests (Falcon TestClient)
```

---

## Running Tests

**Always run the project's own virtualenv:**

```bash
./venv/bin/pytest -q
```

- `pytest-asyncio` is configured in **auto** mode (`asyncio_mode = "auto"` in `pyproject.toml`), so `@pytest.mark.asyncio` is optional but harmless.
- The `test_database` fixture (autouse, function-scoped) resets the driver to an in-memory SQLite DB before each test.

---

## Key Conventions

### Async throughout
Every store method is `async def`. Every transport resource method (`on_get`, `on_post`, etc.) is also `async def`. Never introduce synchronous blocking calls.

### Response status codes
Use Falcon constants (`falcon.HTTP_200`, `falcon.HTTP_201`, `falcon.HTTP_204`, `falcon.HTTP_404`, etc.), not raw strings.

### Error handling
Raise Falcon exceptions (`falcon.HTTPNotFound`, `falcon.HTTPUnauthorized`, `falcon.HTTPBadRequest`) rather than manually setting `resp.status` and `resp.media`.

### Settings
All runtime configuration lives in [`nightrunner_backend/config/settings.py`](nightrunner_backend/config/settings.py) as a `pydantic-settings` `Settings` instance. The singleton is `settings`. Key flags:

| Setting | Default | Meaning |
|---------|---------|---------|
| `dev_mode` | `False` | Bypasses all JWT auth; injects a synthetic dev user |
| `jwks_url` | `""` | Required (non-dev) for OIDC token validation |
| `oidc_issuer` | `""` | Required (non-dev) if JWKS is configured |
| `oidc_audience` | `""` | Required (non-dev) if JWKS is configured |

---

## AuthMiddleware — Critical Details

[`nightrunner_backend/transport/middleware/auth.py`](nightrunner_backend/transport/middleware/auth.py)

**Request flow (in order):**

1. `/health` → always allowed; injects `user=None, roles=[]`
2. `/auth/login` → always allowed; injects `user=None, roles=[]`
3. `settings.dev_mode == True` → injects synthetic dev user; no token required
4. Bearer token == `"test-token"` → injects synthetic test user (legacy convenience bypass)
5. Otherwise: validates JWT via JWKS, fetches user+roles from DB
6. No / malformed `Authorization` header → raises `falcon.HTTPUnauthorized`

**`req.context` attributes set by the middleware:**

| Attribute | Type | Content |
|-----------|------|---------|
| `req.context.user` | `dict \| None` | `{id, username, email, display_name}` |
| `req.context.roles` | `list` | List of role strings for this user |

---

## Testing Authentication

All shared auth fixtures live in [`tests/conftest.py`](tests/conftest.py).

### `token_factory` fixture

Creates signed JWTs with arbitrary roles and admin flag. Returns a headers dict ready to pass to the test client:

```python
async def test_something(token_factory):
    headers = token_factory(roles={"event-1": "scorer"}, is_admin=False)
    resp = await client.simulate_get("/v1/events", headers=headers)
```

- `roles`: dict of `{event_id: role_key}` pairs embedded in the token
- `is_admin`: boolean embedded as `isAdmin` claim

### `dev_mode_enabled` fixture

Enables `settings.dev_mode = True` for the duration of a single test (uses `monkeypatch` so it auto-reverts):

```python
async def test_something_as_dev(dev_mode_enabled, test_client):
    resp = await test_client.simulate_get("/v1/me")
    assert resp.status == falcon.HTTP_200
```

### `mock_jwks` fixture (autouse)

Automatically patches `jwt.PyJWKClient` to return the RSA public key from the session-scoped `rsa_keypair` fixture, so tokens signed with the matching private key will validate without a real JWKS endpoint.

### Patching middleware in transport tests

For endpoints that need auth bypassed entirely in a test, use:

```python
from unittest.mock import AsyncMock, patch

@patch(
    "nightrunner_backend.transport.middleware.auth.AuthMiddleware.process_request",
    AsyncMock(return_value=None),
)
async def test_my_endpoint(test_client):
    ...
```

> **Important:** When `process_request` is patched to `AsyncMock(return_value=None)`, `req.context.user` and `req.context.roles` are **not** set by the middleware. If your resource reads those attributes, you must either use `token_factory` to supply a real token, or use `dev_mode_enabled`.

---

## Adding a New Endpoint

1. Create a new resource file in `nightrunner_backend/transport/`.
2. Define `async def on_get`, `on_post`, etc. on a Falcon resource class.
3. Register the route in `register_routes(app)` in [`main.py`](nightrunner_backend/main.py).
4. Write tests under `tests/transport/` using `falcon.testing.ASGITestClient` (see existing tests for the pattern).
5. If the endpoint is authenticated, use `token_factory` in tests; if public, document why in the middleware's bypass section.

---

## Common Pitfalls

- **`replace_file_content` target content must be non-empty.** If the tool fails with `target content cannot be empty`, it means the text you're trying to match contains invisible characters or the file content has changed. Read the exact bytes from `view_file` first, then use that exact string as the target.
- **`register_routes` is called at module load time** (line 61 of `main.py`). Test fixtures that call it again will double-register routes. Guard against that or use the `app` object directly.
- **`asyncio_mode = "auto"`** means you don't need to explicitly mark tests with `@pytest.mark.asyncio`, but having it doesn't hurt.
- **Pydantic settings are a singleton.** Mutations (e.g., `settings.dev_mode = True`) persist across tests unless you use `monkeypatch`. Always use the `dev_mode_enabled` fixture rather than mutating `settings` directly.
- **`req.context.roles` is a list, not a dict.** The token carries roles as a dict, but the middleware may transform them. Check the middleware if you add role-based access control.
- **Always write unit tests and integration tests** for all new features, endpoints, and components before submitting a PR.
- **Always add or update Storybook stories** in `nightrunner_frontend/src/stories/` whenever creating new frontend UI components or pages.

---

## Git Branching & PR Workflow

- **Branch creation**: Always fetch the latest version of `upstream/main` (`git fetch upstream main`) and rebase `main` (`git checkout main && git rebase upstream/main`) BEFORE creating any new feature or fix branch from `main`.
- **Pre-PR rebase**: Always fetch and rebase on `upstream/main` again BEFORE opening a PR or pushing commits for review to guarantee branches are never outdated against base `main`.
- **Fork-only pushes**: Always push branches to the personal fork (`origin`), and open cross-fork PRs targeting `TLNightOps/NightRunner:main`. Do NOT push directly to `upstream` or auto-merge PRs.
- **PR Assignment**: Always assign the PR to the user submitting/creating it (e.g. `--assignee "@me"` or `--assignee <username>`).
- **Post-Merge Cleanup**: Always clean up local branches (`git branch -d <branch-name>` or `-D` if squash-merged) after a pull request has been merged, while keeping remote branches untouched unless explicitly requested.
