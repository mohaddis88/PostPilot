# PRD.md — PostPilot product requirements

## 1. Summary
PostPilot is an internal tool that lets a small team schedule and publish finished images and videos to LinkedIn, Instagram, Facebook and TikTok for two brands, then see what worked. It does not create or edit content. Finished files come from Task 3 (the AI avatar videos) or from the team directly.

## 2. Who uses it
Ontilus staff who manage social media. One shared login at first. They publish as one of two profiles: Company (Ontilus) and Model (Aria Tan). More models may be added, so the design treats profiles as data, not as two hard-coded cases.

## 3. Problems it solves
- Posting the same file to four platforms means four different size, length and ratio rules. People find out a video is rejected only after uploading it.
- Scheduling lives in separate tools, with no single record of what went out, what failed and why.
- Nobody can easily see which post, platform or posting time performs best.
- Two brands share one workflow, so a post can end up on the wrong account.

## 4. Goals
1. One flow from file to scheduled post, with problems caught before scheduling.
2. A hard separation between the two profiles, enforced by the backend and the database.
3. Every publish attempt recorded, and failures explained in plain language.
4. Statistics and suggestions per platform that lead to an action, not just a chart.
5. A prototype whose mock data can be swapped for the real backend without rewriting screens.

## 5. Non-goals (for now)
Generating or editing video. Comment and DM management. Paid ads. Real Instagram, Facebook and TikTok publishing (blocked by app review; kept simulated). Multi-tenant SaaS features such as billing.

## 6. Functional requirements

### Accounts and profiles
- FR1. Login with Supabase Auth. One user can act as either profile.
- FR2. A Company / Model switcher in the top bar. All data on screen is scoped to the active profile, including half-finished drafts.
- FR3. Connect, reconnect and disconnect social accounts per profile. Show status (active, expiring, disconnected, reauth needed). Never show tokens.
- FR4. A post can only target accounts of its own profile.

### Creating posts
- FR5. Choose Post or Story. Stories are available for Instagram and Facebook only.
- FR6. Upload or pick from Google Drive: JPG, PNG, MP4, MOV. Validate type, size and real content.
- FR7. Show the file's duration, resolution, ratio and size next to each platform's limits (pass, warning, fail), with fixes: crop, trim, replace, split.
- FR8. Per-platform variants: ratio preset, crop position and zoom, blur-fill or letterbox, trim. One source file, many outputs.
- FR9. Story splitting: suggest equal-ish parts (default 30 s, never above the platform max), contiguous and non-overlapping, editable cut points, parts posted in order.
- FR10. Caption: master caption, per-platform overrides, character counters.
- FR11. Schedule: publish now, or pick date and time (local time and UTC shown). Past times blocked. Confirming this step is the approval.
- FR12. Save as draft at any step. Drafts page lists a profile's drafts with edit, schedule and delete (30-day restore).

### Calendar
- FR13. Real calendar: month and week views, previous, next, today.
- FR14. Chips for draft, scheduled, published, failed. Click to edit, drag to reschedule.
- FR15. Drive side panel inside the app. Dragging a file onto a date creates a draft planned for that date (no time). Keyboard alternative provided.

### Publishing and logs
- FR16. A scheduler finds due posts and creates durable jobs. Workers publish through platform adapters.
- FR17. Each platform target succeeds or fails independently. Story parts publish in order.
- FR18. Retry only temporary errors, with backoff. An unknown outcome is reconciled, never blindly retried.
- FR19. Status log: published, in progress, failed. Rows expand in place with details and actions (retry, reconnect, edit).
- FR20. Sidebar badges: failed count (red) and draft count (blue), per profile.

### Statistics and insights
- FR21. Statistics per platform, using each platform's own metric names. Ranges: 7, 30, 90 days, all time, filtered by publish date.
- FR22. Tracking starts when an account is connected to PostPilot. Earlier posts can be imported and are tagged.
- FR23. Top posts per platform, sortable, with story parts grouped.
- FR24. Recommendations (best time, format, CTA) only when each compared group has at least 5 posts and a difference of at least 15%. "Try this" opens Create with exactly the suggested values.

### Clawed
- FR25. One shared chat for all profiles. Uses allowlisted backend tools only. Anything that publishes, reschedules or cancels needs a confirmation card naming profile, platform and time.
- FR26. Everything Clawed can do is also possible through the normal UI.

## 7. Non-functional requirements
- Security: see SECURITY.md, THREAT_MODEL.md and SECURITY_CHECKLIST.md.
- Reliability: no silent failures; every attempt logged; idempotent publishing.
- Performance: pages usable on a normal laptop connection; heavy rendering done in background jobs.
- Accessibility: keyboard use, visible focus, AA contrast, reduced motion respected.
- Maintainability: logic in pure tested functions; mock and real data behind one API layer.
- Cost: free or low-cost tiers for the demo (Supabase, Vercel, Gemini free tier with test data only).

## 8. Scope for the internship demo
In: full UI on mock data, domain logic with tests, Supabase login and profiles, GitHub and Vercel deployment, documentation. Possibly in: real LinkedIn publish if the app is approved in time.
Out: workers running in production, real Meta and TikTok publishing.

## 9. Success criteria
- A reviewer can create a post and a story, fix a failing TikTok ratio by cropping, split a 90-second story into three parts, schedule, and see the result in the status log.
- Switching profiles never shows the other profile's drafts or data.
- Every visible button works.
- A cross-profile post attempt is rejected by the database.

## 10. Open questions
1. Stats day one: connection date (current decision) or platform account creation date? Confirm with supervisor.
2. Publishing states per target with a derived post status (current decision) or one status per post.
3. Where does the backend run (Vercel serves only the frontend)?
4. Exact story limits per platform (sources disagree), to verify against official docs.
5. Timezone: Asia/Kuala_Lumpur as the default, per-user setting later?
