# Add contextual onboarding, permission, empty, error, and offline states

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the app-wide state system that makes the mobile experience resilient and native-feeling: contextual onboarding, permission education, loading, empty, error, denied-permission, offline, and retry states. The app should show useful content quickly and ask permissions only when needed.

## Acceptance criteria

- [x] First launch does not show a long blocking carousel.
- [x] Location, notification, photo/camera, and optional background-location prompts are explained contextually before system prompts.
- [x] Empty, loading, error, denied-permission, offline, and retry states exist in the shell and can be reused by feature slices.
- [x] Offline messaging clearly distinguishes stale cached content from fresh content.
- [x] The states are Spanish-first and fit mobile screens.

## Blocked by

- `.scratch/rastro-v1/issues/02-build-rastro-app-shell-branding-spanish-labels-and-navigation.md`

## Context

Use the app shell must-haves in `docs/product/prd.md`.
