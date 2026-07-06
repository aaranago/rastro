import type {
  AppStateActionDescriptor,
  AppStatePermission,
  AppStatePermissionContext,
  AppStatePermissionEducationPreset,
  AppStateTone,
  EmptyAppStateDescriptor,
  ErrorAppStateDescriptor,
  LoadingAppStateDescriptor,
  OfflineAppStateDescriptor,
  PermissionDeniedAppStateDescriptor,
  PermissionEducationAppStateDescriptor,
  RetryAppStateDescriptor,
} from "./app-state-types";

interface CommonDescriptorInput {
  title?: string;
  body?: string;
  eyebrow?: string;
  iconName?: string;
  tone?: AppStateTone;
  statusLabel?: string;
  detailLines?: readonly string[];
  footnote?: string;
  actions?: readonly AppStateActionDescriptor[];
}

interface PermissionEducationPresetCopy {
  permission: AppStatePermission;
  context: AppStatePermissionContext;
  title: string;
  body: string;
  iconName: string;
  reasons: readonly string[];
  actions: readonly AppStateActionDescriptor[];
  footnote?: string;
}

const retryAction = createAppStateAction({
  id: "retry",
  label: "Reintentar",
  iconName: "arrow.clockwise",
});

const openSettingsAction = createAppStateAction({
  id: "open-settings",
  label: "Abrir ajustes",
  iconName: "gearshape.fill",
});

const permissionEducationPresets: Record<
  AppStatePermissionEducationPreset,
  PermissionEducationPresetCopy
> = {
  "nearby-location": {
    permission: "location",
    context: "nearby",
    title: "Usa tu ubicación en Cerca",
    body: "Rastro usa tu ubicación para ordenar reportes cercanos y mostrar zonas aproximadas, no para publicar tu dirección.",
    iconName: "location.fill",
    reasons: [
      "Puedes buscar por ciudad o zona si prefieres.",
      "Actualizamos la ubicación solo cuando abres o refrescas Cerca.",
    ],
    actions: [
      createAppStateAction({
        id: "request-permission",
        label: "Permitir ubicación",
        iconName: "location.fill",
      }),
      createAppStateAction({
        id: "manual-search",
        label: "Buscar zona manual",
        variant: "secondary",
        iconName: "magnifyingglass",
      }),
    ],
  },
  "alert-notifications": {
    permission: "notifications",
    context: "alert-subscription",
    title: "Activa alertas cercanas",
    body: "Te avisaremos solo sobre nuevos reportes de mascotas perdidas cerca de tu área.",
    iconName: "bell.badge.fill",
    reasons: [
      "Puedes cambiar el radio después.",
      "No enviamos patrocinadores como notificaciones.",
    ],
    actions: [
      createAppStateAction({
        id: "request-permission",
        label: "Activar alertas",
        iconName: "bell.badge.fill",
      }),
      createAppStateAction({
        id: "continue",
        label: "Ahora no",
        variant: "quiet",
      }),
    ],
  },
  "report-media": {
    permission: "photos-camera",
    context: "report-media",
    title: "Agrega fotos al reporte",
    body: "Las fotos ayudan a reconocer a la mascota. Rastro quitará datos EXIF antes de subirlas.",
    iconName: "camera.fill",
    reasons: [
      "Puedes elegir de galería o cámara.",
      "Usa hasta 5 fotos por reporte o ficha.",
    ],
    actions: [
      createAppStateAction({
        id: "request-permission",
        label: "Permitir fotos y cámara",
        iconName: "camera.fill",
      }),
      createAppStateAction({
        id: "continue",
        label: "Elegir después",
        variant: "quiet",
      }),
    ],
  },
  "moving-alerts": {
    permission: "background-location",
    context: "moving-alerts",
    title: "Alertas mientras te mueves",
    body: "Usaremos ubicación en segundo plano solo si activas esta opción para ajustar tu área de alertas.",
    iconName: "figure.walk.motion",
    reasons: [
      "Puedes desactivarlo cuando quieras.",
      "No es necesario para navegar Cerca.",
    ],
    actions: [
      createAppStateAction({
        id: "request-permission",
        label: "Permitir en segundo plano",
        iconName: "location.fill.viewfinder",
      }),
      createAppStateAction({
        id: "continue",
        label: "Solo al abrir la app",
        variant: "secondary",
      }),
    ],
  },
};

export function createAppStateAction(
  action: AppStateActionDescriptor,
): AppStateActionDescriptor {
  return {
    variant: "primary",
    ...action,
  };
}

export function createLoadingStateDescriptor(
  input: CommonDescriptorInput & { progressLabel?: string } = {},
): LoadingAppStateDescriptor {
  return {
    kind: "loading",
    title: input.title ?? "Cargando",
    body: input.body ?? "Estamos preparando la información.",
    eyebrow: input.eyebrow,
    iconName: input.iconName,
    tone: input.tone,
    statusLabel: input.statusLabel,
    detailLines: input.detailLines,
    footnote: input.footnote,
    progressLabel: input.progressLabel,
    actions: input.actions,
  };
}

export function createEmptyStateDescriptor(
  input: CommonDescriptorInput & {
    title: string;
    body: string;
  },
): EmptyAppStateDescriptor {
  return {
    kind: "empty",
    title: input.title,
    body: input.body,
    eyebrow: input.eyebrow,
    iconName: input.iconName,
    tone: input.tone,
    statusLabel: input.statusLabel,
    detailLines: input.detailLines,
    footnote: input.footnote,
    actions: input.actions,
  };
}

export function createErrorStateDescriptor(
  input: CommonDescriptorInput & {
    title?: string;
    body?: string;
    preservesWork?: boolean;
    retryActionLabel?: string | false;
  } = {},
): ErrorAppStateDescriptor {
  return {
    kind: "error",
    title: input.title ?? "No pudimos cargar esto",
    body:
      input.body ??
      "Conservamos lo que estabas haciendo. Intenta de nuevo en un momento.",
    eyebrow: input.eyebrow,
    iconName: input.iconName,
    tone: input.tone,
    statusLabel: input.statusLabel,
    detailLines: input.detailLines,
    footnote: input.footnote,
    preservesWork: input.preservesWork ?? true,
    actions:
      input.actions ??
      (input.retryActionLabel === false
        ? []
        : [
            createAppStateAction({
              ...retryAction,
              label: input.retryActionLabel ?? retryAction.label,
            }),
          ]),
  };
}

export function createPermissionEducationDescriptor(
  input: CommonDescriptorInput & {
    preset: AppStatePermissionEducationPreset;
    reasons?: readonly string[];
  },
): PermissionEducationAppStateDescriptor {
  const preset = permissionEducationPresets[input.preset];

  return {
    kind: "permission-education",
    permission: preset.permission,
    context: preset.context,
    title: input.title ?? preset.title,
    body: input.body ?? preset.body,
    eyebrow: input.eyebrow,
    iconName: input.iconName ?? preset.iconName,
    tone: input.tone ?? "info",
    statusLabel: input.statusLabel,
    detailLines: input.detailLines,
    footnote: input.footnote ?? preset.footnote,
    reasons: input.reasons ?? preset.reasons,
    actions: input.actions ?? preset.actions,
  };
}

export function createPermissionDeniedDescriptor(
  input: CommonDescriptorInput & {
    permission: AppStatePermission;
    hasManualAlternative?: boolean;
  },
): PermissionDeniedAppStateDescriptor {
  const copy = getPermissionDeniedCopy(input.permission);
  const hasManualAlternative =
    input.hasManualAlternative ?? input.permission === "location";
  const defaultActions = hasManualAlternative
    ? [
        createAppStateAction({
          id: "manual-search",
          label: "Buscar zona manual",
          iconName: "magnifyingglass",
        }),
        createAppStateAction({
          ...openSettingsAction,
          variant: "secondary",
        }),
      ]
    : [openSettingsAction];

  return {
    kind: "permission-denied",
    permission: input.permission,
    title: input.title ?? copy.title,
    body: input.body ?? copy.body,
    eyebrow: input.eyebrow,
    iconName: input.iconName ?? copy.iconName,
    tone: input.tone ?? "warning",
    statusLabel: input.statusLabel,
    detailLines: input.detailLines,
    footnote: input.footnote,
    canOpenSettings: true,
    hasManualAlternative,
    actions: input.actions ?? defaultActions,
  };
}

export function createOfflineStateDescriptor(
  input: CommonDescriptorInput & {
    isStale: boolean;
    contentLabel?: string;
    lastUpdatedLabel?: string;
    retryActionLabel?: string | false;
  },
): OfflineAppStateDescriptor {
  const contentLabel = input.contentLabel ?? "contenido guardado";

  return {
    kind: "offline",
    title: input.title ?? "Sin conexión",
    body: input.body ?? buildOfflineBody(input.isStale, contentLabel),
    eyebrow: input.eyebrow,
    iconName: input.iconName ?? "wifi.slash",
    tone: input.tone ?? "warning",
    statusLabel:
      input.statusLabel ?? (input.isStale ? "Datos guardados" : "Sin conexión"),
    detailLines: input.detailLines,
    footnote: input.footnote,
    isStale: input.isStale,
    cachedContentLabel: contentLabel,
    lastUpdatedLabel: input.lastUpdatedLabel,
    actions:
      input.actions ??
      (input.retryActionLabel === false
        ? []
        : [
            createAppStateAction({
              ...retryAction,
              label: input.retryActionLabel ?? retryAction.label,
            }),
          ]),
  };
}

export function createRetryStateDescriptor(
  input: CommonDescriptorInput & {
    retryTargetLabel?: string;
    queuedActionCount?: number;
    retryActionLabel?: string;
  } = {},
): RetryAppStateDescriptor {
  return {
    kind: "retry",
    title: input.title ?? "Listo para reintentar",
    body:
      input.body ??
      buildRetryBody(input.retryTargetLabel, input.queuedActionCount),
    eyebrow: input.eyebrow,
    iconName: input.iconName ?? "arrow.clockwise",
    tone: input.tone ?? "info",
    statusLabel: input.statusLabel,
    detailLines: input.detailLines,
    footnote: input.footnote,
    retryTargetLabel: input.retryTargetLabel,
    queuedActionCount: input.queuedActionCount,
    actions: input.actions ?? [
      createAppStateAction({
        ...retryAction,
        label: input.retryActionLabel ?? retryAction.label,
      }),
    ],
  };
}

function getPermissionDeniedCopy(permission: AppStatePermission) {
  switch (permission) {
    case "location":
      return {
        title: "Ubicación desactivada",
        body: "Puedes abrir ajustes o buscar por ciudad, zona o pin manual en Bolivia.",
        iconName: "location.slash.fill",
      };
    case "notifications":
      return {
        title: "Notificaciones desactivadas",
        body: "Puedes revisar alertas desde Actividad y activar notificaciones en ajustes.",
        iconName: "bell.slash.fill",
      };
    case "photos-camera":
      return {
        title: "Fotos y cámara desactivadas",
        body: "Abre ajustes para agregar imágenes al reporte cuando estés listo.",
        iconName: "camera.fill",
      };
    case "background-location":
      return {
        title: "Ubicación en segundo plano desactivada",
        body: "Las alertas mientras te mueves seguirán apagadas. Puedes usar Cerca al abrir la app.",
        iconName: "location.slash.fill",
      };
  }
}

function buildOfflineBody(isStale: boolean, contentLabel: string) {
  if (isStale) {
    return `Estás viendo ${contentLabel}. Puede estar desactualizado hasta que vuelva la conexión.`;
  }

  return "No hay conexión ahora. Puedes seguir con contenido guardado y reintentar.";
}

function buildRetryBody(
  retryTargetLabel: string | undefined,
  queuedActionCount: number | undefined,
) {
  if (typeof queuedActionCount === "number" && queuedActionCount > 1) {
    return `Hay ${queuedActionCount} acciones pendientes. Reintentaremos cuando tengas conexión.`;
  }

  if (queuedActionCount === 1) {
    return "Hay 1 acción pendiente. Reintentaremos cuando tengas conexión.";
  }

  if (retryTargetLabel) {
    return `Guardamos ${retryTargetLabel}. Puedes reintentar cuando vuelva la conexión.`;
  }

  return "Guardamos tu avance. Puedes reintentar cuando vuelva la conexión.";
}
