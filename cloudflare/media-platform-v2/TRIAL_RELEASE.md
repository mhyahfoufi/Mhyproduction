# Self-contained trial release — 2026-11-08

Build: npm ci, npm test, npm run build from cloudflare/media-platform-v2. Output release/worker.mjs includes jose, engagement server (disabled), admin HTML/JS/CSS and unchanged official logo. No separate public asset binding is needed; the embedded asset handler is reached only after Worker authentication. release/wrangler.json pins ONLY mhy-media-admin-trial and MEDIA_BUCKET -> mhyproduction-private-media, keeps variables and deliberately locks MFA/private verification flags false. Do not deploy this config over any other Worker. No bucket creation, object transfer or deletion.

Owner reports the trial Worker already exists with Hello World and binding configured. Do not recreate either resource. Deployment requires authenticated management access, which this agent lacks. Existing GitHub workflows target production and are not used. No repeated sign-in attempted.

Before enabling: configure actual owner-only Access with mandatory MFA, exact issuer/audience/owner subject/email and ADMIN_RATE_LIMIT (60 requests/60 seconds) on the trial Worker. Mark confirmation flags true only after verifying those controls and private bucket settings. Flags alone do not implement MFA. Existing deployment config resets confirmation flags to false intentionally; release remains locked until owner-side verification.

Validation actually run: 21 local tests pass; bundle imports successfully; GET /health returns 200; /admin/ and /api/admin/session with no identity configuration return 503, with no asset exposure. These checks do not prove live Cloudflare authorization or R2 upload. Real login/MFA, visitor denial on deployed service, image/video upload, retrieval/playback, drafts/publication and Android testing remain unexecuted.

No operational preview is claimed. The existing static review admin stays locked. Source feature limits remain listed in SETUP.md; this release packaging does not claim full season/episode management or hardened production quotas.
