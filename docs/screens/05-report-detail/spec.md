# Report And Listing Detail

## Purpose

Show the public and owner views of Lost Pet Reports, Found Pet Reports, Sighting Reports, and Adoption Listings. Detail screens must communicate urgency, location privacy, contact options, sharing, lifecycle, and safety actions.

## Primary Users

- Visitor
- Member
- Caretaker

## Required Screens

- Lost Pet Report detail.
- Found Pet Report detail.
- Sighting Report detail.
- Adoption Listing detail.
- Owner/caretaker controls.
- Closed report view.
- Share sheet entry.
- Report/block entry.
- Exact public pin opt-in state when available.

## Required Data

- Report/listing type.
- Pet summary and photos.
- Approximate public location or exact pin if opted in.
- Time and description.
- Contact options.
- Report Outcome for closed reports.
- Verification Badge if applicable.
- Owner/member relationship.

## Primary Actions

- Contact through in-app chat.
- Contact through WhatsApp when available.
- Share.
- Report content.
- Block member from chat.
- Caretaker edits/closes report.
- Caretaker changes outcome.

## Navigation

- Entry: `Cerca`, `Actividad`, share/deep link, public web link.
- Exit: chat, edit flow, share sheet, lifecycle outcome sheet.

## UX Requirements

- Never assume every report has public phone/WhatsApp.
- Do not include public comments.
- Use "zona aproximada" when exact location is hidden.
- Make found vs sighting distinction obvious.
- Adoption details must not look like a shopping page.
- Closed reports should remain understandable but less urgent.

## Required States

- Visitor view.
- Member view.
- Caretaker owner view.
- Closed/reunited/transferred/unable/inactive outcomes.
- Contact unavailable.
- Reported/blocked state.
- Loading/error/offline.

## Mock Drop Location

Place generated images in `docs/screens/05-report-detail/mocks/`.
