# Repair no-op Profile rows

Status: ready-for-agent
Type: AFK
Labels: ready-for-agent
Issue ID: PROFILE-1
Severity: P2
Journey: Profile and auth entry support
Screen: Profile visitor state

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

`Mis reportes` and `Ajustes` appear as interactive Profile rows, but tapping them does nothing. A visible button must navigate, show an auth gate, present a disabled/non-pressable state, or provide clear feedback.

## Reproduction Steps

1. Launch the app as a visitor.
2. Open `Perfil`.
3. Tap `Mis reportes`.
4. Tap `Ajustes`.

## Expected Behavior

Each visible Profile row either navigates to its destination, opens auth gating, or is rendered as disabled/non-interactive with clear copy.

## Actual Behavior

The screen remains unchanged after tapping `Mis reportes` or `Ajustes`.

## User Impact

The Profile screen presents dead controls, reducing trust and blocking access to member report management or settings/account actions.

## Evidence

- `.scratch/mobile-qa/20260619-152033/screenshots/profile-after-mis-reportes-tap.png`
- `.scratch/mobile-qa/20260619-152033/screenshots/profile-after-ajustes-tap.png`
- `.scratch/mobile-qa/20260619-152033/functional-qa/screenshots/live-after-profile-mis-reportes-tap.png`
- `.scratch/mobile-qa/20260619-152033/functional-qa/screenshots/live-after-profile-ajustes-tap.png`
- `apps/expo/src/features/shell/shell-screens.tsx`

## Confirmed Root Cause

The `ProfileRow` component renders a `Pressable`, but the `Mis reportes` and `Ajustes` row calls omit `href` or another action handler.

## Acceptance Criteria

- [ ] `Mis reportes` no longer behaves as a no-op.
- [ ] `Ajustes` no longer behaves as a no-op.
- [ ] If a row is not implemented yet, it is visibly disabled or replaced with honest explanatory copy and is not exposed as an active button.
- [ ] If a row requires membership, tapping it opens a real auth gate or member-only destination.
- [ ] Every visible Profile row has an automated test proving it navigates, gates auth, or is disabled.
- [ ] The fix does not regress `Mis mascotas` or `Alertas` navigation.

## Required Automated Tests

- Add Profile visitor tests for all visible rows.
- Add assertions that rows without destinations are not pressable.
- Add navigation tests for implemented rows.

## Required Manual Verification

- As a visitor, tap every Profile row and verify each performs an observable action or is clearly disabled.
- Verify `Mis mascotas` still opens.
- Verify `Alertas` still opens.
- Verify screen-reader roles match each row's actual behavior.

## Affected Components And Likely Files

- `apps/expo/src/features/shell/shell-screens.tsx`
- Profile/shell screen tests
- Potential new route files if destinations are implemented

## Dependencies

None - can start immediately.

## Regression Surfaces

- Profile visitor state
- Profile member state
- Bottom-tab navigation
- Auth entry points
- Account settings and report-management routes if implemented

## Non-Goals

- Do not implement full report-management functionality unless chosen as the observable destination.
- Do not redesign the full Profile screen.
- Do not change pet profile or alert settings behavior except to preserve navigation.
