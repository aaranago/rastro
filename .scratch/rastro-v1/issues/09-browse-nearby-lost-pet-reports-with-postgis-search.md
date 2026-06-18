# Browse nearby Lost Pet Reports with PostGIS search

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the visitor/member path for browsing Lost Pet Reports near a location. Search must use Rastro-owned PostGIS-backed radius queries and show approximate public locations by default.

## Acceptance criteria

- [x] Visitors and members can browse Lost Pet Reports without signing in.
- [x] Search works by current location, last detected location, and manual Bolivia place/map-pin search.
- [x] Radius controls support compact mobile options such as 5 km and 10 km.
- [x] Results use PostGIS-backed radius search, not map-provider search.
- [x] Public UI defaults to approximate location/location cell.
- [x] The screen supports list and map-oriented browsing states, even if the first map renderer is minimal.
- [x] Empty, denied-location, and offline states are handled.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`

## Context

Read ADR-0003 and use `Location Cell`, `Dynamic Alert Area`, and `Alert Radius` terminology.

## Verification notes

- Added a Lost Pet Report search boundary that lets visitors and members search active reports by Rastro-owned PostGIS-style radius semantics.
- Added a Nearby adapter that maps published Lost Pet Reports into public `Cerca` summaries without exposing exact coordinates by default.
- Added `Cerca` view-model and screen support for sign-in-free browse policy, current/last/manual Bolivia location sources, compact Alert Radius controls, list/map shared summaries, Rastro/PostGIS boundary labels, and stale/offline handling.
- `pnpm -F @acme/expo format` passed.
- `pnpm -F @acme/expo lint` passed with the existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/expo typecheck` passed.
- `pnpm -F @acme/expo test` passed: 9 files, 46 tests.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` passed with no introduced findings.
