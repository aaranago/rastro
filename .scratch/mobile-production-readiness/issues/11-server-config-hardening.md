# 11 - Harden server configuration, secrets, and logs

Status: ready-for-agent
Severity: P2
Journey: Backend resilience, privacy, and production setup
Screens: Not screen-specific

## Problem

Starter production-adjacent server config remains in place. CORS is open, errors may log sensitive details, production secret validation is weak, and required map/storage env documentation is missing.

## Reproduction

1. Inspect the tRPC route and auth env validation.
2. Inspect `.env.example` and mobile runbook for map/storage variables.
3. Trigger API errors in development and review logs.

## Expected

Production config validates required secrets and origins, logs are safe, and runbook/env docs explain required backend, map, database, and S3-compatible variables without exposing secrets.

## Actual

The tRPC route allows `*`, logs error objects, auth secret validation only checks non-empty value, and `.env.example` lacks storage/map variables.

## Impact

Future production deployment risks unsafe origin access, leaked signed URLs or credentials in logs, and misconfigured map/storage/auth environments.

## Evidence

- `apps/nextjs/src/app/api/trpc/[trpc]/route.ts:12`
- `apps/nextjs/src/app/api/trpc/[trpc]/route.ts:37`
- `packages/auth/env.ts:18`
- `packages/api/src/trpc.ts:90`
- `.env.example:3`
- `docs/dev/mobile-runbook.md`

## Root Cause

Confirmed. Generic starter config has not been hardened for the product's sensitive location/media/auth data.

## Acceptance Criteria

- CORS uses a documented allowlist in non-development environments.
- Production auth secret validation enforces strong minimum requirements.
- Server logs redact tokens, signed URLs, credentials, private contact data, and stack traces in client-facing errors.
- Development-only artificial latency cannot affect production builds.
- `.env.example` documents required map, database, auth, S3-compatible storage, CDN, and mobile API variables without secrets.
- Mobile runbook explains ngrok/dev-client/backend/storage/map setup and known blockers.
- Tests or config checks fail fast for missing production map/storage/auth secrets.

## Required Automated Tests

- Env validation tests for production secret requirements.
- CORS origin allow/deny tests.
- Error formatting/log redaction tests where practical.
- Config tests for required map/storage variables.

## Required Manual Verification

- Run backend with development env and confirm permissive local behavior still works.
- Run production-mode config validation with missing secrets and confirm fail-fast errors.
- Trigger an API error and verify no sensitive data appears in client response or runtime logs.

## Affected Files

- `apps/nextjs/src/app/api/trpc/[trpc]/route.ts`
- `packages/auth/env.ts`
- `packages/api/src/trpc.ts`
- `.env.example`
- `docs/dev/mobile-runbook.md`
- `docs/dev/mobile-audit.md`

## Backend, Database, Map, or Storage Implications

Documents and validates storage/map variables introduced by issues 04 and 06.

## Dependencies

Requires final variable names from issues 04 and 06 for full documentation.

## Regression Surfaces

- Local dev via ngrok.
- Better Auth OAuth callbacks.
- API smoke tests.

## Non-Goals

- Do not rotate or print real secrets.
- Do not block local development with production-only requirements.
