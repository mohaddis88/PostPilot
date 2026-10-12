# CLAUDE.md — PostPilot (Task 1)

Internal tool: schedule and publish **finished images/videos + caption** (as Post or Story) to LinkedIn, Instagram, Facebook and TikTok for profiles Company (Ontilus) and Model (Aria Tan, more models later), then monitor and analyze. No video generation.

Read first: `docs/PRD.md`, `docs/architecture.md`, `docs/design.md`, `docs/SECURITY.md`, `docs/plan.md`, `docs/AI_rules.md`. PRs follow `docs/PR_.md`.

## Stack
React + TypeScript + Vite (frontend, Vercel) · FastAPI (backend) · Celery + Redis (workers) · Supabase Postgres/Auth/RLS/Realtime (state) · Google Drive (media) · LinkedIn real adapter · Instagram/TikTok mock adapters · Clawed (Gemini via FastAPI tools).

## Layout
`src/domain` (pure logic) `src/api` (mock + http) `src/ui` · `/backend` `/workers` `/publishers` `/supabase` `/tests` `/docs`

## Commands (adjust if the repo differs)
```
frontend:  npm install && npm run dev
backend:   cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
worker:    celery -A workers.app worker -l info
beat:      celery -A workers.app beat -l info
redis:     docker compose up redis
tests:     pytest  |  npm test
lint:      ruff check . && npm run lint
```

## Non-negotiables
1. Backend enforces auth, profile ownership, and the state machine. Frontend is not a security boundary.
2. `post.profile_id == social_account.profile_id`, checked in the backend and by composite FKs in the DB.
3. Postgres is the source of truth. Redis is only queue/lock coordination.
4. Idempotency key + durable job state before any external publish. Unknown outcome => reconcile, never blind retry.
5. Secrets only in env. Service-role key, OAuth tokens, Google credentials never reach the browser or Clawed.
6. Clawed uses allowlisted FastAPI tools only. High-impact actions need confirmation.
7. LinkedIn: current Posts API, versioned headers from config. Not `ugcPosts`.
8. Mock adapters are labelled "Simulated" everywhere.
9. UI uses `design.md` tokens only; `data-profile="company|model"` and `data-theme="light|dark"` on `<html>`.
10. Business logic lives in `src/domain` as pure tested functions; UI reaches data only through `src/api` (`VITE_API_MODE=mock|http`).
11. State is per profile: drafts and half-finished flows never carry over when switching profiles.
12. Stories: Instagram and Facebook only. Story split parts are contiguous, non-overlapping, within platform limits.
13. No review stage: confirming Schedule is the approval.

## Conventions
- Python: type hints, Pydantic schemas, services separate from routers, `ruff` formatting.
- TypeScript: strict mode, no `any`, server state via typed API client, components small and token-styled.
- SQL: every schema change is a migration in `/supabase/migrations` with RLS and a test.
- Errors shown to users are plain-language with a recovery action; raw payloads go only to execution logs (secrets redacted).
- Commits: `type(scope): summary`. Small PRs.

## Workflow
1. Check `plan.md` for the current phase.
2. Propose a short plan; get approval for auth/RLS/publishing/migration changes.
3. Implement with tests.
4. Run lint + tests.
5. Fill in the PR template.

If a requirement is unclear or conflicts between docs, ask before proceeding. Mark unverified platform details `TODO(verify)`.
