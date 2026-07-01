# Rastro Mobile Audit Evidence - 2026-07-01

This document records the Rastro app functionality reviewed during the July 1, 2026 readiness loop. It separates current-build emulator proof from automated contract coverage and from explicit blockers. It must not be read as a release-readiness certificate.

## Status

- Strict readiness status: not release-ready.
- Current strict subauditor scores: completion 6.5/10, market success 6.0/10, appeal 6.6/10, readiness 5.8/10.
- Completion rate: below 9/10 until pet profiles, location switching, safe-area overlap proof, and resource state coverage are proven by current-build E2E evidence.
- Market success rate: below 9/10 until the remaining half-wired feature flows are fixed on-device.
- Appeal rate: below 9/10 until onboarding spacing and all dense-state screens are rechecked on real emulator captures.
- Further implementation loop required: yes.
- Primary evidence bundle: `.scratch/mobile-qa/2026-07-01T10-31-36-091Z/mcp-e2e`.
- Mobile platform confirmed: Android emulator `emulator-5554`.
- Root development command confirmed: `TURBO_UI=true pnpm dev`.
- Mobile E2E command confirmed: `RASTRO_E2E_EXPO_DEV_SERVER_URL=http://127.0.0.1:8081 RASTRO_E2E_MOBILE_NEXT_BASE_URL=http://10.0.2.2:3000 node apps/expo/e2e/rastro-mobile-mcp-e2e.mjs`.

The previous mobile readiness manifest recorded 354 checks, 4 optional skipped checks, 0 hard failures, `readinessGate.passed: true`, `readinessScore: 10`, and no missing required evidence against the old baseline gate. That claim is now superseded. The gate did not require Mis mascotas create/edit backend persistence, ready-state location switching in Cerca, safe-area/overlap bounds proof, or a resources state matrix, so it cannot support a 9/10+ readiness claim.

`apps/expo/e2e/rastro-mobile-mcp-e2e.mjs` now treats those four categories as hard-required evidence:

- `pet-profiles-create-edit-backend-save`
- `location-switching-cerca-postgis`
- `safe-area-and-overlap-pass`
- `resources-state-matrix`

Until those IDs are produced by real E2E steps, the readiness manifest reports them as missing and the script fails the readiness gate after writing artifacts.

## Strict Follow-Up Round - 2026-07-01

This follow-up round was run after the stricter adversarial review that called out stale UI evidence, clipped controls, repeated headers, and half-wired Mis mascotas behavior.

Implemented and locally verified in this round:

- Rebuilt and installed a fresh Android development build on `emulator-5554` after the previous installed app proved stale. The universal debug APK built successfully but could not install because the emulator had insufficient internal storage; an x86_64-only debug APK installed successfully.
- Confirmed `mcp__mobile_mcp` current-build visual navigation on Android after selecting the Metro server at `http://10.0.2.2:8081`.
- Confirmed Cerca now starts with an explicit location chooser and, after selecting Santa Cruz de la Sierra, shows `Cambiar zona`, radius controls first, report-type chips below the radius, and `Lista` / `Mapa` below the report-type chips.
- Confirmed the Cerca list card no longer sits under the bottom tab bar in the captured viewport.
- Confirmed Recursos category chips no longer crop `Peluquerías`; categories wrap into a readable chip grid.
- Confirmed Recursos provider cards no longer use crowded passive badge stacks for category, urgency, and availability. The card now uses one compact metadata line and keeps pill styling for contact actions and trust/disclosure only.
- Confirmed the global `Reportar` FAB no longer appears over dense Recursos or Perfil content.
- Confirmed Actividad visitor state no longer repeats a content-level `Actividad` title.
- Confirmed Mis mascotas opens as a real routed screen for visitors instead of a dead stub, and the native duplicate title was removed while keeping the back affordance.
- Confirmed Alertas visitor state renders readable radius controls and session-required subscription copy.
- Confirmed Cerca map report/search markers render as native Android pins and are visible without clipping in the captured map viewport.
- Confirmed local automated coverage for pet profile API/db/repository contracts, alert settings, activity copy sanitization, resources layout changes, and API/db/validator contracts.

Implemented but not fully current-build E2E-proven:

- Mis mascotas now has an API/db-backed profile repository for create/edit/list/delete profile metadata, plus an Expo repository adapter and native photo picker wiring.
- Saved Mis mascotas profile metadata is now loaded before member lost/adoption report creation mounts, and those profiles are passed into the existing pet selectors instead of defaulting to empty inline-create state.
- Mis mascotas photos are metadata references to selected image URIs in this slice. They are not uploaded through a backend object-storage/media pipeline yet, so reinstall/device-transfer durability for pet profile photos remains unconfirmed.
- Alertas has unit/API coverage for subscription state and retry copy, but authenticated push-token activation was not re-proven on the fresh emulator install.

Current-build visual evidence:

- `.scratch/mobile-audit-2026-07-01/cerca-location-picker-current.png`
- `.scratch/mobile-audit-2026-07-01/cerca-ready-list-current.png`
- `.scratch/mobile-audit-2026-07-01/cerca-map-native-pins-current.png`
- `.scratch/mobile-audit-2026-07-01/resources-simplified-panel-current.png`
- `.scratch/mobile-audit-2026-07-01/alertas-visitor-current.png`
- `.scratch/mobile-audit-2026-07-01/mis-mascotas-title-clean-current.png`
- `.scratch/mobile-audit-2026-07-01/mis-mascotas-no-fab-current.png`

Stale screenshots from earlier in the same loop were removed from this evidence set because they showed the previous crowded Recursos badge stack and pre-fix map marker state.

Verification commands run in this follow-up round:

- `TURBO_UI=true pnpm dev`
- `pnpm -F @acme/expo exec expo run:android --no-build-cache` (build passed, install failed on emulator storage)
- `./gradlew assembleDebug -PreactNativeArchitectures=x86_64` from `apps/expo/android`
- `adb -s emulator-5554 install -r -d --user 0 apps/expo/android/app/build/outputs/apk/debug/app-debug.apk`
- `pnpm -F @acme/expo typecheck`
- `pnpm -F @acme/api typecheck`
- `pnpm -F @acme/db typecheck`
- `pnpm -F @acme/validators typecheck`
- `pnpm -F @acme/expo test -- pet-profiles.test.ts pet-profiles-repository.test.ts alert-subscription-settings-screen.test.tsx alert-subscription-settings-view-model.test.ts activity-model.test.ts nearby-lost-reports.test.ts`
- `pnpm -F @acme/api test -- router/pet-profiles.test.ts`
- `pnpm -F @acme/expo lint -- src/features/pet-profiles/pet-profiles-screen.tsx src/features/pet-profiles/api-pet-profile-repository.ts`
- `pnpm -F @acme/expo lint -- src/features/resources/resources-screen.tsx`
- `pnpm -F @acme/expo test -- resource-provider-card.test.tsx`
- `pnpm -F @acme/expo test -- report-map.test.tsx native-pet-profile-photo-source.test.ts shell-overlays.test.tsx`
- `pnpm -F @acme/expo test -- report-creation-route-screen.test.tsx`
- `pnpm -F @acme/expo lint -- src/features/resources/resource-provider-card.tsx src/features/resources/resource-provider-card.test.tsx`
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`

Remaining strict blockers from this round:

- Authenticated Alertas subscription activation and push-token retry were not re-proven on the fresh current build after reinstall because the emulator auth session was cleared. Unit/API coverage passes, but this is not a current-build E2E proof.
- Mis mascotas backend create/edit persistence for profile metadata is implemented and tested through API/Expo repositories, but authenticated create/edit was not re-proven visually on the current build after reinstall.
- Mis mascotas photo persistence is not full backend media persistence. The current slice stores prepared URI metadata; object-storage upload/reload proof is still missing.
- Mis mascotas profiles are now injected into member lost/adoption report creation in code and unit tests, but this still needs current-build authenticated emulator proof.
- Recursos list/map visual states improved, but the full state matrix is still not proven: loading, empty, backend error/retry, offline cached, stale provider, and sponsored-provider variants still need E2E capture.
- Onboarding still shows a large blank vertical area before the main copy on the fresh install; this was discovered while reaching the main shell and should enter the next visual polish loop.

Strict conclusion after this round: materially improved, but still not 9/10 release-ready.

## Tool Coverage

- `mcp__mobile_mcp`: available as the live emulator UI tool for screenshots, device/app inspection, and direct mobile interaction. This is the correct tool family for native visual audits.
- `mcp__expo`: available in the main Codex session for EAS workflows, build logs, TestFlight feedback/crashes, and App Store reviews. It is not a live Expo-dev-client visual navigator for the local emulator, so it does not replace `mcp__mobile_mcp` for native UI audits.
- `mcp__playwright`: available only for browser control. It can help with web/admin surfaces and browser screenshots, but it does not replace native emulator E2E for the Expo app.

## UI Decision Notes From This Round

- Recursos filter controls remain chip-like because they make an active selection.
- Provider card metadata no longer uses multiple passive badges. Category, urgency, and availability now render as one compact metadata line because they describe the provider rather than triggering an action.
- Provider contact remains a pill-like action because it is tappable, and sponsor/verification can still use badges because those are trust/disclosure signals.
- Map markers now use native Android marker pins instead of custom child marker bubbles to avoid clipping and inconsistent marker rendering in `react-native-maps`.

## Product Scope Partially Confirmed

Rastro remains scoped as a Spanish-first, Bolivia-first lost-pet recovery app rather than a pet marketplace. The baseline evidence confirms meaningful slices of member auth recovery, profile/contact settings, nearby resources, provider sponsor surfaces, provider reporting, mobile adoption publishing, report detail contact actions, report-linked chat, nearby alert settings, activity inbox history, and backend delivery behavior. It does not yet confirm full mobile readiness because several expected 2026 app flows are still missing or visually unproven.

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
- Updated the readiness gate to fail when strict evidence categories are missing instead of treating them as optional or untracked.

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

These are now blockers for a 9/10+ mobile readiness claim, not residual hardening items:

- Mis mascotas create/edit/delete/backend persistence, draft restore, max-photo behavior, and reuse into report/listing creation.
- Ready-state Cerca location switching between current location, last detected location, manual Bolivia city/neighborhood selection, and map pin placement.
- Safe-area and overlap proof that cards, buttons, labels, FABs, tab labels, and map markers are not clipped on representative device sizes.
- Resources loading, list, map, empty, backend error/retry, offline cached, stale provider, and sponsor-policy states.
- Physical push receipt, notification tap deep link, and OS permission education without pre-granting notification permission.
- Lost, found, and sighting creation/update flows from mobile, including validation, draft restore, publish, lifecycle update, close/reopen, and share execution.
- iOS device behavior was not exercised in this run.
- Production OAuth/email auth should receive a final smoke test outside fixture callback-cookie sign-in.
- Splash screen is configured in app config, but this run did not capture a launch splash screenshot.
- Small-device visual density was not judged with baseline diffs or accessibility-bounds clipping checks.

## Current Conclusion

The baseline artifacts prove several important backend-backed slices, but they do not prove a polished 2026 mobile app. The readiness loop should continue until the strict evidence IDs above are produced by real emulator E2E steps and the visual audit confirms no cropped controls, repeated low-value headers, hidden bottom actions, or clipped map markers.
