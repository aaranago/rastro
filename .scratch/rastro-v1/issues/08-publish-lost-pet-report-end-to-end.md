# Publish Lost Pet Report end-to-end

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the first full recovery workflow: a member creates a Lost Pet Report from the FAB, optionally reuses a Pet Profile, adds required photo and location details, chooses contact options, and publishes it for public browsing.

## Acceptance criteria

- [ ] A member can start `Reportar perdida` from the FAB.
- [ ] The flow can use an existing Pet Profile or create one inline.
- [ ] At least one photo is required.
- [ ] The report captures exact internal location and defaults to approximate public display.
- [ ] Exact public pin is opt-in only.
- [ ] The creator chooses in-app chat, WhatsApp, or both as contact options.
- [ ] Visitors who start the action are prompted to sign in and returned to the chosen action.

## Blocked by

- `.scratch/rastro-v1/issues/07-build-pet-profile-and-mis-mascotas-end-to-end.md`

## Context

Use `Lost Pet Report`, `Exact Location`, `Approximate Location`, and `Contact Option` from `CONTEXT.md`.
