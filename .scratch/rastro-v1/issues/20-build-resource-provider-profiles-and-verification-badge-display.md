# Build Resource Provider profiles and verification badge display

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Let visitors and members view Resource Provider profiles with useful contact and trust information, including optional Verification Badges granted by admins.

## Acceptance criteria

- [x] A Resource Provider profile shows name, category, logo/photo, location, service area, hours, contact options, and short description.
- [x] Optional fields can show website, social links, emergency availability, and other external links.
- [x] Verification Badge display is supported but not required for every provider.
- [x] The profile has a `Reportar` action.
- [x] The profile can be opened from `Recursos` search results.
- [x] Sponsor labels are not implied unless a separate sponsor placement exists.

## Blocked by

- `.scratch/rastro-v1/issues/19-build-resources-directory-with-nearby-provider-search.md`

## Context

Use `Verification Badge` and `Resource Provider` from `CONTEXT.md`.

## Verification notes

2026-06-18:

- Added the Recursos provider detail route and wired Resource Provider search results to open profile screens.
- Loaded Resource Provider profiles through the existing resources adapter boundary with Spanish loading, missing, error, and reported states.
- Added behavior coverage for required provider profile fields, optional links, emergency availability, Verification Badge separation, sponsor disclosure separation, and `Reportar`.
- Verified with Expo tests, repo typecheck, repo lint, format check, and Fallow audit.
