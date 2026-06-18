# Configure OAuth provider apps and validate social login

Status: needs-info
Type: HITL

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Configure the external provider applications and secrets required for Google, Facebook, and Apple social login, then validate the flows in the app. This requires human access to provider dashboards and secrets.

## Acceptance criteria

- [ ] Google OAuth app is configured with local and production callback URLs.
- [ ] Facebook Login app is configured with local and production callback URLs and minimal permissions.
- [ ] Apple Sign in is configured for iOS compliance with a real HTTPS return URL. Deferred to v2 by product decision on 2026-06-18.
- [x] Environment variables are populated locally without committing secrets for Google and Facebook. Apple env vars are intentionally unset for v2.
- [ ] Google and Facebook login flows are validated where platform access allows. Blocked locally by Postgres connectivity; see verification notes.
- [x] `docs/product/auth-provider-setup.md` is updated if the actual callback URLs or provider steps differ.

## Blocked by

- `.scratch/rastro-v1/issues/04-implement-better-auth-across-expo-and-nextjs.md`

## Context

Read `docs/product/auth-provider-setup.md`.

## Verification notes

2026-06-18:

- Confirmed `.env` is ignored by git and no local env file is tracked.
- Confirmed local env has `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_FACEBOOK_ID`, and `AUTH_FACEBOOK_SECRET` set.
- Confirmed Apple env vars are unset for v2: `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_CLIENT_SECRET`, and `AUTH_APPLE_APP_BUNDLE_IDENTIFIER`.
- Confirmed `BETTER_AUTH_URL` is set to the ngrok HTTPS domain used for provider callbacks.
- Confirmed the Next.js auth UI renders `Continuar con Google` and `Continuar con Facebook`; `Continuar con Apple` does not render because Apple env is unset.
- `pnpm -F @acme/auth test` passed.
- `pnpm -F @acme/nextjs typecheck` passed.
- Direct provider handoff checks returned HTTP 500 for both `POST /api/auth/sign-in/social` with `provider=google` and `provider=facebook`.
- The server error occurred before redirecting to Google or Facebook because Better Auth could not insert the OAuth verification row. At this point `POSTGRES_URL` still resolved to the template tenant/user `postgres.[USERNAME]`.

2026-06-18 follow-up:

- Re-ran `pnpm --filter @acme/auth generate` and overwrote `packages/db/src/auth-schema.ts` with the Better Auth CLI output.
- Confirmed the new `POSTGRES_URL` is non-placeholder and points at a Postgres URL on port `5432`.
- `pnpm -F @acme/db typecheck` passed with the generated auth schema.
- `pnpm -F @acme/auth test` passed with the generated auth schema.
- `pnpm -F @acme/db push` failed before schema application because the configured Postgres host refused TCP connections on port `5432`.
- Direct TCP check to the configured database host on port `5432` also returned connection refused.

Remaining unblocker:

- Make the configured Postgres instance reachable from this machine on the URL/port in `POSTGRES_URL`, or update `POSTGRES_URL` to the reachable external port. Then rerun `pnpm -F @acme/db push` and Google/Facebook handoff validation.
