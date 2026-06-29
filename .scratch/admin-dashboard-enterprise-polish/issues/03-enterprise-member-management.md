# AEP-003 Enterprise member management

Status: ready-for-agent
Labels: ready-for-agent
Severity: P0
Issue ID: AEP-003
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-enterprise-polish/PRD.md`

## What to build

Replace search-only member cards with an enterprise member list backed by the shared admin list contract.

## Acceptance criteria

- [ ] `admin.members.list` supports pagination, search, suspension filter, email-verification filter, created-date filters, and sorting.
- [ ] `/admin/miembros` defaults to a paginated member table, with profile drill-in preserved.
- [ ] Suspend and unsuspend continue to require a reason and write audit events.
- [ ] The list exposes empty, filtered-empty, loading, error, and many-row states.
- [ ] Non-admins cannot access member list/profile/mutation APIs.

## Required tests

- Repository/API tests for filters, sorting, pagination totals, and stable secondary sorting.
- Next tests for member table, filter controls, pagination, profile drill-in, suspend, unsuspend, and validation errors.

## Notes

Keep the existing suspension enforcement in publish/report paths intact.
