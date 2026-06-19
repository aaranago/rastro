# Add Google and Facebook auth to the Expo mobile prompt

Status: complete
Type: AFK
Issue ID: AUTH-1
Severity: P1
Journey: Auth and protected creation handoff
Screen: Protected action auth prompt

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

Google and Facebook sign-in are implemented for the Next.js web/server auth surface, but the Expo mobile auth prompt exposes only email/password sign-in, account creation, and visitor continuation. This contradicts the v1 auth requirements and the completed OAuth setup issue.

## Reproduction Steps

1. Launch the Expo app as a visitor.
2. Tap the global `Reportar` button.
3. Select `Reportar perdida`.
4. Inspect the auth prompt.

## Expected Behavior

The mobile prompt offers Google and Facebook sign-in options when those providers are configured, alongside email/password access. Starting a provider sign-in uses the mobile-safe Better Auth handoff and returns to the app without losing the selected protected report action.

## Actual Behavior

The prompt shows only `Correo`, `Contrasena`, `Nombre publico`, `Iniciar sesion`, `Crear cuenta`, and `Continuar como visitante`.

## User Impact

An urgent visitor cannot use the promised low-friction Google/Facebook login path before creating a lost pet report. This is likely to increase abandonment and makes mobile auth materially worse than the web auth surface.

## Evidence

- Independent final verification passed on 2026-06-19. Evidence: `.scratch/mobile-qa/20260619-175022-auth1-finalverify/screenshots/06-auth-prompt-report-lost.png`, `.scratch/mobile-qa/20260619-175022-auth1-finalverify/screenshots/08-google-cancel-return.png`, `.scratch/mobile-qa/20260619-175022-auth1-finalverify/screenshots/10-facebook-cancel-return.png`, and `.scratch/mobile-qa/20260619-175022-auth1-finalverify/screenshots/22-pending-provider-google-cancel-return-attempt-1.png`.
- Repair follow-up on 2026-06-19: the first-run tour is now suppressed while the auth prompt is active, so a provider cancellation recovery message is not hidden by onboarding.
- Failed independent verification on 2026-06-19: Google handoff opened `/api/auth/expo-authorization-proxy`, but closing the Google Custom Tab returned to the preserved auth prompt without a visible `Cancelaste el ingreso...` cancellation error.
- `.scratch/mobile-qa/20260619-152033/screenshots/auth-prompt-report-lost.png`
- `.scratch/mobile-qa/20260619-152033/ui/auth-prompt-report-lost.xml`
- `.scratch/rastro-v1/issues/05-configure-oauth-provider-apps-and-validate-social-login.md`
- `docs/product/ui-design-brief.md`
- `docs/product/auth-provider-setup.md`
- `apps/expo/src/features/shell/shell-auth.ts`
- `apps/expo/src/utils/auth.ts`
- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/nextjs/src/auth/server.ts`
- `apps/nextjs/src/auth/actions.ts`
- `apps/nextjs/src/app/_components/auth-showcase.tsx`

## Confirmed Root Cause

The Expo auth contract and shell UI were implemented as email/password only. `ShellAuthAdapter` has no social-provider method, `shellAuthAdapter` does not call Better Auth social sign-in, the i18n copy has no provider labels, and `SignInPrompt` renders no provider buttons. The provider setup issue validated the web/server handoff, not Expo mobile UI/client behavior.

## Acceptance Criteria

- [x] The Expo auth contract exposes Google and Facebook provider sign-in as first-class auth actions.
- [x] The mobile auth prompt renders provider buttons labeled `Continuar con Google` and `Continuar con Facebook` when providers are available.
- [x] The provider buttons are absent or disabled with clear fallback behavior when providers are not available in the current environment.
- [x] Starting Google or Facebook sign-in uses a mobile-safe redirect/session handoff and returns to Rastro.
- [x] A visitor who selected a protected report action before provider sign-in keeps that selected action after successful member auth.
- [x] Provider cancellation or failure leaves the user on a recoverable auth surface with a specific error message.
- [x] Apple is not introduced on Android; if iOS behavior is touched, Apple availability follows the documented v1/iOS compliance decision.

## Required Automated Tests

- Add Expo shell/prompt tests proving Google and Facebook actions render when configured.
- Add adapter tests around the Better Auth social sign-in call, including success, failure, and cancellation.
- Add a mounted shell test for `Reportar` -> provider sign-in success -> selected member creation intent is retained.
- Add regression coverage that email/password auth remains available.
- Added repair regression coverage proving provider cancellation preserves the selected auth prompt with the specific error and that a preserved prompt-level error is rendered.
- Added repair regression coverage proving a pending first-run tour is not displayed over an active auth prompt.

## Required Manual Verification

- [x] Launch the mobile app with a reachable auth backend.
- [x] Open the auth prompt from `Reportar perdida`.
- [x] Verify Google and Facebook buttons are visible on Android.
- [x] Start each provider flow far enough to confirm the external provider handoff begins.
- [x] Verify Google and Facebook cancellation return to the auth prompt with the specific recovery message visible.
- [x] Verify a pending first-run tour does not cover the returned auth prompt after provider cancellation.
- [x] Capture screenshots/logs under `.scratch/mobile-qa/20260619-175022-auth1-finalverify/`.
- [ ] Complete real Google/Facebook account login and verify the app returns to the protected report flow when human provider credentials are available.

## Affected Components And Likely Files

- `apps/expo/src/features/shell/shell-auth.ts`
- `apps/expo/src/features/shell/shell-provider.tsx`
- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/shell/shell-model.ts`
- `apps/expo/src/utils/auth.ts`
- `apps/expo/src/i18n/index.ts`
- `apps/expo/app.config.ts`
- `packages/auth/src/index.ts`
- Expo shell/auth tests

## Dependencies

- `.scratch/rastro-v1/issues/39-document-auth-backend-mobile-runbook.md` for reliable local backend validation.

## Regression Surfaces

- Email/password sign-in and account creation
- Protected report action handoff
- Better Auth session persistence in SecureStore
- Android and iOS redirect schemes
- Web/server social auth behavior

## Non-Goals

- Do not change provider dashboard credentials.
- Do not require Apple sign-in on Android.
- Do not redesign the full account settings screen.
- Do not commit OAuth secrets.
