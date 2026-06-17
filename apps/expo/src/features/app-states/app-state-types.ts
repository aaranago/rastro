export type AppStateKind =
  | "loading"
  | "empty"
  | "error"
  | "permission-denied"
  | "offline"
  | "retry"
  | "permission-education";

export type AppStateTone =
  | "neutral"
  | "info"
  | "warning"
  | "danger"
  | "success";

export type AppStatePermission =
  | "location"
  | "notifications"
  | "photos-camera"
  | "background-location";

export type AppStatePermissionContext =
  | "nearby"
  | "alert-subscription"
  | "report-media"
  | "moving-alerts";

export type AppStatePermissionEducationPreset =
  | "nearby-location"
  | "alert-notifications"
  | "report-media"
  | "moving-alerts";

export type AppStateActionVariant = "primary" | "secondary" | "quiet";

export type AppStateActionId =
  | "retry"
  | "request-permission"
  | "open-settings"
  | "manual-search"
  | "sign-in"
  | "continue"
  | "contact-support"
  | "go-back"
  | (string & {});

export interface AppStateActionDescriptor {
  id: AppStateActionId;
  label: string;
  variant?: AppStateActionVariant;
  iconName?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}

interface AppStateDescriptorBase {
  kind: AppStateKind;
  title: string;
  body?: string;
  eyebrow?: string;
  iconName?: string;
  tone?: AppStateTone;
  statusLabel?: string;
  detailLines?: readonly string[];
  footnote?: string;
  actions?: readonly AppStateActionDescriptor[];
}

export interface LoadingAppStateDescriptor extends AppStateDescriptorBase {
  kind: "loading";
  progressLabel?: string;
}

export interface EmptyAppStateDescriptor extends AppStateDescriptorBase {
  kind: "empty";
}

export interface ErrorAppStateDescriptor extends AppStateDescriptorBase {
  kind: "error";
  preservesWork?: boolean;
}

export interface PermissionDeniedAppStateDescriptor
  extends AppStateDescriptorBase {
  kind: "permission-denied";
  permission: AppStatePermission;
  canOpenSettings: boolean;
  hasManualAlternative?: boolean;
  actions: readonly AppStateActionDescriptor[];
}

export interface OfflineAppStateDescriptor extends AppStateDescriptorBase {
  kind: "offline";
  isStale: boolean;
  cachedContentLabel?: string;
  lastUpdatedLabel?: string;
}

export interface RetryAppStateDescriptor extends AppStateDescriptorBase {
  kind: "retry";
  retryTargetLabel?: string;
  queuedActionCount?: number;
  actions: readonly AppStateActionDescriptor[];
}

export interface PermissionEducationAppStateDescriptor
  extends AppStateDescriptorBase {
  kind: "permission-education";
  permission: AppStatePermission;
  context: AppStatePermissionContext;
  reasons: readonly string[];
  actions: readonly AppStateActionDescriptor[];
}

export type AppStateDescriptor =
  | LoadingAppStateDescriptor
  | EmptyAppStateDescriptor
  | ErrorAppStateDescriptor
  | PermissionDeniedAppStateDescriptor
  | OfflineAppStateDescriptor
  | RetryAppStateDescriptor
  | PermissionEducationAppStateDescriptor;

export type AppStateActionHandler = (
  action: AppStateActionDescriptor,
  descriptor: AppStateDescriptor,
) => void;
export type AppStateCatalogKey =
  | "loading"
  | "empty"
  | "error"
  | "permission-denied"
  | "offline-stale"
  | "retry";

export interface AppStateCatalog {
  states: Record<AppStateCatalogKey, AppStateDescriptor>;
  permissionEducation: Record<
    AppStatePermission,
    PermissionEducationAppStateDescriptor
  >;
}
