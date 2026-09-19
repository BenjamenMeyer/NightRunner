"""Guard against a Postgres-only bug class that CI cannot otherwise catch.

The backend suite runs against SQLite (DATABASE_URL=sqlite:///:memory:), which
preserves the case of a column alias whether or not it is quoted. PostgreSQL --
what the deployed environments actually run -- folds *unquoted* identifiers to
lowercase, so `SELECT patrol_id AS patrolId` comes back as `patrolid` there.

Any code reading `row["patrolId"]` then raises KeyError in production while the
whole suite stays green locally.

CI does stand up a real Postgres via docker compose for the frontend
integration job, but no test drives these queries through it -- the one
report-related test mocks ApiService and asserts on a hardcoded status. Until a
backend integration test runs against that Postgres, this static check is the
cheapest defence: require camelCase aliases to be double-quoted.
"""
import pathlib
import re

STORE_DIR = pathlib.Path(__file__).resolve().parents[2] / "nightrunner_backend"

# `AS someName` where the alias is camelCase and NOT wrapped in double quotes.
UNQUOTED_CAMEL_ALIAS = re.compile(r'\bAS\s+(?!")([a-z]+[A-Z]\w*)')


def test_camelcase_sql_aliases_are_quoted():
    offenders = []
    for path in STORE_DIR.rglob("*.py"):
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for match in UNQUOTED_CAMEL_ALIAS.finditer(line):
                rel = path.relative_to(STORE_DIR.parent)
                offenders.append(f"{rel}:{lineno}: AS {match.group(1)}")

    assert not offenders, (
        "Unquoted camelCase SQL aliases fold to lowercase on PostgreSQL and will "
        "KeyError in production while passing on SQLite. Quote them, e.g. "
        'AS "patrolId":\n  ' + "\n  ".join(offenders)
    )
