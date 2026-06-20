# Rastro v1 PRD

## Summary

Rastro v1 is a Bolivia-first, Spanish-first lost-pet recovery app for iOS, Android, and public web sharing. The product helps people report lost pets, report found pets, submit sightings, browse nearby cases, receive nearby lost-pet alerts, contact caretakers safely, and discover local pet resources without turning animals into marketplace goods.

The core mobile app is the recovery network. The Next.js web app supports public shared report pages, admin moderation, and resource-provider/sponsor management.

## Goals

- Help caretakers publish lost pet reports quickly from a phone.
- Help nearby people discover, share, and respond to lost, found, and sighting reports.
- Give members useful nearby alerts without spam, battery drain, or excessive location tracking.
- Support non-monetary adoption listings without pet-sale language or payments.
- Provide a useful local resources section for vets, shelters, pet stores, groomers, food providers, trainers, and sponsors.
- Give admins operational controls for abuse, verification badges, review mode, email verification enforcement, and sponsor/resource-provider management.
- Keep v1 performant, battery-conscious, app-store-safe, and suitable for polished iOS/Android UX.

## Non-Goals

- No pet sales, checkout, deposits, bidding, breeder storefronts, reward payments, or adoption fees in v1.
- No public comments, group chats, public channels, or unrelated direct messages.
- No video uploads in v1.
- No full offline mode.
- No generic ad marketplace or paid ranking of recovery reports.
- No primary hamburger drawer in the mobile app.
- No always-on WebSocket/SSE chat infrastructure at launch.

## Users

- Visitor: can browse, search, view, share, and use manual or permission-based location without signing in.
- Member: can create pet profiles, reports, adoption listings, alert subscriptions, contact options, and chats.
- Caretaker: the member responsible for a pet profile, report, or listing.
- Admin: manages moderation, settings, verification badges, abuse, sponsors, and resource providers.
- Resource provider: local pet-related organization or business that can appear in Resources and may receive a verification badge.

## V1 Scope

### Mobile App

- Four bottom tabs: `Cerca`, `Actividad`, `Recursos`, `Perfil`.
- Global report FAB on main tabs.
- FAB action sheet: `Reportar perdida`, `Reportar encontrada`, `Reportar avistamiento`, `Dar en adopcion`.
- Sticky alert surface at the top of `Cerca` for urgent nearby lost-pet alerts.
- No primary drawer; secondary settings live under `Perfil`.
- Splash screen, app icon, loading, empty, error, offline, permission-denied, signed-out, signed-in, and maintenance states.

### Content Types

- Lost Pet Report: requires at least one photo.
- Found Pet Report: requires at least one photo.
- Sighting Report: photo optional; requires stronger time, location, and description details.
- Adoption Listing: non-monetary, available to members and organizations; requires at least one photo.
- Pet Profile: member-owned reusable pet record shown under `Mis mascotas`.
- Resource Provider Profile: local pet-resource profile shown in `Recursos`.
- Local Sponsor Placement: clearly labeled placement that never affects recovery priority.

### Pet Data

- Pet types: Perro, Gato, Ave, Conejo, Otro.
- Breed is free text.
- Max 5 photos per pet profile, report, or listing.
- Images must be compressed, stripped of EXIF/location metadata, and thumbnailed.

### Location And Search

- V1 supports Bolivia only.
- Nearby search and alert matching use PostGIS-backed radius search, not map-provider search.
- Store exact selected location for matching and report workflows.
- Public display defaults to approximate location/location cell.
- Exact public pins are opt-in only, with copy such as `zona aproximada` when exact location is hidden.
- Users can search by current location, last detected location, city, department/state, neighborhood, or manual map pin.
- Location permission states must be designed for both iOS and Android.

### Alerts And Notifications

- Members can opt into alert subscriptions for new nearby lost-pet reports.
- Alert matching uses dynamic alert area: current location when available, falling back to last detected location.
- Members choose alert radius, for example 5 km, 10 km, or broader regional options.
- Default location updates happen when the app opens, foregrounds, or the member manually refreshes.
- Optional background alerts require an explicit `alertas mientras me muevo` setting.
- Closed reports do not trigger nearby alerts.

### Contact And Chat

- Report/listing creators choose contact options during creation: in-app chat, WhatsApp, or both.
- WhatsApp opens using the phone number the creator chose to expose.
- Phone verification is not required in v1.
- In-app chat is minimal, one-to-one, and tied to a report or listing.
- Chat messages are stored by Rastro; new-message alerts use Expo push notifications.
- Open chat screens can refresh on focus/send/polling.
- Chat includes report/block controls and a link back to the related report/listing.

### Lifecycle

- Reports can be active or closed.
- Report outcomes: Still Missing, Reunited, Transferred to Shelter, Unable to Locate, Inactive.
- Caretakers receive periodic status prompts so stale active reports do not stay urgent forever.
- Closed reports may remain visible with reduced prominence but do not trigger alerts.

### Moderation And Safety

- Reports and adoption listings publish immediately by default.
- Admins can enable review mode for adoption listings if abuse is detected.
- Email verification is not required by default, but admins can require verified email for publishing if spam is detected.
- Every report, listing, chat, and resource-provider profile has `Reportar`.
- Report reasons: spam, scam, incorrect location, offensive content, animal cruelty, stolen pet concern, impersonation, other.
- Blocking stops chat from the blocked member and can hide the conversation from the blocker.

### Resources And Monetization

- Resources tab includes vets, shelters/rescues, groomers, pet food providers, trainers, pet stores, transport, and other pet services.
- Resource-provider profiles include name, category, logo/photo, location, service area, hours, contact options, short description, report action, and optional verification badge.
- Optional fields: website, social links, emergency availability, external links.
- Sponsor placements are clearly labeled.
- Sponsor placements may appear in nearby resources, provider details, launch/home banner, report success screen, and contextual care resources.
- Sponsors never outrank recovery reports and are never sent as push notifications.
- Sponsor/resource management lives in the Next.js dashboard.

### Web App

- Public web URLs for every public report and listing.
- Shared URLs open the installed app when possible and otherwise show a lightweight public web detail page.
- Public web detail pages show photos, approximate location, selected contact options, and app open/download prompts.
- Admin and resource-provider management live in the Next.js app.

## Authentication

- V1 uses Better Auth.
- Supported methods: email/password, Google, Facebook, and Apple on iOS where required for App Store compliance.
- Email verification is configurable but off by default.
- Password reset is required before production.
- Auth setup details live in `docs/product/auth-provider-setup.md`.

## Admin Dashboard

The dashboard must support:

- Toggle review mode for adoption listings.
- Toggle verified email required to publish.
- Review flagged reports/listings/chats/resource profiles.
- Hide or restore reports/listings.
- Ban or unban abusive members.
- Grant or revoke verification badges.
- Manage sponsor placements.
- Manage resource-provider profiles.
- View basic abuse and content metrics by city or department.

## App Shell And UX Requirements

- Spanish-first UI with i18n preserved for later languages.
- Use short labels in crowded controls and fuller text in titles/flows.
- Suggested compact labels: Perdidas, Encontradas, Vistas, Adopcion, Cerca, Actividad, Recursos, Perfil.
- Use consistent icons: alert/help for lost, paw/check for found, eye/map-pin for sighting, heart/home for adoption.
- Contextual onboarding only; no long blocking carousel.
- Ask permissions only when useful: location in Cerca/alerts, notifications on alert opt-in or after lost report creation, photos/camera during report creation, background location only in explicit moving-alerts setting.
- Use native share sheet for reports/listings.
- Support deep links from push notifications and shared URLs into reports, chats, or activity items.
- Preserve in-progress drafts locally when connectivity drops.
- Cache last-loaded lists/details and mark stale offline content.
- Use retry queues for draft/report submission and media uploads.
- Prioritize battery and performance: avoid continuous GPS polling, avoid always-on sockets, use virtualized lists, compress images before upload.

## Design Deliverables

Design mocks should cover:

- Splash and first usable screen.
- Signed-out and signed-in states.
- Bottom tab shell with global FAB.
- Nearby map/list with sticky alert surface and filters.
- Lost, found, sighting, and adoption creation flows.
- Existing pet profile selection and inline pet creation.
- Report/listing detail with approximate location and conditional contact buttons.
- In-app chat tied to a report/listing.
- Activity feed: alerts, messages, report updates, match candidates.
- Resources list, map/list view, sponsor treatment, and resource-provider detail.
- Perfil: Mis mascotas, my reports/listings, alert settings, contact preferences, verification requests, account settings.
- Admin dashboard key screens in Next.js.
- Public web report/listing detail page.
- Permission, offline, loading, empty, error, blocked, reported, and banned states.

## Technical Decisions

- Better Auth for v1 authentication: `docs/adr/0001-use-better-auth-for-v1.md`.
- App-owned chat with Expo push notifications: `docs/adr/0002-use-app-owned-chat-with-push-for-v1.md`.
- PostGIS-backed location search: `docs/adr/0003-use-postgis-for-geolocation-search.md`.
- Native map provider setup: `docs/product/map-provider-setup.md`.
- Domain language: `CONTEXT.md`.
- UI detail source: `docs/product/ui-design-brief.md`.

## Release Criteria

- A visitor can browse nearby reports/listings and public web pages without signing in.
- A member can create pet profiles and publish lost, found, sighting, and adoption content according to v1 rules.
- Nearby search works by current/last location and manual place search within Bolivia.
- Alert subscriptions notify members only for new nearby lost-pet reports.
- Contact options work through in-app chat and/or WhatsApp.
- Admins can moderate flagged content, enable abuse-response toggles, manage badges, and manage resources/sponsors.
- Shared links work on web and deep-link into the app where installed.
- The app passes basic performance, battery, permission, and Spanish UI fit checks on iOS and Android.
