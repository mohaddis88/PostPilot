# architecture.md — PostPilot system design

PostPilot takes a **finished image or video plus a caption**, lets the user schedule it for one or more platforms, publishes it, records what happened, and then analyzes results. It does not generate or edit content. Test videos come from Task 3.

## 1. Components
| Component | Role |
|---|---|
| React + TypeScript (Vite) | UI only. No secrets, no business rules the server must enforce. Hosted on Vercel. |
| Supabase | Postgres (source of truth), Auth, row level security, Realtime. |
| Google Drive | Large media only. Postgres stores the Drive file ID and metadata. |
| FastAPI | Business logic, authorization, security boundary, tools for Clawed. |
| Celery + Redis | Scheduling, publishing jobs, retries, render jobs, metric collection. Redis is not durable truth. |
| ffmpeg (in workers) | Per-platform crops, trims and story part cuts. |
| Platform adapters | LinkedIn (real, when approved), Instagram, Facebook, TikTok (simulated). |
| Clawed (OpenClaw) | External open-source agent reachable on WhatsApp. Calls PostPilot only through the scoped Clawed API using a custom skill. Brings its own LLM key. |

Principle: Drive stores files, Postgres stores facts, Celery does work, FastAPI enforces rules, adapters talk to platforms, Clawed is the chat interface.

## 2. Code layout
```
src/domain   pure functions (specs, validation, crop, story split, stats, recommendations, dates)
src/api      interfaces + mock/ and http/ implementations, chosen by VITE_API_MODE
src/ui       pages and components; only call api/ and domain/
supabase/    migrations, RLS policies, DB tests
/backend /workers /publishers /storage /analytics /ai /tests   (planned)
```
The same domain logic is ported to Python for the backend and checked with shared JSON test vectors (for example 90 s splits into 30/30/30, 92 s into four 23 s parts).

## 3. Profiles and authorization
Profiles are data: Company (Ontilus, slug `ontilus`, type `company`) and Model (Aria Tan, `aria_tan`, type `ai_model`), with more models possible. One authenticated user can act as either. Each request carries the profile, and the backend checks user, then profile, then action.

Isolation in three layers:
1. Backend check `post.profile_id == social_account.profile_id`.
2. Composite foreign keys so a mismatch can't be stored:
```sql
ALTER TABLE social_accounts ADD UNIQUE (id, profile_id);
ALTER TABLE posts           ADD UNIQUE (id, profile_id);
-- post_targets carries profile_id and references both parents with it
FOREIGN KEY (post_id, profile_id)           REFERENCES posts(id, profile_id)
FOREIGN KEY (social_account_id, profile_id) REFERENCES social_accounts(id, profile_id)
```
3. Row level security on every exposed table. The service role key stays on the server.

## 4. Data model
SQL: `supabase/migrations/0001_core.sql` (core), `0003_jobs_variants_metrics.sql` (later). Tables: `profiles` (name, slug, type, description, image_url), `profile_members`, `social_accounts` (encrypted tokens, status, `tracked_since`, `is_mock`), `media_assets` (kind image|video, drive_file_id, width, height, duration_ms, size_bytes, mime, checksum, profile_id), `media_variants` (asset_id, platform, aspect, fit crop|blur_fill|letterbox, crop_cx, crop_cy, zoom, trim_start_ms, trim_end_ms, rendered_file_id), `posts` (profile_id, type post|story, title, caption, status, planned_date, scheduled_at, cta_type), `post_targets` (post_id, profile_id, account_id, platform, variant_id, caption override, status, external id/url, error fields), `story_parts` (target_id, index, start_ms, end_ms, status), `publishing_jobs` (idempotency_key UNIQUE, attempt_count, max_attempts, available_at, next_retry_at, lease_expires_at, last_heartbeat_at, worker_id, error fields), `publishing_execution_logs`, `metric_snapshots` (target_id, captured_at, raw jsonb, normalized columns), `recommendations`, `audit_log`, `clawed_conversations`.

Media may be archived or deleted by policy. Post, target, job, log, metric and audit rows stay.

## 5. States
No separate review stage: confirming the Schedule step is the approval.

Post: `DRAFT -> SCHEDULED -> PUBLISHING -> PUBLISHED`, with `FAILED`, `UNKNOWN -> RECONCILING -> PUBLISHED | FAILED`, and `AUTH_REQUIRED` as side paths. Platform states live on each **target**, and the post status is derived from them (for example completed with errors). Only backend code changes states. A draft dropped on the calendar is `DRAFT` with `planned_date` and no `scheduled_at`.

## 6. Post types, variants and story parts
- **Post** or **Story**. Stories support Instagram and Facebook only. Platform rules live in one config file (`specs`), marked to verify against official docs, because sources disagree on some limits.
- **Variants:** one source asset, one variant per platform. Crop is stored as normalized `{cx, cy, zoom}` and converted to pixels by `computeCrop`. The preview and the render job use the same values. Fit modes: crop, blur fill, letterbox.
- **Story split:** `L = min(30 s, platform max)`, `n = ceil(duration / L)`. If the last part would be under 5 s, use `n` balanced parts, with leftover milliseconds spread over the first parts. Parts are `[start, end)`, contiguous, non-overlapping, covering the video exactly. Over the daily cap means blocked. Workers cut with re-encoding (frame-accurate), then publish one job per part, in order. If one fails, later parts wait.

## 7. Publishing flow
1. Beat sweep claims due targets with `FOR UPDATE SKIP LOCKED`, creates a job with a deterministic idempotency key, and enqueues it.
2. A render job produces each variant and story part if not already rendered.
3. A worker sets a lease, verifies profile match and Drive access, and calls the adapter chosen by the factory (real or mock per flag).
4. Result goes to the target, execution log and audit log. Realtime pushes the status to the UI.
5. Targets are independent: one platform failing doesn't fail the others.
6. Lease expiry with no heartbeat lets another worker reclaim after checking.
7. Unknown outcome (timeout after send): enter `UNKNOWN`, reconcile through a platform lookup, never retry blindly.
8. Retry only temporary errors (timeouts, 5xx, 429) using `Retry-After` or exponential backoff with jitter. Don't retry invalid media, denied permission or disconnected accounts.
9. Failed jobs stay visible. Manual retry makes a new attempt and keeps history.
10. Every external call has a timeout.

## 8. Adapters
```python
class BasePublisher(ABC):
    def validate_media(self, media_ref) -> list[Check]: ...
    def publish(self, media_ref, caption, credentials) -> PublishResult: ...
    def reconcile(self, target) -> PublishResult | None: ...
    def fetch_metrics(self, target) -> dict: ...
    def refresh_token(self, account) -> None: ...
```
LinkedIn uses the current Posts API with the video upload flow, polling, correct author URN, and version/protocol headers from config. It never uses the legacy `ugcPosts` endpoint. Instagram, Facebook and TikTok are simulated and labelled so. Switching a flag is not enough for production: those platforms need app review and consent flows.

## 9. Calendar and Drive
The calendar fetches ranges (`getRange(from, to, profileId)`) and supports month and week views. A Drive side panel lists the active profile's folders. Dropping a file on a date calls `dropFile({profileId, driveFileId, date})`, which checks the folder belongs to the profile, validates type and size, is idempotent for the same file and date, and creates a draft with `planned_date`. The service account only sees designated folders.

## 10. Statistics and recommendations
- Metric snapshots are collected on a schedule and stored raw. Derived numbers (rates, changes, averages) are calculated by the backend, not by the AI.
- Day one is `social_accounts.tracked_since`, the date the account was connected to PostPilot. Ranges are rolling windows over publish date, clamped to that date. Imported older posts are tagged.
- Each platform shows its own metric names. "All" shows only shared metrics.
- Recommendations are objects: `{kind, platform, evidence, action}`. A suggestion appears only with at least 5 posts per compared group and at least a 15% difference. `action` carries the exact values (platform, post type, weekday, local time, timezone) that "Try this" prefills in Create. Time is stored in UTC and shown in the profile's timezone (default Asia/Kuala_Lumpur).

## 11. Clawed (OpenClaw)
Clawed is the OpenClaw agent: an open-source, self-hosted assistant with its own gateway that talks to WhatsApp, Telegram and similar apps, and is extended with skills (a folder with a `SKILL.md`). PostPilot does not build a chatbot or call an LLM for it. Two pieces connect them:

1. **Clawed API** in FastAPI: a small set of endpoints that act as tools (`get_posts`, `get_scheduled_posts`, `create_draft`, `schedule_post`, `cancel_post`, `get_post_metrics`, `get_content_performance`, `get_recommendations`, and similar). Authenticated with a dedicated, revocable API token that is scoped to specific profiles and operations. It is not the Supabase service key and not a user password.
2. **A PostPilot skill** for OpenClaw: a `SKILL.md` that tells the agent which endpoints exist and how to call them.

Rules:
- Every call is authorized by the backend like any other request: token, then profile, then action.
- Each action names its profile (the one in the message, otherwise a configured default), and the confirmation says which.
- High-impact actions are two-step. The API returns a proposal (profile, platform, time, caption summary) and a confirmation id. Nothing runs until the user confirms, in WhatsApp or in the app.
- Audit log records `source = clawed` and the channel.
- Rate limits apply. WhatsApp senders are allowlisted in OpenClaw so strangers can't instruct it.
- OpenClaw never receives OAuth tokens, Google credentials or the service role key. It stays a client of the API.
- OpenClaw runs on its own machine or container, with shell and file tools it doesn't need turned off, and only reviewed skills installed.
- The in-app Clawed page stays a simple chat UI over the same Clawed API, one shared history, until the OpenClaw gateway is connected. Mock mode works without any LLM key.

## 12. Environment variables (names only)
Frontend: `VITE_API_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Server: `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_SECRET`, `REDIS_URL`, `CELERY_BROKER_URL`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `DRIVE_ROOT_FOLDER_ID`, `CLAWED_API_TOKEN` (stored hashed, one per integration), `USE_MOCK_LINKEDIN`, `USE_MOCK_INSTAGRAM`, `USE_MOCK_FACEBOOK`, `USE_MOCK_TIKTOK`, `USE_MOCK_CLAWED`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_API_VERSION`.
Only `VITE_` values may reach the browser. Commit `.env.example` only.

## 13. Hosting
Vercel serves the frontend. The backend, workers and Redis need a host that can run long processes (to decide). Supabase hosts the database and auth.

## 14. Related documents
PRD.md (what and why), SECURITY.md, THREAT_MODEL.md, SECURITY_CHECKLIST.md, design.md, plan.md, AI_rules.md.
