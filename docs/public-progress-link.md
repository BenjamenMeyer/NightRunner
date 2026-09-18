# Public Progress Link — design spec

Status: **built** — implemented 2026-09-18, together with
[public-patrol-check-in.md](public-patrol-check-in.md). Both ship in one change
because they share the token table, the middleware carve-out, and the admin
mint/list/revoke endpoints.
Drafted 2026-09-18

Two things changed during the build. The migration comments had to lose their
semicolons, because the migration runner splits files on `;` without noticing
comments. And the shared grid extraction went further than planned: check-in and
check-out logic also moved into
`nightrunner_backend/transport/visit_actions.py`, so the public and the
authenticated routes call one implementation.

Companion to [public-patrol-check-in.md](public-patrol-check-in.md). Both features
need the same per-event token mechanism; this spec assumes that table is built
once, with a `scope` column, and used by both.

## Problem

Parents, troop leaders, and anyone not running the event have no way to see how
patrols are doing. The one screen that shows it — `/live` — sits behind a login,
and handing out accounts to spectators is not a thing anyone wants to do.

## Approach

One unguessable link per event, showing a read-only progress board:

```
https://<host>/progress/hT4pW9nK2mQ7vR3xL8cB6yF1jS5dA0zE4gU7nM2oI9k
```

Whoever holds it sees which patrols have reached which stations, at that one
event, and nothing else.

## Scope — progress only

**No scores, at any point.** An earlier draft of this had a "Make scores public"
toggle on the event. That is dropped. Ben is building a printable scoring report,
and that is where results go.

This matters beyond saving work. Raw rows in `scores` include superseded and
unapplied entries — resolving those is exactly what the finalizer does, and it is
where the recent run of bugs has been. A public page reading live scores would
publish numbers that later change. Keeping scores off this page entirely removes
the question.

The public board shows four columns:

| Column | Source |
|---|---|
| Patrol # | `patrols.number` |
| Patrol Name | `patrols.name` |
| Troop | derived from `patrol_members.troop` — see below |
| Progress | `station_visits`, per station |

## Decisions taken

| Decision | Choice | Why |
|---|---|---|
| What is shown | Progress only, never scores | Scores live in Ben's printable report. Avoids publishing pre-finalizer numbers. |
| Scope | One token per event | Matches the check-in link. A spectator has no event context to pick from, so the token has to name the event. |
| Token sharing | Shared table, `scope` column | A progress token is read-only and safe in a parents' group chat. A check-in token can write. Same plumbing, revoked independently. |
| Troop | Derived from members | Patrols have no troop column. Patrols are often mixed, so the column shows every distinct code. |
| Lifetime | Event date + 2 days, plus manual revoke | Same as the check-in link. With no scores on the page there is no reason to keep it alive afterwards. |
| Capabilities | Read only | No POST endpoints at all in this feature. |

## Threat model

What the token holder can do: read patrol progress at one event.

| Risk | Prevention |
|---|---|
| Reach another event's data | Every query is scoped by the token's `event_id`. The client never supplies an event id. |
| Read patrol phone numbers or radio details | `patrols` carries `phone_number`, `radio_frequency`, `radio_channel`, `radio_identifier`. The projection returns `number`, `name`, and derived troop codes only. |
| Read youth names | The troop derivation reads `patrol_members`, which is also where member names live. The query selects the `troop` column only, and a test asserts no name reaches the response. This is the sharpest edge in the feature. |
| Read the attendee roster | Not reachable from this endpoint. |
| See scores | No score table is queried. |
| Write anything | No public write endpoint exists in this feature. |
| Enumerate tokens | Unknown, revoked, expired, and wrong-scope tokens all return the same generic 404. |
| Recover tokens from a database dump | Only a SHA-256 hash is stored. Plaintext is shown once, at creation. |

---

## Backend

### Migration — `022_event_access_tokens.sql`

Next free prefix is **022**. The check-in spec says 019; that was true when it was
written and is now stale — `019_compiled_reports.sql`, both `020_` files, and
`021_add_submitted_text_to_scores.sql` have landed since.

Identical to the check-in spec's table with one addition, `scope`:

```sql
CREATE TABLE IF NOT EXISTS event_access_tokens (
    id TEXT PRIMARY KEY, -- UUIDv7
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    -- SHA-256 of the plaintext token, hex encoded.
    token_hash TEXT NOT NULL UNIQUE,
    -- 'progress' is read-only and safe to share widely. 'checkin' can write
    -- visit records. A token is resolved against the scope the endpoint
    -- expects; presenting a progress token to a check-in route 404s.
    scope TEXT NOT NULL DEFAULT 'progress',
    -- Reserved for per-station check-in links. Unused by progress tokens.
    station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
    label TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT,
    revoked_at TEXT,
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_access_tokens_event
    ON event_access_tokens (event_id, scope);
```

### Token generation

- 32 bytes from `secrets.token_urlsafe(32)` — 43 URL-safe characters.
- Stored as `hashlib.sha256(token.encode()).hexdigest()`.
- Returned in plaintext once, in the mint response.
- Default expiry: event date + 2 days at 23:59 UTC; if the event has no date,
  created_at + 30 days.

### Middleware change — `transport/middleware/auth.py`

Today the middleware lets through only `/health` and `/auth/login`, and in
production requires **two** tokens: a GCP IAM token from the Cloudflare Worker
proxy, and the user's Firebase token.

Public routes must skip the **user** token while **keeping** the IAM proxy check.
Add `PUBLIC_PATH_PREFIXES = ("/v1/public/",)`, then:

- Do **not** early-return alongside `/health`. That branch sits above the IAM
  block and would skip proxy verification too.
- Run the IAM block as today, then return early for public paths before the
  `if not auth_header` rejection, setting `req.context.user = None` and
  `req.context.roles = []`.

Per AGENTS.md, document the bypass in the middleware's own comments: public
resources authenticate themselves via `event_access_tokens`, and
`req.context.user` is `None` for them.

If the check-in feature is built first, this change already exists and progress
needs none of it.

### Store — `drivers/store/event_access_tokens.py`

```python
class EventAccessTokensStore:
    async def create(self, token: EventAccessToken) -> EventAccessToken
    async def list_for_event(self, event_id: str, scope: str | None = None) -> List[EventAccessToken]
    async def get_by_hash(self, token_hash: str) -> Optional[EventAccessToken]
    async def revoke(self, token_id: str, at: str) -> None
    async def touch(self, token_id: str, at: str) -> None
```

`get_by_hash` returns the row regardless of state. Validity is decided in one
place, `resolve_token(token, expected_scope) -> EventAccessToken`, which raises
`falcon.HTTPNotFound` for unknown, revoked, expired, and wrong-scope tokens
alike — the same error for all four.

### Public endpoint — `transport/public_progress.py`

One route, read only.

**`GET /v1/public/progress/{token}`**

```json
{
  "event":    { "name": "Night Runner 2026", "date": "2026-10-10" },
  "stations": [ { "id": "...", "name": "First Aid" } ],
  "patrols":  [ { "id": "...", "number": 7, "name": "Eagles",
                  "troops": ["GA-0594", "GA-0612"] } ],
  "visits":   [ { "stationId": "...", "patrolId": "...", "status": "checked_in",
                  "checkedInAt": "...", "checkedOutAt": null,
                  "tasksCompletedAt": null } ],
  "expiresAt": "2026-10-12T23:59:00Z"
}
```

Note: `stations` has no `number` field. The check-in spec's example shows one;
the `stations` table does not have it.

Absent by design: patrol ids aside, no contact details, no member names, no
scores, no users, no roster.

`patrols[].troops` is a list because patrols are commonly mixed-troop. The
derivation is a single grouped query:

```sql
SELECT patrol_id, troop
FROM patrol_members
WHERE patrol_id IN (...) AND troop IS NOT NULL AND troop <> ''
GROUP BY patrol_id, troop
ORDER BY troop
```

Selecting only `patrol_id` and `troop` keeps names out of the process entirely,
rather than fetching rows and trusting the serializer to drop fields.

The endpoint calls `touch()` to update `last_used_at`.

### Admin endpoints — extend `transport/events.py`

Authenticated, admin only:

- `POST /v1/events/{event_id}/access-tokens` — mint. Body `{scope, label?, expiresAt?}`.
  Response includes `token` in plaintext, exactly once.
- `GET /v1/events/{event_id}/access-tokens?scope=` — list. Metadata only: label,
  scope, created, expiry, revoked, last used. Never the token or the hash.
- `DELETE /v1/events/{event_id}/access-tokens/{token_id}` — revoke. Sets
  `revoked_at`; the row is kept for the audit trail.

Shared with the check-in feature. Whichever is built first writes these.

### Rate limiting

Not in this change, matching the check-in spec. There is no rate limiting anywhere
in the app today. A read-only endpoint behind a 43-character token with
404-on-everything gives brute force nothing to work from. Worth raising separately.

---

## Frontend

### Route — `AppRoutes.jsx`

```js
{
    path: "/progress/:token",
    element: PublicProgress,
    access: ACCESS.PUBLIC,
    layout: false
}
```

`layout: false` matters: `Layout` renders the sidebar and user chrome, which
assume a signed-in user.

### Transport — a separate client

The public page **must not** use `BackendTransport`. On any 401 it calls
`window.location.replace("/login?expired=true")`, which would throw a spectator
holding a valid link onto a login screen.

Add `PublicProgressService.js` — a small fetch wrapper that sends no
`Authorization` header, does not redirect, and surfaces errors to the page.

### Page — `pages/progress/PublicProgress.jsx`

The existing `LiveStatus.jsx` already renders the patrol × station grid with the
cell states this needs, and already handles fit/auto scaling and polling. Build
the public page by extracting that grid into a shared presentational component
rather than copying it — one grid, two data sources.

Differences from `LiveStatus`:

- Four identifying columns: Patrol #, Patrol Name, Troop, then the station grid.
- Troop renders every code in the list, comma separated.
- No event picker. The token names the event.
- No score column, and no link to anything that has one.
- Poll every 30s rather than 15s — spectators are not making operational
  decisions, and this endpoint is open.

States to handle:

- **Loading** — fetching.
- **Invalid link** — 404. Plain message: this link is no longer valid, ask the
  event organiser. No detail about why.
- **Working** — the grid.

Legend matters more here than on the internal board, because the audience has
never seen the app: spell out not arrived / at station / completed rather than
relying on colour alone.

### Admin UI — Event Manager

A "Public links" panel on the event: generate a progress link or a check-in link,
copy it, show a QR code, revoke, and list active links with last-used times. The
repo already has QR helpers in `api/helpers/qr/`.

Label the two kinds plainly, with the difference stated in the UI — a progress
link is safe to share publicly, a check-in link is not.

---

## Tests

Backend, `tests/transport/test_public_progress.py`:

- Valid progress token returns the board for the right event.
- Unknown, revoked, expired, and **check-in-scoped** tokens each return 404 with
  identical bodies.
- Patrols and stations from another event never appear.
- The response contains no `phone_number`, `radio_frequency`, `radio_channel`,
  `radio_identifier`, and no patrol member names — assert on absence explicitly,
  so a future widening of the projection fails loudly here.
- A patrol with members from two troops returns both codes, sorted.
- A patrol with no member troop data returns an empty list, not an error.
- No score field appears anywhere in the response.
- `last_used_at` updates on use.

Store tests under `tests/drivers/store/`: create, hash lookup, scope filtering,
revoke, expiry boundary.

Middleware test: a `/v1/public/` path passes without a user token, and a
non-public path still rejects.

Per AGENTS.md, run `./venv/bin/pytest -q`.

---

## Effort

| Stage | Who | Estimate |
|---|---|---|
| Migration + model + store (shared with check-in) | Backend | 2h |
| Middleware change (shared with check-in) | Backend | 1h |
| Public progress endpoint + troop derivation | Backend | 2h |
| Admin mint/list/revoke endpoints (shared with check-in) | Backend | 2h |
| Extract shared grid component from LiveStatus | Frontend | 2h |
| Public page + transport | Frontend | 3h |
| Admin UI panel + QR | Frontend | 3h |
| Tests | Backend | 3h |
| **Total** | | **~2 days** |

If the check-in feature is built first, the shared rows above are already done and
this drops to roughly **1 day**.

## Resolved

**The Cloudflare Worker does not block this.** Answered by Ben, 2026-09-18:

> The auth on the Cloudflare Worker acts as a poor man's firewall so not just
> anyone can submit something to the API and cause our resources to get spun up
> and charges incurred — it has to come through Cloudflare. The user's auth
> credentials are stored in a secondary location that the application then
> utilizes for the permissions. So yes, we can make some more public routes if
> desired.

Two things follow, and they confirm the middleware design above rather than
changing it.

The Worker's gate is about **cost and abuse**, not identity — it keeps traffic that
did not come through Cloudflare from reaching Cloud Run at all. That gate must
survive. This is exactly why the public-path early return goes *below* the IAM
block and not alongside `/health`: putting it above would strip the spend
protection along with the login.

User permissions are resolved by the application from its own store, not inferred
from anything the Worker attaches. So a request with `req.context.user = None` is
coherent — the public resources authenticate themselves against
`event_access_tokens`, and no permission lookup is skipped or faked.

The same answer clears the matching open question in
[public-patrol-check-in.md](public-patrol-check-in.md), which has not been updated.

## Open questions

1. **Patrol ids in the response.** The board needs a key per row. Exposing the
   UUID is harmless on its own, but if it ever became a lookup key elsewhere it
   would matter. An alternative is keying on patrol number.
2. **Does the link need to survive the event?** Current answer is no, expiring two
   days after. Worth re-checking once people actually use it — if parents ask for
   it afterwards, the answer is probably a longer expiry rather than a rethink.
