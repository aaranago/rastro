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

export function toAdminModerationDashboardProps(
  viewModel: AdminModerationDashboardViewModel,
  viewer: AdminModerationViewer,
): AdminModerationDashboardProps {
  const flaggedItems = flattenModerationItems(viewModel);

  return {
    flaggedItems,
    metrics: buildDashboardMetrics(flaggedItems),
    settings: {
      reviewModeEnabled: viewModel.settings.adoptionReviewMode.enabled,
      verifiedEmailRequiredToPublish:
        viewModel.settings.verifiedEmailRequiredToPublish.enabled,
    },
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
): AdminModerationFlaggedItem[] {
  return [
    ...viewModel.queues.flaggedReports.items,
    ...viewModel.queues.flaggedAdoptionListings.items,
    ...viewModel.queues.flaggedChats.items,
    ...viewModel.queues.flaggedResourceProviders.items,
  ].map(toFlaggedItem);
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
    newestReportLabel: "Pendiente de revision",
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
