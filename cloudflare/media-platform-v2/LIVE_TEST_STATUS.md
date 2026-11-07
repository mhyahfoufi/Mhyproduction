# Live R2 verification status — 2026-11-07

Owner-confirmed facts: MEDIA_BUCKET -> mhyproductiomhyproduction-median-media, Production; Public Access Enabled; a managed public development URL exists; no custom domain; no CORS policy. Accept these facts without requesting more screenshots of the same settings. The URL was withheld and is not needed to establish that this bucket is public.

Source audit at main commit a2cfa424cc95b4f41d40d813ce5d83a53ffb7cc5: fetched 41 frontend HTML/JS/CSS/JSON files (excluding test files and large queued base64 image manifests). Found zero literal HTTPS/HTTP r2.dev object URLs in those files; all reads succeeded. This is not an inventory of all bucket objects, deployed production responses, external shares or concatenated runtime URLs. It does not prove the public endpoint can safely be disabled.

Public access to an entire bucket is incompatible with storing plaintext confidential drafts in it. Moving a file to an unlisted prefix, setting draft in catalog JSON, hiding a URL or adding CORS does not provide object authorization. The legacy Worker also exposes mhy-media/ public reads, so tightening only the new administrative Worker does not close existing direct access paths.

Safe default: leave all existing public bucket settings, objects and URLs intact. Keep PRIVATE_BUCKET_CONFIRMED=false and all live administration/upload gates closed. Prepare separate private storage for new private originals/metadata, subject to owner approval; this is not permission to create a new resource. An approved trial Worker would use MEDIA_BUCKET bound to the private bucket, validate Access assertions/MFA for administration, and serve only published media anonymously. No data migration or deletion is proposed in this phase.

No authenticated Cloudflare account session is available. No Access application, bucket, permissions, CORS or Worker route was changed. No actual file was uploaded, replaced or deleted. Live image/video upload+download hash checks and playback remain NOT RUN. Obtain authenticated account access through a supported secure login, never pasted passwords or API tokens.

Next decision: approve or reject the concrete proposal PRIVATE_STORAGE_PROPOSAL.json. After approval, actual availability, bindings and platform limits must be verified before resource creation and a separately scoped trial deployment. The official website and main remain untouched.

Primary references:
https://developers.cloudflare.com/r2/buckets/public-buckets/
https://developers.cloudflare.com/r2/buckets/cors/
