# ADMIN-003 Provider data contract cleanup for city, department, location, links, and contacts

Status: needs-triage
Labels: needs-triage
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

- [ ] `Departamento` and `Ciudad` are either persisted as structured Resource Provider fields or removed from required forms.
- [ ] Provider metrics by city/department use structured data, not `approximateLocationLabel` parsing.
- [ ] Create and edit forms preserve up to 8 contact options supported by the validator.
- [ ] Editing one provider field does not silently replace or delete unrelated contact options.
- [ ] Logo URL, photo URL, website, social links, and external links are manageable from admin if supported by the DB/API contract.
- [ ] Exact coordinates, public approximate location, and location cell are grouped in an advanced location section with privacy copy.
- [ ] Public `resources.nearby` and `resources.detail` still omit exact private coordinates.

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
