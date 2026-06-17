# Pet Profiles And Mis Mascotas

## Purpose

Let members maintain reusable Pet Profiles under `Mis mascotas`, then reuse those profiles in reports and adoption listings.

## Primary Users

- Member
- Caretaker

## Required Screens

- `Mis mascotas` list.
- Empty `Mis mascotas` state.
- Pet Profile detail.
- Create Pet Profile.
- Edit Pet Profile.
- Photo management state.
- Link from Pet Profile to active reports/listings.

## Required Data

- Pet Profile id.
- Member/caretaker id.
- Name.
- Type: Perro, Gato, Ave, Conejo, Otro.
- Breed free text.
- Description/markings.
- Photos, max 5.
- Related active and closed reports/listings.

## Primary Actions

- Create Pet Profile.
- Edit details.
- Add/remove photos.
- Start report/listing from a Pet Profile.
- Open related report/listing.

## Navigation

- Entry: `Perfil` > `Mis mascotas`, report creation profile picker.
- Exit: report creation, Pet Profile detail, `Perfil`.

## UX Requirements

- Do not call pets "accounts".
- Keep `Mis mascotas` useful even before any report exists.
- Make reuse obvious in creation flows.
- Photo handling must be fast and resilient.
- Visitors cannot create Pet Profiles.

## Required States

- Signed-out prompt.
- Empty list.
- Loading.
- Photo upload error.
- Offline draft/edit state.
- Pet Profile with no active reports.
- Pet Profile with active/closed reports.

## Mock Drop Location

Place generated images in `docs/screens/04-pet-profiles/mocks/`.
