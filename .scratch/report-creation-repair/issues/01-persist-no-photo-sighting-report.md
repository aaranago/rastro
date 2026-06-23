# RC-001 Persist a no-photo sighting report from the real creation flow

Status: manual-qa-needed
Labels: manual-qa-needed
Severity: P0
Issue ID: RC-001
Type: AFK
Owner: Agent RC-001, must invoke `$tdd`
Verifier: Verifier RC-001-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report type: sighting
- Step: review/submit
- Current route: full-screen `SightingReportStartModal` launched from shell member intent
- Entry points: global report FAB on supported tabs, then report-type chooser -> sighting

## Reproduction

1. Launch the Expo dev client with the documented mobile runbook.
2. Open the report-type chooser as a member.
3. Select `Avistamiento`.
4. Fill or use enough existing sighting draft data for review to enable publish.
5. Tap publish.

## Expected

- The app submits through the real `report.create` backend endpoint.
- The request includes a stable idempotency key.
- Repeated taps or delayed response create exactly one report.
- The backend returns a canonical report ID/state.
- The app refetches `report.detail` and the same `report.nearby` production query used elsewhere.
- The new report is visible after clean cache/refetch and app restart.

## Actual

- Publish returns "No pudimos publicar porque el servicio no esta disponible..."
- No `report.create` network call is made.
- No backend record is created.

## User impact

Complete inability to create any report through the production mobile creation UI. Sighting is the thinnest valid persistence slice because backend validation allows a sighting with no media.

## Evidence

- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/12-lost-submit-missing-handler.png`
- Logcat: `.scratch/mobile-qa/20260621-130941/logs/logcat.txt` had no `report.create` or upload evidence during submit.
- Code: `apps/expo/src/features/shell/shell-overlays.tsx` renders creation modals without publish handlers.
- Code: `apps/expo/src/features/report-creation/report-creation-publish.ts` returns `reason: "missing-handler"` when no publish handler is supplied.
- Code: `packages/api/src/router/report.ts` has the real protected `report.create` endpoint.

## Root cause

Confirmed. The UI has publish callback props in the type-specific screens, but `ShellFabHost` never injects handlers backed by `trpcClient.report.create`.

## What to build

Wire the sighting creation flow to the real backend create endpoint as the first complete tracer bullet. Convert the sighting draft into `CreateReportInput`, generate and persist an idempotency key in the draft, submit once, handle timeout/unknown result by reconciling through the idempotency key where possible, and refetch real report data before displaying success.

## Acceptance criteria

- [ ] Sighting creation from the real chooser calls `report.create`, not a mock/local handler.
- [ ] Submission uses a stable idempotency key that survives retries for the same draft.
- [ ] Repeated taps during a slow response issue one create mutation and create one backend report.
- [ ] Success UI displays the real backend report ID/state only after backend confirmation.
- [ ] The new report appears through `report.detail`.
- [ ] The new report appears through the same `report.nearby` production query used by the Nearby tab.
- [ ] Failure keeps the draft and offers retry without re-entering completed data.
- [ ] No client-only report card is inserted as the source of truth.

## Required automated tests

- Failing component/integration test for sighting publish currently hitting the missing-handler path.
- Unit test for draft-to-`CreateReportInput` mapping, including Bolivia location bounds and optional media.
- Test for idempotency key persistence and duplicate-tap prevention.
- Test that success waits for backend confirmation and invalidates/refetches the production query.
- Backend/router test covering duplicate idempotency key returns the same report.

## Required manual verification

- Run the app on the emulator/device.
- Create a sighting report from the chooser.
- Tap publish repeatedly during a delayed response.
- Confirm one backend row and one lifecycle event.
- Confirm `report.detail` and `report.nearby` return the report after a clean refetch/restart.

## Likely files and shared components

- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/sighting-report-creation/*`
- `apps/expo/src/features/report-creation/report-creation-publish.ts`
- `apps/expo/src/utils/api.tsx`
- `packages/validators/src/index.ts`
- `packages/api/src/router/report.ts`
- `packages/api/src/report-repository.ts`

## Backend, database, navigation, or storage implications

- Backend/database create path already exists; this issue should not add media upload storage.
- May need a read/reconcile endpoint by idempotency key if current router contract is insufficient for unknown submission results.
- Navigation should remain current modal until RC-005 replaces it with stack routes.

## Dependencies and regression surfaces

- Blocked by: none.
- Regression surfaces: report detail/nearby adapters, auth cookies, draft persistence, duplicate-tap lock.

## Non-goals

- Full image upload.
- Lost/found/adoption submission.
- Replacing creation modals with stack routes.

## Comments

### 2026-06-21 implementation checkpoint

- Wired the sighting creation flow to the real `report.create` backend path through a publish adapter.
- Drafts now carry stable idempotency keys; repeated publish taps are locked to one in-flight create.
- Success waits for backend create/detail/nearby confirmation and displays the returned report ID/state.
- Verifier found free-text sighting dates could reach backend validation. Fixed by requiring ISO date-time before publish and before draft-to-backend conversion.
- Automated checks pass. Manual backend/device confirmation is still required for the clean-install scenario.

### 2026-06-22 backend/live verification checkpoint

- Runbook verifier reached the real Android `report.create` mutation, but the running backend returned 500.
- Root cause was live DB schema drift plus repository read coupling: the local `report_media` table was still the old schema, while Drizzle relation loading selected newer upload-session columns such as `owner_id`.
- Fixed repository reads to load ready media through an explicit public-column select and changed report creation idempotency to use an advisory transaction lock instead of depending solely on the missing unique index.
- Verified with `RASTRO_DB_INTEGRATION=1` repository integration against both migrated and legacy report-media schemas: 4 tests passed.
- Verified the running Next server path with a QA member cookie: live `report.create` returned an active no-photo sighting with backend ID `d657d305-c440-4538-9e94-671e7755d8f1`, approximate La Paz public location, and `media: []`.
- Remaining gap: clean Android UI publish after this backend fix was not completed; the emulator was blocked by an old saved draft/validation state during this pass.
