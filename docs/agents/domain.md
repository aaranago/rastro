# Domain Docs

This is a single-context repo.

## Before exploring, read these

- `CONTEXT.md` at the repo root.
- Relevant ADRs in `docs/adr/`.
- Product planning docs in `docs/product/` when the task touches product scope, UI, auth setup, or PRD requirements.

If one of these files does not exist, proceed silently. Producer skills create docs lazily when terms or decisions are resolved.

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a concept is missing from the glossary, either reconsider the term or note it for a future `grill-with-docs` session.

## Flag ADR conflicts

If an output contradicts an ADR, surface it explicitly rather than silently overriding it.
