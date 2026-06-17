# Report-Linked In-App Chat

## Purpose

Support safe one-to-one contact between members about a specific report or listing. Chat is app-owned, minimal, and notification-backed.

## Primary Users

- Member
- Caretaker

## Required Screens

- Conversation list entry from `Actividad`.
- Chat thread tied to report/listing.
- New message state.
- Report/block action sheet.
- Blocked conversation state.
- Push/deep-link entry state.

## Required Data

- Conversation id.
- Related report/listing summary.
- Participants.
- Messages.
- Read/unread state.
- Block/report state.

## Primary Actions

- Send text message.
- Open related report/listing.
- Report conversation/member.
- Block member.
- Open WhatsApp if the report also exposes WhatsApp contact.

## Navigation

- Entry: report detail, `Actividad`, push notification.
- Exit: report detail, report/block flow, profile/settings if needed.

## UX Requirements

- No public comments.
- No group chats.
- No unrelated direct messages.
- No image or file attachments in v1.
- Open chat screens may refresh on focus/send/polling; do not imply always-on live presence.
- New-message alerts use push notifications.

## Required States

- Loading messages.
- Empty/new conversation.
- Sending.
- Send failed/retry.
- Offline.
- Blocked member.
- Reported conversation.

## Mock Drop Location

Place generated images in `docs/screens/07-chat/mocks/`.
