# MHY media — prepared, not deployed

Inspected main at 36d931d316b290f9f2524e44ef5f527e63b647c1. Current catalog: assets/content-data.js; renderer: assets/content.js. No tracked Worker configuration or .github workflows were found. Pages may use GitHub's managed deployment. No existing site, Malak, catalog, media or URL was changed.

## API

- GET /health: liveness only, does not verify R2.
- GET /v1/media: authenticated list, 100 objects/page, optional cursor. Read or upload credential.
- PUT /v1/media/mhy-media/CATEGORY/unique-name.png: upload credential, raw binary body, accurate Content-Length and Content-Type. Returns key, ETag and public URL.
- GET or HEAD /media/mhy-media/CATEGORY/unique-name.png: public, video byte ranges supported (explicit start only).
- Delete, replacement, rename, public listing and cookies: disabled. Choose a new versioned name instead of overwriting.

Only the new mhy-media/ namespace is accessible through this Worker. Existing bucket keys remain untouched. This is a public publishing namespace, not private archival storage. Existing r2.dev access independently exposes bucket contents; this Worker cannot make them private. Do not upload drafts or secrets to a public bucket.

PNG, JPEG, WebP, MP4 and WebM only, maximum 25 MiB per upload. ASCII lowercase path names; no SVG, HTML, traversal or arbitrary object keys. MIME, extension and file signature are checked. Signature checks are not full codec validation, malware scanning or media transcoding. Upload bodies are bounded in memory; large films/multipart uploads require a separate implementation. Object creation uses R2 atomic If-None-Match: *; the mock tests do not verify Cloudflare's remote behavior.

## Configuration and permissions — still required

1. Confirm the existing R2 bucket NAME (not the binding name MEDIA_BUCKET), account ID and current Worker settings. No Cloudflare connection is available in this session. Before deploying, export/review existing bindings, routes and settings: Wrangler configuration becomes authoritative for bindings. Do not deploy over an unrelated Worker or use a new bucket.
2. Create GitHub environment cloudflare-media with required owner reviewers and main-only deployment restriction. Verify these protections are available on the repository plan before enabling deployment. Workflow is manual, main-only, after PR merge and owner approval; PR checks have no credentials and never deploy. Do not dispatch it now.
3. Environment secrets: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Variable: MEDIA_BUCKET_NAME, the exact existing bucket. Prefer an API token with Individual Worker Editor limited to long-resonance-69a2 and the correct account; do not grant account-wide admin, R2 object permissions, zone routes or bucket creation. If individual scope is unavailable, review the narrowest supported Worker deployment scope before proceeding. R2 access at runtime uses MEDIA_BUCKET, no S3 keys.
4. Generate two independent 32-byte random base64url credentials in a secure local environment. Store only their SHA-256 lowercase hex hashes as Cloudflare Worker secrets MEDIA_UPLOAD_TOKEN_SHA256 and MEDIA_READ_TOKEN_SHA256. Keep the actual credentials in a protected agent secret store; never in chat, site, repo, logs, command arguments or browser storage. Do not reuse the deployment token as an upload credential. Rotate by replacing the hash. Missing credentials fail closed.
5. Configure and verify request rate limits appropriate to the account/plan before enabling uploads at scale. Add per-agent identities/quotas and audit storage before multi-user operation; current credentials provide role separation, not per-user auditing. Automated agent uploads require an available execution secret store and are not yet connected.

## Validation

Run node --test cloudflare/media-worker/test.mjs. Seven Node tests use an in-memory R2 double, including denied writes, role separation, duplicate rejection, path/type/size checks, public byte-range reads and fail-closed configuration. MP4/WebM tests use signature fixtures, not playable video.

After configuration and approved deployment: upload a real small PNG under a fresh mhy-media/smoke/ key; fetch anonymously and compare SHA-256 to the source; verify authenticated listing, anonymous write denial and duplicate 409. Then upload a real playable small MP4, compare complete download hash, verify HEAD, a 206 byte range and playback on Android Chrome. Retain smoke files unless owner explicitly requests deletion. Record actual URLs/statuses only after success. No remote smoke test has run.

## Site integration pending

The current gallery can use returned HTTPS image URLs after smoke tests and approval. assets/content.js currently embeds YouTube for videos; direct R2 video support needs a reviewed renderer change and mobile verification in phase four. No automatic catalog publishing is implemented.

r2.dev is rate-limited and intended for development. Evaluate a custom media domain, caching, Workers request costs and traffic limits before production. No domain or production serving path has been approved.

Official references:
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- https://developers.cloudflare.com/r2/buckets/public-buckets/
- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
