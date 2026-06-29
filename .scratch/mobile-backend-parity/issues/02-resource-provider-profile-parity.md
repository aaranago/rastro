# MBP-002 Resource Provider profiles render backend public detail

Status: ready-for-human
Labels: ready-for-human
Severity: P1
Issue ID: MBP-002
Type: AFK
Owner: Unassigned

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Make Resource Provider profiles reflect the backend public detail contract end to end. Profiles should present service, contact, media, and trust information in a production mobile layout while preserving public/private field boundaries.

## Acceptance criteria

- [x] Profiles use the backend Resource Provider detail contract for production paths.
- [x] Profile UI displays logo or photo when present, name, category, short description, full service area, hours, Approximate Location label, verified badge, open/emergency state, primary contact actions, website link, social links, external links, and report action where returned.
- [x] Optional media, optional links, missing hours, and missing contact values do not break layout or produce empty actions.
- [x] Public profile UI does not expose private addresses, exact coordinates, admin-only notes, or sponsor date-window details unless a public contract explicitly returns them.
- [x] Backend `NOT_FOUND` or unavailable provider detail produces a clear Spanish-first unavailable state.
- [x] Long provider names and many contact actions fit on small screens without overlap.

## Required tests

- Resource Provider profile adapter tests for backend detail mapping.
- Profile component/screen tests for optional media, contact actions, website/social/external links, unavailable detail, long names, and missing fields.
- Privacy regression test proving private/exact provider coordinates are absent from rendered profile output.

## Required verification

- Include this slice in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

None - can start immediately.

## Comments

### Worker 1 verification - 2026-06-29

Git base: `6d18b78`. Owned Recursos files changed under `apps/expo/src/features/resources/**`.

Implemented: `ResourceProviderProfileScreen` now defaults to the API-backed detail adapter; profile view-model filters empty contact actions, tolerates missing hours, suppresses wrong-surface sponsors, keeps sponsor separate from verification, and whitelists public sponsor delivery URLs only.

Commands:

- `pnpm -F @acme/expo exec vitest run src/features/resources/resource-provider-card.test.tsx src/features/resources/resources.test.ts src/features/resources/resources-api-adapter.test.ts src/features/resources/resource-provider-profile-screen.test.ts src/features/resources/resource-provider-search.test.ts` - passed, 5 files / 36 tests.
- `pnpm -F @acme/api test -- resources` - passed, 15 files passed / 2 skipped, 117 tests passed / 8 skipped.
- `pnpm -F @acme/validators test -- resource-provider` - passed, 4 files / 31 tests.
- `pnpm -F @acme/expo lint` - passed; printed existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/expo typecheck` - passed.
- `pnpm -F @acme/expo exec prettier --check ...resources touched files...` - passed.
- `pnpm -F @acme/expo test -- resources` - failed only in unrelated report/adoption/sighting creation tests outside Worker 1 ownership; Recursos tests in that run passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` - verdict fail due introduced findings in report-creation/adoption/sighting files outside Worker 1 ownership; owned Recursos findings were inherited only.
- `git diff --check` - passed.

Root `TURBO_UI=true pnpm dev` plus MCP-assisted emulator evidence was not run by this worker; left for the coordinated final mobile parity pass because other workers are editing backend-dependent flows in parallel.
