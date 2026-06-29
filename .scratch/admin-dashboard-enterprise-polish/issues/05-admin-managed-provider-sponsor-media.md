# AEP-005 Admin-managed provider and sponsor media

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Issue ID: AEP-005
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-enterprise-polish/PRD.md`

## What to build

Create an admin-owned media lifecycle for provider and sponsor imagery using the existing S3/MinIO adapter.

## Acceptance criteria

- [ ] Provider `logo` and `photo` can be managed through admin upload sessions, while public `logoUrl` and `photoUrl` remain compatible outputs.
- [ ] Sponsor placements support `logo`, `banner`, or `image` fields in the backend, admin UI, and public contract.
- [ ] Admin upload controls support preview, progress, retry, replace, remove, validation errors, and explicit URL fallback where supported.
- [ ] Expo renders provider uploaded image URLs in Resource Provider cards and profiles.
- [ ] Expo renders sponsor image fields on sponsor placement surfaces without implying recovery priority.

## Required tests

- DB/API tests for media asset persistence, replacement, removal, public URL mapping, and sponsor image contract.
- Next tests for provider/sponsor upload controls, validation errors, URL fallback, and remove/replace flows.
- Expo tests for Recursos cards, provider profiles, and sponsor placement image rendering.

## Notes

Reuse the existing storage adapter instead of creating a new object-storage client.
