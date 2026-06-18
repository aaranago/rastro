# Add report-linked in-app chat and WhatsApp contact options

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Implement report/listing contact options: in-app chat, WhatsApp, or both. In-app chat should be minimal, one-to-one, tied to a report or listing, stored by Rastro, and notified through push.

## Acceptance criteria

- [x] Report/listing creation lets the creator choose in-app chat, WhatsApp, or both.
- [x] WhatsApp contact opens WhatsApp using only the phone number the creator chose to expose.
- [x] Phone verification is not required.
- [x] In-app chat is one-to-one and tied to a report or listing.
- [x] Chat does not support public comments, group chat, unrelated DMs, image attachments, or file attachments.
- [x] New-message alerts use push notifications.
- [x] Open chat screens refresh on focus/send/polling without always-on sockets.
- [x] Chat includes report/block controls and a link back to the related report/listing.

## Blocked by

- `.scratch/rastro-v1/issues/04-implement-better-auth-across-expo-and-nextjs.md`
- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`

## Context

Read ADR-0002 before implementing chat.
