# Add abuse reporting and blocking end-to-end

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the end-to-end trust and safety path for members to report abusive content and block abusive chat. Reported items should become reviewable by admins in later dashboard slices.

## Acceptance criteria

- [x] Every report, adoption listing, chat, and resource-provider profile has a `Reportar` action.
- [x] Report reasons include spam, scam, incorrect location, offensive content, animal cruelty, stolen pet concern, impersonation, and other.
- [x] Submitting a report creates an admin-review item.
- [x] Blocking a member stops future chat from that member.
- [x] Blocking can hide the conversation from the blocker.
- [x] Report/block UI is available from relevant mobile surfaces and uses Spanish copy.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/13-publish-non-monetary-adoption-listing-end-to-end.md`
- `.scratch/rastro-v1/issues/16-add-report-linked-in-app-chat-and-whatsapp-contact-options.md`

## Context

This is required for UGC safety and app-store review posture.

## Verification notes

2026-06-18:

- Added a shared Expo trust-safety reporting boundary with Spanish report reasons and pending admin-review receipts.
- Wired Lost Pet Report, Found Pet Report, Sighting Report, Adoption Listing, In-App Chat, and Resource Provider reporting into the shared admin-review item model.
- Added mobile `Reportar` actions for nearby cards and public report/listing deep-link screens, including the missing Found Pet Report route.
- Preserved chat blocking and hide-conversation behavior.
- Verified with Expo tests, typecheck, lint, format, and Fallow audit.
