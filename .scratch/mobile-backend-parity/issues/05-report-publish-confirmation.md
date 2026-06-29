# MBP-005 Report creation confirms before backend publish

Status: ready-for-human
Labels: ready-for-human
Severity: P0
Issue ID: MBP-005
Type: AFK
Owner: Unassigned

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Add a final confirmation sheet or modal before any lost, found, sighting, or adoption report is created through the backend. The confirmation should reduce wrong report submissions without weakening backend validation, idempotency, upload readiness, or draft retry behavior.

## Acceptance criteria

- [x] Every report creation flow shows a final confirmation sheet or modal before backend publish.
- [x] Confirmation summarizes report type, intended public or review-pending status, Approximate Location or zone precision, pet or animal summary, event time or seen/lost/found context, media readiness, contact visibility, and preferred contact path.
- [x] Confirmation copy clearly says the action creates a public or review-pending report.
- [x] Primary action is explicit, for example `Confirmar y publicar`.
- [x] Secondary action returns to editing without losing values.
- [x] Confirm sends exactly one backend publish request.
- [x] Duplicate taps after confirmation still result in one backend request.
- [x] Cancel sends no backend request.
- [x] Drafts are cleared only after backend-confirmed success.
- [x] Failed backend publish preserves draft values and allows the confirmation to be reopened.

## Required tests

- [x] Confirmation appears before publish for lost, found, sighting, and adoption flows.
- [x] Cancel preserves values and sends no request.
- [x] Confirm sends one request.
- [x] Double-tap confirm sends one request.
- [x] Failed publish preserves draft values and supports retry.
- [x] Draft clear happens only after backend-confirmed success.

## Required verification

- Include confirm, cancel, duplicate confirm tap, and failed publish retry in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

None - can start immediately.

## Comments

Implemented a shared publish confirmation modal and wired lost, found, sighting, and adoption flows so the review publish action opens confirmation first. `Confirmar y publicar` is the only path that calls backend publish; cancel returns to editing, duplicate confirm taps remain locked, and drafts clear only after backend-confirmed success.

Verification:

- `pnpm -F @acme/expo exec vitest run src/features/report-creation/report-creation-publish.test.ts src/features/report-creation/report-creation-ui.test.tsx src/features/report-creation/report-creation-route-screen.test.tsx src/features/lost-report-creation/lost-report-creation.test.ts src/features/lost-report-creation/lost-report-creation-screen.test.tsx src/features/found-report-creation/found-report-creation-screen.test.tsx src/features/sighting-report-creation/sighting-report-creation-screen.test.tsx src/features/adoption-listing-creation/adoption-listing-creation-screen.test.tsx --reporter dot` -> 8 files passed, 124 tests passed.
- `pnpm -F @acme/expo test -- report-creation` -> 73 files passed, 494 tests passed.
- `pnpm -F @acme/expo test -- adoption-listing` -> 73 files passed, 494 tests passed.
- `pnpm -F @acme/api test -- report` -> 15 files passed, 2 skipped; 117 tests passed, 8 skipped.
- `pnpm -F @acme/expo lint` -> passed; emitted existing baseline-browser-mapping age warning.
- `pnpm -F @acme/expo typecheck` -> passed.
- `git diff --check` -> passed.
