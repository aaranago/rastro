# Add offline drafts, upload retry, caching, and performance/battery pass

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the v1 resilience and performance pass: preserve in-progress drafts, retry submissions/uploads, cache last-loaded content, and verify the app avoids battery-heavy behavior.

## Acceptance criteria

- [ ] In-progress pet/report/listing drafts survive connectivity drops and app backgrounding.
- [ ] Media uploads and report submissions can retry safely.
- [ ] Last-loaded lists/details are cached and clearly marked when stale/offline.
- [ ] List-heavy surfaces use virtualized rendering.
- [ ] Images are compressed before upload and do not block the UI unnecessarily.
- [ ] The app avoids continuous GPS polling and always-on sockets.
- [ ] Background location is used only when the member explicitly enables moving alerts.
- [ ] A short performance/battery checklist is added for iOS and Android verification.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/15-add-dynamic-alert-area-and-lost-pet-push-alerts.md`
- `.scratch/rastro-v1/issues/16-add-report-linked-in-app-chat-and-whatsapp-contact-options.md`

## Context

This slice should enforce the PRD's "do not build a sluggish battery-draining app" constraint.
