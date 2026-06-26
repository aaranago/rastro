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
    resourceProviderQueue?: AdminResourceProviderModerationQueue;
  },
): AdminModerationFlaggedItem[] {
  const fixtureItems = [
    ...viewModel.queues.flaggedReports.items,
    ...viewModel.queues.flaggedAdoptionListings.items,
    ...viewModel.queues.flaggedChats.items,
  ].map(toFlaggedItem);
  const resourceProviderItems =
    options.resourceProviderQueue !== undefined
      ? options.resourceProviderQueue.map(toResourceProviderFlaggedItem)
      : viewModel.queues.flaggedResourceProviders.items.map(toFlaggedItem);

  return [...fixtureItems, ...resourceProviderItems];
}

function toFlaggedItem(
  item: AdminModerationQueueItemViewModel,
): AdminModerationFlaggedItem {
  return {
    accusedMember: {
      displayName: item.reportedMember.displayName,
      id: item.reportedMember.memberId,
      status: item.reportedMember.status,
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
