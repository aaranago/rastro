import type { RouterInputs, RouterOutputs } from "@acme/api";

import type { AdminResourceProviderProfile } from "./admin-resource-provider-admin-model";
import { localSponsorPlacementSurfaceOptions } from "./admin-resource-provider-admin-model";

export type AdminSponsorPlacementRecord =
  RouterOutputs["resources"]["admin"]["listSponsorPlacements"][number];
export type AdminSponsorPlacementCreateInput =
  RouterInputs["resources"]["admin"]["createSponsor"];
export type AdminSponsorPlacementUpdateInput =
  RouterInputs["resources"]["admin"]["updateSponsor"];
export type AdminSponsorPlacementDetachInput =
  RouterInputs["resources"]["admin"]["detachSponsorPlacement"];
export type AdminSponsorPlacementSurface =
  AdminSponsorPlacementCreateInput["surface"];

export interface AdminSponsorPlacementDashboardViewModel {
  createActionLabel: string;
  locale: "es-BO";
  placements: AdminSponsorPlacementViewModel[];
  providerOptions: AdminSponsorProviderOption[];
  safetyPolicy: AdminSponsorPlacementSafetyPolicyViewModel;
  stats: AdminSponsorPlacementStatsViewModel;
  surfaceOptions: AdminSponsorPlacementSurfaceOption[];
  title: string;
}

export interface AdminSponsorProviderOption {
  city: string;
  department: string;
  id: string;
  name: string;
}

export interface AdminSponsorPlacementViewModel {
  dateWindowLabel: string;
  disclosure: string;
  endsOn: string;
  label: string;
  placementId: string;
  providerCity: string;
  providerDepartment: string;
  providerId: string;
  providerName: string;
  safetyPolicy: AdminSponsorPlacementSafetyPolicyViewModel;
  startsOn: string;
  state: "active" | "expired" | "scheduled";
  stateLabel: "Activo" | "Expirado" | "Programado";
  surface: AdminSponsorPlacementSurface;
  surfaceLabel: string;
}

export interface AdminSponsorPlacementSafetyPolicyViewModel {
  eligibleSurfaceLabels: string[];
  pushNotifications: {
    eligible: false;
    label: "No elegible para push";
  };
  recoveryPriority: {
    canAffect: false;
    label: "No afecta prioridad de recuperación";
  };
}

export interface AdminSponsorPlacementStatsViewModel {
  activeCount: number;
  expiredCount: number;
  placementCount: number;
  providerCount: number;
  scheduledCount: number;
}

export interface AdminSponsorPlacementSurfaceOption {
  id: AdminSponsorPlacementSurface;
  label: string;
}

export interface AdminSponsorPlacementsForbiddenViewModel {
  body: string;
  locale: "es-BO";
  title: string;
}

export const adminSponsorPlacementSurfaceOptions =
  localSponsorPlacementSurfaceOptions satisfies readonly AdminSponsorPlacementSurfaceOption[];

const surfaceLabels = Object.fromEntries(
  adminSponsorPlacementSurfaceOptions.map((option) => [
    option.id,
    option.label,
  ]),
) as Record<AdminSponsorPlacementSurface, string>;

export function buildAdminSponsorPlacementDashboardViewModel(input: {
  placements: readonly AdminSponsorPlacementRecord[];
  providers: readonly AdminResourceProviderProfile[];
  today?: string;
}): AdminSponsorPlacementDashboardViewModel {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const placements = input.placements.map((placement) =>
    toSponsorPlacementViewModel(placement, today),
  );

  return {
    createActionLabel: "Crear patrocinio",
    locale: "es-BO",
    placements,
    providerOptions: input.providers.map((provider) => ({
      city: provider.city,
      department: provider.department,
      id: provider.id,
      name: provider.name,
    })),
    safetyPolicy: buildSponsorSafetyPolicy(
      adminSponsorPlacementSurfaceOptions.map((option) => option.id),
    ),
    stats: buildStats(placements),
    surfaceOptions: [...adminSponsorPlacementSurfaceOptions],
    title: "Gestión de patrocinios locales",
  };
}

export function buildAdminSponsorPlacementsForbiddenViewModel(): AdminSponsorPlacementsForbiddenViewModel {
  return {
    body: "Esta superficie esta disponible solo para administradores de Rastro.",
    locale: "es-BO",
    title: "Acceso restringido",
  };
}

function toSponsorPlacementViewModel(
  placement: AdminSponsorPlacementRecord,
  today: string,
): AdminSponsorPlacementViewModel {
  const state = getPlacementState(placement, today);
  const eligibleSurfaces = placement.safetyPolicy.eligibleSurfaces;

  return {
    dateWindowLabel: `${placement.startsOn} a ${placement.endsOn}`,
    disclosure: placement.disclosure,
    endsOn: placement.endsOn,
    label: placement.label,
    placementId: placement.placementId,
    providerCity: placement.city,
    providerDepartment: placement.department,
    providerId: placement.providerId,
    providerName: placement.providerName,
    safetyPolicy: buildSponsorSafetyPolicy(eligibleSurfaces),
    startsOn: placement.startsOn,
    state,
    stateLabel: getPlacementStateLabel(state),
    surface: placement.surface,
    surfaceLabel: getSurfaceLabel(placement.surface),
  };
}

function buildSponsorSafetyPolicy(
  eligibleSurfaces: readonly AdminSponsorPlacementSurface[],
): AdminSponsorPlacementSafetyPolicyViewModel {
  return {
    eligibleSurfaceLabels: eligibleSurfaces.map(getSurfaceLabel),
    pushNotifications: {
      eligible: false,
      label: "No elegible para push",
    },
    recoveryPriority: {
      canAffect: false,
      label: "No afecta prioridad de recuperación",
    },
  };
}

function getSurfaceLabel(surface: AdminSponsorPlacementSurface): string {
  return surfaceLabels[surface];
}

function getPlacementState(
  placement: AdminSponsorPlacementRecord,
  today: string,
): AdminSponsorPlacementViewModel["state"] {
  if (placement.endsOn < today) {
    return "expired";
  }

  if (placement.startsOn > today) {
    return "scheduled";
  }

  return "active";
}

function getPlacementStateLabel(
  state: AdminSponsorPlacementViewModel["state"],
): AdminSponsorPlacementViewModel["stateLabel"] {
  if (state === "expired") {
    return "Expirado";
  }

  return state === "scheduled" ? "Programado" : "Activo";
}

function buildStats(
  placements: readonly AdminSponsorPlacementViewModel[],
): AdminSponsorPlacementStatsViewModel {
  return {
    activeCount: placements.filter((placement) => placement.state === "active")
      .length,
    expiredCount: placements.filter(
      (placement) => placement.state === "expired",
    ).length,
    placementCount: placements.length,
    providerCount: new Set(placements.map((placement) => placement.providerId))
      .size,
    scheduledCount: placements.filter(
      (placement) => placement.state === "scheduled",
    ).length,
  };
}
