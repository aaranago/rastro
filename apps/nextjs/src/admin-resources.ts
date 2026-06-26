import { buildAdminResourceMetricGroup } from "./admin-resource-metrics";

export type AdminResourceManagementRole = "admin" | "member" | "visitor";

export interface AdminResourceManagementViewer {
  memberId?: string;
  role: AdminResourceManagementRole;
}

export interface AdminResourceManagement {
  attachSponsorPlacement: (
    viewer: AdminResourceManagementViewer,
    input: AttachSponsorPlacementInput,
  ) => AdminResourceProviderSponsorMutationResult;
  createProvider: (
    viewer: AdminResourceManagementViewer,
    input: CreateResourceProviderInput,
  ) => AdminResourceProviderCreateResult;
  detachSponsorPlacement: (
    viewer: AdminResourceManagementViewer,
    input: DetachSponsorPlacementInput,
  ) => AdminResourceProviderSponsorMutationResult;
  getMetrics: (
    viewer: AdminResourceManagementViewer,
  ) => AdminResourceMetricsResult;
  listProviders: (
    viewer: AdminResourceManagementViewer,
  ) => AdminResourceProviderListResult;
  updateProviderVerificationBadge: (
    viewer: AdminResourceManagementViewer,
    input: UpdateProviderVerificationBadgeInput,
  ) => AdminResourceProviderBadgeMutationResult;
}

export interface AdminResourceManagementOptions {
  now?: Date | string;
}

export interface CreateResourceProviderInput {
  category: ResourceProviderCategory;
  city: string;
  contactLabel: string;
  department: string;
  name: string;
  serviceAreaLabel: string;
}

export interface UpdateProviderVerificationBadgeInput {
  note: string;
  providerId: string;
  status: VerificationBadgeStatus;
}

export interface AttachSponsorPlacementInput {
  endsOn: string;
  placementId: string;
  providerId: string;
  startsOn: string;
  surface: LocalSponsorPlacementSurface;
}

export interface DetachSponsorPlacementInput {
  placementId: string;
  providerId: string;
}

export type AdminResourceProviderListResult =
  | {
      status: "authorized";
      viewModel: AdminResourceProviderListViewModel;
    }
  | AdminResourceForbiddenResult;

export type AdminResourceProviderCreateResult =
  | {
      announcement: AdminResourceAnnouncement;
      provider: AdminResourceProviderViewModel;
      status: "created";
    }
  | AdminResourceForbiddenResult
  | AdminResourceInvalidInputResult;

export type AdminResourceProviderBadgeMutationResult =
  | {
      announcement: AdminResourceAnnouncement;
      provider: AdminResourceProviderBadgeViewModel;
      status: "updated";
    }
  | AdminResourceForbiddenResult
  | AdminResourceNotFoundResult;

export type AdminResourceProviderSponsorMutationResult =
  | {
      announcement: AdminResourceAnnouncement;
      provider: AdminResourceProviderWithSponsorPlacementsViewModel;
      status: "updated";
    }
  | AdminResourceForbiddenResult
  | AdminResourceInvalidInputResult
  | AdminResourceNotFoundResult;

export type AdminResourceMetricsResult =
  | {
      metrics: AdminResourceMetricsViewModel;
      status: "authorized";
    }
  | AdminResourceForbiddenResult;

export interface AdminResourceForbiddenResult {
  status: "forbidden";
  viewModel: AdminResourceForbiddenViewModel;
}

export interface AdminResourceNotFoundResult {
  announcement: AdminResourceAnnouncement;
  status: "not_found";
}

export interface AdminResourceInvalidInputResult {
  announcement: AdminResourceAnnouncement;
  fieldErrors: AdminResourceFieldError[];
  status: "invalid_input";
}

export interface AdminResourceFieldError {
  field: string;
  message: string;
}

export interface AdminResourceAnnouncement {
  body: string;
  title: string;
}

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
  category: ResourceProviderCategory;
  categoryLabel: string;
  city: string;
  contactLabel: string;
  department: string;
  name: string;
  providerId: string;
  serviceAreaLabel: string;
  sponsorPlacements: LocalSponsorPlacementViewModel[];
  verificationBadge: VerificationBadgeViewModel;
}

export interface AdminResourceProviderBadgeViewModel {
  city: string;
  department: string;
  name: string;
  providerId: string;
  verificationBadge: VerificationBadgeViewModel;
}

export interface AdminResourceProviderWithSponsorPlacementsViewModel {
  city: string;
  department: string;
  name: string;
  providerId: string;
  sponsorPlacements: LocalSponsorPlacementViewModel[];
}

export interface VerificationBadgeViewModel {
  label: "Insignia de verificacion" | "Sin insignia de verificacion";
  note: string;
  status: VerificationBadgeStatus;
}

export type VerificationBadgeStatus = "unverified" | "verified";

export type ResourceProviderCategory =
  | "groomer"
  | "other"
  | "pet_food"
  | "pet_store"
  | "shelter"
  | "trainer"
  | "transport"
  | "veterinary";

interface ResourceProviderCategoryOption {
  id: ResourceProviderCategory;
  label: string;
}

export interface LocalSponsorPlacementViewModel {
  disclosureLabel: "Patrocinado local";
  endsOn: string;
  placementId: string;
  safetyPolicy: SponsorSafetyPolicy;
  startsOn: string;
  surface: LocalSponsorPlacementSurface;
  surfaceLabel: string;
}

export type LocalSponsorPlacementSurface =
  | "provider_details"
  | "resources_directory";

interface LocalSponsorPlacementSurfaceOption {
  id: LocalSponsorPlacementSurface;
  label: string;
}

export interface SponsorSafetyPolicy {
  eligibleSurfaces: LocalSponsorPlacementSurface[];
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

interface ResourceProviderState {
  category: ResourceProviderCategory;
  city: string;
  contactLabel: string;
  department: string;
  name: string;
  providerId: string;
  serviceAreaLabel: string;
  sponsorPlacements: LocalSponsorPlacementState[];
  verificationBadge: VerificationBadgeState;
}

interface VerificationBadgeState {
  note: string;
  status: VerificationBadgeStatus;
}

interface LocalSponsorPlacementState {
  endsOn: string;
  placementId: string;
  startsOn: string;
  surface: LocalSponsorPlacementSurface;
}

interface AdminResourceManagementState {
  nextProviderSequence: number;
  providers: ResourceProviderState[];
}

const providerFixtures: ResourceProviderState[] = [
  {
    category: "veterinary",
    city: "Santa Cruz de la Sierra",
    contactLabel: "Contacto institucional verificado",
    department: "Santa Cruz",
    name: "Clinica San Roque",
    providerId: "clinic-san-roque",
    serviceAreaLabel: "Santa Cruz urbano",
    sponsorPlacements: [],
    verificationBadge: {
      note: "Proveedor de recursos verificado por Rastro.",
      status: "verified",
    },
  },
  {
    category: "shelter",
    city: "La Paz",
    contactLabel: "Contacto pendiente de verificacion",
    department: "La Paz",
    name: "Patitas La Paz",
    providerId: "provider-patitas-la-paz",
    serviceAreaLabel: "La Paz y El Alto",
    sponsorPlacements: [],
    verificationBadge: {
      note: "Identidad pendiente de revision por Rastro.",
      status: "unverified",
    },
  },
];

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
] as const satisfies readonly ResourceProviderCategoryOption[];

export const localSponsorPlacementSurfaceOptions = [
  {
    id: "resources_directory",
    label: "Directorio de recursos",
  },
  {
    id: "provider_details",
    label: "Perfil del proveedor",
  },
] as const satisfies readonly LocalSponsorPlacementSurfaceOption[];

const categoryLabels = Object.fromEntries(
  resourceProviderCategoryOptions.map((option) => [option.id, option.label]),
) as Record<ResourceProviderCategory, string>;

const surfaceLabels = Object.fromEntries(
  localSponsorPlacementSurfaceOptions.map((option) => [
    option.id,
    option.label,
  ]),
) as Record<LocalSponsorPlacementSurface, string>;

export function createInMemoryAdminResourceManagement(
  options: AdminResourceManagementOptions = {},
): AdminResourceManagement {
  const state = createInitialState();
  const metricsAsOfDate = normalizeManagementDate(options.now ?? new Date());

  return {
    attachSponsorPlacement(viewer, input) {
      if (!canManageResources(viewer)) {
        return buildForbiddenResult();
      }

      return attachSponsorPlacement(state, input);
    },
    createProvider(viewer, input) {
      if (!canManageResources(viewer)) {
        return buildForbiddenResult();
      }

      const normalizedInput = normalizeCreateProviderInput(input);
      const fieldErrors = validateCreateProviderInput(normalizedInput);

      if (fieldErrors.length > 0) {
        return buildInvalidInputResult(
          "No pudimos crear el proveedor de recursos.",
          fieldErrors,
        );
      }

      const provider = createProvider(state, normalizedInput);

      return {
        announcement: {
          body: "El proveedor queda disponible para revision y gestion administrativa.",
          title: "Proveedor de recursos creado",
        },
        provider: toProviderViewModel(provider),
        status: "created",
      };
    },
    detachSponsorPlacement(viewer, input) {
      if (!canManageResources(viewer)) {
        return buildForbiddenResult();
      }

      return detachSponsorPlacement(state, input);
    },
    getMetrics(viewer) {
      if (!canManageResources(viewer)) {
        return buildForbiddenResult();
      }

      return {
        metrics: buildMetricsViewModel(state.providers, metricsAsOfDate),
        status: "authorized",
      };
    },
    listProviders(viewer) {
      if (!canManageResources(viewer)) {
        return buildForbiddenResult();
      }

      return {
        status: "authorized",
        viewModel: {
          createActionLabel: "Registrar proveedor",
          locale: "es-BO",
          metrics: buildMetricsViewModel(state.providers, metricsAsOfDate),
          providers: state.providers.map(toProviderViewModel),
          title: "Gestion de proveedores de recursos",
        },
      };
    },
    updateProviderVerificationBadge(viewer, input) {
      if (!canManageResources(viewer)) {
        return buildForbiddenResult();
      }

      return updateProviderVerificationBadge(state, input);
    },
  };
}

function createInitialState(): AdminResourceManagementState {
  return {
    nextProviderSequence: providerFixtures.length + 1,
    providers: providerFixtures.map((provider) => ({
      ...provider,
      sponsorPlacements: provider.sponsorPlacements.map((placement) => ({
        ...placement,
      })),
      verificationBadge: { ...provider.verificationBadge },
    })),
  };
}

function canManageResources(viewer: AdminResourceManagementViewer): boolean {
  return viewer.role === "admin";
}

function buildForbiddenResult(): AdminResourceForbiddenResult {
  return {
    status: "forbidden",
    viewModel: {
      body: "Esta superficie esta disponible solo para administradores de Rastro.",
      locale: "es-BO",
      title: "Acceso restringido",
    },
  };
}

function buildInvalidInputResult(
  body: string,
  fieldErrors: AdminResourceFieldError[],
): AdminResourceInvalidInputResult {
  return {
    announcement: {
      body,
      title: "Revisa los datos ingresados",
    },
    fieldErrors,
    status: "invalid_input",
  };
}

function normalizeCreateProviderInput(
  input: CreateResourceProviderInput,
): CreateResourceProviderInput {
  return {
    category: input.category,
    city: input.city.trim(),
    contactLabel: input.contactLabel.trim(),
    department: input.department.trim(),
    name: input.name.trim(),
    serviceAreaLabel: input.serviceAreaLabel.trim(),
  };
}

function validateCreateProviderInput(
  input: CreateResourceProviderInput,
): AdminResourceFieldError[] {
  const fieldErrors: AdminResourceFieldError[] = [];

  addRequiredStringError(fieldErrors, "name", input.name);
  addRequiredStringError(fieldErrors, "department", input.department);
  addRequiredStringError(fieldErrors, "city", input.city);
  addRequiredStringError(
    fieldErrors,
    "serviceAreaLabel",
    input.serviceAreaLabel,
  );
  addRequiredStringError(fieldErrors, "contactLabel", input.contactLabel);

  return fieldErrors;
}

function addRequiredStringError(
  fieldErrors: AdminResourceFieldError[],
  field: string,
  value: string,
) {
  if (value.trim().length === 0) {
    fieldErrors.push({
      field,
      message: "Este campo es obligatorio.",
    });
  }
}

function createProvider(
  state: AdminResourceManagementState,
  input: CreateResourceProviderInput,
): ResourceProviderState {
  const provider: ResourceProviderState = {
    category: input.category,
    city: input.city,
    contactLabel: input.contactLabel,
    department: input.department,
    name: input.name,
    providerId: buildProviderId(input.name, state.nextProviderSequence),
    serviceAreaLabel: input.serviceAreaLabel,
    sponsorPlacements: [],
    verificationBadge: {
      note: "Identidad pendiente de revision por Rastro.",
      status: "unverified",
    },
  };

  state.nextProviderSequence += 1;
  state.providers.push(provider);

  return provider;
}

function updateProviderVerificationBadge(
  state: AdminResourceManagementState,
  input: UpdateProviderVerificationBadgeInput,
): AdminResourceProviderBadgeMutationResult {
  const provider = findProvider(state, input.providerId);

  if (!provider) {
    return buildProviderNotFoundResult();
  }

  provider.verificationBadge = {
    note: input.note.trim(),
    status: input.status,
  };

  return {
    announcement: {
      body:
        input.status === "verified"
          ? "El perfil muestra una insignia de verificacion confirmada por Rastro."
          : "El perfil queda sin insignia de verificacion visible mientras se revisa.",
      title: "Insignia de verificacion actualizada",
    },
    provider: toProviderBadgeViewModel(provider),
    status: "updated",
  };
}

function attachSponsorPlacement(
  state: AdminResourceManagementState,
  input: AttachSponsorPlacementInput,
): AdminResourceProviderSponsorMutationResult {
  const normalizedInput = normalizeAttachSponsorPlacementInput(input);
  const fieldErrors = validateAttachSponsorPlacementInput(normalizedInput);

  if (fieldErrors.length > 0) {
    return buildInvalidInputResult(
      "No pudimos adjuntar el patrocinio local.",
      fieldErrors,
    );
  }

  const provider = findProvider(state, normalizedInput.providerId);

  if (!provider) {
    return buildProviderNotFoundResult();
  }

  provider.sponsorPlacements = [
    ...provider.sponsorPlacements.filter(
      (placement) => placement.placementId !== normalizedInput.placementId,
    ),
    {
      endsOn: normalizedInput.endsOn,
      placementId: normalizedInput.placementId,
      startsOn: normalizedInput.startsOn,
      surface: normalizedInput.surface,
    },
  ];

  return {
    announcement: {
      body: "El patrocinio queda etiquetado y no cambia la prioridad de recuperacion ni las alertas.",
      title: "Patrocinio local adjuntado",
    },
    provider: toProviderSponsorViewModel(provider),
    status: "updated",
  };
}

function normalizeAttachSponsorPlacementInput(
  input: AttachSponsorPlacementInput,
): AttachSponsorPlacementInput {
  return {
    endsOn: input.endsOn.trim(),
    placementId: input.placementId.trim(),
    providerId: input.providerId.trim(),
    startsOn: input.startsOn.trim(),
    surface: input.surface,
  };
}

function validateAttachSponsorPlacementInput(
  input: AttachSponsorPlacementInput,
): AdminResourceFieldError[] {
  const fieldErrors: AdminResourceFieldError[] = [];
  const startsOn = parseIsoDate(input.startsOn);
  const endsOn = parseIsoDate(input.endsOn);

  addRequiredStringError(fieldErrors, "placementId", input.placementId);
  addRequiredStringError(fieldErrors, "providerId", input.providerId);

  if (!startsOn) {
    fieldErrors.push({
      field: "startsOn",
      message: "Usa una fecha valida con formato YYYY-MM-DD.",
    });
  }

  if (!endsOn) {
    fieldErrors.push({
      field: "endsOn",
      message: "Usa una fecha valida con formato YYYY-MM-DD.",
    });
  }

  if (startsOn && endsOn && startsOn.getTime() > endsOn.getTime()) {
    fieldErrors.push({
      field: "endsOn",
      message: "La fecha final debe ser posterior o igual a la fecha inicial.",
    });
  }

  return fieldErrors;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeManagementDate(value: Date | string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Expected a valid management date.");
    }

    return startOfUtcDay(value);
  }

  const date = parseIsoDate(value);

  if (!date) {
    throw new Error("Expected management date to use YYYY-MM-DD.");
  }

  return date;
}

function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function detachSponsorPlacement(
  state: AdminResourceManagementState,
  input: DetachSponsorPlacementInput,
): AdminResourceProviderSponsorMutationResult {
  const providerId = input.providerId.trim();
  const placementId = input.placementId.trim();
  const fieldErrors: AdminResourceFieldError[] = [];

  addRequiredStringError(fieldErrors, "providerId", providerId);
  addRequiredStringError(fieldErrors, "placementId", placementId);

  if (fieldErrors.length > 0) {
    return buildInvalidInputResult(
      "No pudimos retirar el patrocinio local.",
      fieldErrors,
    );
  }

  const provider = findProvider(state, providerId);

  if (!provider) {
    return buildProviderNotFoundResult();
  }

  const initialPlacementCount = provider.sponsorPlacements.length;

  provider.sponsorPlacements = provider.sponsorPlacements.filter(
    (placement) => placement.placementId !== placementId,
  );

  if (provider.sponsorPlacements.length === initialPlacementCount) {
    return {
      announcement: {
        body: "No encontramos el patrocinio local solicitado.",
        title: "Patrocinio local no encontrado",
      },
      status: "not_found",
    };
  }

  return {
    announcement: {
      body: "El patrocinio ya no aparece en superficies de recursos.",
      title: "Patrocinio local retirado",
    },
    provider: toProviderSponsorViewModel(provider),
    status: "updated",
  };
}

function buildProviderNotFoundResult(): AdminResourceNotFoundResult {
  return {
    announcement: {
      body: "No encontramos el proveedor de recursos solicitado.",
      title: "Proveedor de recursos no encontrado",
    },
    status: "not_found",
  };
}

function findProvider(
  state: AdminResourceManagementState,
  providerId: string,
): ResourceProviderState | undefined {
  return state.providers.find((provider) => provider.providerId === providerId);
}

function toProviderViewModel(
  provider: ResourceProviderState,
): AdminResourceProviderViewModel {
  return {
    category: provider.category,
    categoryLabel: categoryLabels[provider.category],
    city: provider.city,
    contactLabel: provider.contactLabel,
    department: provider.department,
    name: provider.name,
    providerId: provider.providerId,
    serviceAreaLabel: provider.serviceAreaLabel,
    sponsorPlacements: provider.sponsorPlacements.map(
      toSponsorPlacementViewModel,
    ),
    verificationBadge: toVerificationBadgeViewModel(provider.verificationBadge),
  };
}

function toProviderBadgeViewModel(
  provider: ResourceProviderState,
): AdminResourceProviderBadgeViewModel {
  return {
    city: provider.city,
    department: provider.department,
    name: provider.name,
    providerId: provider.providerId,
    verificationBadge: toVerificationBadgeViewModel(provider.verificationBadge),
  };
}

function toProviderSponsorViewModel(
  provider: ResourceProviderState,
): AdminResourceProviderWithSponsorPlacementsViewModel {
  return {
    city: provider.city,
    department: provider.department,
    name: provider.name,
    providerId: provider.providerId,
    sponsorPlacements: provider.sponsorPlacements.map(
      toSponsorPlacementViewModel,
    ),
  };
}

function toVerificationBadgeViewModel(
  verificationBadge: VerificationBadgeState,
): VerificationBadgeViewModel {
  return {
    label:
      verificationBadge.status === "verified"
        ? "Insignia de verificacion"
        : "Sin insignia de verificacion",
    note: verificationBadge.note,
    status: verificationBadge.status,
  };
}

function toSponsorPlacementViewModel(
  placement: LocalSponsorPlacementState,
): LocalSponsorPlacementViewModel {
  return {
    disclosureLabel: "Patrocinado local",
    endsOn: placement.endsOn,
    placementId: placement.placementId,
    safetyPolicy: buildSponsorSafetyPolicy(placement.surface),
    startsOn: placement.startsOn,
    surface: placement.surface,
    surfaceLabel: surfaceLabels[placement.surface],
  };
}

function buildSponsorSafetyPolicy(
  surface: LocalSponsorPlacementSurface,
): SponsorSafetyPolicy {
  return {
    eligibleSurfaces: [surface],
    pushNotifications: {
      eligible: false,
      note: "Los patrocinadores locales no activan push notifications.",
    },
    recoveryPriority: {
      canAffect: false,
      note: "Reportes de mascota perdida, encontrada y avistamiento mantienen prioridad.",
    },
  };
}

function buildMetricsViewModel(
  providers: ResourceProviderState[],
  asOfDate: Date,
): AdminResourceMetricsViewModel {
  return {
    byCity: buildMetricGroup(providers, asOfDate, (provider) => provider.city),
    byDepartment: buildMetricGroup(
      providers,
      asOfDate,
      (provider) => provider.department,
    ),
  };
}

function buildMetricGroup(
  providers: ResourceProviderState[],
  asOfDate: Date,
  getLabel: (provider: ResourceProviderState) => string,
): AdminResourceMetricGroupViewModel[] {
  return buildAdminResourceMetricGroup(
    providers.map((provider) => ({
      activeSponsorPlacementCount: provider.sponsorPlacements.filter(
        (placement) => isSponsorPlacementActive(placement, asOfDate),
      ).length,
      isVerified: provider.verificationBadge.status === "verified",
      label: getLabel(provider),
    })),
  );
}

function isSponsorPlacementActive(
  placement: LocalSponsorPlacementState,
  asOfDate: Date,
): boolean {
  const startsOn = parseIsoDate(placement.startsOn);
  const endsOn = parseIsoDate(placement.endsOn);

  return Boolean(
    startsOn &&
      endsOn &&
      startsOn.getTime() <= asOfDate.getTime() &&
      endsOn.getTime() >= asOfDate.getTime(),
  );
}

function buildProviderId(name: string, sequence: number): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `provider-${slug || "nuevo"}-${sequence}`;
}
