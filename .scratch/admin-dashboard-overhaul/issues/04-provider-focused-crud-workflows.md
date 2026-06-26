# ADMIN-004 Focused provider CRUD workflows with dialogs or drawers

Status: needs-triage
Labels: needs-triage
Severity: P1
Issue ID: ADMIN-004
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Move provider create, edit, verification, sponsor, and archive actions into focused workflows using shared admin UI primitives. The list stays read-first; actions open a dialog, drawer, detail panel, or dedicated route with one task at a time.

## Acceptance criteria

- [ ] Create provider opens a focused workflow with grouped sections.
- [ ] Edit provider opens a focused workflow and preserves untouched fields.
- [ ] Verification badge changes have their own form, note, and success/error feedback.
- [ ] Archive requires confirmation and cannot be triggered by a single accidental click.
- [ ] Sponsor attach/detach no longer asks admins to paste a placement UUID when the placement is already listed.
- [ ] Errors are field-level where possible and route/form-level where not.
- [ ] Success state identifies the provider and action that changed.
- [ ] Keyboard focus moves into opened workflows and returns to the triggering action when closed.

## Required automated tests

- Component tests for dialog/drawer open and close behavior.
- Server-action tests for create, update, verify, sponsor attach/detach, and archive failure states.
- Accessibility tests for `aria-invalid`, labels, and destructive confirmation.

## Required visual verification

- Playwright screenshots for provider read state, create workflow, edit workflow, verification workflow, sponsor workflow, and archive confirmation.
- Playwright invalid-date sponsor flow with visible field-level error.
- Keyboard-tab screenshot showing visible focus in the workflow.

## Blocked by

- ADMIN-002
- ADMIN-003

## Notes

Use shared `@acme/ui` primitives or admin composites. Do not keep duplicating raw Tailwind form controls.
