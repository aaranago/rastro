# Publish Sighting Report end-to-end

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Let a member submit a Sighting Report when they saw a pet but did not secure it. Sightings should help caretakers understand time, direction, condition, and area without creating the expectation that the reporter has the pet.

## Acceptance criteria

- [x] A member can start `Reportar avistamiento` from the FAB.
- [x] A photo is optional.
- [x] Time, location, description, and observed condition/direction are required strongly enough to make no-photo sightings useful.
- [x] The UI clearly distinguishes a Sighting Report from a Found Pet Report.
- [x] Sightings are browseable and linkable from relevant report/detail contexts.
- [x] Visitors who start the action are prompted to sign in and returned to the chosen action.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/09-browse-nearby-lost-pet-reports-with-postgis-search.md`

## Context

Use `Sighting Report` exactly as defined in `CONTEXT.md`.

## Verification notes

- Added a Sighting Report creation flow reachable from the member FAB action and preserved through the visitor sign-in prompt.
- Added no-photo Sighting Report publishing with required observed time, exact internal Bolivia location, description, observed condition, direction, and visible pet details.
- Added public detail, nearby browse summaries, approximate public location defaults, share/deep-link paths, and a native fallback route for `/reportes/avistamientos/:reportId`.
- Extracted shared report-creation UI, contact view-model, public link, and repository helpers to avoid copying Found Pet Report implementation details.
- `pnpm -F @acme/expo test` passed: 13 files, 65 tests.
- `pnpm -F @acme/expo format` passed.
- `pnpm -F @acme/expo lint` passed with the existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/expo typecheck` passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` passed for introduced changes: no introduced dead code, complexity, or duplication.
