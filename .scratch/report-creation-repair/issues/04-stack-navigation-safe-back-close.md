# RC-005 Move creation into real stack navigation with safe Back/Close and unsaved-work prevention

Status: manual-qa-needed
Labels: manual-qa-needed
Severity: P1
Issue ID: RC-005
Type: AFK
Owner: Agent RC-005, must invoke `$tdd`
Verifier: Verifier RC-005-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting, adoption
- Steps: all creation steps
- Current route: disconnected full-screen React Native modals
- Entry points: report-type chooser, visitor auth handoff after sign-in

## Reproduction

1. Open a creation flow.
2. Press Android Back.
3. Reopen and observe route/tab state.
4. Open a text field near the bottom and inspect keyboard overlap.
5. Inspect header near the status bar/cutout.

## Expected

- Creation uses the app's real navigation stack.
- Every pushed screen has recognizable Back and Close/Cancel behavior.
- Back/system gestures do not silently discard unsaved work.
- The user returns to the original tab/destination after cancel or success.
- Header, content, and sticky footer respect status bar, cutouts, keyboard, bottom navigation, and gesture insets.

## Actual

- Creation is a full-screen RN `Modal` over tabs.
- Android Back dismisses immediately through `onRequestClose`.
- Root stack hides native headers globally.
- Header/content can render close to system UI.

## User impact

Users can become disoriented, lose draft work, or have content/actions covered by system UI and keyboard.

## Evidence

- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/01-launch.png`
- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/02-after-back.png`
- UI XML: `.scratch/mobile-qa/20260621-130941/ui/01-launch.xml`
- Code: `apps/expo/src/app/_layout.tsx` sets `headerShown: false`.
- Code: `apps/expo/src/features/shell/shell-overlays.tsx` full-screen creation modals.

## Root cause

Confirmed. Creation is not represented as an Expo Router stack route and therefore cannot use route-level headers, history, or navigation prevent-remove behavior.

## What to build

Move report creation into explicit Expo Router routes while preserving chooser/auth entry behavior and return destination. Add safe Back/Close semantics, unsaved-change prevention, safe-area-aware headers/footers, and keyboard-safe layouts.

## Acceptance criteria

- [ ] Choosing a report type navigates to exactly one stack route.
- [ ] Every creation screen has an accessible Back action and a distinct Close/Cancel action where appropriate.
- [ ] Android Back and iOS swipe-back preserve data or show a discard/save decision.
- [ ] Previous tab/navigation state is restored after cancel and success.
- [ ] Header respects status bar and display cutouts.
- [ ] Sticky footer respects home indicator/gesture inset and bottom tabs.
- [ ] Focused fields and primary action remain reachable with keyboard open.
- [ ] Duplicate route pushes are prevented.

## Required automated tests

- Shell/route tests for chooser -> creation route.
- Tests for duplicate route prevention.
- Tests for unsaved-change guard behavior.
- Component tests for keyboard/footer inset calculations where practical.

## Required manual verification

- Android Back, system gestures, and Close on emulator/device.
- Smallest phone viewport.
- Keyboard open on lowest field.
- Return to source tab after cancel and success.
- Before/after screenshots.

## Likely files and shared components

- `apps/expo/src/app/_layout.tsx`
- `apps/expo/src/app/(tabs)/_layout.tsx`
- New route files under `apps/expo/src/app/report-create/`
- `apps/expo/src/features/shell/*`
- Type-specific creation screens
- Shared creation layout components

## Backend, database, navigation, or storage implications

- Navigation route contracts must preserve report type and return destination.
- No database/storage changes expected.

## Dependencies and regression surfaces

- Blocked by: RC-004.
- Regression surfaces: shell FAB, auth prompt return flow, first-run tour, tab bar chrome.

## Non-goals

- Backend upload sessions.
- Rewriting unrelated tab navigation.

## Comments

- 2026-06-21: Implemented with `$tdd` via delegated RC-005 agents. Creation now uses concrete Expo Router `/report-create/{lost,found,sighting,adoption}` stack routes with a nested report-create stack layout, route-level Back affordances, `beforeRemove` discard prevention, post-publish clean close behavior, auth-return duplicate prevention, and shared safe-area/keyboard-aware creation frames with sticky footers.
- 2026-06-21: Fresh Verifier RC-005-V3 returned no findings. Focused RC-005 suite passed: 56 files, 297 tests. `pnpm -F @acme/expo typecheck`, `pnpm -F @acme/expo lint`, and `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` passed. Remaining human QA: Android Back/system gestures, iOS swipe-back, smallest phone viewport, keyboard on lowest field, return-to-source tab after cancel/success, and before/after screenshots on device/emulator.
