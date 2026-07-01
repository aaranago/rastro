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
import {
  cloneLocalSponsorPlacement,
  getLocalSponsorPlacementForSurface,
} from "./sponsor-surface-policy";

export interface ResourceCategoryOption {
  id: ResourceCategoryId;
  label: string;
}

const resourceCategoryOptions = [
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

const profileCategoryLabels = new Map<ResourceCategoryId, string>([
  ["veterinary", "Veterinaria"],
  ["shelter", "Refugio"],
  ["groomer", "Peluquería"],
  ["pet_food", "Alimentos"],
  ["trainer", "Entrenamiento"],
  ["pet_store", "Tienda"],
  ["transport", "Transporte"],
  ["other", "Recurso local"],
]);

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
  approximateLocation?: {
    label: string;
    latitude: number;
    longitude: number;
  };
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
  resultSummaryLabel: string;
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
  categoryLabel: string;
  subtitle: string;
  heroImageUrl?: string;
  mediaItems: {
    accessibilityLabel: string;
    id: string;
    url: string;
  }[];
  logoUrl?: string;
  badges: {
    label: string;
    tone: "category" | "verified" | "sponsor" | "emergency";
  }[];
  quickFacts: {
    iconName: string;
    label: string;
    tone?: "default" | "success" | "warning";
    value: string;
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
    resultSummaryLabel: buildResultSummaryLabel(
      results.length,
      selectedCategoryLabels,
    ),
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
    profile.activeSponsorPlacements ?? profile.sponsorPlacement,
    "provider_details",
  );
  const badges: ResourceProviderProfileViewModel["badges"] = [
    {
      label: getProfileCategoryLabel(profile.categoryId),
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
    categoryLabel: getProfileCategoryLabel(profile.categoryId),
    subtitle: profile.description,
    heroImageUrl: profile.photoUrl,
    mediaItems: buildProviderProfileMediaItems(profile),
    logoUrl: profile.logoUrl,
    badges,
    quickFacts: buildProfileQuickFacts(profile),
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
      label: "Reportar proveedor",
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
    provider.activeSponsorPlacements ?? provider.sponsorPlacement,
    "resources_directory",
  );

  return {
    id: provider.id,
    name: provider.name,
    categoryLabel: getCategoryLabel(provider.categoryId),
    description: provider.description,
    approximateLocation: provider.approximateLocation
      ? {
          label: provider.approximateLocation.label,
          latitude: provider.approximateLocation.latitude,
          longitude: provider.approximateLocation.longitude,
        }
      : undefined,
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

function buildProfileQuickFacts(profile: ResourceProviderProfile) {
  const facts: ResourceProviderProfileViewModel["quickFacts"] = [
    {
      iconName: "map-marker",
      label: "Zona",
      value: profile.approximateLocationLabel,
    },
    {
      iconName: "map-marker-radius",
      label: "Cobertura",
      value: profile.serviceAreaLabel,
    },
  ];

  if (
    profile.hoursLabel !== undefined &&
    profile.hoursLabel.trim().length > 0
  ) {
    facts.splice(1, 0, {
      iconName: "clock-outline",
      label: "Horario",
      value: profile.hoursLabel,
    });
  }

  if (profile.isOpenNow === true) {
    facts.unshift({
      iconName: "check-circle",
      label: "Estado",
      tone: "success",
      value: "Abierto ahora",
    });
  } else if (profile.isOpenNow === false) {
    facts.unshift({
      iconName: "clock-alert-outline",
      label: "Estado",
      tone: "warning",
      value: "Confirmar horario",
    });
  }

  return facts;
}

function buildProviderProfileMediaItems(profile: ResourceProviderProfile) {
  const items: ResourceProviderProfileViewModel["mediaItems"] = [];
  const seenUrls = new Set<string>();

  for (const media of profile.media ?? []) {
    const url = media.url.trim();

    if (url.length === 0 || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    const accessibilityLabel = media.alt?.trim();

    items.push({
      accessibilityLabel:
        accessibilityLabel !== undefined && accessibilityLabel.length > 0
          ? accessibilityLabel
          : `Foto de ${profile.name}`,
      id: media.id,
      url,
    });
  }

  const photoUrl = profile.photoUrl?.trim();

  if (photoUrl && !seenUrls.has(photoUrl)) {
    seenUrls.add(photoUrl);
    items.unshift({
      accessibilityLabel: `Foto principal de ${profile.name}`,
      id: `${profile.id}:photo`,
      url: photoUrl,
    });
  }

  return items;
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

function buildResultSummaryLabel(
  resultCount: number,
  selectedCategoryLabels: readonly string[],
) {
  const countLabel =
    resultCount === 1 ? "1 recurso" : `${resultCount} recursos`;
  const filterLabel = selectedCategoryLabels.join(", ");

  return `${countLabel} · ${filterLabel}`;
}

function getProfileCategoryLabel(categoryId: ResourceCategoryId) {
  return profileCategoryLabels.get(categoryId) ?? getCategoryLabel(categoryId);
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toLocaleString("es-BO", {
    maximumFractionDigits: 1,
  })} km`;
}
