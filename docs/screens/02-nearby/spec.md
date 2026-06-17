# Nearby

## Purpose

Let visitors and members discover nearby Lost Pet Reports, Found Pet Reports, Sighting Reports, and Adoption Listings while preserving location privacy and performance.

## Primary Users

- Visitor
- Member

## Required Screens

- `Cerca` default list view.
- Map-oriented browse view.
- Sticky alert surface for nearby lost-pet alerts.
- Filter/radius bottom sheet.
- Manual Bolivia place search.
- Location permission education state.
- Location denied fallback state.
- Empty nearby state.

## Required Data

- Report/listing summary cards.
- Current or last detected location.
- Manual location query or map pin.
- Alert Radius.
- Report category filter: `Perdidas`, `Encontradas`, `Vistas`, `Adopcion`.
- Approximate public location text or location cell.

## Primary Actions

- Toggle list/map-oriented view.
- Change category filter.
- Change radius.
- Search by city, department, neighborhood, or manual pin.
- Open a report/listing detail.
- Share a visible report/listing.
- Enable alert subscription.

## Navigation

- Entry: bottom tab `Cerca`, push/deep link fallback, app launch.
- Exit: report/listing detail, filter sheet, place search, alert settings.

## UX Requirements

- Nearby search uses PostGIS-backed results; do not design around Google Places as source of truth.
- Show approximate public locations by default. Use copy like `zona aproximada`.
- Exact public pin should only appear when the creator opted in.
- Keep filter controls compact and thumb-friendly.
- Location permission must be contextual, not a first-run blocker.
- Recovery reports remain higher priority than sponsor/resource content.

## Required States

- Loading nearby results.
- Empty area.
- Location not requested.
- Location denied.
- Manual search active.
- Offline/stale cached results.
- Error fetching results.

## Mock Drop Location

Place generated images in `docs/screens/02-nearby/mocks/`.
