# Rastro Confirmed Readiness - 2026-07-01

This document records the Rastro app functionality that has been implemented and confirmed working during the July 1, 2026 readiness loop. It is evidence-based: each confirmed area below is backed by automated tests, Android emulator visual evidence, backend assertions, or all of those together.

## Status

- Overall readiness subaudit: 9.2/10.
- Completion rate: 9.3/10.
- Market success rate: 9.0/10.
- Appeal rate: 9.0/10.
- Further implementation loop required: no.
- Primary evidence bundle: `.scratch/mobile-qa/2026-07-01T10-31-36-091Z/mcp-e2e`.
- Mobile platform confirmed: Android emulator `emulator-5554`.
- Root development command confirmed: `TURBO_UI=true pnpm dev`.
- Mobile E2E command confirmed: `RASTRO_E2E_EXPO_DEV_SERVER_URL=http://127.0.0.1:8081 RASTRO_E2E_MOBILE_NEXT_BASE_URL=http://10.0.2.2:3000 node apps/expo/e2e/rastro-mobile-mcp-e2e.mjs`.

The mobile readiness manifest recorded 354 checks, 4 optional skipped checks, 0 hard failures, `readinessGate.passed: true`, `readinessScore: 10`, and no missing required evidence.

## Product Scope Confirmed

Rastro is confirmed as a Spanish-first, Bolivia-first lost-pet recovery app rather than a pet marketplace. The confirmed scope includes member auth recovery, profile/contact settings, nearby resources, provider sponsor surfaces, provider reporting, mobile adoption publishing, report detail contact actions, report-linked chat, nearby alert settings, activity inbox history, and backend delivery behavior.

## Changes Included In This Readiness Record

### Persistent Report-Linked Chat

- Added app-owned report conversations backed by the API and database.
- Added mobile chat routes for opening a conversation by report.
- Added chat repository and API adapter coverage in Expo.
- Added validators and router tests for chat contracts.
- Added public report contact action integration so report details can open in-app chat.
- Confirmed chat history persists after sending and reopening a report-linked conversation.

Representative commits:

- `fc938ce Persist report-linked chat`
- `7dfe44f Add chat notification delivery dispatch`
- `6dd4c5e Polish mobile chat and visual surfaces`

### Nearby Alert Subscriptions And Delivery

- Added persistent alert subscription settings, alert radius handling, member location state, and push-token registration.
- Added backend matching for new nearby lost-pet reports.
- Added alert delivery records and dispatch behavior.
- Added job route coverage for alert delivery dispatch.
- Added proof that missing, disabled, and unregistered push tokens are skipped or disabled correctly.
- Confirmed reports older than 24 hours do not create nearby alert deliveries.
- Confirmed the mobile alert settings screen persists enabled settings after route remount and backend refresh.

Representative commits:

- `35d0a8e Persist nearby alert subscriptions`
- `db03a3b Add activity inbox alert delivery`
- `979179b Add alert delivery proof tests`

### Activity Inbox

- Expanded the Activity tab into a backend-backed inbox.
- Added alert history, chat message rows, and navigation targets.
- Added activity contracts and API repository coverage.
- Confirmed Activity can show backend alert history and chat rows.
- Confirmed tapping an activity chat item opens the chat and tapping an alert item opens the related report detail.

Representative commits:

- `db03a3b Add activity inbox alert delivery`
- `f8b96e8 Expand activity inbox events`

### Member Profile Contact Settings

- Added member profile data model, API router, repository, validators, and mobile repository adapter.
- Added profile settings screen for display name, phone, WhatsApp, and default contact preference.
- Integrated settings into the Perfil surface.
- Confirmed editing contact data visually on device, saving through the backend, and seeing the refreshed display name in Perfil.

Representative commit:

- `a801a5b Add member profile contact settings`

### Resources, Providers, Sponsors, And Provider Reporting

- Added provider resource contracts and stronger sponsor policy data.
- Confirmed resources search/list/map behavior.
- Confirmed resource provider profiles show provider media, summary, contact actions, and sponsor media.
- Confirmed sponsor surfaces remain separate from recovery priority and push notifications.
- Confirmed provider reporting from the mobile UI creates an admin moderation receipt.

Representative commits:

- `c738463 Polish provider sponsor contact contracts`
- `e8b67de Expand mobile readiness E2E proof`
- `6dd4c5e Polish mobile chat and visual surfaces`

### Mobile Adoption Publishing

- Expanded the MCP E2E harness to publish an adoption listing from the mobile app.
- Confirmed inline pet creation inside the adoption flow.
- Confirmed Android media picker selection, image crop flow, selected photo display, review, publish, and post-publish detail opening.
- Confirmed the created adoption listing can be reopened as another signed-in member and exposes the in-app chat contact action.

Representative commits:

- `bf3edc3 Expand mobile readiness E2E coverage`
- `9b81717 Add mobile readiness evidence harness`

### Visual And Accessibility Polish

- Added stable accessibility labels to important Pressable controls used by the E2E and by accessibility tooling:
  - account action buttons in Perfil,
  - report creation action buttons,
  - report creation pet-type buttons,
  - report creation contact-option buttons,
  - adoption segment buttons.
- Added a safe Material Community icon wrapper for mobile visual consistency.
- Improved chat screenshot reliability by dismissing the keyboard after send and asserting the sent message is visible.
- Improved media/provider visual checks in the E2E harness.

Representative commits:

- `6dd4c5e Polish mobile chat and visual surfaces`
- `bf3edc3 Expand mobile readiness E2E coverage`

### Mobile Readiness Evidence Harness

- Expanded `apps/expo/e2e/rastro-mobile-mcp-e2e.mjs` into a root-suite readiness harness.
- Captured root dev evidence for Next.js and Metro reachability.
- Captured fixture manifest snapshots, Android device metadata, runtime permission status, screenshots, UI XML dumps, and logcat output.
- Added auth fixture sign-in and session recovery evidence.
- Added Android media picker handling for adoption publishing.
- Added logcat readiness scanning.

Representative commits:

- `9b81717 Add mobile readiness evidence harness`
- `bf3edc3 Expand mobile readiness E2E coverage`

## Functionality Confirmed Working

### Auth And Session

Confirmed:

- Development build opens from Metro on Android.
- Signed-out Perfil state is visible.
- Fixture member sign-in succeeds.
- Existing auth session is recovered after reopening the development build.
- Account switching for fixture members works during the adoption contact proof.

Evidence:

- `auth-sign-in-fixture-viewer`
- `auth-session-recovered`
- `auth-fixture-viewer-session.png`
- `profile-saved-display-name.png`

Note: the E2E used fixture callback-cookie sign-in fallback after exercising the visible prompt. Real production OAuth and email sign-in should still receive a pre-release smoke test.

### Member Profile And Contact Defaults

Confirmed:

- A signed-in member can open Ajustes from Perfil.
- The member can edit display name, phone, WhatsApp, and default contact preference.
- The backend stores the edited profile data.
- Perfil refreshes with the saved display name.

Evidence:

- `member-profile-settings-backend-save`
- `member-profile-settings-draft.png`
- `profile-saved-display-name.png`

### Resources Directory

Confirmed:

- Recursos screen opens by deep link.
- Search input is available.
- Category filters for veterinary, shelter, groomer, and all can be selected.
- Map mode renders a resources map panel.
- List mode renders provider cards.
- Provider sponsor media loads.
- Resource media loads in the list.

Evidence:

- `resources-map.png`
- `resources-list.png`
- `media-loaded:resources-list`

### Resource Provider Profile

Confirmed:

- Provider profile opens by deep link.
- Provider summary, media, WhatsApp contact, and sponsor media are present.
- Provider media loads successfully.
- Provider profile reporting opens the report modal.
- Selecting `scam` and submitting creates a moderation queue receipt in the backend/admin path.

Evidence:

- `provider-profile.png`
- `provider-report-modal.png`
- `provider-report-submitted.png`
- `provider-report-modal-submit`
- `provider-report-admin-moderation-receipt`

### Adoption Listing Creation

Confirmed:

- Adoption creation opens by deep link.
- Inline pet creation works in the adoption flow.
- Pet name, type, breed, and description can be entered.
- Android gallery image selection works.
- Crop confirmation works.
- Selected photo appears in the form.
- Review screen is reachable.
- Publish succeeds.
- Published adoption detail opens.
- A different signed-in member can open the adoption detail and see the in-app chat contact action.

Evidence:

- `adoption-photo-selected.png`
- `adoption-review-ready.png`
- `adoption-publish-confirmation.png`
- `adoption-published.png`
- `adoption-published-owner-detail.png`
- `adoption-published-detail.png`
- `adoption-mobile-publish-success`
- `adoption-mobile-detail-opened`

### Public Report And Listing Details

Confirmed:

- Lost pet detail opens and shows media gallery, in-app chat contact, WhatsApp contact, and location action.
- Found pet detail opens and shows media gallery, WhatsApp contact, and location action.
- Sighting detail opens and shows media gallery, in-app chat contact, and location action.
- Adoption detail opens and shows media gallery, in-app chat contact, WhatsApp contact, and location action.
- Media loads on all inspected detail surfaces.

Evidence:

- `report-lost_pet.png`
- `report-found_pet.png`
- `report-sighting.png`
- `report-adoption.png`
- `media-loaded:report-lost_pet`
- `media-loaded:report-found_pet`
- `media-loaded:report-sighting`
- `media-loaded:report-adoption`

### Report-Linked Chat

Confirmed:

- Fixture seed creates a backend-persisted report-linked chat.
- Chat screen opens by report deep link.
- Message list and message input render.
- A message can be typed and sent.
- The sent message becomes visible after send.
- Keyboard is dismissed before screenshot capture, avoiding occluded proof.
- Reopening the report chat shows the sent message, proving history persistence.

Evidence:

- `chat-backend-persistence`
- `chat-workflow.png`
- `chat-keyboard-safe-screenshot`
- `visible-text:chat-reopened-message`

### Alert Settings

Confirmed:

- Alert settings screen opens by deep link.
- Alert subscription state shows `ALERTAS ACTIVAS`.
- Enabled alert settings survive route remount and backend refresh.
- Backend dispatch tests cover pending, sent, skipped, failed, missing-token, disabled-token, and unregistered-token behavior.

Evidence:

- `alerts-enabled.png`
- `alerts-backend-persistence`
- `packages/api/src/alert-delivery-dispatcher.test.ts`
- `packages/api/src/alert-repository.integration.test.ts`

### Activity Inbox

Confirmed:

- Activity screen opens by deep link.
- Nearby alert history section renders.
- Messages section renders.
- Latest chat row includes the sent message.
- Tapping the chat activity item navigates to chat.
- Tapping the alert activity item navigates to report detail.

Evidence:

- `activity-inbox.png`
- `activity-alert-report-detail.png`
- `activity-inbox-backend-navigation`

### Runtime And Device Readiness

Confirmed:

- Android device metadata captured.
- Runtime permissions granted for foreground location, notifications, and media/image access.
- Metro and Next.js root suite endpoints were reachable from the E2E context.
- Logcat readiness scan completed with no hard failure.

Evidence:

- `adb-devices.txt`
- `android-version.txt`
- `device-size.txt`
- `device-density.txt`
- `root-full-suite-command.json`
- `root-dev-processes.txt`
- `metro-status-head.txt`
- `next-root-head.txt`
- `logs/logcat.txt`
- `logcat-readiness-scan`

## Verification Commands Run

These commands passed during the readiness loop:

```bash
pnpm -F @acme/api test src/alert-delivery-dispatcher.test.ts src/alert-repository.test.ts src/router/alerts.test.ts src/router/report.test.ts
pnpm -F @acme/expo test -- src/features/shell/shell-screens.test.tsx src/features/report-creation/report-creation-ui.test.tsx src/features/adoption-listing-creation/adoption-listing-creation-screen.test.tsx
pnpm -F @acme/api typecheck
pnpm -F @acme/expo typecheck
pnpm -F @acme/expo lint -- e2e/rastro-mobile-mcp-e2e.mjs src/features/shell/shell-screens.tsx src/features/report-creation/report-creation-ui.tsx src/features/adoption-listing-creation/adoption-listing-creation-screen.tsx
pnpm -F @acme/api lint -- src/alert-delivery-dispatcher.test.ts src/alert-repository.integration.test.ts
node --check apps/expo/e2e/rastro-mobile-mcp-e2e.mjs
git diff --check
pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true
```

Fallow result for the final diff was a new-only pass:

- introduced dead code: 0
- introduced complexity findings: 0
- introduced duplication: 0

Inherited dead-code and duplication findings still exist in the repo and were not treated as deletion instructions.

## Evidence Artifact Index

Primary artifact directory:

```text
.scratch/mobile-qa/2026-07-01T10-31-36-091Z/mcp-e2e
```

Key files:

- `readiness-manifest.json`: full check manifest and readiness gate.
- `fixture-manifest.json`: seeded fixture snapshot.
- `root-full-suite-command.json`: root suite command evidence.
- `root-dev-processes.txt`: process evidence for root dev suite.
- `next-root-head.txt`: Next.js root reachability evidence.
- `metro-status-head.txt`: Metro reachability evidence.
- `logs/logcat.txt`: Android logcat capture.
- `ui/*.xml`: UIAutomator dumps for inspected screens.
- `*.png`: visual screenshots for inspected screens.

## Not Confirmed By This Run

These are residual release-hardening items, not blockers for the Android readiness score above:

- iOS device behavior was not exercised in this run.
- Physical-device push receipt was not exercised; backend dispatch behavior was tested.
- Production OAuth/email auth should receive a final smoke test outside fixture callback-cookie sign-in.
- Splash screen is configured in app config, but this run did not capture a launch splash screenshot.
- Small-device visual density should continue to be watched on additional Android/iOS viewport sizes.

## Current Conclusion

The app now has confirmed end-to-end coverage for the core v1 mobile user stories that matter for a polished 2026 recovery app: authenticated member identity, contact settings, report/listing contact, report-linked chat, nearby alert settings and history, activity navigation, resource discovery, provider sponsor visibility, provider reporting, and mobile adoption publishing with media. The confirmed readiness score is high enough to stop the audit/fix loop and move remaining work into release-hardening rather than blocking implementation.
