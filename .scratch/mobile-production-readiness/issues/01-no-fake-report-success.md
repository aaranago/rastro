# 01 - Prevent fake report submission success

Status: closed
Severity: P0
Journey: Report creation and submission
Screens: Lost, found, sighting, and adoption creation modals

## Problem

Creation flows can display success and clear the draft even when no backend persistence happened. This can cause user data loss and a false belief that a lost/found/sighting/adoption report was published.

## Reproduction

1. Launch the Expo app with the documented runbook setup.
2. Open the global `Reportar` sheet.
3. Start a sighting report.
4. Add required fields until the submit action is available.
5. Submit while the shell has not injected a backend `onPublish*` handler.
6. Observe a success state and draft clearing despite no report endpoint being called.

## Expected

The app only shows success after an authenticated backend response confirms a persisted report. If the backend publish contract is unavailable or fails, the draft remains intact and the user gets a retryable error.

## Actual

The creation screen awaits an optional publish callback and then clears local draft state and shows success even when the callback is absent.

## Impact

Users can lose critical report details and believe a time-sensitive recovery report is public when it is not.

## Evidence

- `apps/expo/src/features/shell/shell-overlays.tsx:252`
- `apps/expo/src/features/shell/shell-overlays.tsx:529`
- `apps/expo/src/features/shell/shell-overlays.tsx:612`
- `apps/expo/src/features/lost-report-creation/lost-report-creation-screen.tsx:126`
- `apps/expo/src/features/sighting-report-creation/sighting-report-creation-screen.tsx:141`
- `packages/db/src/schema.ts:6`
- `packages/api/src/root.ts:5`
- Screenshot evidence: `.scratch/mobile-qa/20260619-195333/screenshots/10-sighting-auth-gate.png`

## Root Cause

Confirmed. Production report persistence does not exist, and mobile creation components treat publish callbacks as optional.

## Acceptance Criteria

- Lost, found, sighting, and adoption creation flows cannot show success when their publish handler is missing.
- A failed or unavailable publish keeps the draft and all selected fields.
- Submit actions are disabled while a submission is in flight.
- Repeated taps cannot trigger duplicate publish attempts.
- Error copy is visible, specific, and retryable in Spanish.
- Runtime logs do not contain unhandled promise rejections.
- This issue does not add fake backend success, local inserted cards, or hardcoded report records.

## Required Automated Tests

- Unit or component test proving a missing publish handler leaves the draft intact and renders an error.
- Test proving submit is disabled while pending.
- Test proving a rejected publish callback does not clear the draft.
- Test proving a resolved publish callback is required before success state appears.

## Required Manual Verification

- Submit each available report type with no publish handler and confirm no success state appears.
- Submit with a failing test handler and confirm retry retains entered data.
- Inspect network activity and confirm no local-only success is presented as persisted backend state.

## Affected Files

- `apps/expo/src/features/lost-report-creation/*`
- `apps/expo/src/features/found-report-creation/*`
- `apps/expo/src/features/sighting-report-creation/*`
- `apps/expo/src/features/adoption-listing-creation/*`
- `apps/expo/src/features/shell/shell-overlays.tsx`
- Related tests under `apps/expo/src/features/**/__tests__`

## Backend, Database, Map, or Storage Implications

This issue is a safety guard only. Full backend persistence belongs to issue 02 and end-to-end creation belongs to issue 07.

## Dependencies

None.

## Regression Surfaces

- Existing creation snapshots and success-state tests.
- Draft persistence.
- Global `Reportar` sheet routing.

## Non-Goals

- Do not implement the full report backend in this issue.
- Do not add a local production stub.
- Do not insert submitted cards into Cerca manually.

## Comments

### 2026-06-19 implementation

Implemented with TDD by implementation agent `019ee27b-33a5-79e3-870a-954cffbbece6`.

- Added `publishReportCreation` as a shared guard for creation publish attempts.
- Missing publish handlers now return a retryable Spanish error and never clear the draft.
- Rejected publish handlers now keep the draft and return a retryable Spanish error.
- Success is only reached after the publish handler resolves and `clearDraft` completes.
- A synchronous publish lock blocks repeated taps before React rerenders.
- No fake backend success, local report insertion, or hardcoded production report record was added.

Independent verifier `019ee284-5687-7a23-9cec-9df7576a2ac1` passed all acceptance criteria.

Verification commands:

- `pnpm -F @acme/expo test`
- `pnpm -F @acme/expo typecheck`
- `pnpm -F @acme/expo lint`
- `pnpm -F @acme/expo format`
- `git diff --check`
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`

Known residual: this issue intentionally does not implement real backend persistence. Issues 02 and 07 remain required before report creation can be considered end-to-end production-ready.
