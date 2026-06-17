# Report And Listing Creation

## Purpose

Let members create Lost Pet Reports, Found Pet Reports, Sighting Reports, and non-monetary Adoption Listings from the global FAB. The flow must be fast for emergency use, clear about contact choices, and safe around location/privacy.

## Primary Users

- Member
- Caretaker
- Visitor who is prompted to sign in

## Required Screens

- FAB action sheet.
- Sign-in prompt preserving selected action.
- Existing Pet Profile picker.
- Inline Pet Profile creation.
- Lost Pet Report creation.
- Found Pet Report creation.
- Sighting Report creation.
- Adoption Listing creation.
- Photo picker/camera permission state.
- Location picker with exact/internal and approximate/public explanation.
- Contact-option step.
- Review and publish step.
- Success screen with share and next action.

## Required Data

- Pet Profile fields: name, type, breed, description/markings, photos.
- Pet type options: Perro, Gato, Ave, Conejo, Otro.
- Report/listing type.
- Photos: max 5.
- Exact internal location.
- Approximate public display choice and exact-pin opt-in.
- Contact options: in-app chat, WhatsApp, or both.
- WhatsApp phone number when selected.
- Sighting time, direction/condition, and description.

## Primary Actions

- Select report/listing type.
- Choose existing pet or create pet inline.
- Add/remove/reorder photos.
- Select location and public precision.
- Choose contact options.
- Publish.
- Save/restore local draft on interruption.
- Share after publish.

## Navigation

- Entry: global FAB.
- Exit: created report/listing detail, share sheet, `Cerca`, `Mis mascotas`.

## UX Requirements

- Lost, found, and adoption require at least one photo.
- Sighting can omit photo but must require strong time/location/description details.
- Adoption is non-monetary: no price, fee, deposit, checkout, bidding, or "buy" copy.
- Creation should feel guided but not slow.
- Use bottom sheets and stepper-like sections where helpful.
- Ask photo/camera permission only inside creation.
- Ask location permission only when location is needed.
- Explain public location privacy clearly.

## Required States

- Visitor tries protected action.
- Draft restore available.
- Photo permission denied.
- Location permission denied.
- Uploading/publishing.
- Upload retry.
- Validation errors.
- Publish success.

## Mock Drop Location

Place generated images in `docs/screens/03-report-creation/mocks/`.
