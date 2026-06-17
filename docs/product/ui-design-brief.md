# Rastro UI Design Brief

This brief captures resolved product decisions for phone-first iOS and Android mocks. It is intentionally separate from `CONTEXT.md`, which is only the domain glossary.

## Product Posture

Rastro v1 is a lost-pet recovery network, not a pet marketplace. The core experience should help people quickly report, discover, and resolve pet recovery cases while keeping contact, location, and adoption behavior safe.

## V1 Market And Language

- V1 supports Bolivia only.
- Spanish is the primary launch language.
- Keep internationalization in place from the start so English or additional regions can be added later without rewriting screens.
- Location entry, region labels, phone formatting, and empty states should be designed for Bolivian users first.
- Use short Spanish labels on crowded mobile controls and fuller text in screen titles, creation flows, and empty states.
- Suggested compact labels: Perdidas, Encontradas, Vistas, Adopcion, Cerca, Actividad, Recursos, Perfil.
- Suggested FAB action labels: Reportar perdida, Reportar encontrada, Reportar avistamiento, Dar en adopcion.
- Suggested full titles: Mascotas perdidas cerca de ti, Mascotas encontradas, Avistamientos recientes, Mascotas en adopcion.
- Use consistent icons with these categories: alert/help for lost, paw/check for found, eye/map-pin for sighting, heart/home for adoption.

## Primary Content Types

- `Lost Pet Report`: created by a caretaker when a pet is missing.
- `Found Pet Report`: created when someone has secured a pet and is looking for the caretaker.
- `Sighting Report`: created when someone saw a pet but did not secure it.
- `Adoption Listing`: created by any signed-in member or organization to find a new caretaker for a pet without operating as a sale.
- `Local Sponsor Placement`: a clearly labeled paid placement for a local pet-related resource.
- Adoption listings are non-monetary in v1. Do not show prices, fees, checkout, deposits, bidding, or "buy" language.

## Pet Data

- V1 pet type options: Perro, Gato, Ave, Conejo, Otro.
- Breed can be free text.
- Pet type should be controlled so filters, alerts, and empty states stay consistent.
- Adoption copy must avoid exotic or regulated animal marketplace behavior.
- Require at least one photo for lost pet reports, found pet reports, and adoption listings.
- Allow sighting reports without a photo, but require stronger time, location, and description details.
- Limit v1 media to photos only, with a maximum of 5 photos per pet profile, report, or listing.
- Compress uploads, strip EXIF/location metadata, and generate thumbnails.
- Do not support video in v1.

## Access Model

- Visitors can browse nearby reports, search/filter, view public report details, share report links, and choose manual or permission-based location.
- Members can create reports/listings, manage their own activity, save alert preferences, and use contact options.
- Organizations can receive a verification badge from admins, but verification is not required to create adoption listings.
- Members can maintain pet profiles under My pets and reuse those profiles when creating reports or adoption listings.
- V1 authentication uses Better Auth and includes email/password, Google, Facebook, and Apple on iOS where required for App Store compliance.

## Moderation Model

- Reports and adoption listings publish immediately by default.
- Admins can enable review mode for adoption listings if abuse is detected.
- Every public report/listing should have clear report/block actions.
- Email verification is not required by default, but admins can require verified email for publishing if spam is detected.
- Every report, listing, chat, and resource-provider profile needs a Reportar action.
- Report reasons: spam, scam, incorrect location, offensive content, animal cruelty, stolen pet concern, impersonation, other.
- Reporting creates an admin-review item.
- Blocking stops chat from the blocked member and can hide the conversation from the blocker.

## Report Lifecycle

- Reports can be active or closed.
- Closed reports no longer trigger nearby alerts.
- Supported report outcomes: Still Missing, Reunited, Transferred to Shelter, Unable to Locate, Inactive.
- Designs should make closure actions easy from owned report details.
- Caretakers should receive periodic status prompts so stale active reports do not keep appearing as urgent.
- Do not support reward amounts, reward escrow, or reward payments in v1.

## Contact Model

When creating a report or listing, the member chooses one or both contact options:

- In-app chat with notifications for new messages.
- WhatsApp contact button using the phone number the member chose to expose.

Do not assume every report has a public phone number.
Do not require phone verification in v1.
Do not include public comments in v1. Useful information should become a sighting report or an in-app/WhatsApp conversation.
- In-app chat is included in v1 as a minimal one-to-one conversation tied to a report or listing.
- V1 chat should not include group chats, public channels, comments, image/file attachments, or unrelated direct messages.
- Chat screens need report/block controls and a clear link back to the related report or listing.
- Chat delivery is app-owned: messages are stored by Rastro, new-message alerts use Expo push notifications, and open chat screens can refresh on focus/send/polling.

## Location Model

- Store the exact selected location for report workflows.
- Show approximate public location by default.
- Exact public pins are opt-in only. Use copy such as "zona aproximada" unless the creator chooses to show the exact location.
- Never design around exposing a home address by default.
- Nearby and alert matching uses PostGIS-backed radius search, not the map provider.
- Use coarse location cells for privacy-preserving public display, broad filtering, and fast approximate grouping.
- Use a dynamic alert area for member alerts and discovery: current location when available, falling back to last detected location.
- Let members choose an alert radius, such as 5 km, 10 km, or a broader regional option.
- Design location permission states for both iOS and Android: not asked, denied, approximate/coarse, precise, foreground-only, and optional background.
- Support place search when device location is denied or unavailable: city, department/state, neighborhood, or a manually selected map pin in Bolivia.

## Notification Model

- Members can opt into alert subscriptions for new nearby lost-pet reports.
- Nearby alerts should use the dynamic alert area and selected alert radius.
- The default location update model should work when the app is opened, foregrounded, or manually refreshed.
- Optional background alerts need an explicit setting and clear state because iOS and Android expose background location differently.

## Monetization Model

- The main app experience prioritizes lost, found, and sighting workflows.
- Sponsors should have a separate dashboard or section with polished resource discovery UX.
- Resource providers can include vets, shelters, groomers, pet food providers, trainers, pet stores, and animal-care services.
- Resource-provider categories: vets, shelters/rescues, groomers, pet food, trainers, pet stores, transport, other.
- Resource-provider profiles should include name, category, logo/photo, location, service area, hours, contact options, short description, report action, and optional verification badge.
- Optional profile fields include website, social links, emergency availability, and other external links.
- Sponsor placements must be clearly labeled and must not outrank recovery reports.
- Suitable mobile surfaces: nearby resources, resource-provider detail pages, launch/home banner, report success screen, and contextual care resources.
- Avoid sponsor push notifications, paid recovery priority, promoted pet reports, and anything that implies payment improves a lost pet's chance of being shown.

## Admin Dashboard

- Admin and resource-provider management lives in the Next.js web app.
- Toggle review mode for adoption listings.
- Toggle verified email required to publish.
- Review reports and listings flagged by members.
- Hide or restore reports and listings.
- Ban or unban abusive members.
- Grant or revoke verification badges for organizations and resource providers.
- Manage local sponsor placements and resource-provider profiles.
- View basic abuse and content metrics by city or department.

## Screen Implications

- Creation flows need a clear contact-option step.
- Creation flows should let members choose an existing pet profile or create a new one inline.
- Report details need conditional contact buttons based on the owner’s choices.
- Map and list views need to distinguish exact internal location from approximate public display.
- Lost, found, and sighting flows should be visually distinct because each implies different owner expectations.
- Nearby screens should support both map and list views, with clear radius controls and permission fallbacks.
- Location-dependent views should gracefully degrade to manual city/state search or map-pin search when location permission is denied.
- The sponsor/resource section should feel like a useful local directory, not a generic ad wall.

## Mobile Navigation

- Use four stable bottom tabs: Nearby, Activity, Resources, Me.
- Use a global report FAB on main tabs.
- The report FAB opens an action sheet with Lost Pet, Found Pet, Sighting, and Adoption Listing.
- If a visitor taps a member-only action, show sign-in and return them to the chosen action after authentication.
- Use a sticky alert surface at the top of Nearby for urgent nearby lost-pet alerts, not a dedicated Alerts tab.
- Activity contains alert history, messages, report updates, and candidate matches.
- Resources contains vets, shelters, pet food providers, sponsors, and local amenities.
- Me contains my pets, my reports/listings, settings, contact preferences, and verification requests.
- Do not use a hamburger drawer for primary mobile navigation. Put secondary settings and account actions under Perfil.

## App Shell Must-Haves

- Splash screen and app icon designed for Rastro, not template defaults.
- Signed-out, signed-in, loading, empty, error, denied-permission, offline/retry, and maintenance states.
- First-run onboarding should be short and contextual, not a long blocking carousel.
- Show the app immediately, then explain permissions at the moment they become useful.
- Ask location when the user taps Cerca, changes radius, or enables alerts.
- Ask notifications when the user enables alert subscriptions or after creating a lost pet report.
- Ask photo/camera access inside report creation.
- Ask optional background location only inside a clear "alertas mientras me muevo" setting.
- Use permission education screens before iOS/Android system prompts for location, notifications, photos/camera, and optional background location.
- Deep links from push notifications and shared report links into the relevant report, chat, or activity item.
- Native share sheet support for reports and adoption listings.
- Every public report and listing should have a shareable Next.js web URL.
- Shared URLs should open the installed app when possible and otherwise show a lightweight public web detail page.
- Public web detail pages should include photos, approximate location, selected contact options, and app open/download prompts.
- Safe-area handling, keyboard handling, pull-to-refresh where useful, haptics for primary actions, and platform-consistent sheets/modals.
- Accessible touch targets, dynamic type tolerance, high-contrast states, and Spanish text that fits compact mobile controls.
- No full offline mode in v1, but preserve in-progress drafts locally when connectivity drops.
- Cache last-loaded lists/details and clearly mark stale offline content.
- Use retry queues for draft/report submission and media uploads.
- Prioritize performance and battery: avoid continuous GPS polling, avoid always-on sockets, keep list rendering virtualized, compress images before upload, and use background location only when the member explicitly enables moving alerts.
