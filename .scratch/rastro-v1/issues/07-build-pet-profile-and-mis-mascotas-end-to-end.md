# Build Pet Profile and Mis mascotas end-to-end

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Let a member create, view, edit, and reuse Pet Profiles from `Perfil` / `Mis mascotas`. Pet Profiles are member-owned records used later by lost, found, sighting, and adoption flows.

## Acceptance criteria

- [ ] A member can create a Pet Profile with pet type, name, breed, description/markings, and photos.
- [ ] Pet types are limited to Perro, Gato, Ave, Conejo, Otro.
- [ ] Breed remains free text.
- [ ] Photos are limited to 5, compressed, stripped of EXIF/location metadata, and thumbnailed.
- [ ] `Mis mascotas` lists the member's Pet Profiles and supports viewing/editing one.
- [ ] Visitors cannot create Pet Profiles.

## Blocked by

- `.scratch/rastro-v1/issues/04-implement-better-auth-across-expo-and-nextjs.md`

## Context

Use `Pet Profile`, `Member`, and `Caretaker` terminology from `CONTEXT.md`.
