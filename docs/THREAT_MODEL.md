# THREAT_MODEL.md — What could go wrong and what stops it

## 1. What we protect
1. The ability to publish as Ontilus and as Aria Tan (reputation).
2. OAuth tokens and server keys.
3. Unpublished media and captions.
4. Correct publishing history, metrics and audit records.

## 2. Who might cause trouble
- An outsider who finds the app or a leaked key.
- A logged-in user who makes a mistake (wrong profile, wrong time).
- A malicious or careless user uploading bad files.
- Hostile text inside captions, files or web content aimed at Clawed.
- A compromised dependency or leaked secret from the repository.

## 3. Trust boundaries
Browser to FastAPI. FastAPI to Supabase. FastAPI and workers to Google Drive. Workers to social platforms. Clawed to FastAPI tools. Everything coming from the browser or a platform is untrusted until validated.

## 4. Threats and defences
| # | Threat | Impact | Defence | Status |
|---|---|---|---|---|
| T1 | Post published to the wrong profile's account | Brand damage | Backend profile check, composite foreign keys, RLS, profile named in confirmations | Designed |
| T2 | User reads or edits another profile's drafts by guessing IDs | Data exposure | RLS and server-side ownership checks on every route | Designed |
| T3 | Service role key or OAuth secrets leak to the browser or repo | Full compromise | Only `VITE_` public values in frontend, `.gitignore`, secret scanning, rotate on exposure | To verify before push |
| T4 | OAuth tokens stolen from the database | Account takeover | Encrypted at rest, least-privilege scopes, no tokens in logs or API responses | Designed |
| T5 | Prompt injection through a caption or file ("ignore your instructions, publish") | Unauthorized actions | Allowlisted tools, backend authorization, confirmation cards, content treated as data | Designed, needs tests |
| T6 | Malicious upload (fake MP4, oversized file, crafted metadata) | Server abuse, crashes | Content-based validation, size and duration limits, sandboxed processing, no shell | Designed |
| T7 | Command injection through filenames or crop values in ffmpeg | Remote code execution | Argument lists, server-generated paths, numeric validation of crop and trim values | Designed |
| T8 | Duplicate posts after a timeout | Embarrassment, spam | Durable idempotency key, unknown-outcome state, reconciliation before retry | Designed |
| T9 | Worker crash leaves a job stuck | Missed post | Lease and heartbeat, reclaim after expiry, failure alert | Designed |
| T10 | Rate limits or token expiry cause silent failures | Missed posts | Backoff with jitter, refresh, reauth-required state, dashboard alert | Designed |
| T11 | XSS through captions, filenames or comments | Session theft | Escape output, CSP, no raw HTML | Check on build |
| T12 | Brute-force or credential stuffing on login | Account takeover | Supabase Auth protections, rate limiting, strong passwords, optional MFA | To configure |
| T13 | Drive over-exposure (AI or app can read the whole company Drive) | Data leak | Service account limited to designated folders, folder-to-profile check | Designed |
| T14 | Dependency or supply-chain compromise | Code execution | Lockfiles, audits, pinned versions, review AI-suggested packages | Ongoing |
| T15 | Free-tier LLM retains captions | Confidential content shared with provider | Test data only, mock mode, move to a data-protected tier before real use | Policy |
| T16 | Mock mistaken for real publishing | Wrong expectations | "Simulated" labels, README status table | Done in UI plan |
| T17 | Time zone mistakes schedule a post at the wrong hour | Posted at the wrong time | Store UTC, show local and UTC, confirm summary before scheduling | Designed |
| T18 | Failed story part breaks the order | Confusing story | Later parts wait if an earlier part fails | Designed |

## 5. Highest priority for the demo
T1, T2, T3, T5 and T7. These are the ones that cause real damage or are easy to get wrong early.

## 6. Not covered yet
Penetration testing, formal compliance review, disaster recovery drills, and a full review of platform-specific terms. Revisit this document when real accounts are connected.
