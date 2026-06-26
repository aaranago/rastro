# ADMIN-005 Standalone Local Sponsor Placement management

Status: verified-runbook
Labels: verified-runbook
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

- [x] `/admin/patrocinios` exists in the admin shell.
- [x] Admins can list Local Sponsor Placements across providers.
- [x] Admins can create, update, and detach placements for supported surfaces.
- [x] Date range validation prevents invalid start/end combinations.
- [x] Safety policy is visible and data-backed: sponsor placement cannot affect recovery priority and cannot enable push notifications.
- [x] Resource Provider detail pages still render the active sponsor placement correctly.
- [x] Public resource APIs never expose admin-only placement IDs unless explicitly intended for admin routes.

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

## ADMIN-005 verification notes

- Added `/admin/patrocinios` to the admin shell with DB-backed sponsor placement list, create, update, detach, validation, active/expired/scheduled states, and policy copy sourced from the placement model.
- Verified validators/API/Next with:
  - `pnpm -F @acme/validators test -- resource-provider-contracts.test.ts`
  - `pnpm -F @acme/api test -- router/resources.test.ts resource-provider-repository.test.ts`
  - `pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/admin-sponsor-placement-model.test.ts src/admin-sponsor-placement-actions.test.ts src/admin-sponsor-placement-dashboard.test.tsx src/admin-sponsor-placement-page.test.tsx`
- Verified touched package typecheck/lint for `@acme/validators`, `@acme/api`, and `@acme/nextjs`; verified DB migration with `pnpm -F @acme/db migrate`; verified repo health with `git diff --check` and `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`.
- Verified current code with Playwright: `pnpm dlx @playwright/test test --config=/tmp/rastro-admin-005-008-playwright/playwright.config.js`.
- Playwright covered sponsor list, create workflow, invalid date error, edit workflow, `/admin/proveedores` active sponsor reflection, and public `resources.detail` privacy for placement IDs.
- Visual artifacts: `/tmp/rastro-admin-005-sponsor-list.png`, `/tmp/rastro-admin-005-sponsor-create-workflow.png`, `/tmp/rastro-admin-005-sponsor-validation-error.png`, `/tmp/rastro-admin-005-sponsor-edit-workflow.png`, and `/tmp/rastro-admin-005-provider-sponsor-visible.png`.
