# AR26-006 Provider sponsor and contact contract polish

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Type: AFK

## Problem

Provider browsing is backend-backed, but sponsor placement selection may collapse multiple active surfaces into one placement, provider in-app contact is not modeled, and contact/social data needs stronger admin/API validation.

## What to build

Harden the provider/sponsor contract and decide whether providers can receive first-party in-app chat/intake.

## Acceptance criteria

- [ ] API can return sponsor placements by eligible surface without losing a valid placement for another surface.
- [ ] Validators and API tests cover multi-surface active placements.
- [ ] Admin/provider contact input normalizes phone, WhatsApp, website, email, directions, and social URLs.
- [ ] Broken sponsor media falls back without blank or collapsed placement UI.
- [ ] If provider chat is in v1 scope, implement it as a first-party intake/chat model; otherwise keep external contacts honest and explicit.

## Suggested ownership

- Sponsor/API contract owner.
- Expo sponsor consumer owner.
- Admin/provider contact validation owner.

