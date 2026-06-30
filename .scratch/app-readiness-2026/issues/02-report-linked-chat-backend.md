# AR26-002 Report-linked chat backend

Status: ready-for-agent
Labels: ready-for-agent
Severity: P0
Type: AFK

## Problem

`Chat en Rastro` is not a real backend-owned conversation flow. Public report detail exposes an in-app chat action that can route back to a report, while the chat route uses sample/in-memory data.

## What to build

Implement app-owned one-to-one, report-linked chat with persistence, membership checks, moderation hooks, and Expo API adapters.

## Acceptance criteria

- [ ] API can get or create a conversation for a report contact action.
- [ ] Messages persist in the database and are scoped to conversation participants.
- [ ] Report owners and contacting members cannot spoof participants.
- [ ] Public report detail opens the created conversation, not a report deep link.
- [ ] Chat route no longer hardcodes sample participants/messages.
- [ ] Reporting/blocking a chat remains backend-confirmed.
- [ ] Tests cover create/open, send, refresh, unauthorized access, blocked member behavior, and report detail contact wiring.

## Suggested ownership

- Backend chat owner: DB, repository, router, validators.
- Expo chat owner: API adapter, route wiring, tests.

