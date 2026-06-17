# Add contextual onboarding, permission, empty, error, and offline states

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the app-wide state system that makes the mobile experience resilient and native-feeling: contextual onboarding, permission education, loading, empty, error, denied-permission, offline, and retry states. The app should show useful content quickly and ask permissions only when needed.

## Acceptance criteria

- [ ] First launch does not show a long blocking carousel.
- [ ] Location, notification, photo/camera, and optional background-location prompts are explained contextually before system prompts.
- [ ] Empty, loading, error, denied-permission, offline, and retry states exist in the shell and can be reused by feature slices.
- [ ] Offline messaging clearly distinguishes stale cached content from fresh content.
- [ ] The states are Spanish-first and fit mobile screens.

## Blocked by

- `.scratch/rastro-v1/issues/02-build-rastro-app-shell-branding-spanish-labels-and-navigation.md`

## Context

Use the app shell must-haves in `docs/product/prd.md`.
