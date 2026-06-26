# ADMIN-009 Member management and persisted suspension enforcement

Status: needs-triage
Labels: needs-triage
Severity: P0
Issue ID: ADMIN-009
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create `/admin/miembros` for member search and safety actions. Replace in-memory ban/unban with a persisted member suspension model and enforce it in publish/action paths.

## Acceptance criteria

- [ ] `/admin/miembros` exists in the admin shell.
- [ ] Admins can search members by email/name/id.
- [ ] Member profile shows account state, email verification state, recent reports/listings, moderation reports, and suspension history.
- [ ] Admins can suspend and unsuspend members with a required reason.
- [ ] Suspended members cannot publish reports/listings or create Resource Provider reports.
- [ ] Suspension state survives restart and appears in moderation queues.
- [ ] Non-admins cannot access member management APIs or pages.

## Required automated tests

- DB/repository tests for suspension state and history.
- API/router tests for admin-only member search and suspend/unsuspend.
- Publish-path tests that suspended members are blocked.
- Next component/action tests for member search, profile, suspend, unsuspend, and validation errors.

## Required visual verification

- Playwright screenshots for member list, member profile, suspend confirmation, suspended state, and unsuspend flow.
- Full-stack smoke proving a suspended member cannot publish through the API.

## Blocked by

- ADMIN-001
- ADMIN-007

## Notes

Admin roles can remain env allowlist for this issue unless a separate persisted admin-role decision is made.
