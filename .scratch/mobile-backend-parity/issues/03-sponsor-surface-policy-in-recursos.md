# MBP-003 Local Sponsor Placement surface policy in Recursos

Status: ready-for-human
Labels: ready-for-human
Severity: P1
Issue ID: MBP-003
Type: AFK
Owner: Unassigned

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Render Patrocinios only when a Local Sponsor Placement is eligible for the current mobile surface. Directory and profile sponsor treatment must be driven by the backend `eligibleSurfaces` policy and must not imply verification, recovery priority, ranking, or push eligibility.

## Acceptance criteria

- [x] A shared sponsor-surface helper determines whether a placement is eligible for a named mobile surface.
- [x] Directory cards show sponsor placement only when the placement is eligible for the Recursos directory surface.
- [x] Provider profiles show sponsor placement only when the placement is eligible for the provider detail surface.
- [x] Correct-surface sponsor UI shows label, disclosure, optional logo, and optional image.
- [x] Wrong-surface sponsor placements are fully suppressed in directory and profile UI.
- [x] Sponsor display remains separate from Verification Badge state.
- [x] Sponsor safety policy is preserved in the mobile model: sponsorship cannot affect Recovery Priority and is not eligible for push notifications.
- [x] Sponsor media URLs are treated as optional public delivery URLs; mobile does not depend on admin media asset IDs.

## Required tests

- Wrong-surface sponsor suppressed on directory cards.
- Wrong-surface sponsor suppressed on provider profiles.
- Correct-surface sponsor shows label, disclosure, logo, and image when present.
- Sponsor does not set verification and does not alter ranking, recovery priority, or push eligibility model values.
- Missing sponsor logo or image renders without layout failure.

## Required verification

- Include directory and profile sponsor cases in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

None - MBP-001 and MBP-002 were completed by Worker 1 in this slice.

## Comments

### Worker 1 verification - 2026-06-29

Git base: `6d18b78`. Owned Recursos files changed under `apps/expo/src/features/resources/**`.

Implemented: added `sponsor-surface-policy.ts`; directory uses `resources_directory`, profiles use `provider_details`; wrong-surface sponsors are suppressed; sponsor safety policy remains explicit and separate from verification; sponsor cloning whitelists public `logoUrl`/`imageUrl` and drops admin asset IDs.

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
