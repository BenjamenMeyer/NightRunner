# Public Patrol Check-In — design spec

Status: **built** — implemented 2026-09-18 alongside
[public-progress-link.md](public-progress-link.md), which shares its token
mechanism.
Drafted 2026-09-17

**Corrections to this document, found while building it.** The design held; these
are details it got wrong.

- **Migration prefix.** This says `019` is next. It was, when written. `022` is
  what shipped.
- **The Cloudflare Worker question** (open question 1, the stated blocker) is
  answered and did not block anything. Ben, 2026-09-18: the Worker's auth is a
  cost and abuse gate so that requests not coming through Cloudflare cannot spin
  up resources, while user credentials live in a secondary store the application
  reads for permissions — "so yes, we can make some more public routes if
  desired." The middleware approach described below was right: the public
  carve-out sits *below* the IAM block, keeping the spend gate and skipping only
  the login.
- **QR helpers.** `api/helpers/qr/` holds a QR *scanner*, not a generator. The
  generator is the `qrcode` package, already a dependency and already used by
  `pages/admin/patrols/QRCodeModal.jsx`.
- **`stations` has no `number` column.** The example bootstrap response below
  shows one.
- **Scope.** Tokens carry a `scope` column so this feature and the progress
  board share one table. A check-in token cannot read the progress board and a
  progress token cannot write visits.
- **Shared visit logic.** Rather than duplicating check-in/check-out, both the
  public and the authenticated routes now call
  `nightrunner_backend/transport/visit_actions.py`, so a rule added in one place
  applies to both.
- **Migration comments cannot contain a semicolon.** The runner splits files on
  `;` with no awareness of comments, so a semicolon inside a `--` comment splits
  the statement and the migration fails. Cost an hour; worth fixing in the runner
  separately.

## Problem

Station volunteers have to create an account and sign in before they can check a
patrol in or out of a station. At a night event, with intermittent signal and
volunteers who turn up once a year, that is friction in the wrong place. We want
a link a volunteer can open on their own phone and start working.

We do **not** want a genuinely public page. Anonymous access to
`/v1/visits/check-in` would let anyone who finds the URL move any patrol through
any station, which corrupts scoring, with no audit trail and no way to tell
mischief from a real volunteer.

## Approach

One unguessable link per event. The link carries a random token. The token is
the credential: it names exactly one event, it can be revoked, and it expires on
its own after the event is over.

```
https://<host>/checkin/kR7xQ2mN8vP4wL9cY6tB3hF5jD1sA0zE7gU2nM4oI8k
```

Anyone holding it can check patrols in and out **at that one event**, and
nothing else.

## Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Scope | One token per event | What was asked for. Schema keeps a nullable `station_id` so per-station links are a later change, not a rewrite. |
| Capabilities | Check in + check out | Parity with the logged-in page minus reset. Check-out is needed or station timing data is incomplete. |
| Reset | Excluded | `VisitResetResource` reopens completed scoring. It already has its own role check; anonymous callers must not reach it. |
| Lifetime | Auto-expire + manual revoke | Expiry catches the forgotten link, revoke catches the leaked one. |
| Station selection | Picked once, stored per-device | Least tapping across a long shift, with a visible way to correct it. |

## Threat model

What the token holder can do: move patrols through stations at one event.

What they must **not** be able to do, and how each is prevented:

| Risk | Prevention |
|---|---|
| Reach another event's data | Every query is scoped by the token's `event_id`. The client never supplies an event id. |
| Read patrol phone numbers or radio frequencies | `patrols` carries `phone_number`, `radio_frequency`, `radio_channel`, `radio_identifier`. The public response is a narrow projection: `id`, `number`, `name` only. |
| Read youth names | `patrol_members` carries member names. Not returned. The attendee roster is not reachable from these endpoints at all. |
| Reopen finalised scoring | Reset is not exposed publicly. |
| Enumerate tokens | Unknown, revoked, and expired tokens all return the same generic 404. |
| Keep a leaked link alive | Expiry plus revoke. |
| Recover tokens from a database dump | Only a SHA-256 hash is stored. The plaintext is shown once, at creation. |

Residual risk accepted: a volunteer who has the link can check in a patrol that
never arrived. That is also true of a signed-in volunteer, and is an operational
problem rather than a technical one.

---

## Backend

### Migration — `019_event_access_tokens.sql`

Migrations are tracked by full filename, not by number, so `019` is the next free
prefix despite the two existing `017_` files.

```sql
-- drivers/migrations/019_event_access_tokens.sql
--
-- Unguessable per-event links for station volunteers, so running a station does
-- not require an account.
--
-- Only a hash of the token is stored. A database dump therefore does not hand
-- over working links; the plaintext is shown once, when the link is created.

CREATE TABLE IF NOT EXISTS event_access_tokens (
    id TEXT PRIMARY KEY, -- UUIDv7
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    -- SHA-256 of the plaintext token, hex encoded. Unique so a lookup is a
    -- single indexed read rather than a scan-and-compare.
    token_hash TEXT NOT NULL UNIQUE,
    -- Null means the link covers every station at the event, and the volunteer
    -- chooses. Set, it would pin the link to one station. Nothing issues a
    -- pinned token yet; the column exists so doing so is not a schema change.
    station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
    -- Free text so an organiser can tell two links apart: "Gate laptop",
    -- "Printed QR, station 4".
    label TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT,
    revoked_at TEXT,
    -- Lets an organiser see whether a link is actually being used, and spot a
    -- link still live after the event.
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_access_tokens_event
    ON event_access_tokens (event_id);
```

### Token generation

- 32 bytes from `secrets.token_urlsafe(32)` — 43 URL-safe characters.
- Stored as `hashlib.sha256(token.encode()).hexdigest()`.
- Returned in plaintext **once**, in the mint response. Never again, by any
  endpoint.
- Default expiry: event date + 2 days, at 23:59 UTC. If the event has no date,
  created_at + 30 days.

### Middleware change — `transport/middleware/auth.py`

This is the delicate part. Today the middleware authenticates everything except
`/health` and `/auth/login`, and in production it requires **two** tokens: a GCP
IAM token from the Cloudflare Worker proxy, and a user's Firebase token.

The public routes must skip the **user** token while **keeping** the IAM proxy
check. Dropping both would put the endpoints on the open internet with the
infrastructure gate removed.

Concretely, add a `PUBLIC_PATH_PREFIXES = ("/v1/public/",)` constant, then:

- Do **not** early-return for public paths alongside `/health`. That branch sits
  above the IAM block and would skip proxy verification too.
- Instead, run the `require_iam_proxy_auth` block as today, and then, before the
  `if not auth_header` rejection, return early for public paths with
  `req.context.user = None` and `req.context.roles = []`.

Per AGENTS.md, document the bypass in the middleware's own comments, stating that
public resources authenticate themselves via `event_access_tokens` and that
`req.context.user` is `None` for them.

### Store — `drivers/store/event_access_tokens.py`

```python
class EventAccessTokensStore:
    async def create(self, token: EventAccessToken) -> EventAccessToken
    async def list_for_event(self, event_id: str) -> List[EventAccessToken]
    async def get_by_hash(self, token_hash: str) -> Optional[EventAccessToken]
    async def revoke(self, token_id: str, at: str) -> None
    async def touch(self, token_id: str, at: str) -> None
```

`get_by_hash` returns the row regardless of state. Validity is decided in one
place, a `resolve_token(token) -> EventAccessToken` helper that raises
`falcon.HTTPNotFound` for unknown, revoked, and expired tokens alike — the same
error for all three, so the endpoint cannot be used to probe which tokens exist.

### Public endpoints — `transport/public_checkin.py`

All read and write against the token's own `event_id`. No endpoint accepts an
event id from the caller.

**`GET /v1/public/checkin/{token}`** — everything the page needs to render:

```json
{
  "event":    { "id": "...", "name": "Night Runner 2026" },
  "stations": [ { "id": "...", "name": "First Aid", "number": 3 } ],
  "patrols":  [ { "id": "...", "name": "Eagles", "number": 7 } ],
  "visits":   [ { "stationId": "...", "patrolId": "...", "status": "checked_in",
                  "checkedInAt": "...", "checkedOutAt": null } ],
  "expiresAt": "2026-10-12T23:59:00Z"
}
```

Note what is absent: no phone numbers, no radio details, no patrol members, no
users, no scores.

**`POST /v1/public/checkin/{token}/check-in`** — body `{stationId, patrolId, timestamp?}`

**`POST /v1/public/checkin/{token}/check-out`** — same body shape.

Both validate that `stationId` and `patrolId` belong to the token's event before
touching `StationVisitsStore`, then delegate to the same logic the authenticated
endpoints use. Both call `touch()` to update `last_used_at`.

`recorded_by` is left null on these rows. If the audit trail matters more than
that, a follow-up could add a nullable `recorded_via_token` column pointing at
`event_access_tokens.id` — worth doing, but not required for a first cut.

### Admin endpoints — extend `transport/events.py`

Authenticated, admin-only, consistent with the other event management routes:

- `POST /v1/events/{event_id}/access-tokens` — mint. Body `{label?, expiresAt?}`.
  Response includes `token` in plaintext, exactly once.
- `GET /v1/events/{event_id}/access-tokens` — list. Metadata only: label, created,
  expiry, revoked, last used. Never the token or the hash.
- `DELETE /v1/events/{event_id}/access-tokens/{token_id}` — revoke. Sets
  `revoked_at`; the row is kept so the audit trail survives.

### Rate limiting

Not in this change. There is no rate limiting anywhere in the app today, and
adding it only here would be odd. Worth raising separately — a public POST
endpoint is the natural first place to want it. Mitigation in the meantime: the
404-on-everything behaviour means brute force has no signal to work from, and a
43-character token is not guessable in practice.

---

## Frontend

### Route — `AppRoutes.jsx`

```js
{
    path: "/checkin/:token",
    element: PublicCheckIn,
    access: ACCESS.PUBLIC,
    layout: false
}
```

`layout: false` matters: `Layout` renders the sidebar and user chrome, which
assume a signed-in user. The public page needs its own minimal shell.

It sits under `/checkin` deliberately — same feature, and React Router resolves
the static `/checkin` and the parameterised `/checkin/:token` without conflict.

### Transport — a separate client

The public page **must not** use `BackendTransport`. On any 401 it does
`window.location.replace("/login?expired=true")`, which would throw a volunteer
holding a valid link onto a login screen.

Add `PublicCheckInService.js` with a small fetch wrapper that sends no
`Authorization` header, does not redirect, and surfaces errors to the page.

### Page — `pages/checkin/PublicCheckIn.jsx`

States to handle:

- **Loading** — fetching bootstrap.
- **Invalid link** — 404 from bootstrap. Plain message: this link is no longer
  valid, ask the event organiser for a current one. No detail about why.
- **Choosing a station** — first open, or after "change station".
- **Working** — the main screen.

The working screen, built for a cold, dark field and one thumb:

- Current station shown persistently, with a "change station" control.
- Patrols as large tap targets, listed by number, showing current state (not
  arrived / checked in at HH:MM / checked out at HH:MM).
- Tapping a patrol offers the action that makes sense for its state.
- A confirmation step on check-out, since it is the one that ends a scoring
  window.
- Poll the bootstrap every 20s, matching what `Arrivals.jsx` already does, so two
  volunteers at one station see each other's work.

Station choice persists in `localStorage`, keyed by token so two events on one
phone do not collide:

```js
localStorage.setItem(`nr.checkin.station.${token}`, stationId);
```

### Admin UI — Event Manager

A "Station check-in link" panel on the event: generate, copy, show a QR code,
revoke, and list active links with last-used times. The repo already has QR
helpers in `api/helpers/qr/`, and a printed QR taped up at each station is the
realistic way this gets distributed.

The plaintext token appears once, at generation, with a clear note that it cannot
be shown again and a revoke-and-reissue path if it is lost.

---

## Tests

Backend, under `tests/transport/test_public_checkin.py`:

- Valid token returns bootstrap for the right event.
- Unknown, revoked, and expired tokens each return 404, with identical bodies.
- Check-in and check-out create and update visit rows.
- A `stationId` or `patrolId` from a *different* event is rejected.
- The bootstrap response contains no `phone_number`, `radio_frequency`, or patrol
  member data — assert on absence explicitly, so a future widening of the patrol
  projection fails loudly here.
- `last_used_at` updates on use.

Store tests under `tests/drivers/store/`: create, hash lookup, revoke, expiry
boundary.

Middleware test: a `/v1/public/` path passes without a user token, and a
non-public path still rejects.

Follow AGENTS.md — run `./venv/bin/pytest -q`.

---

## Effort

| Piece | Estimate |
|---|---|
| Migration + model + store | 2h |
| Middleware change + public endpoints | 3h |
| Admin mint/list/revoke endpoints | 2h |
| Public page + transport | 4h |
| Admin UI panel + QR | 3h |
| Tests | 3h |
| **Total** | **~2 days** |

## Open questions

1. **The Cloudflare Worker is in a different repo.** It fronts Cloud Run and
   signs the IAM token. If it also requires a user token before forwarding, it
   needs a matching change or the public routes will be blocked before they ever
   reach the backend. This must be checked before work starts — it can invalidate
   the whole approach.
2. **Offline behaviour.** Night events have poor signal. The visits API already
   accepts an explicit `timestamp`, and `Arrivals.jsx` has a backdate concept, so
   queuing failed check-ins locally and replaying them with their true time is
   very achievable. Out of scope here, but the single highest-value follow-up.
3. **Audit trail.** `recorded_by` will be null for public check-ins. Adding
   `recorded_via_token` would at least say which link did it.
