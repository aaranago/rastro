# Recursos Android stale-ngrok correction

Date: 2026-06-29
Worker: Implementation Worker B

## Root cause

The Android Recursos blocker was a local development API base URL selection bug, not a broken `resources.nearby` route.

- The Expo app preferred stale repo `.env` config: `https://untransiently-nongerundive-roxanne.ngrok-free.dev`.
- That ngrok origin returned text/plain 404 content beginning with `The endpoint ... is offline` and `ERR_NGROK_3200`.
- tRPC tried to parse that text response as JSON and surfaced `JSON Parse error: Unexpected character: T`.
- The local Next route was reachable at `http://localhost:3000/api/trpc/resources.nearby` with HTTP 200 JSON.

## Fix

- `apps/expo/app.config.ts` now tags `extra.apiBaseUrlSource` as `env-file` or `process`.
- `apps/expo/src/utils/base-url.ts` treats env-file API bases as local defaults when Metro exposes a development host.
- Android localhost-style Metro hosts are converted to `10.0.2.2` so the emulator reaches the root dev backend on port 3000.
- Shell/EAS/unknown explicit API base config still wins over local host derivation, and env-file API bases still work for release-like builds when no local host is available.

## Automated validation

- `pnpm -F @acme/expo exec vitest run app.config.test.ts src/utils/base-url.test.ts src/features/resources/resources-api-adapter.test.ts` -> passed, 3 files / 21 tests.
- `pnpm -F @acme/api exec vitest run src/router/resources.test.ts` -> passed, 1 file / 29 tests.
- `pnpm -F @acme/expo lint` -> passed; emitted the existing `baseline-browser-mapping` freshness warning.
- `pnpm -F @acme/expo typecheck` -> passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` -> verdict `pass`; 4 inherited unused dependency findings, 0 introduced findings, 0 complexity findings, 0 duplication clone groups.
- `git diff --check` -> passed.

The local shell emitted the existing Node engine warning because it is running Node `v24.11.1` while the repo declares `^22.21.0`.

## Runtime scope

Implementation Worker B did not rerun root `pnpm dev` or emulator/MCP verification. Runtime emulator proof remains delegated after the implementation commit.
