# Resources

## Purpose

Make `Recursos` a useful local directory for pet-related services and sponsors without distracting from recovery reports or becoming a generic ad wall.

## Primary Users

- Visitor
- Member
- Resource Provider viewer

## Required Screens

- Resources list.
- Resources map-oriented view.
- Category filter sheet.
- Manual place search.
- Sponsored placement treatment.
- Empty resources state.
- Location denied fallback.

## Required Data

- Resource Provider summaries.
- Category: vets, shelters/rescues, groomers, pet food, trainers, pet stores, transport, other.
- Approximate/selected location.
- Distance/radius.
- Sponsor placement metadata.
- Verification Badge when present.

## Primary Actions

- Browse nearby resources.
- Filter by category.
- Search by current/last location or manual Bolivia place.
- Open Resource Provider profile.
- Report provider or sponsor content.

## Navigation

- Entry: bottom tab `Recursos`, contextual care-resource links.
- Exit: provider profile, search/filter sheet, report action.

## UX Requirements

- Resources must feel helpful, not like an ad feed.
- Clearly label sponsor placements.
- Never show sponsor placement as recovery priority.
- Do not use sponsor push notifications.
- Use map/list treatment consistently with `Cerca`, but keep resources visually distinct from reports.

## Required States

- Loading resources.
- Empty area.
- Location denied.
- Manual search active.
- Offline/stale.
- Sponsored item visible.
- No sponsors available.

## Mock Drop Location

Place generated images in `docs/screens/08-resources/mocks/`.
