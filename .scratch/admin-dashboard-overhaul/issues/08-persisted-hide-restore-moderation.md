# ADMIN-008 Persisted hide and restore moderation for reports and listings

Status: verified-runbook
Labels: verified-runbook
Severity: P0
Issue ID: ADMIN-008
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Replace in-memory hide/restore actions with persisted moderation state for report and listing targets. Public and mobile reads must respect hidden/restored state consistently.

## Acceptance criteria

- [x] Admins can hide and restore lost, found, sighting, and adoption targets from a DB-backed moderation queue.
- [x] Hidden targets are excluded or visibly marked according to product rules on public/mobile surfaces.
- [x] Restored targets return to normal visibility.
- [x] Actions capture admin actor, timestamp, reason/note, and target.
- [x] Admin queue and detail pages reflect the latest persisted state after reload.
- [x] In-memory hide/restore behavior is removed from production admin routes.

## Required automated tests

- DB/repository tests for content moderation state transitions.
- API/router tests for admin-only hide/restore.
- Report `nearby` and `detail` tests for hidden/restored visibility behavior.
- Next tests for queue action forms and action feedback.

## Required visual verification

- Playwright flow: hide target, reload admin, verify hidden state.
- Public/mobile smoke: hidden target is no longer promoted or is marked according to rule.
- Playwright flow: restore target and verify visibility returns.

## Blocked by

- ADMIN-007

## Notes

If adoption listings remain represented as `report.type = adoption`, use the existing report model rather than inventing a second listing table in this issue.

## ADMIN-008 verification notes

- Added persisted report moderation state and actions for lost, found, sighting, and adoption reports, with admin actor, reason/note, timestamp, and latest visibility reflected after reload.
- Wired public/mobile report reads so hidden reports are excluded from nearby results and return `NOT_FOUND` from public detail until restored.
- Verified DB/API/Next with:
  - `pnpm -F @acme/db test`
  - `pnpm -F @acme/api test -- report-repository.test.ts report-repository.integration.test.ts router/report.test.ts router/admin.test.ts`
  - `pnpm -F @acme/nextjs exec vitest run --config vitest.config.ts src/admin-moderation-page.test.tsx src/admin-moderation-dashboard.test.tsx`
- Verified touched package typecheck/lint for `@acme/db`, `@acme/api`, and `@acme/nextjs`; verified DB migration with `pnpm -F @acme/db migrate`; verified repo health with `git diff --check` and `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`.
- Verified current code with Playwright: `pnpm dlx @playwright/test test --config=/tmp/rastro-admin-005-008-playwright/playwright.config.js`.
- Playwright covered hide, reload-hidden state, public `report.detail` hidden `NOT_FOUND`, restore, reload-restored state, and public `report.detail` visibility returning.
- Visual artifacts: `/tmp/rastro-admin-008-moderation-visible.png`, `/tmp/rastro-admin-008-moderation-hidden-after-reload.png`, and `/tmp/rastro-admin-008-moderation-restored-after-reload.png`.
