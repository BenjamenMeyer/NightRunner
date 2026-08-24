## Goal Description
Add comprehensive unit tests for the NightRunner backend to raise overall test coverage from ~70 % to at least 90 %. The tests will focus on the low‑coverage modules identified in the coverage report, ensuring core logic, error handling, and edge cases are exercised. All tests will run against an in‑memory SQLite database and use the existing test fixtures for isolation.

## User Review Required
> [!IMPORTANT]
> The plan introduces new test modules and modifies existing fixtures. No production code will be changed. Please confirm that adding these tests aligns with your project priorities and that you are comfortable with the test scope.

## Open Questions
> [!WARNING]
> 1. **Async behavior** – Some store methods are async and rely on `DatabaseDriver`. Should the new tests use the existing `test_database` fixture (which provides an in‑memory DB) or create a separate fixture per module?
> 2. **Authentication middleware** – The `auth.py` middleware uses Falcon's testing client (`testing.TestClient`) or mocking the request/response manually? Which approach do you prefer?
> 3. **Coverage target** – Target is ≥90 % overall. Do you have a specific module‑level minimum (e.g., each low‑coverage file ≥80 %)?

## Proposed Changes
---
### nightrunner_backend/drivers/base.py
Add tests for `DatabaseDriver` covering:
- Connection creation and reuse.
- Migration execution order.
- Transaction roll‑back on exceptions.
- Concurrency guard (`asyncio.Lock`).

#### [NEW] tests/drivers/test_base_driver.py
```python
import asyncio
import pytest
from nightrunner_backend.drivers.base import DatabaseDriver

@pytest.fixture
async def driver(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    driver = DatabaseDriver(str(db_path))
    await driver.migrate()
    return driver

@pytest.mark.asyncio
async def test_connection_and_migration(driver):
    async with driver.get_connection() as conn:
        cur = await conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in await cur.fetchall()]
        # Expect at least one table created by migrations
        assert tables
```
---
### nightrunner_backend/drivers/store/configuration.py
Create CRUD tests covering creation, retrieval, update, delete, and error cases (duplicate key, missing record).

#### [NEW] tests/drivers/store/test_configuration_store.py
```python
import pytest
from nightrunner_backend.drivers.store.configuration import ConfigurationStore

@pytest.fixture
async def store(test_database):
    return ConfigurationStore(test_database)

@pytest.mark.asyncio
async def test_crud_operations(store):
    # Create
    cfg = await store.create(name="test", value="val")
    assert cfg.id is not None
    # Retrieve
    fetched = await store.get(cfg.id)
    assert fetched.name == "test"
    # Update
    updated = await store.update(cfg.id, name="updated")
    assert updated.name == "updated"
    # Delete
    await store.delete(cfg.id)
    with pytest.raises(Exception):
        await store.get(cfg.id)
```
---
### nightrunner_backend/drivers/store/scores.py
Add similar CRUD tests, also covering score‑specific validation (e.g., value range).

#### [NEW] tests/drivers/store/test_scores_store.py
```python
import pytest
from nightrunner_backend.drivers.store.scores import ScoresStore

@pytest.fixture
async def store(test_database):
    return ScoresStore(test_database)

@pytest.mark.asyncio
async def test_score_crud(store):
    score = await store.create(pilot_id=1, score=85)
    assert score.id
    fetched = await store.get(score.id)
    assert fetched.score == 85
    # Update with invalid value should raise
    with pytest.raises(ValueError):
        await store.update(score.id, score=200)
```
---
### nightrunner_backend/transport/middleware/auth.py
Create tests for the authentication middleware using Falcon's testing utilities:
- Valid token passes through.
- Missing/invalid token returns 401.
- Token expiration handling.

#### [NEW] tests/transport/middleware/test_auth_middleware.py
```python
import pytest
from falcon import testing
from nightrunner_backend.transport.middleware.auth import AuthMiddleware
from nightrunner_backend.transport.me import MeResource

@pytest.fixture
def client():
    app = testing.TestApp()
    app.add_middleware(AuthMiddleware())
    app.add_route('/me', MeResource())
    return app

def test_missing_token(client):
    result = client.simulate_get('/me')
    assert result.status == '401 Unauthorized'
```
---
### nightrunner_backend/transport/login.py
Test the login redirection logic:
- Verify the redirect URL contains expected OIDC parameters.
- Ensure state is generated.

#### [NEW] tests/transport/test_login.py
```python
import urllib.parse as urlparse
from falcon import testing
from nightrunner_backend.transport.login import LoginResource

def test_login_redirect():
    app = testing.TestApp()
    app.add_route('/auth/login', LoginResource())
    resp = app.simulate_get('/auth/login')
    assert resp.status == '302'
    location = resp.headers['Location']
    parsed = urlparse.urlparse(location)
    query = urlparse.parse_qs(parsed.query)
    # Settings values are read from the config module; ensure keys exist.
    assert 'client_id' in query
    assert query['response_type'][0] == 'code'
```
---
### nightrunner_backend/transport/reports_event.py and reports_station.py
Add integration‑style tests that hit the endpoints with a seeded in‑memory DB and verify the JSON payload structure.

#### [NEW] tests/transport/test_reports.py
```python
import pytest
from falcon import testing
from nightrunner_backend.transport.reports_event import ReportsEventResource
from nightrunner_backend.transport.reports_station import ReportsStationResource

@pytest.fixture
def client(test_database):
    app = testing.TestApp()
    app.add_route('/reports/event', ReportsEventResource())
    app.add_route('/reports/station', ReportsStationResource())
    return app

def test_event_report(client):
    resp = client.simulate_get('/reports/event')
    assert resp.status == '200 OK'
    data = resp.json
    assert isinstance(data, list)
    if data:
        assert 'event_id' in data[0]
        assert 'score' in data[0]
```
---
### nightrunner_backend/transport/scores.py
Add tests for score endpoint validation and proper DB interaction.

#### [NEW] tests/transport/test_scores_endpoint.py
```python
import pytest
from falcon import testing
from nightrunner_backend.transport.scores import ScoresResource

@pytest.fixture
def client(test_database):
    app = testing.TestApp()
    app.add_route('/scores', ScoresResource())
    return app

def test_post_score_success(client):
    payload = {"pilot_id": 1, "score": 90}
    resp = client.simulate_post('/scores', json=payload)
    assert resp.status == '201 Created'
    assert resp.json['score'] == 90
```
---
### Additional Fixtures
Update `tests/conftest.py` to expose a `test_database` fixture that yields an in‑memory `DatabaseDriver` with migrations applied. This fixture will be used by all new store and transport tests.

#### [MODIFY] tests/conftest.py
```diff
@@
-@pytest.fixture(scope="function")
-def test_db(tmp_path_factory):
-    # existing implementation …
+@pytest.fixture(scope="function")
+async def test_database(tmp_path_factory):
+    """Provide an in‑memory SQLite driver with migrations applied.
+
+    The existing `test_db` fixture is replaced to ensure all new tests use a
+    fresh, isolated database without touching the file system.
+    """
+    from nightrunner_backend.drivers.base import DatabaseDriver
+    driver = DatabaseDriver(":memory:")
+    await driver.migrate()
+    return driver
```
---
## Verification Plan
### Automated Tests
Run the full suite with coverage collection:
```bash
.venv/bin/pytest -q --cov=nightrunner_backend --cov-report=term-missing
```
Confirm the overall coverage is ≥90 % and that each newly added module meets at least 80 %.

### Manual Verification
- Ensure the CI pipeline (if any) still passes.
- Review the HTML coverage report for any remaining uncovered branches.

---
## Walkthrough (to be added after execution)
A post‑implementation walkthrough artifact will summarise the added tests, coverage results, and any notable edge‑case handling.
