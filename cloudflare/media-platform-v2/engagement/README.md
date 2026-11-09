# MHY audience interaction — approved addition, disabled candidate

2026-11-07. Branch: mhy-library-admin-20261107. This does not activate interactions or provision a database. Priority remains secure administrator sign-in and live R2 uploads. No official site, current Worker, bucket, Access application, secrets or live database changed.

## Implemented source
- D1 schema migration (not applied), parameterized queries and durable reaction/comment/report/event storage.
- HMAC-signed HttpOnly/Secure/SameSite visitor cookie, 30-day browser identity. No name/email/IP stored for visitors. IP-derived HMAC is used only as a transient rate-limit key before a verified session; it is not written to D1. Cookies are necessary identifiers: describe them in the site's privacy notice before activation.
- One current vote per item/browser enforced by database primary key. Upsert changes like/dislike; zero removes it. Clearing cookies/changing browser can create another identity; neither unique people nor absolute anti-abuse protection is claimed.
- Turnstile siteverify in server, strict hostname/action matching, same-origin custom-header mutation checks and mandatory rate-limit binding. Comments always enter pending; there is no pretend AI moderation. Only approved comments are public. Reports deduplicated; temporary 1–30 day blocks; official replies require existing administrator verification.
- Administrative approval/hide/body deletion, reply as MHYPRODUCTION and per-work comment policy. Comment deletion clears its text; it never removes media. Client inserts comment text with textContent, not innerHTML.
- Event thresholds: visible image 3 seconds; visible, active video/audio 10 seconds. One event of each kind per item/browser per 30-minute bucket. No page-open view and no completed-watch claim. Client active time is an abuse heuristic, not trusted proof of watching. A new bucket can count a later repeat. External source opens are a separate metric, never YouTube playback/likes/comments.
- Manager stats: 1/7/30 rolling days, current vote states last changed in that period, like ratio, distinct browser estimates for qualified events, daily totals, popular playback/source openings and reaction/comment rankings. Current implementation groups daily stats in UTC and labels it explicitly; Beirut-local day boundaries are not yet implemented. Deleted votes are not historical analytics; snapshot analytics would need a separate history table.
- Optional visitor component for like/unlike/change, pending comment submission, reports, pagination and Web Share/clipboard fallback. Optional moderator component for queues, replies, policy, blocks and stats.

## Activation gates — intentionally not configured
ENGAGEMENT_ENABLED=true is accepted only when the existing MFA_POLICY_CONFIRMED and PRIVATE_BUCKET_CONFIRMED interlocks are true, ENGAGEMENT_DB binding exists, ENGAGEMENT_RATE_LIMIT exists, and TURNSTILE_SECRET, ENGAGEMENT_HOSTNAME and a server-only random ENGAGEMENT_COOKIE_SECRET (at least 43 characters) exist. No secret is bundled. Never set confirmation flags merely to make a demo work.

Before activation: finish live admin MFA and real R2 image/video readback tests; inspect existing D1 resources; choose the owner-approved database and export its schema/data as needed. Apply 0001_engagement.sql as a new migration to the approved test DB only. Do not add a Sites D1 binding that silently provisions a replacement resource. Configure Turnstile and rate limits. No runtime schema creation exists. After these steps deploy the candidate trial Worker, verify unauthenticated admin denial, and test all writes/readback on live D1.

The media Worker hook only accepts published and verified records, including published parents; no interaction on private/draft content. It currently resolves the new UUID media/external catalog records only. Legacy YouTube/image IDs need an explicit catalog registration/migration without duplicating stored files before they can interact.

## Frontend integration still required
Neither client component is loaded by the public visitor page yet. Do not add enabled buttons with local-only counts. After the gates pass, mount client.mjs below each resolved published media record with its canonical UUID and actual audio/video/image element. Supply a Turnstile token callback for actions session/comment and a stable work/content deep link for sharing. Call externalOpened only on an actual external-source-open gesture. Load client.css and provide Arabic/English labels. Mount admin-client.mjs only after the existing authenticated admin session succeeds. Apply admin CSP changes only for the exact Turnstile script/frame/connect origins if widgets are added to protected admin later (current moderation needs none).

Remaining before release: live D1/Turnstile/Access verification; Android interaction UI and accessibility QA; legacy ID registration; actual UI module mounting; atomic spam throttling under simultaneous requests; report-focused admin filtering; blocked-visitor management/unblock UI; owner-approved retention/purge/export policy; calendar-day semantics; load/cost validation and a query budget review. Existing per-minute comment check is not a race-free quota. No rate limit can guarantee that one anonymous person never creates multiple identities.

## Tests
node --test test.mjs engagement/test.mjs
21 tests pass overall: 10 existing media/admin and 11 audience tests. Audience tests execute the real SQL migration and queries with Node's local SQLite via a D1-shaped adapter, plus deterministic Turnstile and administrator mocks. Checks cover reaction uniqueness/change/cancel, tampered/expired identity, activation interlocks, pending persistence and public filtering, administrator denial, approval/hide/reply/report deduplication, comment policy, blocks, spam limits, threshold counting, external separation and statistics. These are not live Cloudflare D1 or real robot-challenge tests. No live result is claimed.

Primary references:
https://developers.cloudflare.com/d1/worker-api/d1-database/
https://developers.cloudflare.com/d1/worker-api/prepared-statements/
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
