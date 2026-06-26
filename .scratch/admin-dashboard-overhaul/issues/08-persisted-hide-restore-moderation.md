# ADMIN-008 Persisted hide and restore moderation for reports and listings

Status: needs-triage
Labels: needs-triage
Severity: P0
Issue ID: ADMIN-008
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Replace in-memory hide/restore actions with persisted moderation state for report and listing targets. Public and mobile reads must respect hidden/restored state consistently.

## Acceptance criteria

- [ ] Admins can hide and restore lost, found, sighting, and adoption targets from a DB-backed moderation queue.
- [ ] Hidden targets are excluded or visibly marked according to product rules on public/mobile surfaces.
- [ ] Restored targets return to normal visibility.
- [ ] Actions capture admin actor, timestamp, reason/note, and target.
- [ ] Admin queue and detail pages reflect the latest persisted state after reload.
- [ ] In-memory hide/restore behavior is removed from production admin routes.

## Required automated tests

- DB/repository tests for content moderation state transitions.
- API/router tests for admin-only hide/restore.
- Report `nearby` and `detail` tests for hidden/restored visibility behavior.
- Next tests for queue action forms and action feedback.

## Required visual verification

- Playwright flow: hide target, reload admin, verify hidden state.
- Public/mobile smoke: hidden target is no longer promoted or is marked according to rule.
- Playwright flow: restore target and verify visibility returns.

## Blocked by

- ADMIN-007

## Notes

If adoption listings remain represented as `report.type = adoption`, use the existing report model rather than inventing a second listing table in this issue.
