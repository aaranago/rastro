# Add member account settings, password reset, and account deletion

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the account-management path required for a production app: profile settings, password reset, sign out, and account deletion. This should be reachable from `Perfil` and work consistently on mobile and web where applicable.

## Acceptance criteria

- [x] A member can request password reset for email/password auth.
- [x] A member can sign out.
- [x] A member can initiate account deletion from the app.
- [x] Account deletion explains what happens to pet profiles, reports, listings, chats, and public content.
- [x] Admin-facing or backend behavior prevents orphaned unsafe public contact data after deletion.

## Blocked by

- `.scratch/rastro-v1/issues/04-implement-better-auth-across-expo-and-nextjs.md`

## Context

Account deletion is required for app-store compliance and should preserve safety/moderation records where needed.

## Verification notes

2026-06-18:

- Added shared Better Auth account-management behavior for password-reset requests, account deletion, and pre-delete unsafe-public-contact cleanup.
- Added Expo `Perfil` account actions for password reset, sign out, and account deletion initiation with Spanish-first copy.
- Added Next.js account settings actions and documented production email-provider replacement in `docs/product/auth-provider-setup.md`.
- `pnpm -F @acme/auth lint`, `pnpm -F @acme/auth format`, `pnpm -F @acme/auth test`, and `pnpm -F @acme/auth typecheck` passed.
- `pnpm -F @acme/expo lint`, `pnpm -F @acme/expo format`, `pnpm -F @acme/expo test`, and `pnpm -F @acme/expo typecheck` passed. Lint printed the existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/nextjs lint`, `pnpm -F @acme/nextjs format`, `pnpm -F @acme/nextjs test`, and `pnpm -F @acme/nextjs typecheck` passed. Lint printed the existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/db typecheck` passed.
- `pnpm -F @acme/api typecheck` still fails on an unrelated existing TS2742 declaration-portability issue in `packages/api/src/root.ts` and `packages/api/src/router/post.ts`.
