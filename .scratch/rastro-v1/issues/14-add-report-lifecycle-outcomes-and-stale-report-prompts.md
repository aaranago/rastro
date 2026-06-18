# Add report lifecycle, outcomes, and stale-report prompts

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add report lifecycle behavior so caretakers can keep active reports current, close reports with a clear outcome, and prevent stale content from continuing to behave as urgent.

## Acceptance criteria

- [x] Reports can be active or closed.
- [x] Supported report outcomes are Still Missing, Reunited, Transferred to Shelter, Unable to Locate, and Inactive.
- [x] Caretakers can update or close their own reports from report details.
- [x] Closed reports no longer trigger nearby alerts.
- [x] Stale active reports can prompt caretakers to confirm or update status.
- [x] Closed reports remain understandable in browse/detail views with reduced urgency.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/11-publish-found-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/12-publish-sighting-report-end-to-end.md`

## Context

Use `Active Report`, `Closed Report`, and `Report Outcome` from `CONTEXT.md`.
