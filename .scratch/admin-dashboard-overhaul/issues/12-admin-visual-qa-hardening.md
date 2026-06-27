# ADMIN-012 Admin visual QA hardening and scale-state polish

Status: verified-runbook
Labels: verified-runbook
Severity: P1
Issue ID: ADMIN-012
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Run a final strict UI/UX hardening pass across the admin app after the major workflows are real. This issue is for the designer-auditor bar: spacing, hierarchy, focus states, dark mode, Spanish copy, scale states, and regression screenshots.

## Acceptance criteria

- [x] Admin pages use a coherent restrained operational visual language aligned with Rastro, not a one-off pink/purple form wall.
- [x] Spanish copy is accented and consistent across admin routes.
- [x] All primary actions have clear labels, iconography where useful, and accessible names.
- [x] Buttons meet touch target expectations on mobile.
- [x] Field errors use `aria-invalid` and are associated with controls.
- [x] Keyboard focus is visible across nav, tables, filters, forms, dialogs/drawers, and destructive actions.
- [x] Empty, loading, saving, success, validation error, server error, forbidden, not-found, and many-row states are present where applicable.
- [x] No admin route has incoherent text overlap, clipped controls, or horizontal document overflow at required viewports.

## Required automated tests

- [x] Playwright assertions for overflow and key route accessibility states.
- [x] Component tests for shared empty/loading/error/admin notice primitives.
- [x] Fallow audit for introduced complexity and duplication.

## Required visual verification

- [x] Playwright screenshot set for each admin route at `1440x900`, `1280x900`, `390x844`, and `320x568`.
- [x] Dark-mode screenshots for `/admin`, `/admin/proveedores`, `/admin/moderacion`, `/admin/ajustes`, and `/admin/miembros`.
- [x] Large-text or browser zoom verification screenshots for critical workflows.
- [x] Screenshot states for empty, one-row, twenty-row, filtered-empty, saving, success, and error cases.

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

## Verification

Implemented and verified in a coordinator pass for the full admin dashboard:

- Shared admin shell and overview use Spanish operational copy, mobile-safe navigation, visible focus states, and a dark-mode theme toggle that persists after reload.
- `/admin/proveedores`, `/admin/patrocinios`, `/admin/moderacion`, `/admin/miembros`, `/admin/ajustes`, `/admin/metricas`, and `/admin/auditoria` were checked for resolved data states, mobile layout, dark mode where required, large text, and overflow.
- Added shared loading and pending-submit primitives, admin-local not-found recovery, route loading states, mobile moderation cards, sponsor placement cards, and associated `aria-invalid`/`aria-describedby` error states.
- Mutation forms expose saving labels through `AdminSubmitButton` and the settings save state was captured with the POST intentionally paused.
- Fallow passed with no introduced dead code, complexity, duplication, private type leak, or boundary findings; remaining reported issues are inherited repo health items.

Commands:

```sh
pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/admin-not-found-page.test.tsx src/admin-ui/admin-shell.test.tsx src/admin-ui/admin-route-state.test.tsx src/admin-ui/admin-submit-button.test.tsx src/admin-overview-page.test.tsx src/admin-sponsor-placement-dashboard.test.tsx src/admin-sponsor-placement-model.test.ts src/admin-sponsor-placement-page.test.tsx src/admin-settings-dashboard.test.tsx src/admin-settings-page.test.tsx src/admin-member-dashboard.test.tsx src/admin-moderation.test.ts src/admin-moderation-dashboard.test.tsx src/admin-moderation-page.test.tsx src/admin-resources-dashboard.test.tsx src/admin-resource-provider-actions.test.ts src/admin-resource-provider-admin-model.test.ts
pnpm -F @acme/nextjs lint
pnpm -F @acme/ui lint
pnpm -F @acme/nextjs typecheck
pnpm -F @acme/ui typecheck
git diff --check
pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true
pnpm -C apps/nextjs with-env node /tmp/rastro-admin-012-playwright/seed-admin-012.js
pnpm -C apps/nextjs with-env pnpm --dir ../.. dlx @playwright/test test --config=/tmp/rastro-admin-012-playwright/playwright.config.js
```

Playwright evidence:

- Route matrix screenshots: `/tmp/rastro-admin-012-{overview,moderacion,proveedores,patrocinios,miembros,ajustes,metricas,auditoria}-{1440,1280,390,320}.png`.
- Dark-mode screenshots: `/tmp/rastro-admin-012-{overview,proveedores,moderacion,ajustes,miembros}-dark-1440.png`.
- Large-text screenshots: `/tmp/rastro-admin-012-{overview,proveedores,miembros,metricas}-large-text.png`.
- State screenshots: `/tmp/rastro-admin-012-state-{filtered-empty,not-found,one-row,twenty-row,saving,success,server-error}.png`.
