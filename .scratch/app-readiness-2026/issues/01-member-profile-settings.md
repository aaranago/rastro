# AR26-001 Member profile and contact settings

Status: ready-for-agent
Labels: ready-for-agent
Severity: P0
Type: AFK

## Problem

Members cannot edit their display name, default contact method, phone, or WhatsApp contact from Perfil. The current account controls cover password reset, deletion, and sign-out only.

## What to build

Add a backend-owned member profile/settings contract and a mobile Ajustes form that persists member identity and default contact information.

## Acceptance criteria

- [ ] API exposes authenticated read/update for member display name and default contact settings.
- [ ] Validation rejects invalid phone, WhatsApp, empty display name, and unsupported contact methods.
- [ ] Expo Ajustes loads current backend values and saves only after backend confirmation.
- [ ] Perfil reflects the saved display name after session/profile refresh.
- [ ] Visitor Ajustes prompts sign-in without pretending edits are local.
- [ ] Tests cover success, validation failure, auth failure, and offline/backend failure copy.

## Suggested ownership

- API/validators/db owner: profile contract and persistence.
- Expo owner: Ajustes form, adapter, shell refresh.

