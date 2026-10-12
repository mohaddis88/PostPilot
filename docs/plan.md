# plan.md — Where Task 1 stands and what's left

Internship runs until 14 Oct 2026. Update the status column as you go.

## Done (as reported)
- Specs and docs written
- Interface prototype built in Google AI Studio (shell, Create, Drafts, Schedule, Status log, Accounts, Statistics, Insights, Clawed, System status)
- Design pass: collapsible sidebar, sticky headers, profile cards, themes
- Story, per-platform crop and split features specified (AI_STUDIO_V2.md)

## Remaining
| # | Work | Output | Status |
|---|---|---|---|
| 1 | Export from AI Studio, run locally, remove any keys | Local app runs | |
| 2 | Supabase project, migrations, RLS, one user | Login works | |
| 3 | Switch auth, profiles and drafts to the real database | First real slice | |
| 4 | Push to private GitHub repo | Repo with README and docs | |
| 5 | Deploy frontend to Vercel with env vars | Live URL | |
| 6 | Security checklist sections A to C | Ticked list | |
| 7 | Demo script and walkthrough | Scripted demo | |
| 8 | Update docs to match what was built | Final docs | |

## Stretch (only if time allows)
- Real LinkedIn publish, if the app is approved
- FastAPI skeleton with the story-plan and calendar-drop endpoints
- Metric snapshot job with mock data

## Demo script
1. Log in, show the Company / Model switch and that data stays separate.
2. Create a Post, pick TikTok with a landscape video, show the failed check, crop it, pass.
3. Create a Story with a 90-second video, show the split into three parts, schedule.
4. Calendar: navigate months, drag a file from the Drive panel onto a date, open the draft.
5. Status log: expand a failed item, use the suggested fix.
6. Statistics: switch platforms and ranges.
7. Insights: press Try this, show the prefilled time.
8. Clawed: ask for scheduled posts, show a confirmation card.

## Risks
| Risk | What to do |
|---|---|
| Little time left | Do steps 1 to 5 first, everything else is bonus |
| LinkedIn approval not in time | Keep mock, label it |
| Backend host undecided | Say so in the demo, frontend and database are live |
| Stat and platform limits unverified | Mark as "to verify" in the demo |

## Open decisions
See PRD.md section 10.
