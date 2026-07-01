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
  placement:
    | LocalSponsorPlacement
    | readonly LocalSponsorPlacement[]
    | undefined,
  surface: LocalSponsorPlacementSurface,
) {
  if (isLocalSponsorPlacementList(placement)) {
    return placement.find((candidate) =>
      isLocalSponsorPlacementEligibleForSurface(candidate, surface),
    );
  }

  return isLocalSponsorPlacementEligibleForSurface(placement, surface)
    ? placement
    : undefined;
}

export function getLocalSponsorPlacementsForSurface(
  placement:
    | LocalSponsorPlacement
    | readonly LocalSponsorPlacement[]
    | undefined,
  surface: LocalSponsorPlacementSurface,
  options: { limit?: number } = {},
) {
  const limit = options.limit ?? 3;
  const placements = isLocalSponsorPlacementList(placement)
    ? placement
    : placement
      ? [placement]
      : [];

  return placements
    .filter((candidate) =>
      isLocalSponsorPlacementEligibleForSurface(candidate, surface),
    )
    .slice(0, limit)
    .map(cloneRequiredLocalSponsorPlacement);
}

export function cloneLocalSponsorPlacement(
  placement: LocalSponsorPlacement | undefined,
) {
  if (placement === undefined) {
    return undefined;
  }

  return cloneRequiredLocalSponsorPlacement(placement);
}

export function cloneLocalSponsorPlacements(
  placements: readonly LocalSponsorPlacement[] | undefined,
) {
  return placements?.map(cloneRequiredLocalSponsorPlacement);
}

function isLocalSponsorPlacementList(
  placement:
    | LocalSponsorPlacement
    | readonly LocalSponsorPlacement[]
    | undefined,
): placement is readonly LocalSponsorPlacement[] {
  return Array.isArray(placement);
}

function cloneRequiredLocalSponsorPlacement(
  placement: LocalSponsorPlacement,
): LocalSponsorPlacement {
  return {
    kind: placement.kind,
    placementId: placement.placementId,
    label: placement.label,
    disclosure: placement.disclosure,
    ...(placement.logoUrl ? { logoUrl: placement.logoUrl } : {}),
    ...(placement.imageUrl ? { imageUrl: placement.imageUrl } : {}),
    eligibleSurfaces: [...placement.eligibleSurfaces],
    safetyPolicy: {
      recoveryPriority: { ...placement.safetyPolicy.recoveryPriority },
      pushNotifications: { ...placement.safetyPolicy.pushNotifications },
    },
  };
}
