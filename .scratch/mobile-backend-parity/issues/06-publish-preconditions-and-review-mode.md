# MBP-006 Mobile publish UX reflects backend preconditions and Review Mode

Status: ready-for-human
Labels: ready-for-human
Severity: P0
Issue ID: MBP-006
Type: AFK
Owner: Unassigned

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Map backend publish outcomes into specific mobile states. Verified-email-required, suspended-member, validation, and Review Mode results should be visible to members without mobile reading admin-only routes.

## Acceptance criteria

- [x] Backend verified-email `PRECONDITION_FAILED` maps to actionable Spanish-first copy instructing the member to verify email before publishing.
- [x] Suspended-member publish precondition failures map to specific copy and preserve the draft.
- [x] Backend validation and media-readiness failures remain distinct from generic network failure where the error shape allows it.
- [x] Mobile does not call admin-only routes for public publish behavior.
- [x] Adoption publish success branches by returned status: active reports use public published copy, pending-review reports use Review Mode copy and do not claim the listing is already public.
- [x] Existing idempotency and duplicate-submit lock behavior remains intact.
- [x] Drafts are preserved on every backend, validation, media-readiness, or precondition failure.

## Required tests

- [x] Verified-email-required publish failure shows actionable copy and preserves draft.
- [x] Suspended-member precondition failure shows specific copy and preserves draft.
- [x] Validation/media-readiness failure remains distinct from generic network failure where available.
- [x] Adoption active success shows public success copy.
- [x] Adoption pending-review success shows under-review copy.
- [x] Mobile publish path does not rely on admin-only settings routes.

## Required verification

- Include verified-email-required, suspended-member, adoption active, and adoption pending-review cases in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

- MBP-005

## Comments

Implemented backend outcome mapping in the shared publish helper and wired adoption success copy to branch on returned backend status. Verified-email, suspended, validation, media-readiness, not-found, forbidden/auth, and generic backend failures preserve drafts; pending-review adoption success uses Review Mode copy and disables share.

Verification:

- `pnpm -F @acme/expo exec vitest run src/features/report-creation/report-creation-publish.test.ts src/features/report-creation/report-creation-ui.test.tsx src/features/report-creation/report-creation-route-screen.test.tsx src/features/lost-report-creation/lost-report-creation.test.ts src/features/lost-report-creation/lost-report-creation-screen.test.tsx src/features/found-report-creation/found-report-creation-screen.test.tsx src/features/sighting-report-creation/sighting-report-creation-screen.test.tsx src/features/adoption-listing-creation/adoption-listing-creation-screen.test.tsx --reporter dot` -> 8 files passed, 124 tests passed.
- `pnpm -F @acme/expo test -- report-creation` -> 73 files passed, 494 tests passed.
- `pnpm -F @acme/expo test -- adoption-listing` -> 73 files passed, 494 tests passed.
- `pnpm -F @acme/api test -- report` -> 15 files passed, 2 skipped; 117 tests passed, 8 skipped.
- `pnpm -F @acme/expo lint` -> passed; emitted existing baseline-browser-mapping age warning.
- `pnpm -F @acme/expo typecheck` -> passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` -> exit 0, verdict `warn`; introduced duplication warnings in confirmation-state blocks plus inherited unused dependency findings, no dead exports or complexity failures.
- `git diff --check` -> passed.
