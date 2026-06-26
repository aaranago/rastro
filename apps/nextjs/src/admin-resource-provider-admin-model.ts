import type { RouterInputs, RouterOutputs } from "@acme/api";

import { buildAdminResourceMetricGroup } from "./admin-resource-metrics";

export type AdminResourceProviderProfileBase =
  RouterOutputs["resources"]["admin"]["listProviders"][number];
export type AdminResourceProviderProfile = AdminResourceProviderProfileBase & {
  updatedAt?: Date;
};
export type AdminResourceProviderCreateInput =
  RouterInputs["resources"]["admin"]["createProvider"];
export type AdminResourceProviderUpdateInput =
  RouterInputs["resources"]["admin"]["updateProvider"];
export type AdminResourceProviderDeleteInput =
  RouterInputs["resources"]["admin"]["deleteProvider"];
export type AdminResourceProviderUpdateVerificationInput =
  RouterInputs["resources"]["admin"]["updateVerification"];
export type AdminResourceProviderAttachSponsorInput =
  RouterInputs["resources"]["admin"]["attachSponsor"];
export type AdminResourceProviderDetachSponsorInput =
  RouterInputs["resources"]["admin"]["detachSponsor"];
export type AdminResourceProviderCategory =
  AdminResourceProviderCreateInput["category"];
export type AdminResourceProviderContactKind =
  AdminResourceProviderCreateInput["contactOptions"][number]["kind"];
export type AdminResourceProviderVerificationStatus =
  AdminResourceProviderUpdateVerificationInput["status"];
export type AdminLocalSponsorPlacementSurface =
  AdminResourceProviderAttachSponsorInput["surface"];

export interface AdminResourceForbiddenViewModel {
  body: string;
  locale: "es-BO";
  title: string;
}

export interface AdminResourceProviderListViewModel {
  createActionLabel: string;
  locale: "es-BO";
  metrics: AdminResourceMetricsViewModel;
  providers: AdminResourceProviderViewModel[];
  title: string;
}

export interface AdminResourceProviderViewModel {
  activeSponsorPlacement?: AdminResourceProviderActiveSponsorPlacementViewModel;
  addressLabel?: string;
  approximateLocationLabel: string;
  category: AdminResourceProviderCategory;
  categoryLabel: string;
  city: string;
  contactLabel: string;
  contactOptions: AdminResourceProviderProfile["contactOptions"];
  department: string;
  description: string;
  emergencyAvailable: boolean;
  externalLinks: NonNullable<AdminResourceProviderProfile["externalLinks"]>;
  hoursLabel: string;
  isOpenNow: boolean;
  lastUpdatedLabel: string;
  locationCell: string;
  logoUrl?: string;
  name: string;
  photoUrl?: string;
  providerId: string;
  serviceAreaLabel: string;
  shortDescription: string;
  socialLinks: NonNullable<AdminResourceProviderProfile["socialLinks"]>;
  sponsorPlacements: LocalSponsorPlacementViewModel[];
  verificationBadge: VerificationBadgeViewModel;
  websiteUrl?: string;
}

export interface AdminResourceProviderActiveSponsorPlacementViewModel {
  disclosureLabel: "Patrocinado local";
  eligibleSurfaceLabels: string[];
  safetyPolicy: SponsorSafetyPolicy;
  sponsorLabel: string;
}

export interface VerificationBadgeViewModel {
  label: "Insignia de verificacion" | "Sin insignia de verificacion";
  note: string;
  status: AdminResourceProviderVerificationStatus;
}

export interface LocalSponsorPlacementViewModel {
  disclosureLabel: "Patrocinado local";
  endsOn?: string;
  placementId?: string;
  safetyPolicy: SponsorSafetyPolicy;
  startsOn?: string;
  surface: AdminLocalSponsorPlacementSurface;
  surfaceLabel: string;
}

export interface SponsorSafetyPolicy {
  eligibleSurfaces: AdminLocalSponsorPlacementSurface[];
  pushNotifications: {
    eligible: false;
    note: string;
  };
  recoveryPriority: {
    canAffect: false;
    note: string;
  };
}

export interface AdminResourceMetricsViewModel {
  byCity: AdminResourceMetricGroupViewModel[];
  byDepartment: AdminResourceMetricGroupViewModel[];
}

export interface AdminResourceMetricGroupViewModel {
  activeSponsorPlacementCount: number;
  label: string;
  providerCount: number;
  verifiedProviderCount: number;
}

interface AdminResourceProviderCategoryOption {
  id: AdminResourceProviderCategory;
  label: string;
}

interface AdminResourceProviderContactKindOption {
  id: AdminResourceProviderContactKind;
  label: string;
}

interface LocalSponsorPlacementSurfaceOption {
  id: AdminLocalSponsorPlacementSurface;
  label: string;
}

export const resourceProviderCategoryOptions = [
  {
    id: "veterinary",
    label: "Clinica veterinaria",
  },
  {
    id: "shelter",
    label: "Refugio o rescate",
  },
  {
    id: "groomer",
    label: "Peluqueria para mascotas",
  },
  {
    id: "pet_food",
    label: "Alimento para mascotas",
  },
  {
    id: "trainer",
    label: "Entrenamiento",
  },
  {
    id: "pet_store",
    label: "Tienda de mascotas",
  },
  {
    id: "transport",
    label: "Transporte de mascotas",
  },
  {
    id: "other",
    label: "Otro recurso local",
  },
] as const satisfies readonly AdminResourceProviderCategoryOption[];

export const resourceProviderContactKindOptions = [
  {
    id: "phone",
    label: "Telefono",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
  },
  {
    id: "website",
    label: "Sitio web",
  },
  {
    id: "email",
    label: "Correo",
  },
  {
    id: "directions",
    label: "Como llegar",
  },
  {
    id: "social",
    label: "Red social",
  },
] as const satisfies readonly AdminResourceProviderContactKindOption[];

export const localSponsorPlacementSurfaceOptions = [
  {
    id: "resources_directory",
    label: "Directorio de recursos",
  },
  {
    id: "provider_details",
    label: "Perfil del proveedor",
  },
  {
    id: "launch_home_banner",
    label: "Inicio de lanzamiento",
  },
  {
    id: "report_success",
    label: "Confirmacion de reporte",
  },
  {
    id: "contextual_care_resources",
    label: "Cuidados contextuales",
  },
] as const satisfies readonly LocalSponsorPlacementSurfaceOption[];

const categoryLabels = Object.fromEntries(
  resourceProviderCategoryOptions.map((option) => [option.id, option.label]),
) as Record<AdminResourceProviderCategory, string>;

const surfaceLabels = Object.fromEntries(
  localSponsorPlacementSurfaceOptions.map((option) => [
    option.id,
    option.label,
  ]),
) as Record<AdminLocalSponsorPlacementSurface, string>;

export function buildAdminResourceProviderListViewModel(
  profiles: readonly AdminResourceProviderProfile[],
): AdminResourceProviderListViewModel {
  const providers = profiles.map(toAdminResourceProviderViewModel);

  return {
    createActionLabel: "Registrar proveedor",
    locale: "es-BO",
    metrics: buildMetricsViewModel(providers),
    providers,
    title: "Gestión de proveedores de recursos",
  };
}

export function buildAdminResourcesForbiddenViewModel(): AdminResourceForbiddenViewModel {
  return {
    body: "Esta superficie esta disponible solo para administradores de Rastro.",
    locale: "es-BO",
    title: "Acceso restringido",
  };
}

function toAdminResourceProviderViewModel(
  profile: AdminResourceProviderProfile,
): AdminResourceProviderViewModel {
  const approximateLocation = profile.approximateLocation ?? {
    label: profile.approximateLocationLabel,
    latitude: 0,
    locationCell: profile.approximateLocationLabel,
    longitude: 0,
    precision: "approximate" as const,
  };
  return {
    activeSponsorPlacement: profile.sponsorPlacement
      ? toActiveSponsorPlacementViewModel(profile.sponsorPlacement)
      : undefined,
    addressLabel: profile.addressLabel,
    approximateLocationLabel: profile.approximateLocationLabel,
    category: profile.categoryId,
    categoryLabel: categoryLabels[profile.categoryId],
    city: profile.city,
    contactLabel: profile.contactOptions
      .map((contact) => contact.label)
      .join(", "),
    contactOptions: profile.contactOptions,
    department: profile.department,
    description: profile.description,
    emergencyAvailable: profile.emergencyAvailable ?? false,
    externalLinks: profile.externalLinks ?? [],
    hoursLabel: profile.hoursLabel,
    isOpenNow: profile.isOpenNow ?? false,
    lastUpdatedLabel: formatAdminResourceProviderUpdatedAt(profile.updatedAt),
    locationCell: approximateLocation.locationCell,
    logoUrl: profile.logoUrl,
    name: profile.name,
    photoUrl: profile.photoUrl,
    providerId: profile.id,
    serviceAreaLabel: profile.serviceAreaLabel,
    shortDescription: profile.shortDescription,
    socialLinks: profile.socialLinks ?? [],
    sponsorPlacements: profile.sponsorPlacements.map(
      toLocalSponsorPlacementViewModel,
    ),
    verificationBadge: {
      label: profile.isVerified
        ? "Insignia de verificacion"
        : "Sin insignia de verificacion",
      note:
        profile.verificationNote ??
        (profile.isVerified
          ? "Identidad marcada como verificada en Recursos."
          : "Identidad pendiente de revision por Rastro."),
      status: profile.isVerified ? "verified" : "unverified",
    },
    websiteUrl: profile.websiteUrl,
  };
}

const adminResourceProviderUpdatedAtFormatter = new Intl.DateTimeFormat(
  "es-BO",
  {
    day: "2-digit",
    month: "short",
    timeZone: "America/La_Paz",
    year: "numeric",
  },
);

function formatAdminResourceProviderUpdatedAt(updatedAt?: Date): string {
  if (!updatedAt) {
    return "Actualización no expuesta";
  }

  return `Actualizado ${adminResourceProviderUpdatedAtFormatter
    .format(updatedAt)
    .replace(".", "")}`;
}

function toLocalSponsorPlacementViewModel(
  placement: AdminResourceProviderProfile["sponsorPlacements"][number],
): LocalSponsorPlacementViewModel {
  return {
    disclosureLabel: "Patrocinado local",
    endsOn: placement.endsOn,
    placementId: placement.placementId,
    safetyPolicy: buildSponsorSafetyPolicy([placement.surface]),
    startsOn: placement.startsOn,
    surface: placement.surface,
    surfaceLabel: surfaceLabels[placement.surface],
  };
}

function toActiveSponsorPlacementViewModel(
  placement: NonNullable<AdminResourceProviderProfile["sponsorPlacement"]>,
): AdminResourceProviderActiveSponsorPlacementViewModel {
  const eligibleSurfaces = placement.eligibleSurfaces;

  return {
    disclosureLabel: "Patrocinado local",
    eligibleSurfaceLabels: eligibleSurfaces.map(
      (surface) => surfaceLabels[surface],
    ),
    safetyPolicy: buildSponsorSafetyPolicy(eligibleSurfaces),
    sponsorLabel: placement.label,
  };
}

function buildSponsorSafetyPolicy(
  eligibleSurfaces: AdminLocalSponsorPlacementSurface[],
): SponsorSafetyPolicy {
  return {
    eligibleSurfaces,
    pushNotifications: {
      eligible: false,
      note: "Los patrocinadores locales no activan notificaciones push.",
    },
    recoveryPriority: {
      canAffect: false,
      note: "Reportes de mascota perdida, encontrada y avistamiento mantienen prioridad.",
    },
  };
}

function buildMetricsViewModel(
  providers: readonly AdminResourceProviderViewModel[],
): AdminResourceMetricsViewModel {
  return {
    byCity: buildMetricGroup(providers, (provider) => provider.city),
    byDepartment: buildMetricGroup(
      providers,
      (provider) => provider.department,
    ),
  };
}

function buildMetricGroup(
  providers: readonly AdminResourceProviderViewModel[],
  getLabel: (provider: AdminResourceProviderViewModel) => string,
): AdminResourceMetricGroupViewModel[] {
  return buildAdminResourceMetricGroup(
    providers.map((provider) => ({
      activeSponsorPlacementCount: provider.activeSponsorPlacement ? 1 : 0,
      isVerified: provider.verificationBadge.status === "verified",
      label: getLabel(provider),
    })),
  );
}
