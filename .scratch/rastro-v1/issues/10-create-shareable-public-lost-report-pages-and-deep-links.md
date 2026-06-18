# Create shareable public Lost Pet Report pages and deep links

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Give each public Lost Pet Report a shareable web URL and app deep link. A recipient should be able to open the installed app or view a lightweight public web page with enough report information to help.

## Acceptance criteria

- [x] Every public Lost Pet Report has a stable share URL.
- [x] The mobile app can share the report through the native share sheet.
- [x] Shared links open the app when installed and otherwise render a public Next.js page.
- [x] The public page shows photos, approximate location, selected contact options, and app open/download prompts.
- [x] The public page does not expose exact location unless the caretaker opted in.
- [x] Spanish-first social/share metadata is present.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`

## Context

Use the public web requirements in `docs/product/prd.md`.

## Verification notes

- Added a shared public Lost Pet Report share target contract for stable `/reportes/perdidos/:reportId` URLs, `rastro://` deep links, and Spanish share copy.
- Added native share-sheet support from `Cerca` cards and a matching Expo deep-link route for installed-app opens.
- Added a lightweight public Next.js page with report photos, public location privacy handling, contact options, app open/download prompts, and Spanish Open Graph/Twitter metadata.
- Approximate reports expose only the location cell/zone; exact address and coordinates appear only when the report opts into exact public location.
- `pnpm -F @acme/validators typecheck`, `test`, `format`, and `lint` passed.
- `pnpm -F @acme/expo typecheck`, `test`, `format`, and `lint` passed.
- `pnpm -F @acme/nextjs typecheck`, `test`, `format`, and `lint` passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` passed with no introduced findings.
