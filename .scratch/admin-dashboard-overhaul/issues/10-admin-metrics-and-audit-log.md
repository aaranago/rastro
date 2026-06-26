# ADMIN-010 Admin metrics and audit log

Status: verified-runbook
Labels: verified-runbook
Severity: P1
Issue ID: ADMIN-010
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create `/admin/metricas` and `/admin/auditoria` using persisted events from settings changes, moderation actions, provider changes, sponsor placement changes, and member suspensions.

## Acceptance criteria

- [x] Admin actions write a durable audit event with actor, action, target, timestamp, and summary.
- [x] `/admin/auditoria` lists audit events with filters by actor, target type, and action.
- [x] `/admin/metricas` shows abuse/content/resource metrics by city and department.
- [x] Metrics use structured fields, not parsed display labels.
- [x] `/admin` overview consumes a small subset of the same metrics.
- [x] Audit and metrics pages have empty, loading, error, and many-row states.

## Required automated tests

- Repository/router tests for audit event writes and reads.
- Tests that key admin mutations create audit events.
- Metrics aggregation tests by city and department.
- Next tests for filters, empty states, and route access.

## Required visual verification

- Playwright screenshots for metrics overview, filtered audit log, empty audit log, and many-row audit log.
- Assert no table clipping at 1280/1440/1600 widths and no mobile horizontal overflow.

## Blocked by

- ADMIN-003
- ADMIN-006
- ADMIN-007
- ADMIN-008
- ADMIN-009

## Notes

This issue should not add analytics vendors. Keep all metrics app-owned and database-backed.

## Verification notes

- Automated: `pnpm -F @acme/api test -- admin-audit-repository.test.ts admin-metrics-repository.test.ts report-repository.test.ts report-moderation-repository.test.ts router/admin.test.ts router/resources.test.ts`; `pnpm -F @acme/db test`; `pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/admin-metrics-dashboard.test.tsx src/admin-audit-log-dashboard.test.tsx src/admin-metrics-page.test.tsx src/admin-audit-page.test.tsx src/admin-overview-page.test.tsx src/admin-ui/admin-shell.test.tsx`.
- Type/lint/migration: `pnpm -F @acme/api typecheck`; `pnpm -F @acme/api lint`; `pnpm -F @acme/db typecheck`; `pnpm -F @acme/db lint`; `pnpm -F @acme/nextjs typecheck`; `pnpm -F @acme/nextjs lint`; `pnpm -F @acme/db migrate`; `git diff --check`.
- Fallow: `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` returned `verdict: pass` with only inherited dependency findings.
- Visual/e2e: `pnpm -C apps/nextjs with-env pnpm --dir ../.. dlx @playwright/test test --config=/tmp/rastro-admin-010-playwright/playwright.config.js`.
- Screenshots: `/tmp/rastro-admin-010-metrics-overview.png`, `/tmp/rastro-admin-010-audit-many-row.png`, `/tmp/rastro-admin-010-audit-filtered.png`, `/tmp/rastro-admin-010-audit-empty.png`, `/tmp/rastro-admin-010-overview-metrics.png`, `/tmp/rastro-admin-010-metrics-mobile.png`, `/tmp/rastro-admin-010-audit-mobile.png`.
