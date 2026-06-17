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
