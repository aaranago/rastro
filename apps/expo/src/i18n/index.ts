import type { AppStateCatalog } from "../features/app-states";

export type RastroLocale = "es-BO";

export type ShellTabKey = "nearby" | "activity" | "resources" | "profile";

export type ReportIntent = "lost" | "found" | "sighting" | "adoption";

export interface ShellCopy {
  locale: RastroLocale;
  brand: {
    name: string;
    tagline: string;
  };
  shell: {
    reportFabLabel: string;
    reportSheetTitle: string;
    reportSheetSubtitle: string;
    close: string;
    signedOut: string;
    signedIn: string;
    memberIntentReady: (intentLabel: string) => string;
  };
  tabs: Record<ShellTabKey, string>;
  reportActions: Record<ReportIntent, string>;
  authPrompt: {
    title: string;
    bodyForIntent: (intentLabel: string) => string;
    signIn: string;
    createAccount: string;
    continueAsVisitor: string;
  };
  appStates: AppStateCatalog;
  screens: {
    nearby: {
      title: string;
      visitorGreeting: string;
      memberGreeting: string;
      subtitle: string;
      alertTitle: string;
      alertMeta: string;
      filterLost: string;
      filterFound: string;
      filterSightings: string;
      emptyTitle: string;
      emptyBody: string;
      locationHint: string;
    };
    activity: {
      title: string;
      visitorTitle: string;
      visitorBody: string;
      memberTitle: string;
      memberBody: string;
      alertHistory: string;
      messages: string;
      updates: string;
    };
    resources: {
      title: string;
      subtitle: string;
      vets: string;
      shelters: string;
      food: string;
      emergency: string;
      sponsorLabel: string;
      emptyTitle: string;
    };
    profile: {
      title: string;
      visitorTitle: string;
      visitorBody: string;
      memberTitle: string;
      memberBody: string;
      pets: string;
      reports: string;
      alerts: string;
      settings: string;
    };
  };
}

const esBO: ShellCopy = {
  locale: "es-BO",
  brand: {
    name: "Rastro",
    tagline: "Red de recuperacion de mascotas",
  },
  shell: {
    reportFabLabel: "Abrir acciones de reporte",
    reportSheetTitle: "Crear un reporte",
    reportSheetSubtitle: "Elige que paso quieres iniciar",
    close: "Cerrar",
    signedOut: "Visitante",
    signedIn: "Miembro",
    memberIntentReady: (intentLabel) => `${intentLabel} listo para continuar`,
  },
  tabs: {
    nearby: "Cerca",
    activity: "Actividad",
    resources: "Recursos",
    profile: "Perfil",
  },
  reportActions: {
    lost: "Reportar perdida",
    found: "Reportar encontrada",
    sighting: "Reportar avistamiento",
    adoption: "Dar en adopcion",
  },
  authPrompt: {
    title: "Inicia sesion para continuar",
    bodyForIntent: (intentLabel) =>
      `Guardamos tu seleccion: ${intentLabel}. Inicia sesion para reportar o ver tu actividad.`,
    signIn: "Iniciar sesion",
    createAccount: "Crear cuenta",
    continueAsVisitor: "Continuar como visitante",
  },
  appStates: {
    states: {
      loading: {
        kind: "loading",
        title: "Cargando Rastro",
        body: "Preparando la informacion mas reciente.",
        progressLabel: "Un momento",
      },
      empty: {
        kind: "empty",
        title: "Nada por aqui todavia",
        body: "Busca por ciudad, cambia filtros o crea un reporte cuando necesites ayuda.",
        actions: [
          {
            id: "manual-search",
            label: "Buscar por zona",
            iconName: "magnifyingglass",
          },
        ],
      },
      error: {
        kind: "error",
        title: "No pudimos cargar esta vista",
        body: "Conservamos lo que estabas haciendo. Reintenta en unos segundos.",
        preservesWork: true,
        actions: [
          {
            id: "retry",
            label: "Reintentar",
            iconName: "arrow.clockwise",
          },
        ],
      },
      "permission-denied": {
        kind: "permission-denied",
        permission: "location",
        title: "Permiso desactivado",
        body: "Puedes cambiarlo en ajustes o usar una alternativa manual.",
        canOpenSettings: true,
        hasManualAlternative: true,
        actions: [
          {
            id: "manual-search",
            label: "Usar busqueda manual",
            iconName: "magnifyingglass",
          },
          {
            id: "open-settings",
            label: "Abrir ajustes",
            iconName: "gearshape.fill",
            variant: "secondary",
          },
        ],
      },
      "offline-stale": {
        kind: "offline",
        title: "Sin conexion",
        body: "Mostrando contenido guardado. Puede estar desactualizado.",
        isStale: true,
        cachedContentLabel: "contenido guardado",
        statusLabel: "Datos guardados",
        actions: [
          {
            id: "retry",
            label: "Reintentar",
            iconName: "arrow.clockwise",
          },
        ],
      },
      retry: {
        kind: "retry",
        title: "Intentar de nuevo",
        body: "La accion no se completo. Tu informacion se mantiene.",
        retryTargetLabel: "accion pendiente",
        actions: [
          {
            id: "retry",
            label: "Reintentar",
            iconName: "arrow.clockwise",
          },
        ],
      },
    },
    permissionEducation: {
      location: {
        kind: "permission-education",
        permission: "location",
        context: "nearby",
        title: "Usa tu ubicacion para ver Cerca",
        body: "Rastro usa tu ubicacion solo para ordenar reportes cercanos o buscar por radio.",
        iconName: "location.fill",
        reasons: [
          "No pedimos GPS al abrir la app.",
          "Puedes buscar por ciudad, barrio o pin manual en Bolivia.",
        ],
        actions: [
          {
            id: "request-permission",
            label: "Usar mi ubicacion",
            iconName: "location.fill",
          },
          {
            id: "manual-search",
            label: "Buscar por zona",
            iconName: "magnifyingglass",
            variant: "secondary",
          },
        ],
      },
      notifications: {
        kind: "permission-education",
        permission: "notifications",
        context: "alert-subscription",
        title: "Recibe alertas cercanas",
        body: "Te avisaremos de nuevas mascotas perdidas cerca de tu zona cuando actives alertas.",
        iconName: "bell.badge.fill",
        reasons: [
          "Solo enviamos alertas de recuperacion cercanas.",
          "No enviamos patrocinadores como notificaciones.",
        ],
        actions: [
          {
            id: "request-permission",
            label: "Activar alertas",
            iconName: "bell.badge.fill",
          },
          {
            id: "continue",
            label: "Ahora no",
            variant: "quiet",
          },
        ],
      },
      "photos-camera": {
        kind: "permission-education",
        permission: "photos-camera",
        context: "report-media",
        title: "Agrega fotos al reporte",
        body: "Una foto clara ayuda a reconocer a la mascota y completar el reporte.",
        iconName: "camera.fill",
        reasons: [
          "Usa camara o galeria cuando crees un reporte.",
          "Quitamos datos EXIF antes de subir imagenes.",
        ],
        actions: [
          {
            id: "request-permission",
            label: "Elegir foto o camara",
            iconName: "camera.fill",
          },
          {
            id: "continue",
            label: "Ahora no",
            variant: "quiet",
          },
        ],
      },
      "background-location": {
        kind: "permission-education",
        permission: "background-location",
        context: "moving-alerts",
        title: "Alertas mientras me muevo",
        body: "Opcional: usa ubicacion en segundo plano solo para alertas mientras me muevo.",
        iconName: "figure.walk.motion",
        reasons: [
          "No es necesario para navegar Cerca.",
          "Puedes mantener actualizaciones solo al abrir la app.",
        ],
        actions: [
          {
            id: "request-permission",
            label: "Permitir en segundo plano",
            iconName: "location.fill.viewfinder",
          },
          {
            id: "continue",
            label: "Mantener al abrir la app",
            variant: "secondary",
          },
        ],
      },
    },
  },
  screens: {
    nearby: {
      title: "Mascotas cerca de ti",
      visitorGreeting: "Hola, estas en Rastro",
      memberGreeting: "Hola, Camila",
      subtitle: "Explora reportes y recursos cerca de tu zona.",
      alertTitle: "Alerta activa",
      alertMeta: "Perro perdido a 500 m",
      filterLost: "Perdidas",
      filterFound: "Encontradas",
      filterSightings: "Vistas",
      emptyTitle: "Todavia no hay reportes cerca",
      emptyBody:
        "Puedes revisar por ciudad, cambiar filtros o crear un reporte cuando necesites ayuda.",
      locationHint: "Zona aproximada: La Paz, Bolivia",
    },
    activity: {
      title: "Actividad",
      visitorTitle: "Inicia sesion para ver tu actividad",
      visitorBody:
        "Tus alertas, mensajes y actualizaciones apareceran aqui cuando seas miembro.",
      memberTitle: "Tu actividad de recuperacion",
      memberBody: "Alertas, mensajes y cambios importantes en tus reportes.",
      alertHistory: "Historial de alertas",
      messages: "Mensajes",
      updates: "Actualizaciones",
    },
    resources: {
      title: "Recursos cerca",
      subtitle: "Veterinarias, refugios y apoyo local en Bolivia.",
      vets: "Veterinarias",
      shelters: "Refugios",
      food: "Alimento",
      emergency: "Emergencias",
      sponsorLabel: "Patrocinado",
      emptyTitle: "Recursos locales listos para explorar",
    },
    profile: {
      title: "Perfil",
      visitorTitle: "Usas Rastro como visitante",
      visitorBody:
        "Puedes explorar Cerca y Recursos. Inicia sesion para crear reportes y guardar tu actividad.",
      memberTitle: "Camila Rodriguez",
      memberBody: "Miembro en La Paz con alertas cercanas activas.",
      pets: "Mis mascotas",
      reports: "Mis reportes",
      alerts: "Alertas",
      settings: "Ajustes",
    },
  },
};

export function getShellCopy(locale: RastroLocale = "es-BO"): ShellCopy {
  void locale;

  return esBO;
}
