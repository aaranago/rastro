# Add member account settings, password reset, and account deletion

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the account-management path required for a production app: profile settings, password reset, sign out, and account deletion. This should be reachable from `Perfil` and work consistently on mobile and web where applicable.

## Acceptance criteria

- [ ] A member can request password reset for email/password auth.
- [ ] A member can sign out.
- [ ] A member can initiate account deletion from the app.
- [ ] Account deletion explains what happens to pet profiles, reports, listings, chats, and public content.
- [ ] Admin-facing or backend behavior prevents orphaned unsafe public contact data after deletion.

## Blocked by

- `.scratch/rastro-v1/issues/04-implement-better-auth-across-expo-and-nextjs.md`

## Context

Account deletion is required for app-store compliance and should preserve safety/moderation records where needed.
