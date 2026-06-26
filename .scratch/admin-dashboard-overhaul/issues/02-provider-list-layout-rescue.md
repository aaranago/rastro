# ADMIN-002 Provider list layout rescue and read-first queue

Status: verified-runbook
Labels: verified-runbook
Severity: P0
Issue ID: ADMIN-002
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Replace the cramped `/admin/proveedores` one-page surface with a read-first provider queue that does not clip controls and does not make every CRUD form visible at once.

The provider list should make the core admin state scannable: provider, category, city/department, verification, active sponsor count, open/emergency state, last updated, and primary actions.

## Acceptance criteria

- [x] Provider queue is the primary surface above creation/edit forms.
- [x] Desktop layout does not clip action controls at 1280, 1440, or 1600px widths.
- [x] Mobile layout has no horizontal document overflow at 320 or 390px widths.
- [x] The create-provider form is hidden behind a clear action, not always open by default.
- [x] Provider rows/cards are read-first and do not contain full edit, sponsor, verification, and archive forms inline.
- [x] Empty state, one-provider state, and many-provider state are all polished.
- [x] Existing DB-backed provider list behavior remains intact.

## Required automated tests

- Next component tests for empty, one-provider, and many-provider render states.
- Test that admin action labels remain available in the read-first queue.

## Required visual verification

- Playwright screenshots for `/admin/proveedores` at `1440x900`, `1280x900`, `1600x900`, `390x844`, and `320x568`.
- Browser assertion that `document.documentElement.scrollWidth <= document.documentElement.clientWidth` on mobile.
- Visual evidence that the rightmost provider action is visible on desktop.

## Blocked by

- ADMIN-001

## Notes

Do not solve every provider edit field in this slice. This is a layout and scanability rescue that preserves existing server-backed data.

## ADMIN-002 verification notes

- Component tests: `pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/admin-resources-dashboard.test.tsx src/admin-resources-page.test.tsx src/admin-resource-provider-admin-model.test.ts`
- Repository tests: `pnpm -F @acme/api exec vitest run src/resource-provider-repository.test.ts`
- Visual checks: `RASTRO_ADMIN_COOKIE=<redacted> pnpm dlx @playwright/test test --config=/tmp/rastro-admin-002-playwright/playwright.config.ts`
- Static checks: `pnpm -F @acme/nextjs typecheck`, `pnpm -F @acme/nextjs lint`, `pnpm -F @acme/api typecheck`, `pnpm -F @acme/api lint`, `git diff --check`
- Fallow: `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` returned remaining shared-worktree findings in admin settings files outside ADMIN-002; the ADMIN-002 private type leak was fixed and did not remain in the final audit.
- Screenshots: `/tmp/rastro-admin-002-1440x900.png`, `/tmp/rastro-admin-002-1280x900.png`, `/tmp/rastro-admin-002-1600x900.png`, `/tmp/rastro-admin-002-390x844.png`, `/tmp/rastro-admin-002-320x568.png`
