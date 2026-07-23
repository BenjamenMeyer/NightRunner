# Night Runner Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust Python ASGI backend for the Night Runner service using Falcon, featuring a custom Raw SQL driver, generic JWT authentication, and multi-provider Terraform deployment.

**Architecture:** Modified MVC. View = Falcon Layer (`transport/`), Controller = SQL Drivers (`drivers/`), Model = Data Structures (`models/`).

**Tech Stack:** Python 3.12, Falcon (ASGI), Uvicorn, SQLite/PostgreSQL, PyJWT, Terraform, Docker (Alpine).

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create/Modify: `pyproject.toml`
- Create: `nightrunner_backend/__init__.py`
- Modify: `nightrunner_backend/main.py`
- Modify: `README.md` (PRESERVE existing content, append backend notes)

- [ ] **Step 1: Set up Virtual Environment**
Run: `python3 -m venv .venv && source .venv/bin/activate`

- [ ] **Step 2: Update `pyproject.toml`**
Define dependencies and project metadata.
```toml
[project]
name = "nightrunner-backend"
version = "0.1.0"
dependencies = [
    "falcon[asgi]",
    "uvicorn",
    "aiosqlite",
    "psycopg[binary,pool]",
    "pyjwt[crypto]",
    "pydantic",
    "pydantic-settings",
    "uuid6",
    "python-dotenv",
    "httpx",
]

[project.optional-dependencies]
test = [
    "pytest",
    "pytest-asyncio",
    "pytest-falcon",
]

[build-system]
requires = ["setuptools", "wheel"]
build-backend = "setuptools.build_meta"
```

- [ ] **Step 3: Create unit test for Health Check**
Verify the basic Falcon setup.
- Test: `tests/test_health.py`

- [ ] **Step 4: Commit**
```bash
git add pyproject.toml nightrunner_backend/ README.md tests/
git commit -m "chore: scaffold backend with virtualenv and initial tests"
```

---

### Task 2: Database Driver (Controller) & Migration System

**Files:**
- Create: `nightrunner_backend/drivers/base.py`
- Create: `nightrunner_backend/drivers/migrations/001_initial.sql`
- Modify: `nightrunner_backend/main.py`

- [ ] **Step 1: Implement `DatabaseDriver` with Pooling**
Support SQLite and PostgreSQL connection pooling.
- Test: `tests/test_db_driver.py` (Verify connection and raw SQL execution)

- [ ] **Step 2: Implement Migration Runner**
- Test: `tests/test_migrations.py` (Verify numeric order application)

- [ ] **Step 3: Commit**
```bash
git add nightrunner_backend/drivers/ nightrunner_backend/main.py tests/
git commit -m "feat: implement db driver with pooling and migration runner"
```

---

### Task 3: Generic JWT Authentication Middleware (View Layer)

**Files:**
- Create: `nightrunner_backend/transport/middleware/auth.py`
- Create: `nightrunner_backend/config/settings.py`

- [ ] **Step 1: Implement Secure AuthMiddleware**
- **Security:** Mandatory signature verification (no fallback to `verify=False`).
- **Efficiency:** Joined query for user + roles.
- Test: `tests/test_auth_middleware.py` (Mock JWKS and verify role sync)

- [ ] **Step 2: Commit**
```bash
git add nightrunner_backend/transport/middleware/ nightrunner_backend/config/ tests/
git commit -m "feat: add secure JWT auth middleware with role sync"
```

---

### Task 4: Feature Implementation: Events & Patrols

**Files:**
- Create: `nightrunner_backend/models/`
- Create: `nightrunner_backend/drivers/` (Controllers)
- Create: `nightrunner_backend/transport/` (Views)

- [ ] **Step 1: Implement Feature Layers**
Apply the View/Controller separation.
- Test: `tests/features/test_events.py`, `tests/features/test_patrols.py`

- [ ] **Step 2: Commit**
```bash
git add nightrunner_backend/ tests/
git commit -m "feat: implement events and patrols with unit tests"
```

---

### Task 5: Dockerization & Local Testing

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yaml`

- [ ] **Step 1: Create `docker-compose.yaml`**
Include App and PostgreSQL for local testing.
```yaml
services:
  app:
    build: .
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/nightrunner
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=nightrunner
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
```

- [ ] **Step 2: Commit**
```bash
git add Dockerfile docker-compose.yaml
git commit -m "ops: add Docker and docker-compose for local testing"
```

---

### Task 6: Terraform Infrastructure

**Files:**
- Create: `deploy/`

- [ ] **Step 1: Implement Terraform Scripts**
- [ ] **Step 2: Commit**
```bash
git add deploy/
git commit -m "ops: add Terraform IaC for multi-provider deployment"
```
