# ADMIN-005 Standalone Local Sponsor Placement management

Status: needs-triage
Labels: needs-triage
Severity: P1
Issue ID: ADMIN-005
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create `/admin/patrocinios` as the operational surface for Local Sponsor Placement management. It should list placements across Resource Providers, surfaces, date ranges, active/expired state, and safety policy.

This is not a billing/customer management system. It is the v1 admin tool for the sponsor placement data that already exists in the Resource Provider model.

## Acceptance criteria

- [ ] `/admin/patrocinios` exists in the admin shell.
- [ ] Admins can list Local Sponsor Placements across providers.
- [ ] Admins can create, update, and detach placements for supported surfaces.
- [ ] Date range validation prevents invalid start/end combinations.
- [ ] Safety policy is visible and data-backed: sponsor placement cannot affect recovery priority and cannot enable push notifications.
- [ ] Resource Provider detail pages still render the active sponsor placement correctly.
- [ ] Public resource APIs never expose admin-only placement IDs unless explicitly intended for admin routes.

## Required automated tests

- Validator/API tests for placement update if a new mutation is added.
- Repository/router tests for placement list/update across providers.
- Next component/action tests for list, create, update, detach, and validation errors.

## Required visual verification

- Playwright screenshots for sponsor list, create/edit workflow, expired placement state, and validation error state.
- Verify sponsor changes appear on `/admin/proveedores` and public provider detail where appropriate.

## Blocked by

- ADMIN-001
- ADMIN-004

## Notes

Keep billing, invoices, payments, and advertiser CRM out of this issue unless the product scope changes.
