# ADMIN-003 Provider data contract cleanup for city, department, location, links, and contacts

Status: verified-runbook
Labels: verified-runbook
Severity: P0
Issue ID: ADMIN-003
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Fix the Resource Provider admin data contract so the UI does not ask for fields it discards, does not infer metrics from display strings, and does not lose contact data during edits.

Persist city and department as structured provider location fields or remove them from the admin form until they are real. Preserve all contact options during edits. Expose logo/photo/social/external link fields that already exist in the backend model, with clear public/internal copy.

## Acceptance criteria

- [x] `Departamento` and `Ciudad` are either persisted as structured Resource Provider fields or removed from required forms.
- [x] Provider metrics by city/department use structured data, not `approximateLocationLabel` parsing.
- [x] Create and edit forms preserve up to 8 contact options supported by the validator.
- [x] Editing one provider field does not silently replace or delete unrelated contact options.
- [x] Logo URL, photo URL, website, social links, and external links are manageable from admin if supported by the DB/API contract.
- [x] Exact coordinates, public approximate location, and location cell are grouped in an advanced location section with privacy copy.
- [x] Public `resources.nearby` and `resources.detail` still omit exact private coordinates.

## Required automated tests

- Validator tests for any new city/department location contract.
- API repository/router tests for create/update preserving multiple contacts and link fields.
- Next server-action tests for multi-contact create/edit.
- Next component tests for field-level validation errors.

## Required visual verification

- Playwright flow: create provider with city/department and 3 contacts; reload; verify metrics and all contacts remain.
- Playwright flow: edit only the description; reload; verify contacts are unchanged.
- Screenshot of the advanced location section and privacy copy.

## Blocked by

- ADMIN-001

## Notes

This is a data-integrity issue, not only a UI issue. It should include DB migration work if city/department remain part of the provider model.

## ADMIN-003 verification notes

- Added structured Resource Provider `city` and `department` location fields through validators, DB schema/migration, API repository/router, Next admin model, and admin forms.
- Verified multi-contact and link parsing with focused Next tests for create/update form parsing and admin dashboard rendering.
- Verified public API privacy with router tests: `resources.nearby` and `resources.detail` omit exact private coordinates.
- Verified live Next admin flow with `pnpm dlx @playwright/test test --config=/tmp/rastro-admin-playwright.config.js`: admin login, create provider with city/department and 3 contacts, verify all contacts/links, edit only description, fresh server render, and verify contacts/location remained unchanged.
- Visual artifact for advanced location/privacy copy: `/tmp/rastro-admin-verification/provider-location-privacy.png`.
