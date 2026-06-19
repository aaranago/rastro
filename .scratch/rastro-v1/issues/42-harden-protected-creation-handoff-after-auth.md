# Harden protected creation handoff after auth completion

Status: ready-for-agent
Type: AFK
Labels: ready-for-agent
Issue ID: AUTH-4
Severity: P2
Journey: Auth and protected creation handoff
Screen: Auth prompt / report creation modals

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

The protected report action handoff is partly repaired at the reducer level, but the mounted auth prompt/provider flow is not proven under real async auth. `completeAuthPrompt()` hides the prompt immediately and fire-and-forgets session refetch, which can leave a pending member intent unresolved if refetch is slow, fails, or a future social-auth flow is cancelled.

## Reproduction Steps

1. As a visitor, tap `Reportar`.
2. Select any protected report action.
3. Complete an auth attempt in a test environment where session refetch is delayed or fails.
4. Observe whether the selected report creation modal opens, remains pending, or fails visibly.

## Expected Behavior

The app keeps clear state while auth is pending, opens the correct member creation modal only after a confirmed member session, and shows recoverable feedback if auth completes without a member session.

## Actual Behavior

Reducer tests cover pending intent promotion, but the mounted provider/prompt behavior has not been verified. The current provider code hides the prompt immediately after a successful auth action result and does not await or surface refetch failure.

## User Impact

A member may sign in after choosing a protected report action and not land in the intended creation flow, especially once social auth and slow real backend sessions are introduced.

## Evidence

- Independent AUTH-3 verification on 2026-06-19 observed that after successful QA account creation, the first-run tour surfaced over the app. Backend account creation was successful, but this should be evaluated with the protected creation handoff so onboarding does not obscure the next required report-creation action. Evidence: `.scratch/mobile-qa/20260619-180540-auth3-finalverify/screenshots/29-create-account-final-result.png`.
- `.scratch/rastro-v1/issues/29-repair-auth-loading-and-protected-fab-handoff.md`
- `.scratch/mobile-qa/20260619-152033/stage2-review-findings.md`
- `apps/expo/src/features/shell/shell-provider.tsx`
- `apps/expo/src/features/shell/shell-model.ts`
- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell.behavior.test.ts`

## Root Cause Hypothesis

The model stores `pendingMemberIntent` safely, but the provider layer does not treat session refetch as part of the auth transaction. Existing tests exercise reducers rather than the mounted prompt, adapter, and modal sequence.

## Acceptance Criteria

- [ ] After successful email/password auth, the selected lost/found/sighting/adoption action opens the matching member creation modal.
- [ ] The creation modal does not open while the session is still visitor or loading.
- [ ] Failed or timed-out session refetch keeps the user on a recoverable auth surface or shows a clear retry path.
- [ ] Cancelling or failing future provider auth does not leave an invisible pending intent.
- [ ] The same handoff behavior works for all four report action sheet choices.
- [ ] Issue 29 acceptance criteria are either satisfied by this work or explicitly superseded in comments.

## Required Automated Tests

- Add mounted shell tests with a fake auth adapter for delayed successful refetch.
- Add mounted shell tests for failed refetch and cancelled auth.
- Add tests that each protected action opens the correct creation modal only after member session promotion.
- Preserve existing reducer tests for pending intent promotion.

## Required Manual Verification

- Launch with a reachable auth backend.
- Select each report action as a visitor.
- Complete auth and verify the matching creation modal opens.
- Repeat with a failed auth attempt and verify visible recovery.
- Navigate away/back and verify no stale modal opens unexpectedly.

## Affected Components And Likely Files

- `apps/expo/src/features/shell/shell-provider.tsx`
- `apps/expo/src/features/shell/shell-model.ts`
- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell.behavior.test.ts`
- Report creation modal tests

## Dependencies

- `.scratch/rastro-v1/issues/39-document-auth-backend-mobile-runbook.md` for end-to-end manual validation.

## Regression Surfaces

- Global report action sheet
- Lost/found/sighting/adoption creation modals
- Email/password auth
- Future social auth
- Session loading state

## Non-Goals

- Do not implement provider OAuth UI here.
- Do not change report creation form content.
- Do not broaden to non-auth creation validation.
