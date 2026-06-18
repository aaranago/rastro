# Publish Lost Pet Report end-to-end

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the first full recovery workflow: a member creates a Lost Pet Report from the FAB, optionally reuses a Pet Profile, adds required photo and location details, chooses contact options, and publishes it for public browsing.

## Acceptance criteria

- [x] A member can start `Reportar perdida` from the FAB.
- [x] The flow can use an existing Pet Profile or create one inline.
- [x] At least one photo is required.
- [x] The report captures exact internal location and defaults to approximate public display.
- [x] Exact public pin is opt-in only.
- [x] The creator chooses in-app chat, WhatsApp, or both as contact options.
- [x] Visitors who start the action are prompted to sign in and returned to the chosen action.

## Blocked by

- `.scratch/rastro-v1/issues/07-build-pet-profile-and-mis-mascotas-end-to-end.md`

## Context

Use `Lost Pet Report`, `Exact Location`, `Approximate Location`, and `Contact Option` from `CONTEXT.md`.
