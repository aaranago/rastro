# ADMIN-007 Persisted moderation queue and Resource Provider report ingestion

Status: needs-triage
Labels: needs-triage
Severity: P0
Issue ID: ADMIN-007
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Create a persisted moderation queue and wire Resource Provider reporting into it. The Expo Resource Provider profile `Reportar` action must create a backend moderation item instead of failing or pretending success.

## Acceptance criteria

- [ ] Moderation review item tables or equivalent persisted model exist.
- [ ] Public/member Resource Provider report mutation exists and validates reporter, target, reason, and detail.
- [ ] Duplicate reports are suppressed or grouped by a defined idempotency rule.
- [ ] `/admin/moderacion` reads its Resource Provider queue from the database.
- [ ] Admin queue shows reason, reporter, reported provider, target location, newest report label, and count.
- [ ] Expo Resource Provider report action calls the real API and shows backend-confirmed success/failure.
- [ ] In-memory moderation fixtures are not used for Resource Provider moderation in production.

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
