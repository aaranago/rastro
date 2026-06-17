# Public Web Pages

## Purpose

Define lightweight Next.js public pages for shared reports and listings. These pages help recipients from WhatsApp, Facebook, or search/community links understand the case and open/install the mobile app.

## Primary Users

- Visitor
- Member opening a shared link
- Caretaker sharing a report/listing

## Required Screens

- Public Lost Pet Report page.
- Public Found Pet Report page.
- Public Sighting Report page.
- Public Adoption Listing page.
- App-open/download prompt.
- Mobile web view.
- Expired/closed report public state.

## Required Data

- Report/listing type.
- Photos.
- Approximate public location or exact public pin if opted in.
- Description.
- Selected contact options.
- Report Outcome when closed.
- Share metadata.

## Primary Actions

- Open in app.
- Download/open app prompt.
- Contact through available public contact option.
- Share page.
- Report content.

## Navigation

- Entry: shared URL, social preview, deep link fallback.
- Exit: app deep link, external app store/download prompt, report action.

## UX Requirements

- Page must work without signing in.
- Do not expose exact location unless opted in.
- Make app-open prompt useful but not blocking.
- Keep pages lightweight and mobile-friendly.
- Spanish-first metadata and page copy.

## Required States

- Loading.
- Not found.
- Closed report.
- No contact option visible.
- App installed/openable.
- App not installed.

## Mock Drop Location

Place generated images in `docs/screens/12-public-web-pages/mocks/`.
