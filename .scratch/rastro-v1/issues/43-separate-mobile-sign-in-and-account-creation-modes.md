# Separate mobile sign-in and account-creation modes

Status: ready-for-agent
Type: AFK
Labels: ready-for-agent
Issue ID: AUTH-5
Severity: P2
Journey: Auth and protected creation handoff
Screen: Auth prompt

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

The mobile auth prompt mixes sign-in and account creation into one dense form. It shows `Nombre publico` before the primary sign-in action even though that field is only relevant to account creation. The prompt also says the selected protected action was saved while offering `Continuar como visitante`, which actually dismisses the prompt and does not start reporting.

## Reproduction Steps

1. As a visitor, tap `Reportar`.
2. Select `Reportar perdida`.
3. Inspect the auth prompt.
4. Tap `Continuar como visitante`.

## Expected Behavior

The sign-in path is focused and does not show account-creation-only fields until the user chooses account creation. Visitor continuation copy makes clear that reporting will not start until sign-in.

## Actual Behavior

The prompt shows email, password, public name, sign-in, create-account, and visitor continuation simultaneously. The copy says `Guardamos tu seleccion` while visitor continuation dismisses the protected flow.

## User Impact

Existing members must parse irrelevant account-creation fields during an urgent reporting path. Visitors may believe their protected report action can continue as visitor or resume automatically later.

## Evidence

- `.scratch/mobile-qa/20260619-152033/screenshots/auth-prompt-report-lost.png`
- `.scratch/mobile-qa/20260619-152033/ui/auth-prompt-report-lost.xml`
- `.scratch/mobile-qa/20260619-152033/screenshots/nearby-after-auth-visitor-dismiss.png`
- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell-provider.tsx`
- `apps/expo/src/i18n/index.ts`

## Root Cause Hypothesis

`SignInPrompt` always renders all fields and both auth actions in one mode. The generic visitor continuation CTA is reused in a member-only protected-action handoff.

## Acceptance Criteria

- [ ] Initial protected-action auth prompt prioritizes sign-in and provider options.
- [ ] `Nombre publico` is not visible in sign-in mode.
- [ ] Account creation is a deliberate mode or step, and `Nombre publico` appears only there.
- [ ] Switching between sign-in and account-creation modes preserves relevant entered fields without leaking irrelevant errors.
- [ ] Visitor continuation copy clearly states that the protected report will not start as a visitor.
- [ ] Spanish visible copy in this prompt uses correct accents for strings such as `sesión`, `contraseña`, `selección`, and `público`.
- [ ] Dismissing or continuing as visitor does not leave a stale hidden protected action.

## Required Automated Tests

- Add prompt render tests for sign-in mode excluding public-name input.
- Add prompt render tests for create-account mode including public-name input.
- Add tests for visitor continuation behavior and copy in protected-action context.
- Add i18n snapshot/assertion coverage for corrected auth prompt copy.

## Required Manual Verification

- Open the auth prompt from each report action.
- Verify sign-in mode is concise and account creation is explicitly selected before public-name input appears.
- Verify `Continuar como visitante` copy and behavior are aligned.
- Verify default and enlarged font sizes still show usable controls.

## Affected Components And Likely Files

- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell-provider.tsx`
- `apps/expo/src/features/shell/shell-model.ts`
- `apps/expo/src/i18n/index.ts`
- Shell prompt tests

## Dependencies

None - can start immediately.

## Regression Surfaces

- Email/password sign-in
- Account creation
- Protected report action prompt
- Activity/Profile auth entry points
- Spanish localization

## Non-Goals

- Do not implement Google/Facebook provider handoff in this issue.
- Do not redesign account settings.
- Do not change report creation form requirements.
