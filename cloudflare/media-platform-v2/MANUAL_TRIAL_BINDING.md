# Isolated trial binding — 2026-11-08

## Audit result
- Branch: mhy-library-admin-20261107.
- .github/workflows/media-worker.yml deploys only from main, uses environment cloudflare-media, references CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. configure.mjs pins production Worker long-resonance-69a2 and public bucket mhyproductiomhyproduction-median-media.
- .github/workflows/media-upload.yml uploads only from main and references MEDIA_UPLOAD_TOKEN.
- Neither workflow deploys media-platform-v2. Do NOT dispatch either workflow for this trial.
- GitHub Actions returned zero workflow runs for this branch at audit time.
- The connected GitHub API tool explicitly excludes secrets APIs. Secret existence, environment protection and token scope could not be inspected. References are not evidence of usable credentials. No secret values were requested, read or printed.
- No workflow, production Worker, public bucket, official website or main branch was modified.

## Exact manual binding
Use a separate Worker named mhy-media-admin-trial. If this name already exists, inspect it before changing anything; do not overwrite an unknown service.

In that trial Worker's Settings -> Bindings -> Add binding -> R2 bucket:
- Variable / binding name: MEDIA_BUCKET
- Existing bucket: mhyproduction-private-media
- Do not create another bucket or bind the public bucket.
Keep private bucket public access disabled and without a public custom domain.

This binding alone does not install the backend or authenticate the administrator.

## Remaining owner-side setup (more than one technical step)
1. Create/select only the separate trial Worker and add the binding above.
2. Bundle cloudflare/media-platform-v2/worker.mjs with its locked jose dependency; stage media-admin assets and original logo. Bind those assets as ADMIN_ASSETS; configure ADMIN_RATE_LIMIT (60 per 60 seconds).
3. Configure owner-only Cloudflare Access for admin routes with enforced independent MFA and protected alternate hostnames. Set ACCESS_ISSUER, ACCESS_AUD, exact ADMIN_SUB and ADMIN_EMAIL in trial Worker configuration. Never place credentials or assertions in chat or source.
4. Leave MFA_POLICY_CONFIRMED and PRIVATE_BUCKET_CONFIRMED inactive until policy/privacy are verified; then activate only on the trial service. Keep ENGAGEMENT_ENABLED off.
5. Do not accept a paid feature or create a broad API token. Use dashboard deployment if no suitably limited existing deployment credential is available.

There is no honest single click that completes binding, deployment, Access and MFA together. The first owner action is step 1; it requires no sharing of secrets. Return only the trial Worker's non-secret URL after setup, not authentication material.

## Acceptance tests — NOT RUN LIVE
- Anonymous admin/upload requests denied.
- Owner login with MFA succeeds.
- Actual small image and playable video uploaded as drafts to private bucket; size/readback and playback verified through authorized Worker.
- Anonymous draft read denied; drafts absent from public catalog.
- Explicit publication tested separately; no existing media moved/copied/deleted.
- Android Chrome file selection, resumable upload and navigation checked.
No successful live binding or upload is claimed.
