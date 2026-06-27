import type { RouterOutputs } from "@acme/api";

import type {
  AdminModerationDashboardProps,
  AdminModerationFlaggedItem,
  AdminModerationMetric,
  AdminModerationViewer,
} from "./admin-moderation-dashboard";

export type AdminResourceProviderModerationQueue =
  RouterOutputs["admin"]["moderation"]["resourceProviderQueue"];
export type AdminReportModerationQueue =
  RouterOutputs["admin"]["moderation"]["reportQueue"];

export function toPersistedAdminModerationDashboardProps(
  viewer: AdminModerationViewer,
  settings: {
    reviewModeEnabled: boolean;
    verifiedEmailRequiredToPublish: boolean;
  },
  queues: {
    reportQueue: AdminReportModerationQueue;
    resourceProviderQueue: AdminResourceProviderModerationQueue;
  },
): AdminModerationDashboardProps {
  const flaggedItems = [
    ...queues.reportQueue.map(toReportFlaggedItem),
    ...queues.resourceProviderQueue.map(toResourceProviderFlaggedItem),
  ];

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
      href: buildReviewTargetHref(item.id),
      id: item.target.id,
      locationLabel: item.target.city,
      status: item.target.status,
      title: item.target.title,
      type: item.target.type,
    },
  };
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
      href: buildReviewTargetHref(item.id),
      id: item.provider.id,
      locationLabel: item.provider.locationLabel,
      status: "visible",
      title: item.provider.name,
      type: "resource_provider_profile",
    },
  };
}

function buildReviewTargetHref(reviewItemId: string) {
  return `/admin/moderacion/${reviewItemId}`;
}

function formatNewestReportLabel(value: Date | string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}
