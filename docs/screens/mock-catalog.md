# Rastro Mock Catalog

This catalog maps generated mock images to screen-spec folders. Images are generated from the stronger `.scratch/ui-draft` compositions after applying one Rastro polish layer for color, Spanish copy, Bolivia-only sample data, viewport sizing, and navigation consistency.

## Regeneration

The deterministic renderer is `docs/screens/render-mocks.mjs`.

Run it with Node from the repository root:

```bash
node docs/screens/render-mocks.mjs
```

It writes PNGs into each `docs/screens/<flow>/mocks/` directory using the naming convention from `docs/screens/README.md`. It also writes normalized reference HTML under `mocks/html/` for developers who need to inspect the source composition.

## Raw Drafts

The raw generated images in `.scratch/ui-draft/` are reference material only. They have better composition than the rejected low-fidelity pass, but many still have inconsistent dimensions, over-saturated color, English/admin copy, non-Bolivia sample locations, and navigation drift.

## Canonical Mock Standard

All final mocks should follow `docs/screens/design-system.md`.
