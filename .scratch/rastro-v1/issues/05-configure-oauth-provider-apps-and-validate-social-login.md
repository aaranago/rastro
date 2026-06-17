# Configure OAuth provider apps and validate social login

Status: ready-for-human
Type: HITL

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Configure the external provider applications and secrets required for Google, Facebook, and Apple social login, then validate the flows in the app. This requires human access to provider dashboards and secrets.

## Acceptance criteria

- [ ] Google OAuth app is configured with local and production callback URLs.
- [ ] Facebook Login app is configured with local and production callback URLs and minimal permissions.
- [ ] Apple Sign in is configured for iOS compliance with a real HTTPS return URL.
- [ ] Environment variables are populated locally without committing secrets.
- [ ] Google, Facebook, and Apple login flows are validated where platform access allows.
- [ ] `docs/product/auth-provider-setup.md` is updated if the actual callback URLs or provider steps differ.

## Blocked by

- `.scratch/rastro-v1/issues/04-implement-better-auth-across-expo-and-nextjs.md`

## Context

Read `docs/product/auth-provider-setup.md`.
