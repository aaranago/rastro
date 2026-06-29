import type {
  LocalSponsorPlacement,
  ResourceCategoryId,
  ResourceContactOption,
  ResourceProviderProfile,
  ResourceProviderSummary,
  ResourcesDirectoryMode,
  ResourcesDirectoryStatus,
  ResourceSearchLocation,
} from "./resource-types";
import { getLocalSponsorPlacementForSurface } from "./sponsor-surface-policy";

export interface ResourceCategoryOption {
  id: ResourceCategoryId;
  label: string;
}

export const resourceCategoryOptions = [
  {
    id: "veterinary",
    label: "Veterinarias",
  },
  {
    id: "shelter",
    label: "Refugios",
  },
  {
    id: "groomer",
    label: "Peluquerías",
  },
  {
    id: "pet_food",
    label: "Alimentos",
  },
  {
    id: "trainer",
    label: "Entrenadores",
  },
  {
    id: "pet_store",
    label: "Tiendas",
  },
  {
    id: "transport",
    label: "Transporte",
  },
  {
    id: "other",
    label: "Otros",
  },
] satisfies ResourceCategoryOption[];

const categoryLabels = new Map<ResourceCategoryId, string>(
  resourceCategoryOptions.map((category) => [category.id, category.label]),
);

export interface ResourcesDirectoryViewModelInput {
  providers: readonly ResourceProviderSummary[];
  selectedCategoryIds?: readonly ResourceCategoryId[];
  location: ResourceSearchLocation;
  mode: ResourcesDirectoryMode;
  status: ResourcesDirectoryStatus;
  viewer?: {
    kind: "visitor" | "member";
  };
  isOffline?: boolean;
  isStale?: boolean;
  errorMessage?: string;
}

export interface ResourceProviderSummaryViewModel {
  id: string;
  name: string;
  categoryLabel: string;
  description: string;
  locationLabel: string;
  serviceAreaLabel?: string;
  distanceLabel?: string;
  isVerified: boolean;
  isSponsored: boolean;
  sponsorLabel?: string;
  sponsorDisclosure?: string;
  sponsorPlacement?: LocalSponsorPlacement;
  sponsorLogoUrl?: string;
  sponsorImageUrl?: string;
  availabilityLabel?: string;
  emergencyLabel?: string;
  logoUrl?: string;
  photoUrl?: string;
  contactLabels: string[];
}

export interface ResourcesDirectoryViewModel {
  mode: ResourcesDirectoryMode;
  state:
    | "loading"
    | "error"
    | "location_denied"
    | "offline"
    | "empty"
    | "ready";
  title: string;
  location: {
    kind: ResourceSearchLocation["kind"];
    label: string;
    helper: string;
  };
  access: {
    audienceLabel: string;
    canBrowse: boolean;
    requiresSignIn: boolean;
    signInCopy: string | undefined;
  };
  searchBoundary: {
    title: string;
    body: string;
    precisionLabel: string;
  };
  presentation: {
    sectionLabel: string;
    resultKindLabel: string;
    recoverySeparationCopy: string;
  };
  categories: (ResourceCategoryOption & { isSelected: boolean })[];
  selectedCategoryLabels: string[];
  results: ResourceProviderSummaryViewModel[];
  notice?: {
    title: string;
    body: string;
    actions?: {
      kind: "manual_search" | "show_all" | "use_current_location" | "retry";
      label: string;
    }[];
  };
}

export interface ResourceProviderProfileViewModel {
  id: string;
  name: string;
  subtitle: string;
  heroImageUrl?: string;
  logoUrl?: string;
  badges: {
    label: string;
    tone: "category" | "verified" | "sponsor" | "emergency";
  }[];
  primaryActions: {
    kind: ResourceContactOption["kind"];
    label: string;
    value: string;
  }[];
  sections: {
    title: string;
    rows: {
      label: string;
      value: string;
    }[];
  }[];
  optionalLinks: {
    label: string;
    url: string;
  }[];
  sponsorPlacement?: LocalSponsorPlacement;
  sponsorDisclosure?: string;
  sponsorLogoUrl?: string;
  sponsorImageUrl?: string;
  reportAction: {
    label: string;
    providerId: string;
  };
}

export function buildResourcesDirectoryViewModel(
  input: ResourcesDirectoryViewModelInput,
): ResourcesDirectoryViewModel {
  const selectedCategoryIds = input.selectedCategoryIds ?? [];
  const selectedCategorySet = new Set(selectedCategoryIds);
  const categories = resourceCategoryOptions.map((category) => ({
    ...category,
    isSelected: selectedCategorySet.has(category.id),
  }));
  const selectedCategoryLabels =
    selectedCategoryIds.length > 0
      ? selectedCategoryIds.map(getCategoryLabel)
      : ["Todos"];

  const filteredProviders =
    selectedCategorySet.size > 0
      ? input.providers.filter((provider) =>
          selectedCategorySet.has(provider.categoryId),
        )
      : input.providers;

  const results = filteredProviders.map(buildProviderSummaryViewModel);
  const location = buildLocationViewModel(input.location);
  const state = getDirectoryState(input, results.length);

  return {
    mode: input.mode,
    state,
    title: input.mode === "map" ? "Recursos en mapa" : "Recursos cerca",
    location,
    access: buildAccessViewModel(input.viewer?.kind ?? "visitor"),
    searchBoundary: buildSearchBoundaryViewModel(),
    presentation: buildPresentationViewModel(),
    categories,
    selectedCategoryLabels,
    results,
    notice: buildDirectoryNotice(state, {
      errorMessage: input.errorMessage,
      isStale: input.isStale === true,
    }),
  };
}

export function buildResourceProviderProfileViewModel(
  profile: ResourceProviderProfile,
): ResourceProviderProfileViewModel {
  const sponsorPlacement = getLocalSponsorPlacementForSurface(
    profile.sponsorPlacement,
    "provider_details",
  );
  const badges: ResourceProviderProfileViewModel["badges"] = [
    {
      label: getCategoryLabel(profile.categoryId),
      tone: "category",
    },
  ];

  if (profile.isVerified === true) {
    badges.push({
      label: "Verificado",
      tone: "verified",
    });
  }

  if (sponsorPlacement !== undefined) {
    badges.push({
      label: sponsorPlacement.label,
      tone: "sponsor",
    });
  }

  if (profile.emergencyAvailable === true) {
    badges.push({
      label: "Urgencias 24h",
      tone: "emergency",
    });
  }

  return {
    id: profile.id,
    name: profile.name,
    subtitle: profile.description,
    heroImageUrl: profile.photoUrl,
    logoUrl: profile.logoUrl,
    badges,
    primaryActions: getVisibleContactOptions(profile.contactOptions).map(
      (contact) => ({
        kind: contact.kind,
        label: contact.label,
        value: contact.value,
      }),
    ),
    sections: buildProfileSections(profile),
    optionalLinks: buildProfileLinks(profile),
    sponsorPlacement: cloneLocalSponsorPlacement(sponsorPlacement),
    sponsorDisclosure: sponsorPlacement?.disclosure,
    sponsorLogoUrl: sponsorPlacement?.logoUrl,
    sponsorImageUrl: sponsorPlacement?.imageUrl,
    reportAction: {
      label: "Reportar",
      providerId: profile.id,
    },
  };
}

function buildAccessViewModel(viewerKind: "visitor" | "member") {
  return {
    audienceLabel: viewerKind === "member" ? "Miembro" : "Visitante",
    canBrowse: true,
    requiresSignIn: false,
    signInCopy: undefined,
  };
}

function buildSearchBoundaryViewModel() {
  return {
    title: "Búsqueda Rastro/PostGIS",
    body: "Lista y mapa usan el mismo radio de Rastro; el mapa solo orienta la zona.",
    precisionLabel: "Zonas aproximadas en Bolivia",
  };
}

function buildPresentationViewModel() {
  return {
    sectionLabel: "Directorio de servicios",
    resultKindLabel: "Proveedor local",
    recoverySeparationCopy:
      "Estos recursos no son reportes de recuperación ni cambian la prioridad de mascotas perdidas.",
  };
}

function buildProviderSummaryViewModel(
  provider: ResourceProviderSummary,
): ResourceProviderSummaryViewModel {
  const sponsorPlacement = getLocalSponsorPlacementForSurface(
    provider.sponsorPlacement,
    "resources_directory",
  );

  return {
    id: provider.id,
    name: provider.name,
    categoryLabel: getCategoryLabel(provider.categoryId),
    description: provider.description,
    locationLabel: provider.approximateLocationLabel,
    serviceAreaLabel: provider.serviceAreaLabel,
    distanceLabel:
      provider.distanceMeters === undefined
        ? undefined
        : formatDistance(provider.distanceMeters),
    isVerified: provider.isVerified === true,
    isSponsored: sponsorPlacement !== undefined,
    sponsorLabel: sponsorPlacement?.label,
    sponsorDisclosure: sponsorPlacement?.disclosure,
    sponsorPlacement: cloneLocalSponsorPlacement(sponsorPlacement),
    sponsorLogoUrl: sponsorPlacement?.logoUrl,
    sponsorImageUrl: sponsorPlacement?.imageUrl,
    availabilityLabel: provider.isOpenNow === true ? "Abierto" : undefined,
    emergencyLabel:
      provider.emergencyAvailable === true ? "Urgencias" : undefined,
    logoUrl: provider.logoUrl,
    photoUrl: provider.photoUrl,
    contactLabels: getVisibleContactOptions(provider.contactOptions).map(
      (contact) => contact.label,
    ),
  };
}

function cloneLocalSponsorPlacement(
  placement: LocalSponsorPlacement | undefined,
) {
  if (placement === undefined) {
    return undefined;
  }

  return {
    kind: placement.kind,
    label: placement.label,
    disclosure: placement.disclosure,
    logoUrl: placement.logoUrl,
    imageUrl: placement.imageUrl,
    eligibleSurfaces: [...placement.eligibleSurfaces],
    safetyPolicy: {
      recoveryPriority: { ...placement.safetyPolicy.recoveryPriority },
      pushNotifications: { ...placement.safetyPolicy.pushNotifications },
    },
  };
}

function buildProfileSections(profile: ResourceProviderProfile) {
  const sections: ResourceProviderProfileViewModel["sections"] = [];

  if (profile.shortDescription.trim().length > 0) {
    sections.push({
      title: "Sobre",
      rows: [
        {
          label: "Descripción",
          value: profile.shortDescription,
        },
      ],
    });
  }

  const locationRows: ResourceProviderProfileViewModel["sections"][number]["rows"] =
    [];

  if (
    profile.hoursLabel !== undefined &&
    profile.hoursLabel.trim().length > 0
  ) {
    locationRows.push({
      label: "Horario",
      value: profile.hoursLabel,
    });
  }

  locationRows.push({
    label: "Ubicación",
    value: profile.approximateLocationLabel,
  });

  locationRows.push({
    label: "Cobertura",
    value: profile.serviceAreaLabel,
  });

  sections.push({
    title: "Horario y zona",
    rows: locationRows,
  });

  return sections;
}

function buildProfileLinks(profile: ResourceProviderProfile) {
  const links: ResourceProviderProfileViewModel["optionalLinks"] = [];

  if (profile.websiteUrl !== undefined) {
    links.push({
      label: "Sitio web",
      url: profile.websiteUrl,
    });
  }

  if (profile.socialLinks !== undefined) {
    for (const link of profile.socialLinks) {
      links.push(link);
    }
  }

  if (profile.externalLinks !== undefined) {
    for (const link of profile.externalLinks) {
      links.push(link);
    }
  }

  return links;
}

function getVisibleContactOptions(
  contactOptions: readonly ResourceContactOption[],
) {
  return contactOptions.filter(
    (contact) =>
      contact.label.trim().length > 0 && contact.value.trim().length > 0,
  );
}

function buildLocationViewModel(location: ResourceSearchLocation) {
  if (location.kind === "current") {
    return {
      kind: location.kind,
      label: location.label
        ? `Cerca de ${location.label}`
        : "Usando tu ubicación actual",
      helper: "Búsqueda por radio PostGIS de Rastro en Bolivia.",
    };
  }

  if (location.kind === "last") {
    return {
      kind: location.kind,
      label: `Última ubicación: ${location.label}`,
      helper:
        "Usa la última zona guardada; puedes actualizarla o buscar otra zona de Bolivia.",
    };
  }

  if (location.kind === "manual") {
    return {
      kind: location.kind,
      label: `Buscando en ${location.label}`,
      helper: "Búsqueda manual dentro de Bolivia con radio PostGIS de Rastro.",
    };
  }

  if (location.kind === "denied") {
    return {
      kind: location.kind,
      label: "Ubicación desactivada",
      helper: "Busca una ciudad, zona o punto manual en Bolivia.",
    };
  }

  return {
    kind: location.kind,
    label: "Busca recursos en Bolivia",
    helper: "Elige ubicación actual, última ubicación o búsqueda manual.",
  };
}

function getDirectoryState(
  input: ResourcesDirectoryViewModelInput,
  resultCount: number,
): ResourcesDirectoryViewModel["state"] {
  if (input.status === "loading") {
    return "loading";
  }

  if (input.status === "error") {
    return "error";
  }

  if (input.isOffline === true) {
    return "offline";
  }

  if (input.location.kind === "denied") {
    return "location_denied";
  }

  if (resultCount === 0) {
    return "empty";
  }

  return "ready";
}

function buildDirectoryNotice(
  state: ResourcesDirectoryViewModel["state"],
  options: {
    errorMessage?: string;
    isStale: boolean;
  },
): ResourcesDirectoryViewModel["notice"] {
  if (state === "loading") {
    return {
      title: "Cargando recursos",
      body: "Buscando proveedores locales cerca de la zona elegida.",
    };
  }

  if (state === "error") {
    return {
      title: "No pudimos cargar recursos",
      body: options.errorMessage ?? "Reintenta en unos segundos.",
      actions: [{ kind: "retry", label: "Reintentar" }],
    };
  }

  if (state === "location_denied") {
    return {
      title: "Busca por zona",
      body: "Sin permiso de ubicación, usa una ciudad, barrio o punto manual en Bolivia.",
      actions: [
        { kind: "manual_search", label: "Buscar zona manual" },
        { kind: "use_current_location", label: "Usar ubicación" },
      ],
    };
  }

  if (state === "offline") {
    if (options.isStale) {
      return {
        title: "Datos guardados",
        body: "Sin conexion. Mostrando recursos guardados; pueden estar desactualizados.",
        actions: [{ kind: "retry", label: "Reintentar" }],
      };
    }

    return {
      title: "Sin conexión",
      body: "Mostrando recursos guardados si están disponibles. La búsqueda se actualizará cuando vuelva internet.",
      actions: [{ kind: "retry", label: "Reintentar" }],
    };
  }

  if (state === "empty") {
    return {
      title: "No hay servicios cerca",
      body: "Intenta buscar en otra ubicación o ampliar el radio dentro de Bolivia.",
      actions: [
        { kind: "manual_search", label: "Buscar en otra zona" },
        { kind: "show_all", label: "Ver todos los recursos" },
      ],
    };
  }

  return undefined;
}

function getCategoryLabel(categoryId: ResourceCategoryId) {
  return categoryLabels.get(categoryId) ?? "Otros";
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toLocaleString("es-BO", {
    maximumFractionDigits: 1,
  })} km`;
}
