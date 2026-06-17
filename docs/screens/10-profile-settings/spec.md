# Profile And Settings

## Purpose

Give members access to their pets, reports/listings, alert settings, contact preferences, verification requests, account management, and app settings from `Perfil`.

## Primary Users

- Visitor
- Member
- Caretaker

## Required Screens

- Signed-out `Perfil`.
- Signed-in `Perfil`.
- `Mis mascotas` entry point.
- My reports/listings summary.
- Alert settings.
- Contact preferences.
- Verification request entry.
- Account settings.
- Password reset entry.
- Account deletion flow.

## Required Data

- Member profile/session.
- Pet Profile count.
- Active/closed report counts.
- Alert Subscription status.
- Contact defaults.
- Verification Badge/request status.

## Primary Actions

- Sign in/sign out.
- Open `Mis mascotas`.
- Open my reports/listings.
- Change alert radius and moving-alert setting.
- Update contact preferences.
- Start verification request.
- Request password reset.
- Delete account.

## Navigation

- Entry: bottom tab `Perfil`.
- Exit: auth, pet profiles, report details, alert settings, account settings.

## UX Requirements

- Secondary settings live here instead of a drawer.
- Account deletion must be clear and app-store compliant.
- Optional background location must be controlled from explicit alert settings, not hidden.
- Signed-out state should keep browsing posture friendly.

## Required States

- Signed out.
- Signed in.
- Loading.
- Error.
- No pets/reports yet.
- Verification pending/granted/not started.
- Account deletion confirmation.

## Mock Drop Location

Place generated images in `docs/screens/10-profile-settings/mocks/`.
