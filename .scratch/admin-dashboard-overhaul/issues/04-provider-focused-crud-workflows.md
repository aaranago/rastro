# ADMIN-004 Focused provider CRUD workflows with dialogs or drawers

Status: verified-runbook
Labels: verified-runbook
Severity: P1
Issue ID: ADMIN-004
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Move provider create, edit, verification, sponsor, and archive actions into focused workflows using shared admin UI primitives. The list stays read-first; actions open a dialog, drawer, detail panel, or dedicated route with one task at a time.

## Acceptance criteria

- [x] Create provider opens a focused workflow with grouped sections.
- [x] Edit provider opens a focused workflow and preserves untouched fields.
- [x] Verification badge changes have their own form, note, and success/error feedback.
- [x] Archive requires confirmation and cannot be triggered by a single accidental click.
- [x] Sponsor attach/detach no longer asks admins to paste a placement UUID when the placement is already listed.
- [x] Errors are field-level where possible and route/form-level where not.
- [x] Success state identifies the provider and action that changed.
- [x] Keyboard focus moves into opened workflows and returns to the triggering action when closed.

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

## ADMIN-004 verification notes

- Implemented focused provider create, edit, verification, sponsor, and archive workflows in `/admin/proveedores`.
- Verified server actions and form parsing with `pnpm -F @acme/nextjs test -- admin-resource-provider-actions.test.ts admin-resource-provider-form-parser.test.ts admin-resources-dashboard.test.tsx admin-resources-page.test.tsx admin-moderation-page.test.tsx admin-moderation-dashboard.test.tsx`.
- Verified Next lint/typecheck with `pnpm -F @acme/nextjs lint` and `pnpm -F @acme/nextjs typecheck`.
- Verified repo health with `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` and `git diff --check`.
- Playwright artifacts: `/tmp/rastro-admin-004-read-state-fixed.png`, `/tmp/rastro-admin-004-create-workflow.png`, `/tmp/rastro-admin-004-edit-workflow.png`, `/tmp/rastro-admin-004-verification-workflow.png`, `/tmp/rastro-admin-004-sponsor-workflow.png`, `/tmp/rastro-admin-004-archive-confirmation.png`, `/tmp/rastro-admin-004-invalid-sponsor-date.png`, and `/tmp/rastro-admin-004-keyboard-focus-create.png`.
