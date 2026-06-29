# Mobile backend parity coordination

## Current closure status

Status: closed with documented device-environment residual risk.

Implemented commits:

- `5f02634e` - Complete resource provider parity: MBP-001, MBP-002, MBP-003.
- `290772f7` - Confirm report publish with backend outcomes: MBP-004, MBP-005, MBP-006.
- `6d18b78` - Handle public report moderation states: MBP-007.
- `2f30c9f0` - Enforce nearby moderation cache discipline: MBP-008.
- Replacement Worker 5B closure commit - MBP-009 docs and evidence only.

Final evidence path: `.scratch/mobile-qa/20260629-145920/`.

Closure summary:

- MBP-001 through MBP-008 are implemented in the commits above with their issue comments preserved.
- MBP-009 found no isolated report-media source defect. Media readiness, retry, failed publish preservation, admin-media separation, and provider/sponsor media resilience are covered by focused and full automated validation.
- Root `TURBO_UI=true pnpm dev` was run in a recorded TTY and reached Next.js, TanStack/Vite, Expo Metro, API, DB, and validators startup.
- MCP/mobile evidence launched `bo.rastro.app` on `emulator-5554`, captured app screenshots, and documented a local `resources.nearby` `TRPCClientError` LogBox that blocked the full manual device regression.
- Do not overclaim full manual e2e coverage from this pass; the remaining risk is the local device/backend data path captured in `.scratch/mobile-qa/20260629-145920/mcp-notes.md`.

This README is for the coordination agent running the mobile backend parity wave. The local issues live under `.scratch/mobile-backend-parity/issues/` and should be implemented in dependency order unless the coordinator explicitly assigns disjoint paths.

## Non-negotiable verification

- Always launch the full suite from the repo root with `TURBO_UI=true pnpm dev` for backend-dependent mobile checks. This is the required root `pnpm dev` path.
- Do not use an Expo-only dev command for final verification of auth, uploads, report publishing, share, view-report, provider reporting, moderation visibility, or media readiness.
- Final e2e passes must use MCP-assisted device evidence with a deployed emulator or installed development client. Use `mcp__mobile_mcp` for device listing, launch, screenshots, and saved artifacts. Use `mcp__expo` where available for Expo-side evidence such as deployed build or TestFlight feedback context.
- Save screenshots, UI hierarchy dumps where useful, logs, and notes under `.scratch/mobile-qa/<timestamp>/`.
- Keep tests out of `apps/expo/src/app/**`; Expo Router route-tree contamination has been a known failure mode.

## Coordinator flow

1. Baseline agent:
   - Run `git status --short`.
   - Read `CONTEXT.md`, relevant ADRs, this PRD, all MBP issues, and current source contracts.
   - Record any dirty files as user or prior-agent work unless proven otherwise.

2. Explorer agents:
   - Backend/API/admin explorer: inspect validators, resource/report/admin routers, repositories, admin settings, moderation, and media contracts. No edits.
   - Expo resources explorer: inspect Recursos directory/profile/provider-report paths. No edits.
   - Expo report/moderation explorer: inspect report creation, adoption creation, nearby, and public detail paths. No edits.

3. Synthesis agent:
   - Merge explorer findings into an implementation order.
   - Confirm issue dependencies still make sense.
   - Assign path ownership so one worker does not rewrite another worker's files.
   - Flag any human decisions before implementation starts.

4. Implementation agents:
   - Work one issue at a time.
   - Keep changes scoped to the issue's acceptance criteria.
   - Add focused tests before or with behavior changes.
   - Update the issue comment section with commands run, notable failures, screenshots, and final status.

5. Verification agent:
   - Run focused package tests after each slice.
   - Run the final verification matrix after the dependent slices land.
   - Run root `TURBO_UI=true pnpm dev` before MCP-assisted emulator e2e checks.
   - Use `mcp__mobile_mcp` to launch the deployed emulator app or installed dev client, capture screenshots, and prove the backend-backed flows.

## Suggested parallelism

- MBP-001, MBP-002, and MBP-003 all touch Recursos and should be sequential or coordinated by one owner.
- MBP-005 and MBP-006 touch report creation and adoption publish state; run them sequentially.
- MBP-007 and MBP-008 touch public report visibility and nearby cache behavior; run them sequentially unless the synthesis agent assigns a shared status contract first.
- MBP-004 touches report-success provider reporting and should wait for MBP-003's sponsor surface helper.
- MBP-009 is the closure pass and should run after MBP-001 through MBP-008.

## Final verification matrix

Run these from the repo root unless the command itself scopes a package:

```bash
pnpm -F @acme/expo test
pnpm -F @acme/api test
pnpm -F @acme/validators test
pnpm -F @acme/expo lint && pnpm -F @acme/expo typecheck
pnpm -F @acme/api lint && pnpm -F @acme/api typecheck
pnpm -F @acme/validators lint && pnpm -F @acme/validators typecheck
pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true
TURBO_UI=true pnpm dev
git diff --check
git status --short
```

The `TURBO_UI=true pnpm dev` process should remain running while the MCP-assisted emulator pass is performed.

### Final matrix result - Replacement Worker 5B, 2026-06-29

Artifacts are under `.scratch/mobile-qa/20260629-145920/`.

- `pnpm -F @acme/expo test` -> passed, 73 files / 494 tests.
- `pnpm -F @acme/api test` -> passed, 15 files / 117 tests; 2 files / 8 tests skipped.
- `pnpm -F @acme/validators test` -> passed, 4 files / 31 tests.
- `pnpm -F @acme/expo lint` -> passed; existing `baseline-browser-mapping` freshness warning only.
- `pnpm -F @acme/expo typecheck` -> passed.
- `pnpm -F @acme/api lint` -> passed.
- `pnpm -F @acme/api typecheck` -> passed.
- `pnpm -F @acme/validators lint` -> passed.
- `pnpm -F @acme/validators typecheck` -> passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` -> exit 0, verdict `pass`; 4 warning-level unused dependency findings, no dead-code errors, complexity findings, or duplication clone groups.
- `git diff --check` -> passed before and after closure doc edits.
- `TURBO_UI=true pnpm dev` -> run through `script -q -f .scratch/mobile-qa/20260629-145920/root-dev-smoke-tty.log -c 'env TURBO_UI=true pnpm dev'`; reached Next.js ready on `:3000`, TanStack/Vite ready on `:3001`, Expo Metro waiting on `:8081`, and API/DB/validators dev tasks started. Stopped with Ctrl+C after MCP capture.

Focused MBP-009 checks:

- Report-media and report-creation focused tests -> passed, 6 files / 75 tests.
- Recursos provider/sponsor media focused tests -> passed, 4 files / 31 tests.
- API media/report focused tests -> passed, 4 files / 39 tests; 2 files / 8 tests skipped.
- Validator contract focused tests -> passed, 2 files / 28 tests.

## MCP-assisted emulator e2e pass

Use a deployed emulator or installed dev client. The coordinator may use the exact package name from the current Expo config or installed app list.

Minimum device evidence:

- List available devices with `mcp__mobile_mcp`.
- Launch the app on the emulator with `mcp__mobile_mcp`.
- Capture before/after screenshots for each tested flow.
- Store artifacts in `.scratch/mobile-qa/<timestamp>/`.

Minimum flows:

- Recursos directory loads backend Resource Provider summaries, shows optional public media, and keeps exact coordinates private.
- Resource Provider profile loads backend detail, contact actions, hours, external links, and report action.
- Sponsor placements render on eligible surfaces and are suppressed on wrong surfaces.
- Report-success provider report uses the backend mutation for created, already-reported, auth, validation, and backend failure states.
- Report creation confirmation supports cancel, confirm, duplicate confirm tap, backend failure, and draft preservation.
- Verified-email-required and suspended-member publish failures show actionable Spanish-first copy.
- Adoption Review Mode success shows pending-review copy instead of public-listing copy.
- Hidden, false-marked, deleted, and non-owner pending-review reports disappear from nearby or show unavailable detail states.
- Pending, ready, failed, and retried report media states remain visible and backend-confirmed.

## Issue update protocol

Each implementation agent should append to `## Comments` in its issue:

- Git base and files changed.
- Automated commands run and result.
- Root `pnpm dev` and MCP/emulator evidence if the issue was included in a device pass.
- Remaining risks or follow-up issues.
- Whether acceptance criteria are complete.
