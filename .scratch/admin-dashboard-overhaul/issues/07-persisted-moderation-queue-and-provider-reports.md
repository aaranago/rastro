# ADMIN-007 Persisted moderation queue and Resource Provider report ingestion

Status: verified-runbook
Labels: verified-runbook
Severity: P0
Issue ID: ADMIN-007
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create a persisted moderation queue and wire Resource Provider reporting into it. The Expo Resource Provider profile `Reportar` action must create a backend moderation item instead of failing or pretending success.

## Acceptance criteria

- [x] Moderation review item tables or equivalent persisted model exist.
- [x] Public/member Resource Provider report mutation exists and validates reporter, target, reason, and detail.
- [x] Duplicate reports are suppressed or grouped by a defined idempotency rule.
- [x] `/admin/moderacion` reads its Resource Provider queue from the database.
- [x] Admin queue shows reason, reporter, reported provider, target location, newest report label, and count.
- [x] Expo Resource Provider report action calls the real API and shows backend-confirmed success/failure.
- [x] In-memory moderation fixtures are not used for Resource Provider moderation in production.

## Required automated tests

- Validator tests for moderation report input.
- Repository/router tests for report creation, duplicate grouping, and admin queue listing.
- Expo adapter/screen tests for provider report success and failure.
- Next moderation queue tests for DB-backed Resource Provider items.

## Required manual verification

- Run full `pnpm dev`.
- Report a provider from Expo/mobile MCP.
- Verify `/admin/moderacion` shows the report after reload.
- Verify no client-only success is shown before backend confirmation.

## Required visual verification

- Playwright screenshot of `/admin/moderacion` with a DB-backed Resource Provider review item.
- Mobile MCP screenshot of provider report success and failure states.

## Blocked by

- ADMIN-001

## Notes

This is the first moderation persistence tracer bullet. Keep the target narrow: Resource Provider reports only.

## ADMIN-007 verification notes

- Added persisted Resource Provider moderation review items/reports, API ingestion, admin queue listing, and Expo report submission through the real TRPC client.
- Verified database migration with `pnpm -F @acme/db migrate`.
- Verified validators/DB/API/Expo/Next with:
  - `pnpm -F @acme/validators test -- src/resource-provider-contracts.test.ts`
  - `pnpm -F @acme/db test -- src/resource-provider-schema.test.ts`
  - `pnpm -F @acme/api test -- src/resource-provider-moderation-repository.test.ts src/router/resources.test.ts src/router/admin.test.ts`
  - `pnpm -F @acme/expo test -- src/features/resources/resources-api-adapter.test.ts src/features/resources/resource-provider-profile-screen.test.ts`
  - `pnpm -F @acme/nextjs test -- admin-resource-provider-actions.test.ts admin-resource-provider-form-parser.test.ts admin-resources-dashboard.test.tsx admin-resources-page.test.tsx admin-moderation-page.test.tsx admin-moderation-dashboard.test.tsx`
- Verified touched package lint/typecheck for `@acme/validators`, `@acme/db`, `@acme/api`, `@acme/expo`, and `@acme/nextjs`.
- Verified full-stack success path with root `TURBO_UI=true pnpm dev`, mobile MCP provider report, and a direct Postgres query showing the persisted review item/report for `Veterinaria QA Recursos Actualizada`.
- Verified no client-only success on backend failure with Expo adapter/screen failure tests and mobile MCP backend-off screenshot; provider profile cannot open with the API down because production Resource Provider data is API-backed.
- Visual artifacts: `/tmp/rastro-admin-007-moderation-db-backed.png`, `/tmp/rastro-admin-007-mobile-current-report-state.png`, and `/tmp/rastro-admin-007-mobile-backend-off-error.png`.
