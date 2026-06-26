# ADMIN-011 Replace public web fixture pages with persisted report data

Status: needs-triage
Labels: needs-triage
Severity: P1
Issue ID: ADMIN-011
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Point public shared report/listing pages at the same persisted data used by the app/API so admin visibility changes and real reports are reflected on web.

## Acceptance criteria

- [ ] `/reportes/perdidos/[reportId]` reads persisted report detail instead of fixture-only data.
- [ ] `/adopciones/[listingId]` reads persisted adoption report/listing data instead of fixture-only data, or the route is explicitly aligned with the current report model.
- [ ] Hidden/deleted report states from admin moderation are reflected on public web pages.
- [ ] Public pages never expose private exact coordinates.
- [ ] Existing public SEO/open-graph behavior remains valid for persisted records.
- [ ] Fixture data remains test-only.

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
