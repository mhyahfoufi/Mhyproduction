# MHY media platform v2 — candidate, NOT DEPLOYED

## Boundaries
Official GitHub Pages/main and existing Worker/bucket are unchanged. Do not dispatch media-worker.yml: it targets the existing main Worker. Existing legacy Worker public namespace remains separate and cannot securely serve secret drafts by itself. Do not bind this candidate to a bucket with public r2.dev/custom-domain access without inspecting its settings and obtaining owner approval for any necessary change. No bucket is created by this package.

The Sites review remains static and owner-private. /admin/ on the static preview is a locked preparation page, NOT a working administrative backend. No administrator password or token exists in the client. The candidate Worker serves authenticated admin assets from ADMIN_ASSETS, validates the Access RS256 assertion with jose, pins issuer/audience and exact ADMIN_SUB plus ADMIN_EMAIL, and denies writes without same-origin Origin, X-MHY-Admin and ADMIN_RATE_LIMIT. MFA is enforced by the Access application policy; MFA_POLICY_CONFIRMED is a deployment interlock, not evidence that MFA is enabled.

## Owner action required before deployment
Open Cloudflare Dashboard -> Workers & Pages -> existing media Worker -> Settings -> Bindings. Supply the existing R2 binding name and bucket name (non-secret), so private-access settings and binding can be checked before configuring a trial Worker. Do not paste an API token, password or Access assertion. There is no available Cloudflare management connection in this session. No Access app, account, domain, bucket or secret was created or changed.

After read-only binding/privacy verification, configure a separately scoped trial Worker on an approved hostname and protect /admin/* and /api/admin/* with Cloudflare Access, exact owner email and mandatory independent MFA (TOTP/security key). Export the existing configuration first. PUBLIC /api/catalog and /media/* remain outside the Access route; the Worker authorizes each private media read internally. Disable workers.dev alternate access or apply equivalent Access policy so the protected application cannot be bypassed. Identity restrictions in Worker remain mandatory regardless.

Server-only config names: ACCESS_ISSUER (https://TEAM.cloudflareaccess.com), ACCESS_AUD, ADMIN_SUB (Access identity UUID, not Sites identity), ADMIN_EMAIL, MFA_POLICY_CONFIRMED=true only after live policy test, PRIVATE_BUCKET_CONFIRMED=true only after verifying no direct public bucket bypass. MEDIA_BUCKET must bind the exact existing approved private bucket. ADMIN_ASSETS binds ../../dist/admin. Configure ADMIN_RATE_LIMIT with the Workers rate-limit binding using limit=60, period=60; verify runtime support before deploy. Do not put secrets or live account identifiers in tracked config. No executable wrangler config is included to prevent accidental overwrite/creation.

Run npm ci then npm test. Wrangler must bundle worker.mjs with its jose dependency. Never deploy over the legacy Worker. Never use Sites r2 manifest to create a replacement bucket.

## Candidate features / limits
Records use private mhy-platform-v2/ namespace and UUID identities. Logical work/folder associations, publication state, media role, external platform URLs, optional download policy. Revision/ETag checks prevent stale metadata overwrite. Uploads use 8 MiB sequential parts (10 GiB per-file ceiling), per-part SHA-256 and first-part media-signature check, durable upload sessions and local resumable session references. Completion HEAD + first-byte readback verifies object size/signature, not a full transcoding/playability check. Resumption requires reselecting the same original file after connection failure. Local fingerprint is first/last chunk plus file metadata, not an entire-file digest. Cross-device global deduplication is not implemented. Multipart retry/abort cleanup, quotas and codec scanning need hardening before public rollout. Catalog scan currently caps at 2000 records.

Admin currently supports create work/folder, local file types and covers, external links, title edits, folder moves within a work, publish/unpublish, per-media download permission and soft removal after separate confirmation. Full description/category/external-link editing, season/episode forms and assigning a specific cover to an episode remain incomplete. A cover upload is tagged role=cover. No destructive R2 deletion exists. Arbitrary nesting is not implemented.

Private content is denied server-side. Published media is necessarily retrievable to view; disabling the download endpoint/UI is not DRM and cannot guarantee preventing copying. Every metadata/media response is no-store. Backend download enforcement cannot affect old public R2 URLs; those are untouched and require a separate privacy review.

## Verification
10 automated tests pass against in-memory R2, including real RS256 signature/audience/expiry/owner checks with locally generated keys, anonymous API rejection, CSRF and rate-limit interlocks, draft isolation, mocked image/MP4-signature multipart, public byte range, download rejection, external-link validation, revision conflicts and confirmed soft-removal without object deletion.

NOT VERIFIED: live Access sign-in/MFA; actual binding/private bucket config; actual image or playable video R2 upload, restart/resume on real service, Android physical Back, codec playback, production Malak live smoke check. Do not declare these complete. No actual R2 mutation performed in this session.

Primary references:
https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/
https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/
