import type { AdminModerationViewer as ModelAdminModerationViewer } from "./admin-moderation";
import type { AdminModerationViewer as ExistingAdminDashboardViewer } from "./admin-moderation-dashboard";
import type {
  AdminResourceForbiddenViewModel,
  AdminResourceManagementViewer,
  AdminResourceMetricsViewModel,
  AdminResourceProviderListViewModel,
} from "./admin-resources";
import type {
  AdminResourcesDashboardProps,
  AdminResourcesViewer,
} from "./admin-resources-dashboard";

const emptyMetrics: AdminResourceMetricsViewModel = {
  byCity: [],
  byDepartment: [],
};

export function toAdminResourceManagementViewer(
  viewer: ModelAdminModerationViewer,
): AdminResourceManagementViewer {
  return {
    memberId: viewer.memberId,
    role: viewer.role,
  };
}

export function toAdminResourcesDashboardProps(
  viewModel: AdminResourceProviderListViewModel,
  metrics: AdminResourceMetricsViewModel,
  viewer: ExistingAdminDashboardViewer,
): AdminResourcesDashboardProps {
  return {
    accessDenied: {
      body: "Esta superficie esta disponible solo para administradores de Rastro.",
      title: "Acceso restringido",
    },
    createActionLabel: viewModel.createActionLabel,
    metrics,
    providers: viewModel.providers,
    title: viewModel.title,
    viewer: toAdminResourcesViewer(viewer),
  };
}

export function buildForbiddenAdminResourcesDashboardProps(
  viewer: ExistingAdminDashboardViewer,
  forbidden: AdminResourceForbiddenViewModel,
): AdminResourcesDashboardProps {
  return {
    accessDenied: {
      body: forbidden.body,
      title: forbidden.title,
    },
    createActionLabel: "Registrar proveedor",
    metrics: emptyMetrics,
    providers: [],
    title: "Gestion de proveedores de recursos",
    viewer: toAdminResourcesViewer(viewer),
  };
}

function toAdminResourcesViewer(
  viewer: ExistingAdminDashboardViewer,
): AdminResourcesViewer {
  return {
    displayName: viewer.displayName,
    role: viewer.role,
  };
}
