# Admin dashboard enterprise polish

Status: ready-for-agent
Labels: ready-for-agent
Owner: Unassigned

## Problem

The verified admin overhaul established real DB-backed routes, but the current admin area still has gaps that matter for operational use:

- Admin list endpoints do not share a paginated, sortable, filterable contract.
- Member management is search-first and card-first instead of list-first.
- Moderation queues are unpaginated and lack false-report decisions or provider-report resolution workflows.
- Provider and sponsor media are still raw URL fields or missing from sponsor placement contracts.
- Admin chrome still exposes implementation residue such as availability badges and old issue IDs.

## Product direction

Build an enterprise admin work surface for Rastro that remains Spanish-first and Bolivia-first, keeps `RASTRO_ADMIN_EMAILS` as the v1 admin gate, and treats moderation/resource data as persisted operational records.

## Shared Admin List Contract

All admin list endpoints introduced or touched in this wave must accept:

- `page`
- `pageSize`
- `search`
- `sortBy`
- `sortDirection`
- typed `filters`

They must return:

- `items`
- `total`
- `page`
- `pageSize`
- `pageCount`
- `hasNextPage`
- `hasPreviousPage`
- `availableFilters`
- `availableSorts`

Use stable secondary sorting for deterministic pagination.

## Scope

- Shared list helpers, validators, and repository contracts for members, Resource Providers, Local Sponsor Placements, report moderation, provider moderation, audit, and future admin lists.
- Shadcn-style admin shell polish with a sidebar/dashboard structure, mobile drawer/collapse behavior, breadcrumbs, command/search affordance, filter bars, table pagination, and reusable admin data-table primitives.
- Enterprise member list with pagination, search, suspension filter, email-verification filter, created-date filters, sorting, profile drill-in, suspend/unsuspend, and audit events.
- Moderation queues with server-side filtering/pagination, item/detail lookup, persisted false-report decisions for report targets, and persisted provider-report resolution states.
- Admin-managed provider and sponsor media using the existing S3/MinIO adapter, while retaining public provider `logoUrl` and `photoUrl` compatibility.
- Public and Expo sponsor placement contracts include image fields so Recursos cards, provider profiles, and sponsor placement surfaces can render uploaded media.

## Out of Scope

- Persisted admin roles/permissions beyond `RASTRO_ADMIN_EMAILS`.
- Sponsor billing, CRM, invoicing, or payment handling.
- Re-ranking recovery content based on sponsorship.
- Deleting code solely because a static tool reports it unused.

## Definition of Done

- No admin list endpoint touched in this wave ships as unpaginated, client-filtered-only, or limit-only.
- False-marked reports are excluded from public/mobile reads the same way hidden reports are excluded.
- Provider-report resolution captures admin actor, timestamp, status, note, and audit event.
- Admin media upload flows support preview, progress, retry, replace, remove, validation errors, and explicit URL fallback where supported.
- Expo renders provider and sponsor image URLs from the public contracts.
- Relevant package tests, lint, typecheck, Fallow audit, and full-stack verification are recorded in issue comments.
