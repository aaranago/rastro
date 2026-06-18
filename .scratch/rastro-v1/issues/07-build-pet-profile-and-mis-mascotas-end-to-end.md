# Build Pet Profile and Mis mascotas end-to-end

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Let a member create, view, edit, and reuse Pet Profiles from `Perfil` / `Mis mascotas`. Pet Profiles are member-owned records used later by lost, found, sighting, and adoption flows.

## Acceptance criteria

- [x] A member can create a Pet Profile with pet type, name, breed, description/markings, and photos.
- [x] Pet types are limited to Perro, Gato, Ave, Conejo, Otro.
- [x] Breed remains free text.
- [x] Photos are limited to 5, compressed, stripped of EXIF/location metadata, and thumbnailed.
- [x] `Mis mascotas` lists the member's Pet Profiles and supports viewing/editing one.
- [x] Visitors cannot create Pet Profiles.

## Blocked by

- `.scratch/rastro-v1/issues/04-implement-better-auth-across-expo-and-nextjs.md`

## Context

Use `Pet Profile`, `Member`, and `Caretaker` terminology from `CONTEXT.md`.

## Verification notes

2026-06-18:

- Added a reusable Expo Pet Profile feature model for member-owned profiles, supported pet types, local photo normalization metadata, and in-memory repository behavior.
- Added `Perfil` > `Mis mascotas` route with visitor gate, virtualized member list, create/edit form, detail surface, reusable report actions, and contextual photo-permission copy.
- Added Vitest coverage for visitor restrictions, exact pet type options, free-text breed, 5-photo cap, media metadata, list/select/view/edit behavior, and draft normalization.
- `pnpm -F @acme/expo format`, `pnpm -F @acme/expo lint`, `pnpm -F @acme/expo typecheck`, and `pnpm -F @acme/expo test` passed. Lint printed the existing `baseline-browser-mapping` freshness warning.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` passed with no introduced findings; remaining findings were inherited.
