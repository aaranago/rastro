# Remove the report sheet's accessible full-screen scrim target

Status: ready-for-agent
Type: AFK
Labels: ready-for-agent
Issue ID: SHELL-2
Severity: P2
Journey: Auth and protected creation handoff
Screen: Report action sheet

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

The report action sheet exposes an invisible full-screen `Cerrar` button before the visible sheet content in the accessibility tree. The backdrop should dismiss on touch, but it should not be the first screen-reader focus target.

## Reproduction Steps

1. Launch the app as a visitor.
2. Tap `Reportar`.
3. Inspect `ui/report-action-sheet.xml` or traverse the sheet with a screen reader.

## Expected Behavior

Screen-reader focus starts on visible modal content or the visible close button. The backdrop remains touch-dismissible without being a full-screen accessible `Cerrar` control.

## Actual Behavior

The UI XML contains a focusable `Cerrar` button with bounds `[0,0][1080,2400]` before the visible action sheet controls.

## User Impact

Screen-reader users can land on an invisible full-screen close control before reaching the report choices, making the modal confusing and easy to dismiss accidentally.

## Evidence

- `.scratch/mobile-qa/20260619-152033/ui/report-action-sheet.xml`
- `.scratch/mobile-qa/20260619-152033/screenshots/report-action-sheet.png`
- `apps/expo/src/features/shell/shell-overlays.tsx`

## Root Cause Hypothesis

The absolute-fill scrim `Pressable` has an accessibility label and role. React Native exposes it as a full-screen button rather than a hidden backdrop.

## Acceptance Criteria

- [ ] Backdrop tapping still dismisses the report action sheet.
- [ ] The backdrop is hidden from accessibility traversal.
- [ ] The visible close button remains accessible as `Cerrar`.
- [ ] Screen-reader focus reaches the sheet title and report actions without first landing on an invisible full-screen control.
- [ ] The same pattern is checked for the auth prompt backdrop if it shares this implementation.

## Required Automated Tests

- Add a component/accessibility test that the report sheet scrim is not accessible.
- Add a test that the visible close button remains accessible.
- Add a test that backdrop press still calls `onClose`.

## Required Manual Verification

- Open the report action sheet on Android.
- Traverse with a screen reader and verify no invisible full-screen `Cerrar` target appears.
- Tap outside the sheet and verify it still closes.
- Press the visible close button and verify it closes.

## Affected Components And Likely Files

- `apps/expo/src/features/shell/shell-overlays.tsx`
- Report action sheet tests

## Dependencies

None - can start immediately.

## Regression Surfaces

- Report action sheet
- Auth prompt backdrop if shared
- First-run tour/backdrop patterns if shared helpers are introduced

## Non-Goals

- Do not change report action labels or ordering.
- Do not remove tap-outside-to-dismiss behavior.
- Do not redesign the modal visual style.
