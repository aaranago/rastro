# Fix Android shell overlay icon rendering

Status: ready-for-agent
Type: AFK
Labels: ready-for-agent
Issue ID: SHELL-1
Severity: P2
Journey: Auth and protected creation handoff
Screen: Report action sheet / auth prompt / shared shell overlays

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

Several Android shell overlay icons render as blank affordances. The report action sheet, auth prompt close button, auth prompt icon, chevrons, and button-leading icons all show empty icon containers in captured Android screenshots.

## Reproduction Steps

1. Launch the Android Expo app as a visitor.
2. Tap `Reportar`.
3. Observe the report action sheet icons and close affordance.
4. Select `Reportar perdida`.
5. Observe the auth prompt icon, close affordance, and auth action icons.

## Expected Behavior

Android displays visible icons or intentionally designed text/icon fallbacks for every shell overlay action.

## Actual Behavior

Icon containers are present but visually blank.

## User Impact

The UI loses action affordance, direction, and close affordance clarity at the exact moment users choose a report type or sign in.

## Evidence

- `.scratch/mobile-qa/20260619-152033/screenshots/report-action-sheet.png`
- `.scratch/mobile-qa/20260619-152033/screenshots/auth-prompt-report-lost.png`
- `.scratch/mobile-qa/20260619-152033/ui/report-action-sheet.xml`
- `.scratch/mobile-qa/20260619-152033/ui/auth-prompt-report-lost.xml`
- `apps/expo/src/features/shell/shell-overlays.tsx`

## Confirmed Root Cause

`ShellIcon` renders `sf:` images unless the caller passes a text fallback. SF Symbols are iOS-specific. Many Android overlay callers omit fallbacks, so Android renders blank icon containers.

## Acceptance Criteria

- [ ] Report action sheet close icon is visible on Android.
- [ ] Report action sheet report-type icons and chevrons are visible on Android.
- [ ] Auth prompt close icon and hero icon are visible on Android.
- [ ] Auth prompt action button icons are visible on Android.
- [ ] Shared `ShellIcon` behavior prevents future blank Android icons when a symbol lacks a platform renderer.
- [ ] Icons remain visible and correctly tinted on iOS.
- [ ] Touch target sizes and accessible labels are preserved.

## Required Automated Tests

- Add tests for `ShellIcon` Android fallback behavior.
- Add render tests for report action sheet and auth prompt icon fallbacks.
- Add regression assertions that icon-only actions have accessible labels.

## Required Manual Verification

- Android: open report action sheet and auth prompt and capture screenshots showing visible icons.
- iOS or iOS-render path if available: verify icons remain correct.
- Verify screen-reader labels still identify close and action buttons.

## Affected Components And Likely Files

- `apps/expo/src/features/shell/shell-overlays.tsx`
- Any shared shell icon tests
- Potential shared icon mapping/helper if introduced

## Dependencies

None - can start immediately.

## Regression Surfaces

- Bottom shell FAB
- Report action sheet
- Auth prompt
- Profile rows
- First-run tour
- Any Android surface using `ShellIcon`

## Non-Goals

- Do not redesign shell iconography.
- Do not replace the whole icon system unless needed to prevent blank Android rendering.
- Do not change button labels or navigation behavior.
