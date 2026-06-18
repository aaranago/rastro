# Publish non-monetary Adoption Listing end-to-end

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Let a member or organization create a non-monetary Adoption Listing that appears in nearby browsing without pet-sale language, prices, checkout, deposits, bidding, or fees.

## Acceptance criteria

- [x] A member can start `Dar en adopcion` from the FAB.
- [x] The flow can reuse an existing Pet Profile or create one inline.
- [x] At least one photo is required.
- [x] No price, fee, payment, deposit, bidding, or checkout fields are present.
- [x] Copy avoids "buy", "sell", and marketplace framing.
- [x] Adoption listings are browseable and shareable.
- [x] Verification badge display is supported when the creator has one, but verification is not required to publish.

## Blocked by

- `.scratch/rastro-v1/issues/07-build-pet-profile-and-mis-mascotas-end-to-end.md`
- `.scratch/rastro-v1/issues/09-browse-nearby-lost-pet-reports-with-postgis-search.md`

## Context

Use `Adoption Listing`, not pet sale or marketplace language.

## Verification notes

- Added TDD coverage for Adoption Listing creation, publish/detail/search, nearby browse/share, public web share/page metadata, and FAB intent preservation.
- Verified Expo, Next.js, and validators tests/typechecks/lints/formats for the touched workspaces.
- Ran `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`; verdict `pass` with no introduced findings.
