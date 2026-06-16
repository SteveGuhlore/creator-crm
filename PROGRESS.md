# Creator CRM — Build Progress

> Updated after every phase. Single most important artifact for the morning.

## Morning summary

_(to be finalized at end of run)_

Overnight autonomous build of a per-platform creator CRM against **mock + CSV data only**.
Guardrails held: no live integration, no scraping, no real-account auth, no AI chat/content.

## Standing directives (from operator, this run)

- **/goal: continually improve.** Keep working overnight, constantly — build →
  `pnpm verify` → reviewer → commit, then the §16 hardening loop. Use sub-agents
  (sonnet builders, opus reviewer). Go above and beyond.
- **Aggressive testing.** Stress tests, edge cases, malformed/messy-input tests,
  sandbox tests where useful. Never weaken/skip/delete a test to pass.
- **Full autonomy granted.** Proceed without pausing for confirmation; never
  regress the baseline; never violate the §2/§3/§8 guardrails.

---

## Environment notes (this run)

- **Docker daemon is NOT available** in the build container. Local infra runs **natively**:
  PostgreSQL 16 on `127.0.0.1:5433` (user `pg`, socket in `/tmp`) + Redis on `:6379`.
  `docker-compose.yml` is the documented path; `scripts/dev-db.sh` is the native fallback used here.
- npm registry reachable → deps install fine.
- `.env` (gitignored) points `DATABASE_URL` at the native cluster; `.env.example` documents
  the docker-compose path (port 5432).

---

## Phase status

### Phase 0 — Scaffold & guardrails ✅

- **Done:** Next.js 15 (App Router, TS strict) + Tailwind + Prisma/Zod deps + Vitest +
  Playwright + ESLint/Prettier, pnpm. `docker-compose.yml` + `scripts/dev-db.sh`,
  `.env.example`, `pnpm verify` script, root `CLAUDE.md`, health route + smoke test.
- **Tested:** `pnpm verify` green (typecheck + lint + 2 tests). Local Postgres+Redis up.
- **Stubbed/Deferred:** —
- **Blocked:** —

### Phase 1 — Data model + seed ✅

- **Done:** Frozen Prisma schema (11 entities, enums, indexes, multi-tenant fields),
  initial migration, deterministic fixtures (5 platforms), idempotent `runSeed()`.
- **Tested:** 24 generator + DB seed idempotency/invariant tests. Reviewer PASS.

### Phase 2 — Feature modules (2a–2e) ✅

- **Done:** 2a Ingestion (CSV/mock adapters, LiveAdapter stub throws, ingest service,
  import UI) · 2b Auth/RBAC/shell · 2c Analytics (per-platform/per-type + charts) ·
  2d per-platform Inbox (separated, read-only) · 2e Content vault (tag/type/search).
- **Tested:** 223 tests (pure unit incl. malformed-CSV/edge + DB integration:
  ingestion upsert/idempotency/audit, inbox cross-platform isolation). Build green.
  Reviewer PASS, 0 blockers.
- **Fixed during integration:** adapter error-buffer overwrite bug; moved import/library
  under `/dashboard` for middleware auth-gating.

### Phase 3 — Workflow helpers 🔨 (in progress)

### Phase 4 — Audit + security hardening ⏳

### Phase 5 — Integration, QA, deploy ⏳

### Phase 6 — Hardening loop (§16) ⏳ (after §11 met)

---

## Tested

- Phase 0–2: 223 tests green (`pnpm verify`), production build green.

## Stubbed / Deferred

- `LiveAdapter` — interface + `NotImplementedError` only (by design; live integration deferred).

## Blocked

- _(none yet)_

## Ideas for review (parked — NOT built, per no-scope-creep rule)

- **OFAuth (or similar) managed-access integration** — a sanctioned third-party
  API gateway (NOT scraping) that could later back the deferred `LiveAdapter`.
  Their connect UX offers 3 modes: **Redirect** (creator authorizes on a hosted
  page; least liability, recommended first target), **Embed** (iframe widget in
  our app), **Whitelabel** (we own the credential-capture UI; most work +
  compliance burden). Decision deferred per "NO live platform integration"
  guardrail. Our adapter pattern + encrypted credential fields already leave the
  slot open for this without a rewrite. Pick a connect mode if/when live is
  greenlit. For now the `MockLiveAdapter` "Sandbox sync" is the local stand-in.

## Phase 6 hardening backlog (seed)

- LiveAdapter `mode` should be a distinct `'live'` literal (cosmetic; add to union).
- `getOverviewByPlatform` could use explicit per-platform `groupBy` for query-layer clarity.
- PayoutSplit: add `agencyPct + modelPct = 100` validation when agency phase is built.
- global-setup: log `prisma db push` failure cause instead of swallowing silently.
- Raise `/lib` coverage to ≥85%; add adapter error-accumulation unit test; content list scoping DB test.

## Next steps

- Phase 3: template CRUD + variable substitution, draft-then-review composer,
  BullMQ scheduled send → SENT_SIMULATED + audit (no platform contact), cancel/reschedule.

## How to run

```bash
pnpm install
# Infra: docker compose up -d    (or, when no docker daemon: scripts/dev-db.sh start)
cp .env.example .env             # then edit values
pnpm db:push                     # or: pnpm db:migrate
pnpm seed
pnpm dev                         # http://localhost:3000
pnpm verify                      # typecheck + lint + test
```
