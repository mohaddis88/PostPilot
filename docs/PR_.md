# PR_.md — Pull request template and rules

Copy the template below into `.github/pull_request_template.md`.

## Rules
- One concern per PR. Small PRs (aim under ~400 changed lines).
- Branch names: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `db/…`.
- Commit style: `type(scope): summary` (e.g. `feat(publishing): add lease heartbeat`).
- Never commit secrets, `.env`, service-role keys, tokens or real captions/media.
- DB changes ship as a migration file plus RLS policy plus a test.
- AI-generated code gets the same review as hand-written code (see `AI_rules.md`).

## Template

```markdown
## What and why
<!-- One or two sentences. Link the plan.md phase/milestone. -->

## Type
- [ ] Feature  - [ ] Fix  - [ ] DB migration  - [ ] Refactor  - [ ] Docs  - [ ] Chore

## Changes
-

## Screenshots (UI changes)
<!-- Light + dark, Company + Model (4 combinations) -->

## Security checklist
- [ ] No secrets or tokens in code, logs, or frontend bundle
- [ ] Backend checks user -> profile authorization
- [ ] Profile isolation preserved (post.profile_id == account.profile_id)
- [ ] New tables have RLS enabled and policies tested
- [ ] External calls have timeouts
- [ ] Clawed tools remain allowlisted; high-impact actions require confirmation
- [ ] Error messages shown to users are plain-language and safe

## Reliability checklist (publishing changes)
- [ ] Idempotency key used before external calls
- [ ] Unknown outcome does not retry blindly
- [ ] Retry only for temporary errors; backoff + jitter
- [ ] Execution log and audit row written

## UI checklist
- [ ] Uses design.md tokens only
- [ ] States: hover, focus-visible, disabled, loading, error, empty
- [ ] Keyboard navigation works
- [ ] Reduced motion respected
- [ ] 375px and 1440px, no horizontal overflow

## Tests
- [ ] Unit / API tests added or updated
- [ ] DB tests (if schema or RLS changed)
- [ ] Manual test steps:
  1.

## AI assistance
- [ ] AI tools used  (which, and which parts): 
- [ ] I read and understand every line submitted

## Rollback
<!-- How to undo (revert commit, down migration, flag). -->
```
