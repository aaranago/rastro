# Browse nearby Lost Pet Reports with PostGIS search

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the visitor/member path for browsing Lost Pet Reports near a location. Search must use Rastro-owned PostGIS-backed radius queries and show approximate public locations by default.

## Acceptance criteria

- [ ] Visitors and members can browse Lost Pet Reports without signing in.
- [ ] Search works by current location, last detected location, and manual Bolivia place/map-pin search.
- [ ] Radius controls support compact mobile options such as 5 km and 10 km.
- [ ] Results use PostGIS-backed radius search, not map-provider search.
- [ ] Public UI defaults to approximate location/location cell.
- [ ] The screen supports list and map-oriented browsing states, even if the first map renderer is minimal.
- [ ] Empty, denied-location, and offline states are handled.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`

## Context

Read ADR-0003 and use `Location Cell`, `Dynamic Alert Area`, and `Alert Radius` terminology.
