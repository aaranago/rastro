# Build admin moderation dashboard

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the Next.js admin dashboard path for reviewing abuse reports and controlling moderation settings. Admin work should be dashboard-focused on web, not forced into the phone app.

## Acceptance criteria

- [ ] Admins can view flagged reports, listings, chats, and resource-provider profiles.
- [ ] Admins can hide or restore reports/listings.
- [ ] Admins can ban or unban abusive members.
- [ ] Admins can toggle Review Mode for adoption listings.
- [ ] Admins can toggle verified email required to publish.
- [ ] Admins can see basic abuse metrics by city or department.
- [ ] Non-admin members cannot access admin surfaces.

## Blocked by

- `.scratch/rastro-v1/issues/18-add-abuse-reporting-and-blocking-end-to-end.md`

## Context

Use `Review Mode` terminology from `CONTEXT.md`. Admin lives in Next.js.
