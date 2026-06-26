# ADMIN-001 Admin shell, navigation, and shadcn primitive foundation

Status: verified-runbook
Labels: verified-runbook
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

- [x] `/admin` exists and renders for allowed admins.
- [x] Non-admin visitors see a polished access-denied state through the shared admin shell.
- [x] Admin navigation includes Overview, Moderación, Proveedores, Patrocinios, Miembros, Ajustes, Métricas, and Auditoría.
- [x] Navigation clearly distinguishes implemented routes from planned routes.
- [x] `packages/ui` exports the missing shadcn-style primitives needed for admin work: Card, Badge, Table, Alert, Textarea, Select, Checkbox/Switch, Skeleton, and Dialog/Sheet or Collapsible/Tabs.
- [x] Admin pages use shared admin shell primitives instead of each page inventing its own top-level chrome.
- [x] The global floating theme toggle no longer overlaps admin routes; admin controls live in the admin header/shell.
- [x] Spanish copy is accented and uses Rastro domain language.

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

## ADMIN-001 verification notes

- Implemented shared admin shell under `apps/nextjs/src/admin-ui/`, `/admin/layout.tsx`, and `/admin/page.tsx`.
- Verified admin navigation labels and active state with `pnpm -C apps/nextjs exec vitest run --config vitest.config.ts src/admin-ui/admin-shell.test.tsx`.
- Verified `@acme/ui` generated primitives with `pnpm -F @acme/ui lint` and `pnpm -F @acme/ui typecheck`.
- Verified focused Next admin tests with `pnpm -C apps/nextjs test src/admin-ui/admin-shell.test.tsx src/admin-resource-provider-admin-model.test.ts src/admin-resource-provider-form-parser.test.ts src/admin-resources-dashboard.test.tsx src/admin-resources-page.test.tsx`.
- Verified ADMIN-001 file-scoped lint with `pnpm -C apps/nextjs exec eslint --flag unstable_native_nodejs_ts_config src/admin-ui/admin-navigation.tsx src/admin-ui/admin-shell-client.tsx src/admin-ui/admin-shell.tsx src/admin-ui/admin-shell.test.tsx src/app/admin/layout.tsx src/app/admin/page.tsx`.
- Verified full Next lint/typecheck with `pnpm -C apps/nextjs lint` and `pnpm -C apps/nextjs typecheck`.
- Playwright artifacts: `/tmp/rastro-admin-001-visual/admin-1440x900.png`, `/tmp/rastro-admin-001-visual/admin-1280x900.png`, `/tmp/rastro-admin-001-visual/admin-390x844.png`, `/tmp/rastro-admin-001-visual/admin-320x568.png`, `/tmp/rastro-admin-001-visual/admin-1440x900-dark.png`, and `/tmp/rastro-admin-001-visual/overflow-report.json`.
- Fallow: `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` passed with only inherited dependency findings.
- Coordinator verification completed allowed-admin Playwright flow with `pnpm dlx @playwright/test test --config=/tmp/rastro-admin-playwright.config.js`; screenshots: `/tmp/rastro-admin-verification/admin-overview-allowed-1440.png` and `/tmp/rastro-admin-verification/admin-overview-allowed-390.png`.
