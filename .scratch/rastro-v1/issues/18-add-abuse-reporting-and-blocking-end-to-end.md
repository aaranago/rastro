# Add abuse reporting and blocking end-to-end

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Add the end-to-end trust and safety path for members to report abusive content and block abusive chat. Reported items should become reviewable by admins in later dashboard slices.

## Acceptance criteria

- [ ] Every report, adoption listing, chat, and resource-provider profile has a `Reportar` action.
- [ ] Report reasons include spam, scam, incorrect location, offensive content, animal cruelty, stolen pet concern, impersonation, and other.
- [ ] Submitting a report creates an admin-review item.
- [ ] Blocking a member stops future chat from that member.
- [ ] Blocking can hide the conversation from the blocker.
- [ ] Report/block UI is available from relevant mobile surfaces and uses Spanish copy.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`
- `.scratch/rastro-v1/issues/13-publish-non-monetary-adoption-listing-end-to-end.md`
- `.scratch/rastro-v1/issues/16-add-report-linked-in-app-chat-and-whatsapp-contact-options.md`

## Context

This is required for UGC safety and app-store review posture.
