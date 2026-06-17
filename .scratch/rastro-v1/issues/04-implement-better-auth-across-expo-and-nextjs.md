# Implement Better Auth across Expo and Next.js

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Implement Better Auth as the v1 authentication provider for the Expo app and Next.js app. A visitor should be able to browse without signing in, and a member should be able to sign in with email/password and see authenticated app state.

## Acceptance criteria

- [x] Better Auth is configured for email/password login and registration.
- [x] Expo persists sessions securely and can show signed-in versus signed-out UI.
- [x] Next.js can read the authenticated member in server/API contexts.
- [x] Starter Discord auth is removed or replaced with Rastro-required providers.
- [x] Email verification is configurable but off by default.
- [x] Auth configuration aligns with ADR-0001.

## Blocked by

- `.scratch/rastro-v1/issues/02-build-rastro-app-shell-branding-spanish-labels-and-navigation.md`

## Context

Read `docs/adr/0001-use-better-auth-for-v1.md` and `docs/product/auth-provider-setup.md`.
