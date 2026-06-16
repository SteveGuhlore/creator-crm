# Project: Creator CRM (internal, multi-tenant-ready)

> Full build spec: see `OVERNIGHT_HANDOFF.md`. Read it before starting.

## What this is

A per-platform CRM/dashboard for managing my own content-creator accounts, architected
from day one to expand into a multi-model agency tool later **without a rewrite**.
Built and tested entirely against **mock + CSV data**.

## Absolute rules (do not violate)

- **NO live platform integration.** No scrapers, no reverse-engineering any platform’s
  endpoints, no logging into any real account, no calls to any external creator-platform
  API. Live adapters are **interface + mock implementation only**; the `LiveAdapter` stub
  throws `NotImplementedError`.
- **NO AI fan-chat / chatbot.** Helpers are deterministic: templates, scheduling, manual
  draft-then-review. No LLM generating fan replies.
- **NO AI content / likeness generation.**
- **NO agency UI yet** (multi-operator, shifts, payroll). Build schema hooks only
  (`model_id` everywhere, stubbed `payout_split` table, `audit_log` table).
- **NO production deploy.** Staging only.
- **Dashboard is SEPARATED per platform** — never a single merged/unified inbox.
- **`model_id` and `source_platform` on every relevant record** (multi-tenant from day one).
- **No secrets in code.** All config via env; `.env` git-ignored; `.env.example` committed.
  Credential/proxy fields are designed for AES-GCM encryption-at-rest (empty for now).
- **No scope creep.** Park new ideas in `PROGRESS.md` under “Ideas for review” — don’t build them.

## Stack (don’t re-litigate)

Next.js (App Router, TS **strict**) · PostgreSQL · Prisma · Zod · Auth.js (NextAuth) ·
Tailwind + shadcn/ui · Recharts · BullMQ + Redis · Vitest · Playwright · pnpm · Docker Compose.

## Workflow (non-negotiable)

- **Plan first.** Start in plan mode; produce a dependency-ordered task list + sub-agent plan
  - self-check acceptance criteria, then execute.
- **Dependency order is law.** The Prisma schema (Phase 1) is a frozen shared dependency —
  complete and tested before any feature work. Only parallelize genuinely independent modules.
- **Every task:** code → `pnpm verify` (typecheck + lint + test) **green** → commit
  (conventional commit) → update `PROGRESS.md`. Never advance on red. Never disable tests.
- **If blocked:** stub with `TODO(blocked): <what/why/tried>`, log in `PROGRESS.md`, move to
  independent work. Never hack around it destructively or commit broken code.
- **Commit constantly** — commits are the overnight checkpoints.

## Sub-agents & models

- Orchestrator (main session): **Opus**, high effort.
- `builder` sub-agents: set `model: sonnet` explicitly (they inherit Opus otherwise).
  Work in non-overlapping directories; never modify the frozen schema.
- `reviewer`/QA sub-agent: `model: opus` — gates each phase against acceptance criteria
  and the guardrails above.
- test-runner / file-search: `model: sonnet`.
- **Think hard** on architecture, data-model design, and integration decisions; **move
  efficiently** on routine implementation and boilerplate.

## Commands

- `pnpm verify` — typecheck + lint + test (must pass before closing any task)
- `pnpm seed` — seed realistic mock data
- `pnpm dev` — run the app
- `docker compose up` — Postgres + Redis

## Definition of done (full criteria in OVERNIGHT_HANDOFF.md §11)

App runs locally from a clean checkout, `pnpm verify` green, per-platform dashboards render
seeded data, analytics correct, CSV import works, template + scheduled-send (simulated) work
with audit entries, deployed to private staging, `PROGRESS.md` + `README.md` written, and
zero live-integration / AI-chat / AI-content code.