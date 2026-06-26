# ADMIN-001 Admin shell, navigation, and shadcn primitive foundation

Status: needs-triage
Labels: needs-triage
Severity: P0
Issue ID: ADMIN-001
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create the foundation for the Next.js admin app area: a shared `/admin` shell, a dashboard landing page, route navigation, access-denied state, and the missing shadcn-style primitives needed by admin screens.

This slice must introduce the admin structure without pretending that downstream CRUD domains are complete. The `/admin` landing page should show real available sections, mark incomplete sections clearly, and link to `/admin/moderacion` and `/admin/proveedores`.

## Acceptance criteria

- [ ] `/admin` exists and renders for allowed admins.
- [ ] Non-admin visitors see a polished access-denied state through the shared admin shell.
- [ ] Admin navigation includes Overview, Moderación, Proveedores, Patrocinios, Miembros, Ajustes, Métricas, and Auditoría.
- [ ] Navigation clearly distinguishes implemented routes from planned routes.
- [ ] `packages/ui` exports the missing shadcn-style primitives needed for admin work: Card, Badge, Table, Alert, Textarea, Select, Checkbox/Switch, Skeleton, and Dialog/Sheet or Collapsible/Tabs.
- [ ] Admin pages use shared admin shell primitives instead of each page inventing its own top-level chrome.
- [ ] The global floating theme toggle no longer overlaps admin routes; admin controls live in the admin header/shell.
- [ ] Spanish copy is accented and uses Rastro domain language.

## Required automated tests

- Next unit/component test for admin access-denied state.
- Next unit/component test for admin navigation link labels and active route state.
- UI package typecheck/lint for added primitives.

## Required visual verification

- Playwright screenshot for `/admin` at `1440x900`, `1280x900`, `390x844`, and `320x568`.
- Assert no mobile horizontal document overflow.
- Capture dark-mode screenshot for `/admin`.

## Blocked by

None - can start immediately.

## Notes

Do not wire fake CRUD into planned routes. It is acceptable for a planned section to render a polished "Todavía no disponible" state if it links to the issue that will implement it.
