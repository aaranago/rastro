# Build Resources directory with nearby provider search

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the `Recursos` tab as a useful nearby local directory for pet-related services. It should use the same Rastro-owned location/search approach as recovery content and feel like a helpful resource, not an ad wall.

## Acceptance criteria

- [x] Visitors and members can browse nearby Resource Providers.
- [x] Categories include vets, shelters/rescues, groomers, pet food, trainers, pet stores, transport, and other.
- [x] Search works by current/last location and manual Bolivia place/map-pin search.
- [x] Results use PostGIS-backed location search.
- [x] Resource results are visually distinct from recovery reports.
- [x] Empty, denied-location, and offline states are handled.

## Blocked by

- `.scratch/rastro-v1/issues/09-browse-nearby-lost-pet-reports-with-postgis-search.md`

## Context

Use `Resource Provider` terminology from `CONTEXT.md`.
