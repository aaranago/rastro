import type { RouterInputs, RouterOutputs } from "@acme/api";
import type { AdminSponsorPlacementListInput } from "@acme/validators";

import type { AdminResourceProviderProfile } from "./admin-resource-provider-admin-model";
import { localSponsorPlacementSurfaceOptions } from "./admin-resource-provider-admin-model";

export type { AdminSponsorPlacementListInput };

export type AdminSponsorPlacementRecord =
  RouterOutputs["resources"]["admin"]["listSponsorPlacements"] extends readonly (infer TItem)[]
    ? TItem
    : RouterOutputs["resources"]["admin"]["listSponsorPlacements"] extends {
          items: readonly (infer TItem)[];
        }
      ? TItem
      : never;
export type AdminSponsorPlacementListResult =
  RouterOutputs["resources"]["admin"]["listSponsorPlacements"];
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
  list: AdminSponsorPlacementListStateViewModel;
  locale: "es-BO";
  placements: AdminSponsorPlacementViewModel[];
  providerOptionsTotal: number;
  providerOptions: AdminSponsorProviderOption[];
  providerSearch?: string;
  safetyPolicy: AdminSponsorPlacementSafetyPolicyViewModel;
  stats: AdminSponsorPlacementStatsViewModel;
  surfaceOptions: AdminSponsorPlacementSurfaceOption[];
  title: string;
}

export interface AdminSponsorPlacementListStateViewModel {
  availableFilters: AdminSponsorPlacementListResult["availableFilters"];
  availableSorts: AdminSponsorPlacementListResult["availableSorts"];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  input: AdminSponsorPlacementListInput;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

export interface AdminSponsorProviderOption {
  city: string;
  department: string;
  id: string;
  name: string;
}

export interface AdminSponsorPlacementViewModel {
  dateWindowLabel: string;
  deliveryMetrics: AdminSponsorPlacementDeliveryMetricsViewModel;
  disclosure: string;
  endsOn: string;
  imageUrl?: string;
  label: string;
  logoUrl?: string;
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

export interface AdminSponsorPlacementDeliveryMetricsViewModel {
  impressionCount: number;
  openCount: number;
  openRateLabel: string;
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
  impressionCount: number;
  openCount: number;
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
  listInput?: AdminSponsorPlacementListInput;
  placements:
    | readonly AdminSponsorPlacementRecord[]
    | AdminSponsorPlacementListResult;
  providers:
    | readonly AdminResourceProviderProfile[]
    | { items: readonly AdminResourceProviderProfile[] };
  providerSearch?: string;
  today?: string;
}): AdminSponsorPlacementDashboardViewModel {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const placementList = normalizeSponsorPlacementList(input.placements);
  const providerItems =
    "items" in input.providers ? input.providers.items : input.providers;
  const placements = placementList.items.map((placement) =>
    toSponsorPlacementViewModel(placement, today),
  );
  const providerOptionsTotal =
    "total" in input.providers && typeof input.providers.total === "number"
      ? input.providers.total
      : providerItems.length;

  return {
    createActionLabel: "Crear patrocinio",
    list: {
      availableFilters: placementList.availableFilters,
      availableSorts: placementList.availableSorts,
      hasNextPage: placementList.hasNextPage,
      hasPreviousPage: placementList.hasPreviousPage,
      input: input.listInput ?? {
        page: placementList.page,
        pageSize: placementList.pageSize,
      },
      page: placementList.page,
      pageCount: placementList.pageCount,
      pageSize: placementList.pageSize,
      total: placementList.total,
    },
    locale: "es-BO",
    placements,
    providerOptionsTotal,
    providerOptions: providerItems.map((provider) => ({
      city: provider.city,
      department: provider.department,
      id: provider.id,
      name: provider.name,
    })),
    providerSearch: input.providerSearch,
    safetyPolicy: buildSponsorSafetyPolicy(
      adminSponsorPlacementSurfaceOptions.map((option) => option.id),
    ),
    stats: buildStats(placements),
    surfaceOptions: [...adminSponsorPlacementSurfaceOptions],
    title: "Gestión de patrocinios locales",
  };
}

function normalizeSponsorPlacementList(
  placements:
    | readonly AdminSponsorPlacementRecord[]
    | AdminSponsorPlacementListResult,
): AdminSponsorPlacementListResult {
  if ("items" in placements) {
    return placements;
  }

  return {
    availableFilters: [],
    availableSorts: [],
    hasNextPage: false,
    hasPreviousPage: false,
    items: [...placements],
    page: 1,
    pageCount: placements.length > 0 ? 1 : 0,
    pageSize: Math.max(placements.length, 1),
    total: placements.length,
  };
}

export function buildAdminSponsorPlacementsForbiddenViewModel(): AdminSponsorPlacementsForbiddenViewModel {
  return {
    body: "Esta superficie está disponible solo para administradores de Rastro.",
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
    deliveryMetrics: buildSponsorPlacementDeliveryMetrics(
      placement.deliveryMetrics,
    ),
    disclosure: placement.disclosure,
    endsOn: placement.endsOn,
    imageUrl: placement.imageUrl,
    label: placement.label,
    logoUrl: placement.logoUrl,
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

function buildSponsorPlacementDeliveryMetrics(
  metrics: AdminSponsorPlacementRecord["deliveryMetrics"],
): AdminSponsorPlacementDeliveryMetricsViewModel {
  return {
    impressionCount: metrics.impressionCount,
    openCount: metrics.openCount,
    openRateLabel:
      metrics.impressionCount > 0
        ? formatDeliveryOpenRate(metrics.openCount / metrics.impressionCount)
        : "Sin impresiones",
  };
}

function formatDeliveryOpenRate(value: number): string {
  return new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
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
  const deliveryTotals = placements.reduce(
    (totals, placement) => ({
      impressionCount:
        totals.impressionCount + placement.deliveryMetrics.impressionCount,
      openCount: totals.openCount + placement.deliveryMetrics.openCount,
    }),
    {
      impressionCount: 0,
      openCount: 0,
    },
  );

  return {
    activeCount: placements.filter((placement) => placement.state === "active")
      .length,
    expiredCount: placements.filter(
      (placement) => placement.state === "expired",
    ).length,
    impressionCount: deliveryTotals.impressionCount,
    openCount: deliveryTotals.openCount,
    placementCount: placements.length,
    providerCount: new Set(placements.map((placement) => placement.providerId))
      .size,
    scheduledCount: placements.filter(
      (placement) => placement.state === "scheduled",
    ).length,
  };
}
