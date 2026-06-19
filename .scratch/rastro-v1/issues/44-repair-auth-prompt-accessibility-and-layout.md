# Repair auth prompt accessibility and layout behavior

Status: ready-for-agent
Type: AFK
Labels: ready-for-agent
Issue ID: AUTH-6
Severity: P2
Journey: Auth and protected creation handoff
Screen: Auth prompt

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

The auth prompt is fragile under keyboard input, validation errors, and accessibility settings. The Android keyboard can cover submit controls, empty-field validation shifts the modal and CTAs, key text has capped font scaling, fields do not expose invalid/required semantics, and keyboard `Next` labels are not wired to deterministic focus movement.

## Reproduction Steps

1. As a visitor, open `Reportar` -> `Reportar perdida`.
2. Focus the password field and type text on Android.
3. Dismiss/reopen, then tap `Iniciar sesion` with empty fields.
4. Increase OS font size and repeat the prompt flow.
5. Inspect accessibility UI XML for invalid field semantics.

## Expected Behavior

Submit controls remain reachable while the keyboard is open, validation feedback does not cause disruptive layout movement, text respects accessibility scaling while staying scrollable, invalid fields are announced meaningfully, and keyboard `Next` moves focus or submits predictably.

## Actual Behavior

The Android keyboard covers the lower prompt actions, empty validation moves the card and CTAs, prompt text caps scaling, empty-field errors are standalone alerts without field-level semantics, and `returnKeyType` is set without focus handlers.

## User Impact

Users with larger text settings, keyboard navigation needs, or screen readers can struggle to complete auth. Sighted users can lose their action target when the error appears or the keyboard opens.

## Evidence

- `.scratch/mobile-qa/20260619-152033/functional-qa/screenshots/live-auth-filled-keyboard-open.png`
- `.scratch/mobile-qa/20260619-152033/ui/auth-prompt-report-lost.xml`
- `.scratch/mobile-qa/20260619-152033/ui/auth-prompt-missing-credentials.xml`
- `.scratch/mobile-qa/20260619-152033/stage2-review-findings.md`
- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell-theme.ts`

## Root Cause Hypothesis

The prompt uses iOS-only `KeyboardAvoidingView` behavior, centers scroll content while inserting validation errors conditionally, caps `maxFontSizeMultiplier` on important text, and treats validation as a standalone alert rather than a field state.

## Acceptance Criteria

- [ ] On Android, focusing email/password/name fields keeps primary auth actions reachable by automatic layout or scroll behavior.
- [ ] Empty-field validation displays without moving the primary CTA stack by more than a small, intentional amount.
- [ ] Auth prompt title, body, labels, inputs, errors, and actions respect the supported large-text setting and remain scrollable.
- [ ] Email and password inputs expose required/invalid semantics or equivalent accessible hints after missing-credentials validation.
- [ ] Keyboard `Next` moves from email to password and then to the next relevant field or submit action.
- [ ] Reduced-motion settings are respected for nonessential prompt animations where supported by React Native/Expo APIs.
- [ ] Input boundaries meet the project's non-text contrast standard or are otherwise visually identifiable.

## Required Automated Tests

- Add component tests for missing-credentials validation state and field accessibility props.
- Add tests for focus/submit behavior from keyboard return actions.
- Add layout or snapshot coverage for large-text prompt rendering if supported by the current test stack.
- Add regression coverage that the prompt remains scrollable with error text present.

## Required Manual Verification

- Android: focus fields with the keyboard open and verify actions are reachable.
- Android: submit empty fields and verify the CTA does not jump unexpectedly.
- Android/iOS: increase OS font size and verify all prompt content remains readable and scrollable.
- Screen reader: verify invalid fields and the error are announced clearly.

## Affected Components And Likely Files

- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell-theme.ts`
- Shell prompt tests

## Dependencies

None - can start immediately.

## Regression Surfaces

- Auth prompt
- Report action sheet modal behavior
- First-run tour/reduced-motion behavior if shared animation helpers are introduced
- Android keyboard behavior
- Accessibility semantics

## Non-Goals

- Do not add new auth providers.
- Do not split sign-in/account creation modes unless required for layout; that is tracked separately.
- Do not redesign the full shell visual system.
