# MBP-008 Nearby refresh drops moderated or unavailable reports

Status: complete
Labels: ready-for-human
Severity: P1
Issue ID: MBP-008
Type: AFK
Owner: Worker 4

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Ensure nearby discovery treats backend omission as authoritative. Hidden, false-marked, deleted, unavailable, and non-owner pending-review reports must be removed from the visible nearby list after refresh instead of being resurrected from cache or fixture fallback behavior.

## Acceptance criteria

- [x] Nearby refresh replaces visible results with backend-visible results instead of preserving omitted moderated records.
- [x] Hidden reports disappear from nearby after backend refresh.
- [x] False-marked reports disappear from nearby after backend refresh.
- [x] Deleted or unavailable reports disappear from nearby after backend refresh.
- [x] Non-owner pending-review reports do not appear in public nearby results.
- [x] Owner-facing pending-review report copy is available from the relevant owner surface where applicable. Not applicable inside Expo Nearby; this slice preserves public-nearby absence and does not edit Worker 3 owner detail files.
- [x] Offline-ish or generic backend failure does not silently purge all visible data without user-facing error or retry copy.
- [x] Static or stale cache adapters cannot reintroduce records that the backend has excluded during a successful refresh.

## Required tests

- Hidden report omitted by backend is removed from nearby UI.
- False-marked report omitted by backend is removed from nearby UI.
- Deleted/unavailable report omitted by backend is removed from nearby UI.
- Non-owner pending-review report is absent from public nearby results.
- Generic backend failure still shows retry/error behavior and does not fake moderation success.
- Stale cache behavior is covered so successful refresh omission wins over stale cards.

## Required verification

- Include nearby refresh removal cases in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

- None. This slice consumes the MBP-007 backend visibility contract for public nearby omission.

## Comments

- 2026-06-29 Worker 4: Implemented Expo Nearby cache discipline in `createCachedNearbyLostReportsAdapter`. Successful backend refresh now wins before any stale cache fallback, cache-write failure cannot return older excluded cards, and the adapter keeps the latest successful result by cache key for later offline fallback. Added nearby tests for hidden, false-marked, deleted, unavailable, non-owner pending-review omission, successful empty refresh, generic backend failure retry behavior, and stale cache/write-failure behavior. Final MCP-assisted emulator evidence from `.scratch/mobile-backend-parity/README.md` was not run in this worker slice and remains for the overall parity closeout while root `TURBO_UI=true pnpm dev` is running.
- Verification:
  - `pnpm -F @acme/expo test -- nearby` -> failed in unrelated `src/features/resources/resource-provider-profile-screen.test.ts` setup (`__DEV__ is not defined` / missing `TurboModuleRegistry` mock) after 71 suites and 460 tests passed.
  - `pnpm -F @acme/expo exec vitest run src/features/nearby/nearby-lost-reports.test.ts src/features/nearby/nearby-route.test.tsx src/features/nearby/nearby-location-adapter.test.ts` -> passed, 3 files and 26 tests.
  - `pnpm -F @acme/expo lint` -> failed in unrelated `apps/expo/src/features/resources/resources-view-model.ts:378:7` (`@typescript-eslint/no-unnecessary-condition`).
  - `pnpm -F @acme/expo exec eslint --flag unstable_native_nodejs_ts_config src/features/nearby/nearby-stale-cache-adapter.ts src/features/nearby/nearby-lost-reports.test.ts` -> passed.
  - `pnpm -F @acme/expo typecheck` -> failed in unrelated Worker-3-owned `src/features/reports/public-report-detail-screen.test.tsx:243:3` (`ownerNotice` allows `undefined`).
  - `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` -> ran; audit verdict `fail` with findings in report-creation, public-report-detail, and resources files, not the touched Nearby files.
  - `git diff --check` -> passed.
