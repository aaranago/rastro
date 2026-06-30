# Rastro 2026 app readiness audit

Status: ready-for-agent
Labels: ready-for-agent
Readiness score: 5/10 after the 2026-06-30 strict-user audit loop.

## Summary

The app has a solid backend-backed foundation for report creation, managed media readiness, public report visibility, and Resource Provider browsing. It is not yet market-ready because several expected 2026 app flows are local-only, fixture-backed, or not covered by strong e2e gates.

## Fixed in the audit loop

- Expo local dev API base provenance now treats preloaded repo `.env` values as env-file defaults, so local Metro can derive a device-reachable backend instead of using stale ngrok values.
- Perfil no longer exposes the dead `Mis reportes` row, and `Ajustes` now routes to a real account settings screen.
- The chat screen test imports again by mocking the native safe-area package.
- Provider contact and external-link actions now preflight/open safely and show Spanish inline error feedback on failure.
- Recursos directory cards now receive a report handler in the live route, exposing the existing provider report affordance.

## Remaining readiness issues

Implement the issue files in this folder as disjoint slices. The single emulator must be used only by the coordinator during final verification.

## Verification rule

Backend-dependent mobile verification must start from the repo root with:

```bash
TURBO_UI=true pnpm dev
```

Do not claim auth, upload, publish, share, chat, alert, or view-report readiness from an Expo-only dev command.

