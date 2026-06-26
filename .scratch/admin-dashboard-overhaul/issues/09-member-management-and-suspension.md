# ADMIN-009 Member management and persisted suspension enforcement

Status: verified-runbook
Labels: verified-runbook
Severity: P0
Issue ID: ADMIN-009
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create `/admin/miembros` for member search and safety actions. Replace in-memory ban/unban with a persisted member suspension model and enforce it in publish/action paths.

## Acceptance criteria

- [x] `/admin/miembros` exists in the admin shell.
- [x] Admins can search members by email/name/id.
- [x] Member profile shows account state, email verification state, recent reports/listings, moderation reports, and suspension history.
- [x] Admins can suspend and unsuspend members with a required reason.
- [x] Suspended members cannot publish reports/listings or create Resource Provider reports.
- [x] Suspension state survives restart and appears in moderation queues.
- [x] Non-admins cannot access member management APIs or pages.

## Required automated tests

- DB/repository tests for suspension state and history.
- API/router tests for admin-only member search and suspend/unsuspend.
- Publish-path tests that suspended members are blocked.
- Next component/action tests for member search, profile, suspend, unsuspend, and validation errors.

## Required visual verification

- Playwright screenshots for member list, member profile, suspend confirmation, suspended state, and unsuspend flow.
- Full-stack smoke proving a suspended member cannot publish through the API.

## Blocked by

- ADMIN-001
- ADMIN-007

## Notes

Admin roles can remain env allowlist for this issue unless a separate persisted admin-role decision is made.

## Verification notes

- Automated: `pnpm -F @acme/db test`; `pnpm -F @acme/api test -- member-suspension-repository.test.ts resource-provider-moderation-repository.test.ts report-repository.test.ts report-repository.integration.test.ts router/admin.test.ts router/report.test.ts router/resources.test.ts`; `pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/admin-ui/admin-shell.test.tsx src/admin-member-actions.test.ts src/admin-member-dashboard.test.tsx src/admin-member-page.test.tsx src/admin-moderation-page.test.tsx src/admin-moderation-dashboard.test.tsx src/public-report-detail-api-adapter.test.ts src/public-lost-reports.test.ts src/public-lost-reports-page.test.tsx src/public-adoption-listings.test.ts src/public-adoption-listings-page.test.tsx`.
- Type/lint: `pnpm -F @acme/db typecheck`; `pnpm -F @acme/api typecheck`; `pnpm -F @acme/nextjs typecheck`; `pnpm -F @acme/db lint`; `pnpm -F @acme/api lint`; `pnpm -F @acme/nextjs lint`.
- Visual/full-stack: `pnpm -C apps/nextjs with-env node /tmp/rastro-admin-009-011-playwright/seed-admin-009-011.js && pnpm -C apps/nextjs with-env pnpm --dir ../.. dlx @playwright/test test --config=/tmp/rastro-admin-009-011-playwright/playwright.config.js`.
- Screenshots: `/tmp/rastro-admin-009-member-list-profile.png`, `/tmp/rastro-admin-009-suspend-confirmation.png`, `/tmp/rastro-admin-009-suspended-state-after-reload.png`, `/tmp/rastro-admin-009-unsuspend-flow.png`, `/tmp/rastro-admin-009-moderation-suspension-visible.png`.
