## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with a root `CONTEXT.md` and root `docs/adr/`. See `docs/agents/domain.md`.

### Local development verification

For emulator and end-to-end mobile verification, launch the full suite from the repo root with `pnpm dev` so the Expo app, API, Next app, database tasks, and validators run together. Do not verify auth, uploads, report publishing, share, or view-report flows from an Expo-only dev command, because that misses backend-dependent behavior.

### Fallow

Before committing non-trivial JavaScript or TypeScript changes, run `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`. Treat findings as review input; Fallow does not replace lint, typecheck, or tests.

Do not delete code only because Fallow reports it as unused. Trace first with `fallow dead-code --trace <file>:<export>` or `fallow dead-code --trace-dependency <name>`, and do not enable Fallow telemetry.
