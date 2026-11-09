# Library restoration — phase 1 review

Base: `a39f864`. Branch: `mhy-library-restore-phase1-20261109`.

- Ten illustrated SVG category covers recreated from the owner's reference screenshots, with numbers and Arabic/English labels. Existing studio advertisements and promotional videos retain their stored categories and their old fragment routes; both remain accessible through the sixth, trailers/advertisements section.
- Reuse the existing `assets/library-index.js` work identities and explicit item mappings. Record IDs, URLs and remote UUID relationships are retained. The six pending draft images in the old index are deliberately not imported into the public catalog.
- Restore work cross-section navigation and season/episode labels, work/title/alias search, catalog-order latest entries (dates are never fabricated), and opt-in playback resumption for original video files. Withdrawal clears only playback preference/position data. YouTube playback positions are not collected.
- Four navigation controls and breadcrumbs. Scroll positions survive reloads in the same tab via sessionStorage; browser Back remains native. Physical Android QA remains outstanding.
- Homepage collection links point to the restored library. All old collection pages, content data, backend/admin files, workflows for production deployment, and engagement files/settings are preserved.

## Validation

`node --test media-library/restore.test.mjs`: 10 tests. Covers exact legacy ID/URL retention, explicit work aliases, remote UUID relationships, draft/ancestry filtering, ten covers, Arabic search, playback consent/expiry, latest ordering and homepage links.

Existing platform/security/engagement suite: 31 tests; public gateway suite: 4 tests. No live writes or Cloudflare deployments are required by these tests.

A branch-only GitHub Actions workflow runs these checks and verifies that backend/admin files have not changed relative to the approved base. No deployment job is added.

## Preview boundaries

A separate owner-private static preview uses a read-only snapshot of the published public catalog. This avoids changing the existing gateway's origin policy. It contains no administration page or backend credentials. Production source continues to use the original live public gateway after a separately approved merge.

Remaining outside phase 1: activating engagement, assigning unattributed legacy images to particular works, uploading a new real video, real playback/Android verification, and production approval. Neither main nor Cloudflare storage/security settings may be changed by this phase.

## Continuation validation

- Library-home actions now clear a search query before showing the ten section cards.
- Withdrawing playback consent immediately removes all visible resume buttons; even an obsolete button reference cannot resume after consent is withdrawn.
- Eight additional in-memory DOM integration tests execute the actual frontend module: ten covers, global alias search, library-home search reset, cross-section/episode rendering, catalog-failure recovery, existing UUID empty-work search, consent withdrawal, and fragment/reload scroll persistence. These are simulated DOM tests, not physical Android or real video playback tests.
- Total automated checks: 18 restoration/interface tests plus the existing 35 platform/security/gateway tests = 53.
