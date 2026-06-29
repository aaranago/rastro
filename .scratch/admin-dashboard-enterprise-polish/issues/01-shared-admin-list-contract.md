# AEP-001 Shared admin list contract

Status: ready-for-agent
Labels: ready-for-agent
Severity: P0
Issue ID: AEP-001
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-enterprise-polish/PRD.md`

## What to build

Introduce a shared paginated admin list contract for backend repositories, tRPC routers, and Next admin adapters.

## Acceptance criteria

- [ ] Shared list input validates `page`, `pageSize`, `search`, `sortBy`, `sortDirection`, and typed `filters`.
- [ ] Shared list output includes `items`, `total`, `page`, `pageSize`, `pageCount`, `hasNextPage`, `hasPreviousPage`, `availableFilters`, and `availableSorts`.
- [ ] Audit, member search, report moderation queue, provider moderation queue, provider list, and sponsor list use the contract or have typed adapters that normalize to it.
- [ ] Invalid page/sort/filter input is rejected or normalized consistently.
- [ ] Pagination uses deterministic secondary sorting.

## Required tests

- Validator/helper tests for page bounds, page count, empty lists, invalid sort keys, and available filters/sorts.
- API tests for at least audit, members, and one moderation queue using the shared contract.

## Notes

Keep this contract generic enough for future admin lists without leaking domain-specific filter keys into the base helper.
