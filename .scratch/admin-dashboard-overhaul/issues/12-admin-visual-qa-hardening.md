# ADMIN-012 Admin visual QA hardening and scale-state polish

Status: needs-triage
Labels: needs-triage
Severity: P1
Issue ID: ADMIN-012
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Run a final strict UI/UX hardening pass across the admin app after the major workflows are real. This issue is for the designer-auditor bar: spacing, hierarchy, focus states, dark mode, Spanish copy, scale states, and regression screenshots.

## Acceptance criteria

- [ ] Admin pages use a coherent restrained operational visual language aligned with Rastro, not a one-off pink/purple form wall.
- [ ] Spanish copy is accented and consistent across admin routes.
- [ ] All primary actions have clear labels, iconography where useful, and accessible names.
- [ ] Buttons meet touch target expectations on mobile.
- [ ] Field errors use `aria-invalid` and are associated with controls.
- [ ] Keyboard focus is visible across nav, tables, filters, forms, dialogs/drawers, and destructive actions.
- [ ] Empty, loading, saving, success, validation error, server error, forbidden, not-found, and many-row states are present where applicable.
- [ ] No admin route has incoherent text overlap, clipped controls, or horizontal document overflow at required viewports.

## Required automated tests

- Playwright assertions for overflow and key route accessibility states.
- Component tests for shared empty/loading/error/admin notice primitives.
- Fallow audit for introduced complexity and duplication.

## Required visual verification

- Playwright screenshot set for each admin route at `1440x900`, `1280x900`, `390x844`, and `320x568`.
- Dark-mode screenshots for `/admin`, `/admin/proveedores`, `/admin/moderacion`, `/admin/ajustes`, and `/admin/miembros`.
- Large-text or browser zoom verification screenshots for critical workflows.
- Screenshot states for empty, one-row, twenty-row, filtered-empty, saving, success, and error cases.

## Blocked by

- ADMIN-001
- ADMIN-002
- ADMIN-004
- ADMIN-005
- ADMIN-006
- ADMIN-007
- ADMIN-008
- ADMIN-009
- ADMIN-010

## Notes

Do not use this as a place to smuggle missing backend behavior. Backend stubs should be fixed by the earlier vertical slices.
