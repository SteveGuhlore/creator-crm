# Creator CRM — Overnight Build Handoff

**For:** Claude Code (autonomous overnight session)
**From:** Planning session
**Mission:** Build a working, tested, deployed-to-staging multi-platform creator-management CRM — the durable, zero-risk core — entirely against mock and manual-import data.

-----

## 0. Read this first — how to run tonight

You are running largely unattended for one long session. Optimize for **finishing a smaller scope fully and correctly** over starting a larger scope you can’t verify. A working, tested, deployed app covering Phases 0–5 is a complete success. Half-built features everywhere is a failure.

**Operating principles:**

1. **Plan before building.** Start in plan mode. Produce a written plan, a task list, and a dependency graph. Then execute.
1. **Dependency order is law.** The data model (Phase 1) is a shared dependency — it must be complete and tested before any feature work. Only parallelize work that is genuinely independent.
1. **Every phase ends green.** A phase is not “done” until typecheck passes, lint passes, its tests pass, and the work is committed to git. Do not advance on red.
1. **Commit constantly.** One commit per completed task, conventional-commit messages. Commits are your checkpoints — morning-me reads `git log` to see what happened.
1. **Keep a running `PROGRESS.md`.** Update it after every phase: what’s done, what’s tested, what’s stubbed, what’s blocked, what’s next. This is the single most important artifact for the morning.
1. **If blocked, don’t spin.** See the “If blocked” protocol in §9. Stub it with a clear `TODO(blocked):` comment, log it in `PROGRESS.md`, and move to independent work. Never make a destructive or hacky change just to get unblocked.
1. **No scope creep.** Build exactly what’s in §3 IN-scope. If you think of something better, write it in `PROGRESS.md` under “Ideas for review” — do not build it.

-----

## 1. What we’re building (product)

A CRM/dashboard for one operator (me) to manage my own content-creator accounts across multiple platforms, **architected from day one to expand into a multi-model agency tool later** without a rewrite.

- **Per-platform dashboard.** Each platform gets its **own separated view** — NOT a single merged inbox. (This is a firm product decision. Do not build a unified cross-platform queue.)
- **Analytics** broken down per platform and per revenue type (subscription / DM / PPV / tip / other).
- **Workflow helpers** for posting and messaging: template/script library, scheduled sends, draft-then-review composer. **Review-then-send only.**
- **Content library / vault** with tagging and organization.

**Platforms (as data sources):** ManyVids, Fansly, hidden.com, OnlyFans, SextPanther. Tonight they exist only as `source_platform` enum values fed by mock + CSV data (see §3 / §6).

-----

## 2. What this is NOT (tonight)

- **No live platform integration.** Do not write scrapers, do not reverse-engineer any platform’s endpoints, do not attempt to log into any real account, do not call any external creator-platform API. Live adapters are **interface + mock implementation only.** (This is both a safety boundary and a correctness boundary — live integration cannot be safely built or tested unattended.)
- **No AI fan-chat / chatbot.** Helpers are deterministic (templates, scheduling, manual drafting). No LLM generating fan replies.
- **No AI content / likeness generation.**
- **No agency-only features yet** (multi-user roles, payroll/payout splits): build the *schema hooks* for them (`model_id` everywhere, a stubbed `payout_split` table, an `audit_log` table), but do not build the agency UI.
- **No production launch.** Deploy target is a **private staging environment** only.

-----

## 3. Scope — IN vs OUT (hard boundaries)

|IN scope tonight                                                               |OUT of scope tonight                                  |
|-------------------------------------------------------------------------------|------------------------------------------------------|
|Multi-tenant data model (`model_id` + `source_platform` on all relevant tables)|Live platform adapters / scraping / real account auth |
|Seeded realistic mock data                                                     |AI fan chat / chatbot                                 |
|Owner auth + RBAC scaffolding (single owner user seeded)                       |AI content / likeness generation                      |
|Per-platform dashboard views                                                   |Agency management UI (multi-operator, shifts, payroll)|
|Analytics: per-platform, per-revenue-type                                      |Public/production deployment                          |
|Ingestion adapter interface + `ManualCsvAdapter` + `MockLiveAdapter`           |Payment processing                                    |
|Message template/script library                                                |Mobile app                                            |
|Scheduled-send queue (operating on mock data)                                  |                                                      |
|Draft-then-review composer (posts + messages)                                  |                                                      |
|Content library/vault with tagging                                             |                                                      |
|Audit logging on all mutations                                                 |                                                      |
|Full test suite + e2e + staging deploy                                         |                                                      |

-----

## 4. Tech stack (use this — don’t re-litigate)

Chosen to match my existing familiarity (I already run a Next.js project) and to be a clean fit for this app.

- **Framework:** Next.js (App Router) + TypeScript (strict mode on).
- **DB:** PostgreSQL.
- **ORM:** Prisma (schema + typed client + migrations).
- **Validation:** Zod (validate every input boundary; derive types from Zod where practical).
- **Auth (dashboard’s own users):** Auth.js (NextAuth) with credentials provider, seeded owner account.
- **UI:** Tailwind CSS + shadcn/ui components. Charts via Recharts.
- **Background jobs / scheduling:** BullMQ + Redis (for scheduled sends and ingestion jobs).
- **Testing:** Vitest (unit/integration) + Playwright (e2e).
- **Local infra:** Docker Compose (Postgres + Redis). App runs via `docker compose up` + `pnpm dev`.
- **Package manager:** pnpm.
- **Lint/format:** ESLint + Prettier.
- **CI gate (local script):** a `pnpm verify` script that runs typecheck + lint + tests; must pass before any commit that closes a task.

**Secrets:** everything via `.env` (provide `.env.example`). **Never** commit secrets. Any field that would eventually hold a platform credential must be designed for encryption-at-rest (see §8) — but tonight those fields stay empty/null.

-----

## 5. Architecture

### Module layout (suggested)

```
/app                  # Next.js routes (per-platform dashboard, analytics, composer, library)
/lib
  /db                 # prisma client, query helpers
  /ingestion          # adapter interface + implementations + ingestion service
  /analytics          # revenue/breakdown computations
  /scheduling         # BullMQ queues, workers, scheduled-send service
  /auth               # Auth.js config, RBAC helpers
  /audit              # audit logging service
  /validation         # shared Zod schemas
/components           # shadcn-based UI components
/prisma               # schema.prisma + migrations + seed.ts
/tests                # vitest unit/integration
/e2e                  # playwright specs
/fixtures             # mock data generators per platform
```

### Data model (Prisma) — core entities

Design so a single owner today becomes one of many agency-managed models tomorrow. **`model_id` (the creator) and `source_platform` appear on every relevant record.**

- **User** — dashboard login accounts. Fields: id, email, passwordHash, role (`OWNER` | `OPERATOR` | `MANAGER`, default OWNER), createdAt. (Only OWNER seeded tonight; others are schema-ready.)
- **Model** — a creator being managed (tonight: just me). Fields: id, displayName, notes, createdAt. Everything below FKs to `modelId`.
- **PlatformAccount** — a model’s account on one platform. Fields: id, modelId, platform (`MANYVIDS|FANSLY|HIDDEN|ONLYFANS|SEXTPANTHER`), handle, status, **credentialRef (nullable, designed for encrypted storage — empty tonight)**, proxyRef (nullable), createdAt.
- **Fan** — a subscriber/customer, scoped per platform account. Fields: id, modelId, platformAccountId, platform, externalRef (the platform’s id for them, from import), displayName, tags (string[]), lifetimeValueCents, firstSeenAt, lastSeenAt, notes. (Per the product decision, fans are **not** merged across platforms — a person on two platforms is two Fan rows.)
- **Transaction** — money events. Fields: id, modelId, platformAccountId, platform, fanId (nullable), type (`SUBSCRIPTION|DM|PPV|TIP|OTHER`), grossCents, netCents, currency, occurredAt, externalRef.
- **ContentItem** — vault/library asset metadata. Fields: id, modelId, title, type (`IMAGE|VIDEO|BUNDLE`), tags (string[]), storageRef, durationSec (nullable), createdAt. (Store **metadata + references** only; no actual media handling tonight.)
- **MessageThread / Message** — per-platform conversation records (populated from import/mock). Thread: id, modelId, platformAccountId, platform, fanId, lastMessageAt. Message: id, threadId, direction (`IN|OUT`), body, sentAt, externalRef.
- **MessageTemplate** — reusable scripts. Fields: id, modelId (nullable = shared), name, category, body, variables (string[]), createdAt.
- **ScheduledSend** — queued helper sends. Fields: id, modelId, platformAccountId, kind (`POST|MASS_MESSAGE|DM`), payload (json), status (`DRAFT|SCHEDULED|SENT_SIMULATED|CANCELLED|FAILED`), scheduledFor, createdBy, createdAt. **Tonight, “sending” is simulated** — the worker transitions to `SENT_SIMULATED` and writes an audit entry; it does NOT contact any platform.
- **PayoutSplit** *(stub for agency phase)* — id, modelId, agencyPct, modelPct, effectiveFrom. Schema only; no UI.
- **AuditLog** — id, actorUserId, action, entityType, entityId, metadata (json), createdAt. **Every create/update/delete to the above writes here.**

Add sensible indexes (modelId, platform, occurredAt, fanId). Use enums for platform and type fields.

### The adapter pattern (the important part)

Ingestion is pluggable so live adapters can slot in later **without touching the rest of the app**. Define one interface; implement two safe adapters tonight.

```ts
interface IngestionAdapter {
  readonly platform: Platform;
  readonly mode: 'manual' | 'mock-live';
  // Returns normalized records the ingestion service persists.
  fetchFans(ctx: IngestCtx): Promise<NormalizedFan[]>;
  fetchTransactions(ctx: IngestCtx): Promise<NormalizedTransaction[]>;
  fetchMessages(ctx: IngestCtx): Promise<NormalizedThread[]>;
}
```

- **`ManualCsvAdapter`** — parses uploaded CSVs (one schema per record type) into normalized records. This is the real, usable import path.
- **`MockLiveAdapter`** — returns generated fixture data shaped like what a *future* live adapter would return. Model the record shapes on the public endpoint taxonomies documented by OFAuth and OnlyFansAPI (fans, messages, transactions/earnings, posts) so the normalized shape is realistic. **It generates data locally; it never makes a network call.**
- A `LiveAdapter` interface stub exists with every method throwing `NotImplementedError('live integration is deferred')`, so the slot is visible but empty.

The **ingestion service** takes any adapter, validates output with Zod, upserts by `externalRef`, and writes audit entries. All downstream features read from the DB and are adapter-agnostic.

-----

## 6. Build phases (dependency-ordered, each with done-criteria)

> A phase is DONE only when: code written → `pnpm verify` green → committed → `PROGRESS.md` updated.

**Phase 0 — Scaffold & guardrails**

- Init Next.js+TS (strict), Tailwind, shadcn, Prisma, Vitest, Playwright, ESLint/Prettier, pnpm.
- `docker-compose.yml` (Postgres + Redis). `.env.example`. `pnpm verify` script.
- Drop in `CLAUDE.md` (content in §13). First commit.
- **Done:** `pnpm verify` runs (even with zero tests) and `docker compose up` brings up Postgres+Redis.

**Phase 1 — Data model + seed (SHARED DEPENDENCY — do alone, first)**

- Full Prisma schema per §5. Migrate. Generate client.
- `fixtures/` generators producing realistic mock data for all 5 platforms (varied fans, transactions across all types, threads, content, templates).
- `seed.ts` seeds one OWNER user, one Model (me), 5 PlatformAccounts, and mock data via generators.
- Unit tests for schema invariants + seed idempotency.
- **Done:** `pnpm seed` populates a realistic DB; tests green; committed.

**Phase 2 — Parallelizable feature modules (only after Phase 1)**
These depend on the schema but **not on each other** → candidates for parallel sub-agents (§7). Each must land with its own tests.

- **2a — Ingestion:** adapter interface + `ManualCsvAdapter` + `MockLiveAdapter` + `LiveAdapter` stub + ingestion service. Tests: CSV parse, upsert-by-externalRef, audit writes, Zod rejection of bad rows.
- **2b — Auth + RBAC + dashboard shell:** Auth.js credentials login (seeded owner), RBAC helper (`requireRole`), app layout with **per-platform navigation** (one section per platform). Tests: auth flow, RBAC denies operator from owner-only routes.
- **2c — Analytics:** services computing per-platform + per-type revenue, top fans, trends; Recharts visualizations. Tests: aggregation correctness against known seed totals.
- **2d — Per-platform inbox views:** separated thread/message views per platform reading message data (read-only display). Tests: rendering + scoping (platform A view never shows platform B data).
- **2e — Content library/vault:** list/tag/filter content metadata. Tests: tagging + filtering.

**Phase 3 — Workflow helpers**

- Template/script library CRUD with variable substitution preview.
- Draft-then-review composer for posts and messages (validates, saves as `DRAFT`).
- Scheduled sends via BullMQ: schedule → worker fires at time → transitions to `SENT_SIMULATED` + audit entry (NO platform contact). Cancel/reschedule.
- Tests: template substitution, schedule lifecycle, simulated-send transitions, cancellation.

**Phase 4 — Audit + security hardening**

- Ensure every mutation across all modules writes `AuditLog`.
- Verify no secrets in code; all config via env. Implement an encryption helper for the (currently empty) `credentialRef`/`proxyRef` fields (AES-GCM via a key from env) so the pattern is proven even though fields are null tonight.
- Input validation (Zod) on every route handler / server action.
- Tests: audit coverage on representative mutations; encryption round-trip.

**Phase 5 — Integration, QA, deploy**

- Playwright e2e covering: login → view a platform dashboard → see analytics → import a CSV → see new data → create a template → schedule a send → see it flip to SENT_SIMULATED → see audit entries.
- Coverage gate (aim ≥80% on `/lib`). Reviewer sub-agent QA pass against §11 acceptance criteria.
- Build production image; deploy to **private staging** (e.g. a Vercel preview + managed Postgres/Redis, or a single container host). Run a smoke test against the deployed URL.
- Write `README.md` (run + deploy instructions) and finalize `PROGRESS.md` with a morning summary.
- **Done:** staging URL responds, smoke test passes, all green, docs written.

-----

## 7. Sub-agent orchestration

Use sub-agents to parallelize and to get independent review. The main session is the **orchestrator**: it plans, delegates, integrates, and owns git.

**Recommended sub-agents (define each with a tight brief + minimal tool scope):**

- **`builder`** (can spawn several in parallel) — implements one Phase-2 module each. Brief: “Implement module X per the handoff §5/§6. Write tests. Run `pnpm verify`. Do not modify the Prisma schema (it’s frozen after Phase 1) — if you need a schema change, stop and report to the orchestrator.” Minimal cross-module file access.
- **`test-writer`** — given a module, writes additional unit/integration tests and hunts edge cases.
- **`reviewer` / QA** — runs after each phase. Brief: “Review the diff against the handoff acceptance criteria and the guardrails (§2, §3, §8). Flag scope violations, missing tests, security issues, or live-integration creep. Report PASS/FAIL with specifics.” The reviewer does not write features — it only reports.
- **`integrator`** (the orchestrator itself) — merges sub-agent work, resolves conflicts, runs the full suite, commits.

**Parallelization rules:**

- Never parallelize across the frozen schema. Phase 1 is single-threaded.
- Parallel builders must work in **non-overlapping directories** (2a `/lib/ingestion`, 2c `/lib/analytics`, etc.) to avoid merge conflicts.
- After each parallel batch, the orchestrator runs the **full** `pnpm verify` (not just per-module) before committing — integration catches what isolation misses.
- The reviewer sub-agent gates each phase. A phase with a FAIL review is not done.

**Context hygiene for sub-agents:** give each only the handoff sections it needs + the relevant files. Don’t dump the whole repo into every sub-agent.

-----

## 8. Security baseline (must-haves, even tonight)

These are table-stakes for this category and painful to retrofit — bake them in now:

- **No platform passwords/credentials stored in plaintext, ever.** `credentialRef`/`proxyRef` are designed for AES-GCM encryption-at-rest with a key from env. (Empty tonight, but the pattern must be proven by tests.)
- **Role-based access** enforced server-side (not just hidden in UI).
- **Full audit log** on every mutation.
- **Per-account isolation** modeled now (each `PlatformAccount` has its own `proxyRef` slot) so future live adapters never share fingerprints.
- All secrets via env; `.env` git-ignored; `.env.example` committed.
- Validate every input boundary with Zod.

-----

## 9. If blocked — protocol

When a task can’t complete after a reasonable attempt (e.g. a dependency won’t install, a tool is unavailable, an external resource is unreachable):

1. **Do not** hack around it destructively, disable tests, or commit broken code to “move on.”
1. Leave a precise `TODO(blocked): <what + why + what you tried>` in code.
1. Log it in `PROGRESS.md` under “Blocked” with enough detail for morning-me to resolve in minutes.
1. Stub the minimal interface so dependent code still typechecks, then **move to independent work.**
1. If a whole phase is blocked, skip to the next genuinely independent phase rather than stalling. Network egress may be restricted — if a package source or deploy target is unreachable, note it and complete everything that doesn’t need it (the entire core can be built and tested locally without external network).

-----

## 10. Progress tracking

- **`PROGRESS.md`** at repo root, updated after every phase. Sections: Done | Tested | Stubbed/Deferred | Blocked | Ideas for review | Next steps | How to run.
- **Git:** conventional commits, one per closed task. The commit history should read like a clear narrative of the night.
- **Morning summary** at the top of `PROGRESS.md`: 5–10 bullets on what got built, what’s deployed, what needs my attention first.

-----

## 11. Morning acceptance criteria (definition of success)

When I wake up, ALL of these should be true:

1. `pnpm install && docker compose up && pnpm seed && pnpm dev` brings up a working app locally (document exact steps in README).
1. `pnpm verify` is green (typecheck + lint + all tests).
1. I can log in as the seeded owner.
1. Each platform has its own separated dashboard view with seeded data.
1. Analytics render correct per-platform and per-type revenue breakdowns.
1. I can import a CSV and see the new records appear.
1. I can create a template and schedule a send, and watch it transition to `SENT_SIMULATED` with an audit entry — with zero external/platform contact.
1. The audit log is populated by real actions.
1. The app is deployed to a private staging URL and a smoke test passes.
1. `PROGRESS.md` clearly explains state, blockers, and next steps; `README.md` explains run + deploy.
1. **Zero live-integration code, zero AI chat/content code** — the guardrails held.

-----

## 12. Anti-goals / reminders

- Don’t build the unified merged inbox. Per-platform separation is intentional.
- Don’t implement any live platform adapter or scraping. Mock + CSV only.
- Don’t add AI chat or AI content.
- Don’t build agency UI — schema hooks only.
- Don’t deploy to production.
- Don’t expand scope. Park ideas in `PROGRESS.md`.

-----

## 13. `CLAUDE.md` to place at repo root

```md
# Project: Creator CRM (internal, multi-tenant-ready)

## What this is
A per-platform CRM/dashboard for managing my own creator accounts, architected to
expand into a multi-model agency tool later. Built against MOCK + CSV data only.

## Absolute rules
- NO live platform integration / scraping / real-account auth. Live adapters are
  interface + mock implementation only.
- NO AI fan-chat / chatbot. Helpers are deterministic (templates, scheduling, manual drafts).
- NO AI content/likeness generation.
- NO secrets in code. All config via env. Credentials are encrypted-at-rest by design.
- Dashboard is SEPARATED per platform — never a merged inbox.
- `model_id` and `source_platform` on every relevant record (multi-tenant from day one).

## Stack
Next.js (App Router, TS strict) · PostgreSQL · Prisma · Zod · Auth.js · Tailwind +
shadcn/ui · Recharts · BullMQ + Redis · Vitest · Playwright · pnpm · Docker Compose.

## Workflow
- Plan first. Dependency order: schema (Phase 1) before features.
- Every task: code → `pnpm verify` (typecheck+lint+test) green → commit (conventional) →
  update PROGRESS.md.
- If blocked: stub with TODO(blocked), log in PROGRESS.md, move to independent work.
  Never disable tests or commit broken code.

## Commands
- `pnpm verify` — typecheck + lint + test (must pass before closing a task)
- `pnpm seed` — seed mock data
- `pnpm dev` — run app
- `docker compose up` — Postgres + Redis
```

-----

## 14. Kickoff prompt (paste into Claude Code)

> Read `OVERNIGHT_HANDOFF.md` in full, then `CLAUDE.md`. Enter plan mode and produce: (1) a dependency-ordered task list mapping to the handoff phases, (2) a sub-agent plan for the parallelizable Phase-2 modules, (3) the acceptance criteria you’ll self-check against. Then begin executing Phase 0. Work autonomously through the phases. Obey every guardrail in §2/§3/§8 — especially: no live platform integration, no AI chat/content, mock + CSV data only. After each phase, run `pnpm verify`, commit, run a reviewer sub-agent against the acceptance criteria, and update `PROGRESS.md`. If blocked, follow the §9 protocol and keep moving on independent work. Your goal is to satisfy every item in §11 (Morning acceptance criteria) by end of session. Prioritize finishing Phases 0–5 fully and correctly over starting anything beyond them.

-----

## 15. Model & reasoning configuration

**Main / orchestrator session → Opus 4.8** (`claude --model opus`). Owns planning, architecture, integration, and judgment on sub-agent output — where the strongest model pays off. (Fable 5 is the tier above Opus if available/desired; Opus 4.8 is the recommended default for this build.)

**Sub-agent model assignment (set explicitly — subagents inherit the parent model by default, so unset = Opus everywhere = drained Opus pool):**

- `builder` sub-agents → `model: sonnet` (4.6). Focused execution; as good as Opus on tightly-scoped work, faster, and on Max plans uses a separate rate pool that preserves Opus headroom.
- `reviewer` / QA sub-agent → `model: opus` (4.8). The exception — nuanced judgment (guardrail/scope/security checks) benefits from Opus.
- `test-runner` / file-search / mechanical → `model: sonnet` (Haiku only for pure lookups; never for development logic).

**Reasoning / effort:**

- Opus 4.8 uses adaptive reasoning (always on) — fast on routine steps, deep where it matters. Good for a mixed overnight workload.
- Set the orchestrator to **high effort** via `/model` (effort level shows next to the spinner).
- Steering line for `CLAUDE.md`: *“Think hard on architecture, data-model design, and integration decisions; move efficiently on routine implementation and boilerplate.”*

**Unattended-run note:** Claude Code may auto-fall back to Sonnet if the Opus usage pool is exhausted — so the session keeps progressing rather than halting. Offloading bulk execution to Sonnet sub-agents (Opus reserved for orchestration + review) makes the night both higher-quality and more likely to finish within pool limits. `opusplan` (Opus plans, Sonnet executes) is a more economical alternative for the main session, at the cost of running the orchestrator on Sonnet during execution stretches.

-----

## 16. Phase 6 — Autonomous hardening loop (runs after §11 is met)

The goal of this phase is to keep the agents productively improving and testing the build
through the rest of the night **without ever regressing it**. This is NOT open-ended “keep
changing things.” It is a bounded loop that can only improve or hold.

### Entry condition (do not start Phase 6 until ALL are true)

- Every §11 acceptance criterion is met.
- Full suite (`pnpm verify` + e2e) is green and committed.
- A git tag **`baseline-green`** marks this known-good commit. **This tag is sacred** — main
  must always be able to return to it.

### The improvement backlog (finite, prioritized — generate at entry)

Build a prioritized backlog from: open `TODO`s, reviewer findings, coverage gaps, the
“Ideas for review” list, and this fixed hardening checklist:

- Raise test coverage to **≥85%** on `/lib`; add edge-case and failure-path tests.
- Harden input validation + error handling on every route/server action.
- Add malformed/messy-CSV fixtures; verify graceful rejection (no crashes, clear errors).
- Tighten types: remove every `any`, ensure exhaustive enum handling.
- Empty / loading / error states on every view; basic accessibility pass.
- Verify audit-log coverage across ALL mutations (add tests proving it).
- RBAC negative tests + credential-encryption round-trip tests.
- Performance: index review, N+1 query checks on analytics aggregations.
- Seed determinism, README accuracy, `pnpm verify` speed.
- Resolve every `TODO(blocked)` that is now unblockable.

**Priority order:** test coverage & correctness > bug fixes > robustness/error handling >
security hardening > performance > DX/refactors. **Never** add features outside §3 IN-scope.
**Never** touch anything in §2 OUT-scope.

### The loop (each iteration)

1. **Orchestrator** picks the single highest-value backlog item.
1. **Builder sub-agent** (`model: sonnet`) implements just that item on a **fresh branch**.
1. Run `pnpm verify` + relevant e2e. If red and not fixable in 2–3 attempts → **discard the
   branch**, log why in `PROGRESS.md`, move to the next item. Never merge red.
1. **Reviewer sub-agent** (`model: opus`) reviews the diff and must return **PASS** on all of:
   (a) it genuinely improves something, (b) it regresses nothing, (c) it violates no guardrail
   or scope rule (§2/§3/§8). The reviewer’s new findings feed back into the backlog.
1. **Merge only if** green + reviewer-PASS + the §11 e2e acceptance suite still passes. Then
   commit (conventional message) and append a one-line entry to `CHANGELOG.md`.
1. If a change would regress or can’t be made green/approved → **revert to last good commit**
   and move on. The baseline is never sacrificed for an improvement.

### Regression safety (hard rules)

- **Never delete, skip, or weaken a test** to make something pass.
- The §11 e2e acceptance suite must stay green every iteration.
- Every ~5 merged improvements, re-run the full suite and move the `baseline-green` tag to the
  new known-good commit.

### Inter-agent collaboration (what “agents talking to make it better” means here)

The value is the **builder → reviewer → backlog** feedback cycle, grounded in the backlog and
acceptance criteria — not free-form chatter. Reviewer findings become backlog items; the
builder addresses them; the reviewer re-checks. A `hardening` sub-agent (sonnet) can run in
parallel on independent test-writing while the builder works fixes, as long as they touch
non-overlapping files and each lands green + reviewed.

### Stop conditions (halt the loop on ANY)

- Backlog is exhausted.
- Two consecutive iterations produce no net improvement (anti-churn guard).
- Usage/time budget is reached, or Opus pool exhausts and reviewer quality would degrade.

### On stop (always leave a clean morning state)

- Ensure `main` is on a **green, committed, tagged** commit.
- Finalize `CHANGELOG.md` (everything Phase 6 changed) and the `PROGRESS.md` morning summary:
  what improved, current coverage, the `baseline-green` commit hash, anything left for review.

-----

*End of handoff. Build the durable core well; leave the risky/live parts as clean, empty slots for me to handle deliberately later.*