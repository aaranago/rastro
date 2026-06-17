# Resource Provider Profiles

## Purpose

Show useful local resource details, trust signals, sponsor labeling when applicable, and safe reporting controls for providers.

## Primary Users

- Visitor
- Member
- Resource Provider viewer

## Required Screens

- Standard Resource Provider profile.
- Verified provider profile.
- Sponsored provider placement/profile treatment.
- Missing optional links state.
- Report provider action sheet.

## Required Data

- Name.
- Category.
- Logo/photo.
- Location or service area.
- Hours.
- Contact options.
- Short description.
- Optional website, social links, emergency availability, external links.
- Optional Verification Badge.
- Optional sponsor label.

## Primary Actions

- Call/contact provider.
- Open WhatsApp if available.
- Open website/social links if available.
- Get directions or view approximate area where applicable.
- Report profile.

## Navigation

- Entry: `Recursos` list/map, sponsor placement, contextual care-resource link.
- Exit: external contact/link, report action, back to resources.

## UX Requirements

- Verification Badge is a trust marker, not a seller badge.
- Sponsor label must be clear and separate from verification.
- Optional fields should not leave awkward gaps.
- Provider profiles should not imply official endorsement unless verified.

## Required States

- Loading.
- Missing optional fields.
- Verified.
- Sponsored.
- Reported.
- Offline/error.

## Mock Drop Location

Place generated images in `docs/screens/09-provider-profiles/mocks/`.
