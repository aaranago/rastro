import type { RouterOutputs } from "@acme/api";

import type {
  AdminModerationDashboardViewModel,
  AdminModerationQueueItemViewModel,
  AdminModerationTargetType as ModelAdminModerationTargetType,
} from "./admin-moderation";
import type {
  AdminModerationDashboardProps,
  AdminModerationFlaggedItem,
  AdminModerationMetric,
  AdminModerationViewer,
  AdminModerationTargetType as DashboardAdminModerationTargetType,
} from "./admin-moderation-dashboard";

export type AdminResourceProviderModerationQueue =
  RouterOutputs["admin"]["moderation"]["resourceProviderQueue"];
export type AdminReportModerationQueue =
  RouterOutputs["admin"]["moderation"]["reportQueue"];

export function toAdminModerationDashboardProps(
  viewModel: AdminModerationDashboardViewModel,
  viewer: AdminModerationViewer,
  settings: {
    reviewModeEnabled: boolean;
    verifiedEmailRequiredToPublish: boolean;
  } = {
    reviewModeEnabled: viewModel.settings.adoptionReviewMode.enabled,
    verifiedEmailRequiredToPublish:
      viewModel.settings.verifiedEmailRequiredToPublish.enabled,
  },
  options: {
    reportQueue?: AdminReportModerationQueue;
    resourceProviderQueue?: AdminResourceProviderModerationQueue;
  } = {},
): AdminModerationDashboardProps {
  const flaggedItems = flattenModerationItems(viewModel, options);

  return {
    flaggedItems,
    metrics: buildDashboardMetrics(flaggedItems),
    settings,
    viewer,
  };
}

export function buildForbiddenAdminModerationDashboardProps(
  viewer: AdminModerationViewer,
): AdminModerationDashboardProps {
  return {
    flaggedItems: [],
    metrics: [],
    settings: {
      reviewModeEnabled: false,
      verifiedEmailRequiredToPublish: false,
    },
    viewer,
  };
}

function flattenModerationItems(
  viewModel: AdminModerationDashboardViewModel,
  options: {
    reportQueue?: AdminReportModerationQueue;
    resourceProviderQueue?: AdminResourceProviderModerationQueue;
  },
): AdminModerationFlaggedItem[] {
  const reportItems =
    options.reportQueue !== undefined
      ? options.reportQueue.map(toReportFlaggedItem)
      : [
          ...viewModel.queues.flaggedReports.items,
          ...viewModel.queues.flaggedAdoptionListings.items,
        ].map(toFlaggedItem);
  const chatItems = viewModel.queues.flaggedChats.items.map(toFlaggedItem);
  const resourceProviderItems =
    options.resourceProviderQueue !== undefined
      ? options.resourceProviderQueue.map(toResourceProviderFlaggedItem)
      : viewModel.queues.flaggedResourceProviders.items.map(toFlaggedItem);

  return [...reportItems, ...chatItems, ...resourceProviderItems];
}

function toFlaggedItem(
  item: AdminModerationQueueItemViewModel,
): AdminModerationFlaggedItem {
  return {
    accusedMember: {
      displayName: item.reportedMember.displayName,
      id: item.reportedMember.memberId,
      status: item.reportedMember.status === "banned" ? "banned" : "active",
    },
    department: item.department,
    detail: buildModerationDetail(item),
    id: `review-${item.targetId}`,
    newestReportLabel: "Pendiente de revisión",
    reasonLabel: "Reportado por la comunidad",
    reportCount: item.reportCount,
    reporterLabel:
      item.reportCount === 1 ? "1 miembro" : `${item.reportCount} miembros`,
    target: {
      href: buildTargetHref(item),
      id: item.targetId,
      locationLabel: item.city,
      status: item.visibility,
      title: item.title,
      type: toDashboardTargetType(item.targetType),
    },
  };
}

function buildModerationDetail(item: AdminModerationQueueItemViewModel) {
  const verificationCopy = item.verificationBadge
    ? ` Tiene ${item.verificationBadge.label}: ${item.verificationBadge.note}`
    : "";

  return `${item.surfaceLabel} con ${item.reportCount} reporte(s) en ${item.city}, ${item.department}. ${item.statusLabel}.${verificationCopy}`;
}

function buildTargetHref(item: AdminModerationQueueItemViewModel) {
  switch (item.targetType) {
    case "adoption_listing":
      return `/adopciones/${item.targetId}`;
    case "chat_conversation":
      return `/admin/moderacion/chats/${item.targetId}`;
    case "found_pet_report":
      return `/admin/moderacion/reportes/encontrados/${item.targetId}`;
    case "lost_pet_report":
      return `/reportes/perdidos/${item.targetId}`;
    case "resource_provider":
      return `/admin/moderacion/recursos/${item.targetId}`;
    case "sighting_report":
      return `/admin/moderacion/reportes/avistamientos/${item.targetId}`;
  }
}

function toDashboardTargetType(
  targetType: ModelAdminModerationTargetType,
): DashboardAdminModerationTargetType {
  switch (targetType) {
    case "chat_conversation":
      return "in_app_chat";
    case "resource_provider":
      return "resource_provider_profile";
    default:
      return targetType;
  }
}

function buildDashboardMetrics(
  flaggedItems: readonly AdminModerationFlaggedItem[],
): AdminModerationMetric[] {
  const metrics = new Map<string, AdminModerationMetric>();

  for (const item of flaggedItems) {
    const key = `${item.department}:${item.target.locationLabel}`;
    const current = metrics.get(key) ?? {
      city: item.target.locationLabel,
      department: item.department,
      hiddenCount: 0,
      pendingCount: 0,
      reportCount: 0,
    };

    current.reportCount += item.reportCount;

    if (item.target.status === "hidden") {
      current.hiddenCount += 1;
    } else {
      current.pendingCount += 1;
    }

    metrics.set(key, current);
  }

  return Array.from(metrics.values()).sort(
    (left, right) =>
      right.reportCount - left.reportCount ||
      left.department.localeCompare(right.department) ||
      left.city.localeCompare(right.city),
  );
}

const moderationReasonLabels = {
  animal_cruelty: "Crueldad animal",
  impersonation: "Suplantación de identidad",
  incorrect_location: "Ubicación incorrecta",
  offensive_content: "Contenido ofensivo",
  other: "Otro motivo",
  scam: "Estafa",
  spam: "Spam",
  stolen_pet_concern: "Sospecha de mascota robada",
} satisfies Record<
  AdminResourceProviderModerationQueue[number]["reason"],
  string
>;

const reportTypeLabels = {
  adoption: "Publicación de adopción",
  found_pet: "Reporte de mascota encontrada",
  lost_pet: "Reporte de mascota perdida",
  sighting: "Reporte de avistamiento",
} satisfies Record<
  AdminReportModerationQueue[number]["target"]["reportType"],
  string
>;

function toReportFlaggedItem(
  item: AdminReportModerationQueue[number],
): AdminModerationFlaggedItem {
  const actionDetail = item.newestAction
    ? `Ultima acción: ${item.newestAction.action === "hide" ? "oculto" : "restaurado"} por ${item.newestAction.adminId ?? "admin"} (${item.newestAction.reason}).`
    : "Sin acciones administrativas previas.";

  return {
    accusedMember: {
      displayName: item.target.caretaker.displayName,
      id: item.target.caretaker.memberId,
      status: item.target.caretaker.suspension ? "banned" : "active",
    },
    department: item.target.department,
    detail: [
      `${reportTypeLabels[item.target.reportType]} en ${item.target.locationLabel}.`,
      actionDetail,
      item.target.caretaker.suspension
        ? `Miembro suspendido desde ${formatNewestReportLabel(item.target.caretaker.suspension.suspendedAt)}: ${item.target.caretaker.suspension.reason}.`
        : "Miembro activo.",
    ].join(" "),
    id: item.id,
    newestReportLabel: formatNewestReportLabel(item.updatedAt),
    reasonLabel: item.target.hiddenReason ?? "Revisión de contenido",
    reportCount: item.reportCount,
    reporterLabel: "Moderación Rastro",
    target: {
      href: buildReportTargetHref(item),
      id: item.target.id,
      locationLabel: item.target.city,
      status: item.target.status,
      title: item.target.title,
      type: item.target.type,
    },
  };
}

function buildReportTargetHref(item: AdminReportModerationQueue[number]) {
  switch (item.target.type) {
    case "adoption_listing":
      return `/adopciones/${item.target.id}`;
    case "found_pet_report":
      return `/admin/moderacion/reportes/encontrados/${item.target.id}`;
    case "lost_pet_report":
      return `/reportes/perdidos/${item.target.id}`;
    case "sighting_report":
      return `/admin/moderacion/reportes/avistamientos/${item.target.id}`;
  }
}

function toResourceProviderFlaggedItem(
  item: AdminResourceProviderModerationQueue[number],
): AdminModerationFlaggedItem {
  return {
    accusedMember: {
      displayName: item.provider.name,
      id: item.provider.id,
      status: "active",
    },
    department: item.provider.department,
    detail: [
      `Perfil de proveedor de recursos en ${item.provider.locationLabel}, ${item.provider.department}.`,
      `Detalle más reciente: ${item.newestReport.detail}`,
      item.newestReport.reporter.suspension
        ? `Reportante suspendido desde ${formatNewestReportLabel(item.newestReport.reporter.suspension.suspendedAt)}: ${item.newestReport.reporter.suspension.reason}.`
        : "Reportante sin suspensión activa.",
    ].join(" "),
    id: item.id,
    newestReportLabel: formatNewestReportLabel(item.newestReport.createdAt),
    reasonLabel: moderationReasonLabels[item.reason],
    reportCount: item.reportCount,
    reporterLabel: item.newestReport.reporter.displayName,
    target: {
      href: `/admin/moderacion/recursos/${item.provider.id}`,
      id: item.provider.id,
      locationLabel: item.provider.locationLabel,
      status: "visible",
      title: item.provider.name,
      type: "resource_provider_profile",
    },
  };
}

function formatNewestReportLabel(value: Date | string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}
