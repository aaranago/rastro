# Add offline drafts, upload retry, caching, and performance/battery pass

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the v1 resilience and performance pass: preserve in-progress drafts, retry submissions/uploads, cache last-loaded content, and verify the app avoids battery-heavy behavior.

## Acceptance criteria

- [x] In-progress pet/report/listing drafts survive connectivity drops and app backgrounding.
- [x] Media uploads and report submissions can retry safely.
- [x] Last-loaded lists/details are cached and clearly marked when stale/offline.
- [x] List-heavy surfaces use virtualized rendering.
- [x] Images are compressed before upload and do not block the UI unnecessarily.
- [x] The app avoids continuous GPS polling and always-on sockets.
- [x] Background location is used only when the member explicitly enables moving alerts.
- [x] A short performance/battery checklist is added for iOS and Android verification.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/15-add-dynamic-alert-area-and-lost-pet-push-alerts.md`
- `.scratch/rastro-v1/issues/16-add-report-linked-in-app-chat-and-whatsapp-contact-options.md`

## Context

This slice should enforce the PRD's "do not build a sluggish battery-draining app" constraint.

## Verification notes

- `pnpm -F @acme/expo format`
- `pnpm -F @acme/expo lint`
- `pnpm -F @acme/expo typecheck`
- `pnpm -F @acme/expo test` (29 files, 138 tests)
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`

Fallow verdict: pass. Remaining findings were inherited from `HEAD`: three unused exports, two private type leaks, one `pg` dependency placement issue, and two complexity findings.
