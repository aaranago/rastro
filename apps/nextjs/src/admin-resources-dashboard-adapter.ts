import type { AdminModerationViewer as ExistingAdminDashboardViewer } from "./admin-moderation-dashboard";
import type {
  AdminResourceForbiddenViewModel,
  AdminResourceMetricsViewModel,
  AdminResourceProviderListViewModel,
} from "./admin-resource-provider-admin-model";
import type {
  AdminResourcesDashboardProps,
  AdminResourcesViewer,
} from "./admin-resources-dashboard";

const emptyMetrics: AdminResourceMetricsViewModel = {
  byCity: [],
  byDepartment: [],
};

export function toAdminResourcesDashboardProps(
  viewModel: AdminResourceProviderListViewModel,
  metrics: AdminResourceMetricsViewModel,
  viewer: ExistingAdminDashboardViewer,
): AdminResourcesDashboardProps {
  return {
    accessDenied: {
      body: "Esta superficie está disponible solo para administradores de Rastro.",
      title: "Acceso restringido",
    },
    createActionLabel: viewModel.createActionLabel,
    list: viewModel.list,
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
    list: {
      availableFilters: [],
      availableSorts: [],
      hasNextPage: false,
      hasPreviousPage: false,
      input: {
        page: 1,
        pageSize: 10,
      },
      page: 1,
      pageCount: 0,
      pageSize: 10,
      total: 0,
    },
    metrics: emptyMetrics,
    providers: [],
    title: "Gestión de proveedores de recursos",
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
