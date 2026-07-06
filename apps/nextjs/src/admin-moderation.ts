// Legacy in-memory moderation model kept for regression tests only.
// Production admin routes use persisted API-backed adapters.
export interface AdminModerationViewer {
  memberId: string;
  role: "admin" | "member";
}

export interface AdminModerationDashboard {
  applyAction: (
    viewer: AdminModerationViewer,
    action: AdminModerationAction,
  ) => AdminModerationActionResult;
  getViewModel: (
    viewer: AdminModerationViewer,
  ) => AdminModerationDashboardResult;
}

export type AdminModerationAction =
  | {
      targetId: string;
      targetType: HideableAdminModerationTargetType;
      type: "hide_target";
    }
  | {
      targetId: string;
      targetType: HideableAdminModerationTargetType;
      type: "restore_target";
    }
  | {
      memberId: string;
      type: "ban_member";
    }
  | {
      memberId: string;
      type: "unban_member";
    }
  | {
      type: "toggle_adoption_review_mode";
    }
  | {
      type: "toggle_verified_email_required_to_publish";
    };

export type AdminModerationActionResult =
  | {
      announcement: AdminModerationAnnouncement;
      status: "not_found";
    }
  | {
      announcement: AdminModerationAnnouncement;
      status: "updated";
      viewModel: AdminModerationDashboardViewModel;
    }
  | {
      status: "forbidden";
      viewModel: AdminModerationForbiddenViewModel;
    };

export interface AdminModerationAnnouncement {
  body: string;
  title: string;
}

export type AdminModerationDashboardResult =
  | {
      status: "authorized";
      viewModel: AdminModerationDashboardViewModel;
    }
  | {
      status: "forbidden";
      viewModel: AdminModerationForbiddenViewModel;
    };

export interface AdminModerationForbiddenViewModel {
  body: string;
  locale: "es-BO";
  title: string;
}

export interface AdminModerationDashboardViewModel {
  locale: "es-BO";
  metrics: AdminModerationMetricsViewModel;
  queues: {
    flaggedAdoptionListings: AdminModerationQueueViewModel;
    flaggedChats: AdminModerationQueueViewModel;
    flaggedReports: AdminModerationQueueViewModel;
    flaggedResourceProviders: AdminModerationQueueViewModel;
  };
  settings: {
    adoptionReviewMode: AdminModerationSettingViewModel;
    verifiedEmailRequiredToPublish: AdminModerationSettingViewModel;
  };
  title: string;
}

export interface AdminModerationMetricsViewModel {
  byCity: AdminModerationAbuseMetricViewModel[];
  byDepartment: AdminModerationAbuseMetricViewModel[];
}

export interface AdminModerationAbuseMetricViewModel {
  bannedMemberCount: number;
  hiddenTargetCount: number;
  label: string;
  reportCount: number;
}

export interface AdminModerationQueueViewModel {
  items: AdminModerationQueueItemViewModel[];
  title: string;
}

export interface AdminModerationQueueItemViewModel {
  availableActions: AdminModerationQueueItemActionViewModel[];
  city: string;
  department: string;
  reportCount: number;
  reportedMember: AdminModerationReportedMemberViewModel;
  statusLabel: string;
  surfaceLabel:
    | "Chat interno"
    | "Perfil de proveedor"
    | "Publicación de adopción"
    | "Reporte de avistamiento"
    | "Reporte de mascota encontrada"
    | "Reporte de mascota perdida";
  targetId: string;
  targetType: AdminModerationTargetType;
  title: string;
  verificationBadge: {
    label: "Insignia de verificación";
    note: string;
  } | null;
  visibility: "hidden" | "visible";
}

export interface AdminModerationReportedMemberViewModel {
  availableAction: {
    label: string;
    type: "ban_member" | "unban_member";
  };
  displayName: string;
  memberId: string;
  status: "active" | "banned";
  statusLabel: string;
}

export interface AdminModerationQueueItemActionViewModel {
  label: string;
  type: "hide_target" | "restore_target";
}

export interface AdminModerationSettingViewModel {
  enabled: boolean;
  label: string;
  stateLabel: "Activado" | "Desactivado";
  summary: string;
}

type AdminModerationQueueKey =
  | "flaggedAdoptionListings"
  | "flaggedChats"
  | "flaggedReports"
  | "flaggedResourceProviders";

export type AdminModerationTargetType =
  | "adoption_listing"
  | "chat_conversation"
  | "found_pet_report"
  | "lost_pet_report"
  | "resource_provider"
  | "sighting_report";

export type HideableAdminModerationTargetType =
  | "adoption_listing"
  | "found_pet_report"
  | "lost_pet_report"
  | "sighting_report";

interface AdminModerationItemState {
  city: string;
  department: string;
  queue: AdminModerationQueueKey;
  reportCount: number;
  reportedMemberId: string;
  statusLabel: string;
  surfaceLabel: AdminModerationQueueItemViewModel["surfaceLabel"];
  targetId: string;
  targetType: AdminModerationTargetType;
  title: string;
  verificationBadge: AdminModerationQueueItemViewModel["verificationBadge"];
  visibility: "hidden" | "visible";
}

interface AdminModerationState {
  items: AdminModerationItemState[];
  members: Map<string, AdminModerationMemberState>;
  settings: {
    adoptionReviewModeEnabled: boolean;
    verifiedEmailRequiredToPublish: boolean;
  };
}

interface AdminModerationMemberState {
  displayName: string;
  memberId: string;
  status: "active" | "banned";
}

const moderationFixtures: Omit<AdminModerationItemState, "visibility">[] = [
  {
    city: "La Paz",
    department: "La Paz",
    queue: "flaggedReports",
    reportCount: 4,
    reportedMemberId: "member-diego",
    statusLabel: "Visible en superficies públicas",
    surfaceLabel: "Reporte de mascota perdida",
    targetId: "lost-bruno-achumani",
    targetType: "lost_pet_report",
    title: "Bruno reportado como posible riesgo",
    verificationBadge: null,
  },
  {
    city: "Cochabamba",
    department: "Cochabamba",
    queue: "flaggedReports",
    reportCount: 2,
    reportedMemberId: "member-camila",
    statusLabel: "Visible en superficies públicas",
    surfaceLabel: "Reporte de mascota encontrada",
    targetId: "found-michi-sarco",
    targetType: "found_pet_report",
    title: "Michi con ubicación disputada",
    verificationBadge: null,
  },
  {
    city: "La Paz",
    department: "La Paz",
    queue: "flaggedReports",
    reportCount: 1,
    reportedMemberId: "member-lucia",
    statusLabel: "Visible en superficies públicas",
    surfaceLabel: "Reporte de avistamiento",
    targetId: "sighting-toby-miraflores",
    targetType: "sighting_report",
    title: "Avistamiento de Toby en Miraflores",
    verificationBadge: null,
  },
  {
    city: "La Paz",
    department: "La Paz",
    queue: "flaggedAdoptionListings",
    reportCount: 3,
    reportedMemberId: "member-huellitas",
    statusLabel: "Visible en superficies públicas",
    surfaceLabel: "Publicación de adopción",
    targetId: "adopt-nala-sopocachi",
    targetType: "adoption_listing",
    title: "Nala busca nuevo hogar",
    verificationBadge: {
      label: "Insignia de verificación",
      note: "Organización verificada por Rastro.",
    },
  },
  {
    city: "La Paz",
    department: "La Paz",
    queue: "flaggedChats",
    reportCount: 5,
    reportedMemberId: "member-diego",
    statusLabel: "Pendiente de revisión",
    surfaceLabel: "Chat interno",
    targetId: "chat-bruno-achumani",
    targetType: "chat_conversation",
    title: "Conversación sobre Bruno en Achumani",
    verificationBadge: null,
  },
  {
    city: "Santa Cruz de la Sierra",
    department: "Santa Cruz",
    queue: "flaggedResourceProviders",
    reportCount: 2,
    reportedMemberId: "member-san-roque",
    statusLabel: "Perfil visible",
    surfaceLabel: "Perfil de proveedor",
    targetId: "clinic-san-roque",
    targetType: "resource_provider",
    title: "Clínica San Roque",
    verificationBadge: {
      label: "Insignia de verificación",
      note: "Proveedor de recursos verificado por Rastro.",
    },
  },
];

const memberFixtures: AdminModerationMemberState[] = [
  {
    displayName: "Diego P.",
    memberId: "member-diego",
    status: "active",
  },
  {
    displayName: "Camila R.",
    memberId: "member-camila",
    status: "active",
  },
  {
    displayName: "Lucia M.",
    memberId: "member-lucia",
    status: "active",
  },
  {
    displayName: "Huellitas La Paz",
    memberId: "member-huellitas",
    status: "active",
  },
  {
    displayName: "Clínica San Roque",
    memberId: "member-san-roque",
    status: "active",
  },
];

const queueTitles: Record<AdminModerationQueueKey, string> = {
  flaggedAdoptionListings: "Publicaciones de adopción reportadas",
  flaggedChats: "Chats internos reportados",
  flaggedReports: "Reportes marcados",
  flaggedResourceProviders: "Perfiles de proveedores reportados",
};

export function createInMemoryAdminModerationDashboard(): AdminModerationDashboard {
  const state = createInitialState();

  return {
    applyAction(viewer, action) {
      if (viewer.role !== "admin") {
        return {
          status: "forbidden",
          viewModel: buildForbiddenViewModel(),
        };
      }

      return applyAdminAction(state, action);
    },
    getViewModel(viewer) {
      if (viewer.role !== "admin") {
        return {
          status: "forbidden",
          viewModel: buildForbiddenViewModel(),
        };
      }

      return {
        status: "authorized",
        viewModel: buildDashboardViewModel(state),
      };
    },
  };
}

function applyAdminAction(
  state: AdminModerationState,
  action: AdminModerationAction,
): AdminModerationActionResult {
  if (action.type === "ban_member" || action.type === "unban_member") {
    return applyMemberAction(state, action);
  }

  if (
    action.type === "toggle_adoption_review_mode" ||
    action.type === "toggle_verified_email_required_to_publish"
  ) {
    return applySettingsAction(state, action);
  }

  return applyTargetVisibilityAction(state, action);
}

function createInitialState(): AdminModerationState {
  return {
    items: moderationFixtures.map((fixture) => ({
      ...fixture,
      visibility: "visible",
    })),
    members: new Map(
      memberFixtures.map((member) => [member.memberId, { ...member }]),
    ),
    settings: {
      adoptionReviewModeEnabled: false,
      verifiedEmailRequiredToPublish: false,
    },
  };
}

function buildForbiddenViewModel(): AdminModerationForbiddenViewModel {
  return {
    body: "Esta superficie está disponible solo para administradores de Rastro.",
    locale: "es-BO",
    title: "Acceso restringido",
  };
}

function buildDashboardViewModel(
  state: AdminModerationState,
): AdminModerationDashboardViewModel {
  return {
    locale: "es-BO",
    metrics: buildMetricsViewModel(state),
    queues: {
      flaggedAdoptionListings: buildQueueViewModel(
        state,
        "flaggedAdoptionListings",
      ),
      flaggedChats: buildQueueViewModel(state, "flaggedChats"),
      flaggedReports: buildQueueViewModel(state, "flaggedReports"),
      flaggedResourceProviders: buildQueueViewModel(
        state,
        "flaggedResourceProviders",
      ),
    },
    settings: buildSettingsViewModel(state),
    title: "Panel de moderación",
  };
}

function buildMetricsViewModel(
  state: AdminModerationState,
): AdminModerationMetricsViewModel {
  return {
    byCity: buildMetricGroup(state, (item) => item.city),
    byDepartment: buildMetricGroup(state, (item) => item.department),
  };
}

function buildMetricGroup(
  state: AdminModerationState,
  getLabel: (item: AdminModerationItemState) => string,
): AdminModerationAbuseMetricViewModel[] {
  const metricsByLabel = new Map<
    string,
    {
      bannedMemberIds: Set<string>;
      hiddenTargetIds: Set<string>;
      label: string;
      reportCount: number;
    }
  >();

  for (const item of state.items) {
    const label = getLabel(item);
    const metric = metricsByLabel.get(label) ?? {
      bannedMemberIds: new Set<string>(),
      hiddenTargetIds: new Set<string>(),
      label,
      reportCount: 0,
    };
    const member = state.members.get(item.reportedMemberId);

    metric.reportCount += item.reportCount;

    if (item.visibility === "hidden") {
      metric.hiddenTargetIds.add(item.targetId);
    }

    if (member?.status === "banned") {
      metric.bannedMemberIds.add(member.memberId);
    }

    metricsByLabel.set(label, metric);
  }

  return Array.from(metricsByLabel.values())
    .map((metric) => ({
      bannedMemberCount: metric.bannedMemberIds.size,
      hiddenTargetCount: metric.hiddenTargetIds.size,
      label: metric.label,
      reportCount: metric.reportCount,
    }))
    .sort(
      (left, right) =>
        right.reportCount - left.reportCount ||
        left.label.localeCompare(right.label),
    );
}

function buildSettingsViewModel(
  state: AdminModerationState,
): AdminModerationDashboardViewModel["settings"] {
  const adoptionReviewModeEnabled = state.settings.adoptionReviewModeEnabled;
  const verifiedEmailRequiredToPublish =
    state.settings.verifiedEmailRequiredToPublish;

  return {
    adoptionReviewMode: {
      enabled: adoptionReviewModeEnabled,
      label: "Modo de revisión",
      stateLabel: adoptionReviewModeEnabled ? "Activado" : "Desactivado",
      summary: adoptionReviewModeEnabled
        ? "Nuevas adopciones requieren revisión antes de publicarse."
        : "Nuevas adopciones pueden publicarse sin revisión previa.",
    },
    verifiedEmailRequiredToPublish: {
      enabled: verifiedEmailRequiredToPublish,
      label: "Correo verificado requerido para publicar",
      stateLabel: verifiedEmailRequiredToPublish ? "Activado" : "Desactivado",
      summary: verifiedEmailRequiredToPublish
        ? "Los miembros deben verificar su correo antes de crear reportes o adopciones."
        : "Los miembros pueden publicar mientras terminan la verificación de correo.",
    },
  };
}

function buildQueueViewModel(
  state: AdminModerationState,
  queue: AdminModerationQueueKey,
): AdminModerationQueueViewModel {
  return {
    items: state.items
      .filter((fixture) => fixture.queue === queue)
      .map((fixture) => toQueueItemViewModel(state, fixture)),
    title: queueTitles[queue],
  };
}

function toQueueItemViewModel(
  state: AdminModerationState,
  fixture: AdminModerationItemState,
): AdminModerationQueueItemViewModel {
  return {
    availableActions: buildAvailableActions(fixture),
    city: fixture.city,
    department: fixture.department,
    reportCount: fixture.reportCount,
    reportedMember: buildReportedMemberViewModel(state, fixture),
    statusLabel: fixture.statusLabel,
    surfaceLabel: fixture.surfaceLabel,
    targetId: fixture.targetId,
    targetType: fixture.targetType,
    title: fixture.title,
    verificationBadge: fixture.verificationBadge
      ? { ...fixture.verificationBadge }
      : null,
    visibility: fixture.visibility,
  };
}

function applyTargetVisibilityAction(
  state: AdminModerationState,
  action: Extract<
    AdminModerationAction,
    { type: "hide_target" | "restore_target" }
  >,
): AdminModerationActionResult {
  const item = state.items.find(
    (candidate) =>
      candidate.targetId === action.targetId &&
      candidate.targetType === action.targetType,
  );

  if (!item) {
    return {
      announcement: {
        body: "No encontramos el elemento solicitado en la cola de moderación.",
        title: "Elemento no encontrado",
      },
      status: "not_found",
    };
  }

  item.visibility = action.type === "hide_target" ? "hidden" : "visible";
  item.statusLabel =
    item.visibility === "hidden"
      ? "Oculto de superficies públicas"
      : "Visible en superficies públicas";

  return {
    announcement:
      action.type === "hide_target"
        ? {
            body: "El contenido queda fuera de las superficies públicas mientras se revisa.",
            title: "Contenido oculto",
          }
        : {
            body: "El contenido vuelve a las superficies públicas de Rastro.",
            title: "Contenido restaurado",
          },
    status: "updated",
    viewModel: buildDashboardViewModel(state),
  };
}

function applyMemberAction(
  state: AdminModerationState,
  action: Extract<
    AdminModerationAction,
    { type: "ban_member" | "unban_member" }
  >,
): AdminModerationActionResult {
  const member = state.members.get(action.memberId);

  if (!member) {
    return {
      announcement: {
        body: "No encontramos el miembro solicitado en la cola de moderación.",
        title: "Miembro no encontrado",
      },
      status: "not_found",
    };
  }

  member.status = action.type === "ban_member" ? "banned" : "active";

  return {
    announcement:
      action.type === "ban_member"
        ? {
            body: "El miembro ya no puede publicar ni contactar desde Rastro.",
            title: "Miembro bloqueado",
          }
        : {
            body: "El miembro recupera acceso para publicar y contactar en Rastro.",
            title: "Miembro restaurado",
          },
    status: "updated",
    viewModel: buildDashboardViewModel(state),
  };
}

function applySettingsAction(
  state: AdminModerationState,
  action: Extract<
    AdminModerationAction,
    {
      type:
        | "toggle_adoption_review_mode"
        | "toggle_verified_email_required_to_publish";
    }
  >,
): AdminModerationActionResult {
  if (action.type === "toggle_adoption_review_mode") {
    state.settings.adoptionReviewModeEnabled =
      !state.settings.adoptionReviewModeEnabled;

    return {
      announcement: {
        body: state.settings.adoptionReviewModeEnabled
          ? "Nuevas adopciones pasan por revisión antes de publicarse."
          : "Nuevas adopciones pueden publicarse sin revisión previa.",
        title: state.settings.adoptionReviewModeEnabled
          ? "Modo de revisión activado"
          : "Modo de revisión desactivado",
      },
      status: "updated",
      viewModel: buildDashboardViewModel(state),
    };
  }

  state.settings.verifiedEmailRequiredToPublish =
    !state.settings.verifiedEmailRequiredToPublish;

  return {
    announcement: {
      body: state.settings.verifiedEmailRequiredToPublish
        ? "Solo miembros con correo verificado pueden publicar."
        : "Los miembros pueden publicar mientras terminan la verificación de correo.",
      title: state.settings.verifiedEmailRequiredToPublish
        ? "Correo verificado requerido"
        : "Correo verificado opcional",
    },
    status: "updated",
    viewModel: buildDashboardViewModel(state),
  };
}

function buildReportedMemberViewModel(
  state: AdminModerationState,
  fixture: AdminModerationItemState,
): AdminModerationReportedMemberViewModel {
  const member = state.members.get(fixture.reportedMemberId);

  if (!member) {
    return {
      availableAction: {
        label: "Bloquear miembro",
        type: "ban_member",
      },
      displayName: "Miembro no encontrado",
      memberId: fixture.reportedMemberId,
      status: "active",
      statusLabel: "Miembro activo",
    };
  }

  return {
    availableAction:
      member.status === "banned"
        ? {
            label: "Quitar bloqueo",
            type: "unban_member",
          }
        : {
            label: "Bloquear miembro",
            type: "ban_member",
          },
    displayName: member.displayName,
    memberId: member.memberId,
    status: member.status,
    statusLabel:
      member.status === "banned" ? "Bloqueado por abuso" : "Miembro activo",
  };
}

function buildAvailableActions(
  fixture: AdminModerationItemState,
): AdminModerationQueueItemActionViewModel[] {
  if (!isHideableTargetType(fixture.targetType)) {
    return [];
  }

  return [
    fixture.visibility === "hidden"
      ? {
          label: "Restaurar",
          type: "restore_target",
        }
      : {
          label: "Ocultar",
          type: "hide_target",
        },
  ];
}

function isHideableTargetType(
  targetType: AdminModerationTargetType,
): targetType is HideableAdminModerationTargetType {
  return (
    targetType === "adoption_listing" ||
    targetType === "found_pet_report" ||
    targetType === "lost_pet_report" ||
    targetType === "sighting_report"
  );
}
