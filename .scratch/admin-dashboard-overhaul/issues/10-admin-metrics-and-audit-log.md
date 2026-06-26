# ADMIN-010 Admin metrics and audit log

Status: needs-triage
Labels: needs-triage
Severity: P1
Issue ID: ADMIN-010
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create `/admin/metricas` and `/admin/auditoria` using persisted events from settings changes, moderation actions, provider changes, sponsor placement changes, and member suspensions.

## Acceptance criteria

- [ ] Admin actions write a durable audit event with actor, action, target, timestamp, and summary.
- [ ] `/admin/auditoria` lists audit events with filters by actor, target type, and action.
- [ ] `/admin/metricas` shows abuse/content/resource metrics by city and department.
- [ ] Metrics use structured fields, not parsed display labels.
- [ ] `/admin` overview consumes a small subset of the same metrics.
- [ ] Audit and metrics pages have empty, loading, error, and many-row states.

## Required automated tests

- Repository/router tests for audit event writes and reads.
- Tests that key admin mutations create audit events.
- Metrics aggregation tests by city and department.
- Next tests for filters, empty states, and route access.

## Required visual verification

- Playwright screenshots for metrics overview, filtered audit log, empty audit log, and many-row audit log.
- Assert no table clipping at 1280/1440/1600 widths and no mobile horizontal overflow.

## Blocked by

- ADMIN-003
- ADMIN-006
- ADMIN-007
- ADMIN-008
- ADMIN-009

## Notes

This issue should not add analytics vendors. Keep all metrics app-owned and database-backed.
