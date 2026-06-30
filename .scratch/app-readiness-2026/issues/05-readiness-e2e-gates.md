# AR26-005 Readiness e2e gates

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Type: AFK

## Problem

Current Playwright coverage is admin-heavy and current mobile MCP is a seeded smoke. The tests document known gaps such as chat persistence instead of failing readiness.

## What to build

Create a release-readiness verification loop with explicit pass/fail oracles for mobile and web.

## Acceptance criteria

- [ ] Root full-suite run starts with `TURBO_UI=true pnpm dev`.
- [ ] Mobile MCP fails on LogBox, stale ngrok/base URL, JSON parse errors, blank screens, broken media fallback, or keyboard overlap.
- [ ] Mobile MCP covers auth, report creation for lost/found/sighting/adoption, native media upload, publish confirmation, share, view created report, Recursos, provider profile, provider report, chat, alerts, offline/reopen.
- [ ] Playwright splits admin chrome smoke from public functional contracts.
- [ ] Visual artifacts include semantic assertions, not only screenshots.
- [ ] A manifest records commands, artifacts, screenshots, UI dumps, logcat scans, and readiness score.

## Suggested ownership

- Web e2e owner.
- Mobile MCP owner.
- Coordinator-only emulator verification owner.

