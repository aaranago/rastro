# MBP-001 Resource Provider directory renders backend public summaries

Status: ready-for-human
Labels: ready-for-human
Severity: P1
Issue ID: MBP-001
Type: AFK
Owner: Unassigned

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Make the Recursos directory a production API-backed Resource Provider surface. Directory cards should render the public summary fields returned by backend nearby search, stay resilient when optional fields are absent, and never expose private or exact coordinates.

## Acceptance criteria

- [x] Directory search uses the backend Resource Provider nearby contract for production paths.
- [x] Cards display provider name, category, description, Approximate Location label, distance where returned, service area, contact labels, verified badge, open-now badge, emergency badge, and optional provider logo or photo.
- [x] Missing logo, photo, distance, service area, open state, emergency state, or contact options do not collapse the card layout.
- [x] Loading, no-results, backend error, and offline-ish failure states use Spanish-first Bolivia copy and remain usable on small screens.
- [x] Map or radius mode, if present, uses only public Approximate Location data and never displays private or exact coordinates.
- [x] Static fixtures remain test or fallback boundaries, not the production data source.

## Required tests

- Resource Provider directory adapter tests for backend summary mapping.
- Recursos screen/card tests for optional media, missing fields, long provider names, many contact options, loading, empty, and error states.
- Privacy regression test proving exact coordinates are absent from rendered card output and public mobile test data.

## Required verification

- Include this slice in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

None - can start immediately.

## Comments

### Worker 1 verification - 2026-06-29

Git base: `6d18b78`. Owned Recursos files changed under `apps/expo/src/features/resources/**`.

Implemented: `ResourcesScreen` now defaults to the API-backed Resource Provider adapter; directory cards render service area and sponsor disclosure; contact overflow is compact; public mobile view data strips exact coordinates and admin media asset IDs; static fixtures remain explicit fallback/test adapters.

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
