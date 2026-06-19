# Build admin moderation dashboard

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the Next.js admin dashboard path for reviewing abuse reports and controlling moderation settings. Admin work should be dashboard-focused on web, not forced into the phone app.

## Acceptance criteria

- [x] Admins can view flagged reports, listings, chats, and resource-provider profiles.
- [x] Admins can hide or restore reports/listings.
- [x] Admins can ban or unban abusive members.
- [x] Admins can toggle Review Mode for adoption listings.
- [x] Admins can toggle verified email required to publish.
- [x] Admins can see basic abuse metrics by city or department.
- [x] Non-admin members cannot access admin surfaces.

## Blocked by

- `.scratch/rastro-v1/issues/18-add-abuse-reporting-and-blocking-end-to-end.md`

## Context

Use `Review Mode` terminology from `CONTEXT.md`. Admin lives in Next.js.

## Verification notes

2026-06-18:

- Added a fixture-backed admin moderation boundary with Spanish `es-BO` view models, admin-only access, moderation queues, settings toggles, and abuse metrics.
- Added a reusable server-rendered Next.js dashboard and wired `/admin/moderacion` to Better Auth sessions through the `RASTRO_ADMIN_EMAILS` admin allowlist.
- Wired dashboard form submissions to the moderation boundary for hide/restore, ban/unban, Review Mode, and verified-email-required publishing changes.
- Verified with Next.js tests, typecheck, lint, Prettier, and Fallow audit.
