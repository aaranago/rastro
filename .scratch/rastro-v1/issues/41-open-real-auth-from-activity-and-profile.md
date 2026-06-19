# Open a real auth surface from Activity and Profile sign-in entry points

Status: complete
Type: AFK
Issue ID: AUTH-2
Severity: P1
Journey: Auth and protected creation handoff
Screen: Activity visitor gate / Profile visitor state

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

The Activity visitor `Iniciar sesion` action does not open sign-in controls. It routes to Profile, where the visitor state shows explanatory copy but no sign-in or account-creation action.

## Reproduction Steps

1. Launch the Expo app as a visitor.
2. Open the `Actividad` tab.
3. Tap `Iniciar sesion`.
4. Observe the destination screen.

## Expected Behavior

The user reaches a real auth surface with sign-in/account-creation controls and can return to Activity after completing or dismissing auth.

## Actual Behavior

The app navigates to `Perfil`. The Profile visitor screen does not expose a sign-in/create-account control, so the entry point is a dead end for authentication.

## User Impact

Visitors who try to sign in from Activity cannot do so. This blocks activity, chats, alerts, member profile state, and protected creation flows outside the global report prompt.

## Evidence

- Independent verification passed on 2026-06-19: Activity and Profile visitor sign-in entries opened the shared auth prompt, and dismissing the prompt returned to Activity without leaving the user in a dead-end Profile state.
- `.scratch/mobile-qa/20260619-152033/functional-qa/screenshots/live-activity-before-signin-tap.png`
- `.scratch/mobile-qa/20260619-152033/functional-qa/screenshots/live-after-activity-signin-tap.png`
- `.scratch/mobile-qa/20260619-152033/stage2-review-findings.md`
- `apps/expo/src/features/activity/activity-screen.tsx`
- `apps/expo/src/features/navigation/internal-rastro-links.ts`
- `apps/expo/src/features/shell/shell-screens.tsx`

## Root Cause Hypothesis

Activity emits an internal `rastro://auth/sign-in?returnTo=/actividad` link, but internal link handling maps auth sign-in to Profile. Profile is not an auth route and has no visitor sign-in action.

## Acceptance Criteria

- [x] Tapping Activity `Iniciar sesion` opens a real auth prompt or dedicated auth route.
- [x] The auth surface includes the same available auth methods as the protected report prompt.
- [x] Dismissing auth returns to Activity without losing navigation state.
- [x] Successful auth returns to Activity or the requested `returnTo` destination.
- [x] Visitor Profile exposes a real sign-in action or clearly does not present itself as the sign-in destination.
- [x] Internal `rastro://auth/sign-in` links do not route to a dead-end visitor Profile screen.

## Required Automated Tests

- Add a navigation/link test proving Activity sign-in opens the auth surface.
- Add a test for `rastro://auth/sign-in?returnTo=/actividad` resolution.
- Add a Profile visitor test proving the visible sign-in entry point opens auth, if Profile remains part of the flow.

## Required Manual Verification

- [x] As a visitor, tap Activity `Iniciar sesion`.
- [x] Verify auth controls open.
- [x] Dismiss auth and confirm Activity is restored.
- [x] Verify Profile visitor sign-in opens the shared auth prompt instead of acting as a dead-end destination.
- [ ] Complete sign-in in a configured local auth environment and confirm the member Activity state is shown.

## Affected Components And Likely Files

- `apps/expo/src/features/activity/activity-screen.tsx`
- `apps/expo/src/features/navigation/internal-rastro-links.ts`
- `apps/expo/src/features/shell/shell-provider.tsx`
- `apps/expo/src/features/shell/shell-screens.tsx`
- Shell/navigation tests

## Dependencies

None - can start immediately.

## Regression Surfaces

- Activity visitor state
- Profile visitor state
- Internal deep-link handling
- Protected report auth prompt
- Bottom-tab navigation restoration

## Non-Goals

- Do not implement unrelated Profile rows.
- Do not redesign Activity feed content.
- Do not add new auth providers beyond the providers handled by the shared auth surface.
