import type { AlertSubscriptionNativeLocationSnapshot } from "./alert-subscription-native-adapter";
import type {
  AlertSubscription,
  AlertSubscriptionLocationSnapshot,
  AlertSubscriptionRadiusKm,
  AlertSubscriptionsSessionState,
} from "./alert-subscriptions";
import { alertSubscriptionRadiusOptionsKm } from "./alert-subscriptions";

export type AlertSubscriptionSettingsAction =
  | "enable-alerts"
  | "pause-alerts"
  | "retry-load"
  | "sign-in";

export type AlertSubscriptionSettingsLoadState = "error" | "loading" | "ready";

export interface AlertSubscriptionSettingsRadiusOption {
  isSelected: boolean;
  label: string;
  value: AlertSubscriptionRadiusKm;
}

export interface AlertSubscriptionSettingsViewModel {
  action: {
    id: AlertSubscriptionSettingsAction;
    label: string;
  };
  area?: {
    label: string;
    meta: string;
    sourceLabel: string;
  };
  body: string;
  canManage: boolean;
  enabled: boolean;
  loadState: AlertSubscriptionSettingsLoadState;
  locationPolicyRows: string[];
  movingAlerts: {
    body: string;
    enabled: boolean;
    statusLabel: string;
    title: string;
  };
  radiusOptions: AlertSubscriptionSettingsRadiusOption[];
  refreshActionLabel: string;
  statusLabel: string;
  title: string;
}

export function buildAlertSubscriptionSettingsViewModel({
  loadState = "ready",
  radiusKm,
  session,
  subscription,
}: {
  loadState?: AlertSubscriptionSettingsLoadState;
  radiusKm?: AlertSubscriptionRadiusKm;
  session: AlertSubscriptionsSessionState;
  subscription: AlertSubscription | null;
}): AlertSubscriptionSettingsViewModel {
  if (session.kind === "visitor") {
    return {
      action: {
        id: "sign-in",
        label: "Iniciar sesión",
      },
      body: "Inicia sesión para recibir alertas de nuevas mascotas perdidas cerca de tu zona.",
      canManage: false,
      enabled: false,
      loadState: "ready",
      locationPolicyRows: [
        "No usamos GPS continuo.",
        "Puedes explorar Cerca sin activar alertas.",
      ],
      movingAlerts: {
        body: "Disponible solo para miembros y siempre como ajuste explícito.",
        enabled: false,
        statusLabel: "No disponible",
        title: "Alertas mientras me muevo",
      },
      radiusOptions: buildRadiusOptions(radiusKm ?? 5),
      refreshActionLabel: "Actualizar área",
      statusLabel: "Sesión requerida",
      title: "Alertas cercanas",
    };
  }

  if (loadState === "loading") {
    return {
      action: {
        id: "enable-alerts",
        label: "Cargando alertas",
      },
      body: "Estamos cargando tu suscripción antes de permitir cambios.",
      canManage: false,
      enabled: false,
      loadState,
      locationPolicyRows: [
        "No usamos GPS continuo.",
        "Puedes cambiar estos ajustes cuando termine la carga.",
      ],
      movingAlerts: {
        body: "Disponible cuando cargue tu suscripción de alertas cercanas.",
        enabled: false,
        statusLabel: "Cargando",
        title: "Alertas mientras me muevo",
      },
      radiusOptions: buildRadiusOptions(radiusKm ?? 5),
      refreshActionLabel: "Actualizar área",
      statusLabel: "Cargando alertas",
      title: "Alertas cercanas",
    };
  }

  if (loadState === "error") {
    return {
      action: {
        id: "retry-load",
        label: "Reintentar carga",
      },
      body: "No pudimos cargar tu suscripción. Reintenta antes de cambiar alertas.",
      canManage: false,
      enabled: false,
      loadState,
      locationPolicyRows: [
        "No cambiaremos tu suscripción hasta recuperar el estado actual.",
        "Puedes volver a intentar desde esta pantalla.",
      ],
      movingAlerts: {
        body: "Primero necesitamos cargar tu suscripción actual.",
        enabled: false,
        statusLabel: "Sin cargar",
        title: "Alertas mientras me muevo",
      },
      radiusOptions: buildRadiusOptions(radiusKm ?? 5),
      refreshActionLabel: "Actualizar área",
      statusLabel: "No pudimos cargar alertas",
      title: "Alertas cercanas",
    };
  }

  const selectedRadiusKm = subscription?.radiusKm ?? radiusKm ?? 5;
  const enabled = subscription?.enabled ?? false;

  return {
    action: {
      id: enabled ? "pause-alerts" : "enable-alerts",
      label: enabled ? "Pausar alertas" : "Activar alertas",
    },
    area: subscription?.dynamicAlertArea
      ? formatDynamicAlertArea(subscription.dynamicAlertArea.location)
      : undefined,
    body: enabled
      ? `Te avisaremos de nuevas mascotas perdidas activas en un radio de ${selectedRadiusKm} km.`
      : "Activa alertas para enterarte de nuevas mascotas perdidas cerca de tu área dinámica.",
    canManage: true,
    enabled,
    loadState,
    locationPolicyRows: [
      "Actualizamos al abrir la app, volver a primer plano o tocar actualizar.",
      "No usamos GPS continuo ni sockets siempre activos.",
      "Los reportes cerrados no generan alertas.",
    ],
    movingAlerts: formatMovingAlerts(subscription),
    radiusOptions: buildRadiusOptions(selectedRadiusKm),
    refreshActionLabel: "Actualizar área",
    statusLabel: enabled ? "Alertas activas" : "Alertas desactivadas",
    title: "Alertas cercanas",
  };
}

export function toAlertSubscriptionLocationSnapshot(
  snapshot: AlertSubscriptionNativeLocationSnapshot,
): AlertSubscriptionLocationSnapshot | undefined {
  if (snapshot.kind !== "available") {
    return undefined;
  }

  const source = snapshot.source === "current" ? "current" : "last";

  return {
    coordinates: {
      latitude: snapshot.coordinates.latitude,
      longitude: snapshot.coordinates.longitude,
    },
    countryCode: "BO",
    detectedAt: snapshot.coordinates.capturedAt,
    label:
      source === "current"
        ? "Ubicación actual en Bolivia"
        : "Última ubicación detectada en Bolivia",
    locationCellLabel: "Bolivia",
    source,
  };
}

function buildRadiusOptions(
  selectedRadiusKm: AlertSubscriptionRadiusKm,
): AlertSubscriptionSettingsRadiusOption[] {
  return alertSubscriptionRadiusOptionsKm.map((option) => ({
    isSelected: option === selectedRadiusKm,
    label: `${option} km`,
    value: option,
  }));
}

function formatDynamicAlertArea(
  location: AlertSubscriptionLocationSnapshot,
): AlertSubscriptionSettingsViewModel["area"] {
  return {
    label: location.label,
    meta: `${location.locationCellLabel} · zona aproximada`,
    sourceLabel:
      location.source === "current"
        ? "Ubicación actual"
        : "Última ubicación detectada",
  };
}

function formatMovingAlerts(
  subscription: AlertSubscription | null,
): AlertSubscriptionSettingsViewModel["movingAlerts"] {
  if (!subscription) {
    return {
      body: "Primero activa alertas cercanas. Luego podrás pedir este permiso opcional.",
      enabled: false,
      statusLabel: "Requiere alertas activas",
      title: "Alertas mientras me muevo",
    };
  }

  if (!subscription.movingAlerts.enabled) {
    return {
      body: "Mantendremos las actualizaciones solo al abrir la app, volver a primer plano o actualizar manualmente.",
      enabled: false,
      statusLabel: "Desactivadas",
      title: subscription.movingAlerts.label,
    };
  }

  if (subscription.movingAlerts.status === "needs-background-permission") {
    return {
      body: "Necesita permiso de ubicación en segundo plano. Rastro todavía no inicia seguimiento continuo.",
      enabled: true,
      statusLabel: "Necesita permiso",
      title: subscription.movingAlerts.label,
    };
  }

  return {
    body: "Permiso listo. El seguimiento en segundo plano queda apagado hasta activar una tarea nativa dedicada.",
    enabled: true,
    statusLabel: "Permiso listo",
    title: subscription.movingAlerts.label,
  };
}
