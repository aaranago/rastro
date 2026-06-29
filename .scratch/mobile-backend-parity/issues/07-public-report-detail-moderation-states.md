# MBP-007 Public report detail honors moderation visibility states

Status: complete
Labels: ready-for-human
Severity: P1
Issue ID: MBP-007
Type: AFK
Owner: Worker 3

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Make public report detail screens treat backend public visibility as authoritative. Hidden, false-marked, deleted, unavailable, and non-owner pending-review reports should not be shown as normal public reports, and the mobile copy should avoid presenting moderation outcomes as random network failures.

## Acceptance criteria

- [x] Public detail `NOT_FOUND` or unavailable responses produce a clear unavailable, removed, or under-review state where the API shape allows it.
- [x] Generic network failures still show retry/error UI instead of unavailable moderation copy.
- [x] Non-owner pending-review report detail is unavailable publicly.
- [x] Owner-facing pending-review detail copy explains that the report is under review when the backend allows the owner to see it.
- [x] Hidden and false-marked reports are not rendered from stale local detail data after backend exclusion.
- [x] API regression coverage exists for false-marked public report exclusion if missing.
- [x] Exact Location remains private unless an existing public contract explicitly allows precise sharing.

## Required tests

- Hidden detail is unavailable or removed.
- False-marked detail is unavailable or removed.
- Deleted or unavailable detail is not shown as a normal report.
- Non-owner pending-review detail is unavailable.
- Owner pending-review detail shows under-review copy.
- Generic backend/network failure still shows retry/error path.
- API regression test for `falseReportedAt` public exclusion exists or is added.

## Required verification

- Include public detail hidden, false-marked, pending-review, and generic backend failure cases in the final MCP-assisted emulator pass from `.scratch/mobile-backend-parity/README.md`.
- Final device evidence must be collected while root `TURBO_UI=true pnpm dev` is running.

## Blocked by

None - can start immediately.

## Comments

- 2026-06-29 Worker 3: Implemented public detail moderation/error states in the shared public report detail screen. `NOT_FOUND`/unavailable detail responses now render Spanish unavailable copy instead of the legacy public-page fallback, generic failures render retry UI, and each fetch resets to loading before resolution so a successful old detail is not stale-rendered after backend exclusion. Owner-visible `pending_review` details now show `En revisión`/`Reporte en revisión` copy, while non-owner pending review remains backend `NOT_FOUND`. Public detail route wrappers now use the shared detail screen failure states directly. API regressions cover `falseReportedAt` detail exclusion, deleted detail exclusion, nearby false-marked omission, and repository public visibility SQL including `"falseReportedAt" is null`. Exact location privacy remains unchanged and covered by the existing public detail tests; approximate display remains the default.
- Verification:
  - Git base: `2f30c9f`.
  - Changed owned files: `apps/expo/src/features/reports/public-report-detail.ts`, `apps/expo/src/features/reports/public-report-detail-screen.tsx`, `apps/expo/src/features/reports/public-report-detail.test.ts`, `apps/expo/src/features/reports/public-report-detail-screen.test.tsx`, relevant public detail route wrappers, `packages/api/src/router/report.test.ts`, `packages/api/src/report-repository.test.ts`, and this issue file.
  - `pnpm -F @acme/expo test -- public-report-detail` -> failed because the package script passed a literal `--` to Vitest and also loaded the broader Expo test set; 68 files passed, 5 unrelated files failed with 12 failures in report-creation/resources tests outside this owned slice.
  - `pnpm -F @acme/expo test public-report-detail` -> passed, 3 files and 18 tests.
  - `pnpm -F @acme/expo exec vitest run src/features/reports/public-report-detail.test.ts src/features/reports/public-report-detail-screen.test.tsx src/features/reports/public-report-detail-routes.test.tsx` -> passed, 3 files and 18 tests.
  - `pnpm -F @acme/api test -- report` -> passed, 15 files passed, 2 skipped; 117 tests passed, 8 skipped.
  - `pnpm -F @acme/expo typecheck` -> passed.
  - `pnpm -F @acme/expo lint` -> passed.
  - `pnpm -F @acme/expo exec eslint --flag unstable_native_nodejs_ts_config src/features/reports/public-report-detail.ts src/features/reports/public-report-detail-screen.tsx src/features/reports/public-report-detail.test.ts src/features/reports/public-report-detail-screen.test.tsx src/features/reports/public-report-detail-routes.test.tsx 'src/app/(tabs)/(nearby)/reportes/perdidos/[reportId].tsx' 'src/app/(tabs)/(nearby)/reportes/encontrados/[reportId].tsx' 'src/app/(tabs)/(nearby)/reportes/avistamientos/[reportId].tsx' 'src/app/(tabs)/(nearby)/adopciones/[listingId].tsx'` -> passed.
  - `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` -> ran; verdict `fail` because the working tree has 43 changed files from parallel slices, with introduced findings in report-creation/resources files outside this owned slice.
  - `git diff --check` -> passed.
  - Final MCP-assisted emulator evidence from `.scratch/mobile-backend-parity/README.md` was not run in this worker slice and remains for the coordinated parity closeout while root `TURBO_UI=true pnpm dev` is running.
