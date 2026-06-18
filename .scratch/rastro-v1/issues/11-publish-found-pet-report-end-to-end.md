# Publish Found Pet Report end-to-end

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Let a member report a secured found pet and make it discoverable to visitors and members. Found Pet Reports should be distinct from sightings because the reporter has secured the pet and can coordinate handoff.

## Acceptance criteria

- [x] A member can start `Reportar encontrada` from the FAB.
- [x] At least one photo is required.
- [x] The flow captures where and when the pet was found, condition, description, and contact options.
- [x] The report is publicly browseable through nearby search and detail screens.
- [x] The UI clearly distinguishes found from lost and sighting content.
- [x] Visitors who start the action are prompted to sign in and returned to the chosen action.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/09-browse-nearby-lost-pet-reports-with-postgis-search.md`

## Context

Use `Found Pet Report` exactly as defined in `CONTEXT.md`.

## Verification notes

- Added a Found Pet Report creation flow reachable from the member FAB action and preserved through the visitor sign-in prompt.
- Added Found Pet Report publishing, public detail, nearby browse summaries, approximate public location defaults, contact option handling, and found-specific Spanish labels.
- Extracted shared report-creation UI controls and shared radius-search distance helpers to avoid duplicate Lost/Found implementations.
- `pnpm -F @acme/expo test` passed: 11 files, 56 tests.
- `pnpm -F @acme/expo format` passed.
- `pnpm -F @acme/expo lint` passed with the existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/expo typecheck` passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` passed with no introduced findings.
