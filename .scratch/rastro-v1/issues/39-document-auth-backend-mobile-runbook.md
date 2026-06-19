# Document and validate the mobile auth backend runbook

Status: ready-for-human
Type: AFK
Labels: ready-for-human
Issue ID: AUTH-3
Severity: P1
Journey: Auth and protected creation handoff
Screen: Auth prompt / local mobile runtime

## Parent

`.scratch/rastro-v1/PRD.md`

## Problem

The documented mobile run launches the Expo dev client but does not start or configure the auth/API backend required by Better Auth. Email/password sign-in and account creation therefore show `Network request failed`, so the protected report-creation handoff cannot be validated end to end.

## Reproduction Steps

1. Follow `docs/dev/mobile-runbook.md` to launch the Android dev-client app.
2. As a visitor, tap `Reportar`.
3. Select `Reportar perdida`.
4. Enter `qa.invalid@example.com` and `wrongpassword`.
5. Tap `Iniciar sesion`.
6. Repeat with `Crear cuenta`.

## Expected Behavior

The app reaches a running auth backend and returns either a credential-specific auth error or a successful member session that can continue the protected report flow.

## Actual Behavior

Both sign-in and create-account attempts show `Network request failed`.

## User Impact

Member-only flows cannot be tested or used locally from the documented mobile setup. This blocks validation of report creation, activity, profile, alerts, and social-auth handoff.

## Evidence

- `.scratch/mobile-qa/20260619-152033/functional-qa/screenshots/live-auth-invalid-signin-result-3.png`
- `.scratch/mobile-qa/20260619-152033/functional-qa/screenshots/live-auth-create-network-result.png`
- `.scratch/mobile-qa/20260619-152033/stage2-review-findings.md`
- `apps/expo/src/utils/base-url.ts` falls back to the Metro host on port `3000` when no explicit API URL is configured.

## Root Cause Hypothesis

`docs/dev/mobile-runbook.md` launches only the Expo app. It does not start the Next.js/API server, set `EXPO_PUBLIC_API_BASE_URL`, or provide a seeded/smoke account for mobile auth validation.

## Acceptance Criteria

- [x] `docs/dev/mobile-runbook.md` documents the exact commands required to run the auth/API backend for mobile QA.
- [x] The runbook explains when to set `EXPO_PUBLIC_API_BASE_URL` and how the app derives the fallback URL.
- [x] A fresh run following the runbook can reach the Better Auth session endpoint from the Android emulator or physical device. In the installed Better Auth version this route is `/api/auth/get-session`; `/api/auth/session` returns 404.
- [x] Invalid email/password sign-in reaches the backend and returns an auth-specific error, not `Network request failed`.
- [x] Account creation succeeds with the documented QA account pattern or returns a specific backend validation error.
- [x] The runbook includes cleanup/reset steps for any local QA member created during validation.

## Required Automated Tests

- [x] Add or update a smoke-level test/script that verifies the configured mobile API base URL reaches the auth session endpoint.
- [x] Add a test or documented CI-safe check that fails clearly when mobile auth is configured without a reachable backend.

## Required Manual Verification

- [ ] Launch the app exactly as documented in `docs/dev/mobile-runbook.md`.
- [ ] Open the protected `Reportar perdida` auth prompt.
- [ ] Verify invalid sign-in no longer produces `Network request failed`.
- [ ] Verify create-account behavior reaches the backend.
- [ ] Capture screenshot/log evidence under `.scratch/mobile-qa/<timestamp>/`.

## Implementation Notes

- Added `scripts/mobile-auth-backend-smoke.sh`; it checks the configured API origin against the Better Auth session endpoint and exits clearly on unreachable backend, 404 route mismatch, or 5xx backend health errors.
- Added `scripts/mobile-auth-qa-cleanup.sh`; it deletes only the documented `qa+mobile-%@example.com` auth members by default and uses the app's existing `pg` dependency so it does not require `psql` on the host.
- Reproduced the pre-fix backend gap with `curl http://127.0.0.1:3000/api/auth/session`, which failed because no backend was running.
- Started the documented Next.js backend with `pnpm -F @acme/nextjs with-env next dev --hostname 0.0.0.0 --port 3000`.
- Confirmed `MOBILE_AUTH_API_BASE_URL=http://127.0.0.1:3000 scripts/mobile-auth-backend-smoke.sh` reaches `http://127.0.0.1:3000/api/auth/get-session` with HTTP 200.
- Confirmed the Android emulator can reach host port `3000` through `10.0.2.2`; the Next.js log recorded `/api/auth/get-session` returning HTTP 200 after an Android `nc` request.
- Confirmed invalid email/password sign-in returns HTTP 401 with `Invalid email or password`.
- Confirmed account creation with `qa+mobile-<timestamp>@example.com` returns HTTP 200, then deleted the created QA member row.
- Full in-app `Reportar perdida` auth-prompt verification was not completed in this pass.

## Affected Components And Likely Files

- `docs/dev/mobile-runbook.md`
- `apps/expo/src/utils/base-url.ts`
- Expo env/config documentation
- Any local QA seed/smoke script added for auth validation

## Dependencies

None - can start immediately.

## Regression Surfaces

- Expo dev-client local launch
- Android emulator networking
- Physical-device networking
- Better Auth session endpoint
- Next.js local development server

## Non-Goals

- Do not implement new authentication UI.
- Do not change provider OAuth configuration.
- Do not commit real OAuth secrets or real user credentials.
