# MBP-004 Report-success provider reporting uses backend moderation

Status: ready-for-human
Labels: ready-for-human
Severity: P1
Issue ID: MBP-004
Type: AFK
Owner: Unassigned

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Make provider reporting from the report-success resource recommendation surface use the same backend-confirmed Resource Provider moderation mutation as provider profiles. The report-success sponsor display must also honor the report-success sponsor surface policy.

## Acceptance criteria

- [x] Report-success Resource Provider recommendations use the API-backed provider report mutation, not a static resources adapter.
- [x] Report-success sponsor placement renders only when eligible for the report-success surface selected for that screen.
- [x] Created and already-reported moderation receipts produce distinct Spanish-first UI copy.
- [x] Auth, suspension, validation, not-found, and backend failure states are surfaced as backend-confirmed outcomes.
- [x] API rejection is never faked as provider-report success.
- [x] Report-success provider reporting does not expose admin media asset IDs or private provider fields.

## Required tests

- [x] Report-success provider report calls the API-backed mutation.
- [x] Created and already-reported receipts map to distinct UI states.
- [x] Auth, validation, not-found, suspension, and backend failure states do not show success.
- [x] Wrong-surface sponsor placement is suppressed on report-success recommendations.
- [x] Correct report-success sponsor placement displays label, disclosure, and optional media.

## Required verification

- Include report-success provider reporting in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

- MBP-003

## Comments

Implemented in the mobile report-success slice. Route glue now creates the API resources adapter and sponsor report actions require a backend receipt; success sponsor placement is filtered by `report_success`, copies only public fields, and exposes distinct created/already-reported/auth/suspended/validation/not-found/backend copy.

Verification:

- `pnpm -F @acme/expo exec vitest run src/features/report-creation/report-creation-publish.test.ts src/features/report-creation/report-creation-ui.test.tsx src/features/report-creation/report-creation-route-screen.test.tsx src/features/lost-report-creation/lost-report-creation.test.ts src/features/lost-report-creation/lost-report-creation-screen.test.tsx src/features/found-report-creation/found-report-creation-screen.test.tsx src/features/sighting-report-creation/sighting-report-creation-screen.test.tsx src/features/adoption-listing-creation/adoption-listing-creation-screen.test.tsx --reporter dot` -> 8 files passed, 124 tests passed.
- `pnpm -F @acme/expo test -- report-creation` -> 73 files passed, 494 tests passed.
- `pnpm -F @acme/expo lint` -> passed; emitted existing baseline-browser-mapping age warning.
- `pnpm -F @acme/expo typecheck` -> passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` -> exit 0, verdict `warn`; introduced duplication warnings in confirmation-state blocks plus inherited unused dependency findings, no dead exports or complexity failures.
