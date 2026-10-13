# SECURITY_CHECKLIST.md

Tick before each milestone. If an item can't be ticked, write why next to it.

## A. Before the first push to GitHub
- [ ] `.gitignore` covers `.env*`, `node_modules`, build output
- [ ] No keys in the code (search for `KEY`, `SECRET`, `TOKEN`, `process.env`)
- [ ] The AI Studio export doesn't bake an API key into the bundle
- [ ] `.env.example` has placeholder values only
- [ ] Repository is private
- [ ] Lockfile committed

## B. Before connecting Supabase
- [ ] RLS enabled on every table exposed to the client
- [ ] A policy exists for each operation the app uses
- [ ] Only the anon (publishable) key is in the frontend
- [ ] Service role key exists only on the server
- [ ] Cross-profile insert test fails as expected (composite foreign keys)
- [ ] Email confirmation and password rules configured
- [ ] Site URL and redirect URLs set to the real domain

## C. Before deploying to Vercel
- [ ] Environment variables set in the dashboard, none committed
- [ ] Only `VITE_` public values exposed
- [ ] HTTPS only, security headers configured (CSP, nosniff, frame protection)
- [ ] CORS limited to the real frontend origin (backend)
- [ ] Production build contains no secrets (search the bundle)
- [ ] Error pages don't reveal stack traces

## D. Before uploading real media
- [ ] Type, size, duration and content checks in place
- [ ] Files stay inside the right profile's Drive folder
- [ ] Browser never receives Google credentials
- [ ] ffmpeg runs with argument lists, server-generated paths, validated numbers
- [ ] Temporary files cleaned up

## E. Before connecting real social accounts
- [ ] Minimum OAuth scopes requested
- [ ] Tokens encrypted at rest, never in API responses or logs
- [ ] Reauth-required flow works
- [ ] Disconnect revokes tokens
- [ ] Idempotency key and unknown-outcome path tested
- [ ] Confirmation modal names profile, platform and time
- [ ] A test post on a throwaway account first

## F. Clawed (OpenClaw)
- [ ] Clawed API has an allowlist of operations, nothing else callable
- [ ] Dedicated token, scoped to profiles and operations, stored hashed, revocable
- [ ] No Supabase service key, OAuth tokens or Google credentials on the OpenClaw host
- [ ] OpenClaw runs on its own machine or container
- [ ] Shell, file and browser tools disabled unless needed
- [ ] Only reviewed skills installed (the PostPilot skill is written by us)
- [ ] WhatsApp senders allowlisted
- [ ] High-impact actions need a second-step confirmation
- [ ] Audit log shows source = clawed
- [ ] Prompt-injection test captions behave correctly
- [ ] Only fictional data while using a free-tier LLM key

## G. Before the demo or handover
- [ ] Both profiles tested in light and dark, no data leaking across
- [ ] Failure and retry paths demonstrated, errors readable
- [ ] Audit log shows who did what
- [ ] Dependency audit run (`npm audit`) and results reviewed
- [ ] README status table is honest about what is simulated
- [ ] All keys that were ever shared in chat or screenshots rotated
