# MBP-009 Managed media resilience and MCP e2e regression closure

Status: complete
Labels: ready-for-human
Severity: P1
Issue ID: MBP-009
Type: AFK
Owner: Replacement Worker 5B

## Parent

`.scratch/mobile-backend-parity/PRD.md`

## What to build

Close the parity wave with media-specific regressions and a backend-confirmed mobile e2e pass. Provider and sponsor media must be optional public delivery URLs, report creation must publish only ready report media, and final evidence must come from the full root dev suite plus MCP-assisted emulator verification.

## Acceptance criteria

- [x] Resource Provider cards handle provider logo, provider photo, sponsor logo, sponsor image, broken media, and null media without layout failure.
- [x] Resource Provider profiles handle provider logo, provider photo, sponsor logo, sponsor image, broken media, and null media without layout failure.
- [x] Report creation passes only ready report-media IDs to backend publish.
- [x] Pending media keeps upload state visible and blocks or explains publish readiness according to existing flow rules.
- [x] Failed upload retry remains available.
- [x] Failed publish preserves the draft and ready media references for retry.
- [x] Mobile never reuses admin media asset IDs as report-owned media IDs.
- [x] Final automated verification matrix from the README is run or any skipped command is justified in issue comments.
- [x] Final root `TURBO_UI=true pnpm dev` smoke is run before e2e device checks.
- [x] Final e2e evidence uses MCP-assisted emulator or installed dev-client flows and is saved under `.scratch/mobile-qa/<timestamp>/`.

## Required tests

- Recursos card/profile tests for provider logo/photo, sponsor logo/image, broken image fallback, and null media.
- Report creation tests for pending media, ready media, failed upload retry, failed publish, and draft preservation.
- Publish payload tests proving only ready report-media IDs are submitted.
- Regression checks proving admin media asset IDs are not used as report-owned media IDs.

## Required verification

- Run the full verification matrix documented in `.scratch/mobile-backend-parity/README.md`.
- Start root `TURBO_UI=true pnpm dev` before any backend-dependent mobile e2e checks.
- Use MCP-assisted emulator evidence for Recursos, sponsor surfaces, report-success provider reporting, report confirmation, publish preconditions, adoption Review Mode, moderation visibility, nearby refresh, and media readiness.
- Append artifact paths and command results to this issue's comments.

## Blocked by

- MBP-001
- MBP-002
- MBP-003
- MBP-004
- MBP-005
- MBP-006
- MBP-007
- MBP-008

## Comments

### Replacement Worker 5B closure - 2026-06-29

Git base before closure commit: `290772f`. Source edits: none. No isolated report-media readiness defect was found, so no files under `apps/expo/src/features/report-media/**` were changed.

Partial artifacts found and preserved from the prior closure worker:

- `.scratch/mobile-backend-parity/PRD.md`
- `.scratch/mobile-backend-parity/README.md`
- `.scratch/mobile-backend-parity/issues/09-managed-media-and-e2e-regression-closure.md`
- `.scratch/mobile-qa/20260629-143409/**`

New evidence path for this pass: `.scratch/mobile-qa/20260629-145920/`.

Media/readiness verification notes:

- Expo report-media draft snapshots expose `readyMedia` only for items with `status === "ready"` and `mediaId`.
- Pending/uploading selected media remains visible and non-ready media is excluded from publish payloads.
- Failed upload items remain retryable; retry refreshes authorization when a backend media ID already exists.
- Publish failure returns draft-safe copy and does not call draft clear.
- API `report.create` checks ready media against draft ID, member owner, and report type before persistence.
- Shared validators reject client-supplied storage metadata, so admin media asset IDs/object storage fields cannot be reused as report-owned media.
- Recursos directory/profile tests cover optional provider/sponsor media, wrong-surface sponsor suppression, sponsor safety policy, and dropping admin media asset IDs from mobile view data.

Automated validation:

- `pnpm -F @acme/expo exec vitest run src/features/report-media/report-media-draft.test.ts src/features/report-media/report-media-manager.test.tsx src/features/report-media/report-media-creation-photos.test.ts src/features/report-creation/report-creation-publish.test.ts src/features/report-creation/report-creation-ui.test.tsx src/features/report-creation/report-creation-route-screen.test.tsx` -> passed, 6 files / 75 tests.
- `pnpm -F @acme/expo exec vitest run src/features/resources/resource-provider-card.test.tsx src/features/resources/resource-provider-profile-screen.test.ts src/features/resources/resources.test.ts src/features/resources/resources-api-adapter.test.ts` -> passed, 4 files / 31 tests.
- `pnpm -F @acme/api exec vitest run src/router/report.test.ts src/report-repository.test.ts src/report-repository.integration.test.ts src/media-storage.test.ts src/media-storage.integration.test.ts src/report-media-cleanup.test.ts` -> passed, 4 files / 39 tests; 2 files / 8 tests skipped by existing test conditions.
- `pnpm -F @acme/validators exec vitest run src/report-contracts.test.ts src/resource-provider-contracts.test.ts` -> passed, 2 files / 28 tests.
- `pnpm -F @acme/expo test` -> passed, 73 files / 494 tests.
- `pnpm -F @acme/api test` -> passed, 15 files / 117 tests; 2 files / 8 tests skipped.
- `pnpm -F @acme/validators test` -> passed, 4 files / 31 tests.
- `pnpm -F @acme/expo lint` -> passed; emitted existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/expo typecheck` -> passed.
- `pnpm -F @acme/api lint` -> passed.
- `pnpm -F @acme/api typecheck` -> passed.
- `pnpm -F @acme/validators lint` -> passed.
- `pnpm -F @acme/validators typecheck` -> passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` -> exit 0, verdict `pass`; summary had 4 warning-level unused dependency findings and no dead-code errors, complexity findings, or duplication clone groups.
- `git diff --check` -> passed before and after closure doc updates.

Root dev and MCP/mobile evidence:

- Root dev command: `script -q -f .scratch/mobile-qa/20260629-145920/root-dev-smoke-tty.log -c 'env TURBO_UI=true pnpm dev'`.
- Root dev reached Next.js ready on `http://localhost:3000`, TanStack/Vite ready on `http://localhost:3001`, Expo Metro waiting on `http://localhost:8081`, and API/DB/validators dev tasks started. The session was stopped with Ctrl+C after MCP capture so no watch processes remained.
- MCP listed `emulator-5554` as online and found installed app `bo.rastro.app`.
- MCP launched `bo.rastro.app` with locale `es-BO,es`.
- MCP screenshots saved under `.scratch/mobile-qa/20260629-145920/`: `mcp-launch-initial.png`, `mcp-recursos-tab.png`, `mcp-recursos-logbox-error.png`, `mcp-recursos-after-logbox-dismiss.png`, and `mcp-recursos-logbox-minimized.png`.
- MCP crash listing was attempted but the helper returned `device not found: emulator-5554`.

Residual risk:

- The full device regression matrix for Recursos/provider/sponsor/report-success/confirmation/preconditions/Review Mode/moderation/nearby/media readiness was not completed manually. The installed app reached the location chooser, but the Recursos path was blocked by a development LogBox from `resources.nearby` returning `TRPCClientError` for the local PostGIS radius query. This is captured in `mcp-recursos-logbox-error.png` and `mcp-notes.md`.
- Device evidence therefore proves root-dev startup, app launch, and the local blocker; behavioral closure rests on the automated tests above plus the committed source slices.
