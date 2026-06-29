import type {
  LocalSponsorPlacement,
  LocalSponsorPlacementSurface,
} from "./resource-types";

export function isLocalSponsorPlacementEligibleForSurface(
  placement: LocalSponsorPlacement | undefined,
  surface: LocalSponsorPlacementSurface,
) {
  return placement?.eligibleSurfaces.includes(surface) === true;
}

export function getLocalSponsorPlacementForSurface(
  placement: LocalSponsorPlacement | undefined,
  surface: LocalSponsorPlacementSurface,
) {
  return isLocalSponsorPlacementEligibleForSurface(placement, surface)
    ? placement
    : undefined;
}
