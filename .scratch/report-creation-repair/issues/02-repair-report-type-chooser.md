# RC-007 Repair the report-type chooser icons, accessibility, safe areas, and duplicate selection

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Issue ID: RC-007
Type: AFK
Owner: Agent RC-007, must invoke `$tdd`
Verifier: Verifier RC-007-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting, adoption
- Step: choose type
- Current route: global `ReportActionSheet` modal over tab routes
- Entry points: global report FAB on supported tabs, including member and visitor auth handoff paths

## Reproduction

1. Launch app on Android.
2. Open the report-type chooser from a supported tab.
3. Inspect each action row and close/back behavior.
4. Reopen from Nearby as a clean visitor and select Lost.

## Expected

- Each report type has an intentional icon from one consistent family and a clear Spanish label.
- No placeholder punctuation, numbers, text badges, or emoji communicate report type.
- The sheet respects top/bottom/horizontal safe areas and can scroll on small screens/large text.
- Close action has a 48 x 48 dp target and accessible label.
- Backdrop and Android Back dismiss appropriately.
- Selecting a type dismisses the chooser and opens exactly one next state.
- Repeated taps do not push duplicate creation/auth states.

## Actual

- Android fallback icons display `!`, `OK`, `o`, `<3`, and `>`.
- Chooser behavior is modal state, not guarded against rapid duplicate selection at the UI boundary.

## User impact

Users must decode developer placeholders when choosing the most important creation path. Duplicate selection risks stacked or inconsistent creation/auth state.

## Evidence

- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/03-report-chooser.png`
- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/22-clean-nearby-chooser.png`
- Code: `apps/expo/src/features/shell/shell-overlays.tsx` `androidIconFallbacks`
- Code: `apps/expo/src/features/shell/shell-model.ts` `reportActions`

## Root cause

Confirmed. `ShellIcon` intentionally uses text fallbacks for SF Symbols on non-iOS platforms. The chooser consumes those icons directly.

## What to build

Replace placeholder report-action symbols with production icons and harden the chooser as a real accessible sheet/modal in the current shell architecture. Selection must be atomic and duplicate-tap safe.

## Acceptance criteria

- [ ] Android chooser uses intentional icons for lost, found, sighting, adoption, close, and chevron/action affordances.
- [ ] iOS still renders intentional icons without visual regression.
- [ ] Each action has Spanish accessible label and does not depend on color alone.
- [ ] Content remains usable at largest supported font scale and smallest supported phone viewport.
- [ ] Close target is at least 48 x 48 dp.
- [ ] Backdrop and Android Back close the sheet.
- [ ] A rapid double tap on one report type opens one auth prompt or one creation flow.
- [ ] Visitor auth handoff still preserves the selected intent.

## Required automated tests

- Component test asserting no placeholder icon fallback text appears in report chooser on Android.
- Component test for close/backdrop dismissal.
- Behavior test for duplicate report-type selection.
- Accessibility assertions for labels/roles.

## Required manual verification

- Inspect chooser on Android emulator.
- Inspect clean visitor Nearby chooser and auth prompt handoff.
- Verify large text and small viewport scrolling.
- Capture before/after screenshots.

## Likely files and shared components

- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell-model.ts`
- `apps/expo/src/features/shell/shell-provider.tsx`
- `apps/expo/src/features/shell/shell-overlays.test.tsx`
- `apps/expo/src/features/shell/shell.behavior.test.ts`

## Backend, database, navigation, or storage implications

- None expected.

## Dependencies and regression surfaces

- Blocked by: none.
- Regression surfaces: shell FAB visibility, auth prompt intent preservation, first-run tour suppression.

## Non-goals

- Replacing creation modals with stack routes.
- Implementing report submission.

## Comments
