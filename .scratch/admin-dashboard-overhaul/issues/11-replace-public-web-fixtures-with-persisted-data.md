# ADMIN-011 Replace public web fixture pages with persisted report data

Status: verified-runbook
Labels: verified-runbook
Severity: P1
Issue ID: ADMIN-011
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Point public shared report/listing pages at the same persisted data used by the app/API so admin visibility changes and real reports are reflected on web.

## Acceptance criteria

- [x] `/reportes/perdidos/[reportId]` reads persisted report detail instead of fixture-only data.
- [x] `/adopciones/[listingId]` reads persisted adoption report/listing data instead of fixture-only data, or the route is explicitly aligned with the current report model.
- [x] Hidden/deleted report states from admin moderation are reflected on public web pages.
- [x] Public pages never expose private exact coordinates.
- [x] Existing public SEO/open-graph behavior remains valid for persisted records.
- [x] Fixture data remains test-only.

## Required automated tests

- Repository/API adapter tests for public report detail mapping.
- Next page tests for persisted lost report, persisted adoption listing/report, not-found, hidden, and deleted states.
- Privacy tests ensuring exact coordinates are absent from public page props/rendered HTML.

## Required visual verification

- Playwright screenshots for persisted lost report, persisted adoption listing/report, hidden state, and not-found state.

## Blocked by

- ADMIN-008

## Notes

This belongs in the admin wave because admin moderation must affect public shared pages, but it can be split into a separate public-sharing PRD if needed.

## Verification notes

- Automated: `pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/public-report-detail-api-adapter.test.ts src/public-lost-reports.test.ts src/public-lost-reports-page.test.tsx src/public-adoption-listings.test.ts src/public-adoption-listings-page.test.tsx`.
- Regression batch: `pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/admin-ui/admin-shell.test.tsx src/admin-member-actions.test.ts src/admin-member-dashboard.test.tsx src/admin-member-page.test.tsx src/admin-moderation-page.test.tsx src/admin-moderation-dashboard.test.tsx src/public-report-detail-api-adapter.test.ts src/public-lost-reports.test.ts src/public-lost-reports-page.test.tsx src/public-adoption-listings.test.ts src/public-adoption-listings-page.test.tsx`.
- Visual/full-stack: `pnpm -C apps/nextjs with-env node /tmp/rastro-admin-009-011-playwright/seed-admin-009-011.js && pnpm -C apps/nextjs with-env pnpm --dir ../.. dlx @playwright/test test --config=/tmp/rastro-admin-009-011-playwright/playwright.config.js`.
- Screenshots: `/tmp/rastro-admin-011-public-lost-persisted.png`, `/tmp/rastro-admin-011-public-adoption-persisted.png`, `/tmp/rastro-admin-011-hidden-not-found.png`.
