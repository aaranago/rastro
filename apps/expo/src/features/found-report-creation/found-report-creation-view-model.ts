import type {
  FoundReportContactDraft,
  FoundReportContactOption,
  FoundReportCreationSession,
  FoundReportCreationVisitorAction,
  FoundReportDraft,
  FoundReportPhoto,
  PublishFoundPetReportInput,
  PublishFoundReportContactOption,
} from "./found-report-creation-types";
import { foundReportPetTypeOptions } from "./found-report-creation-types";

const foundReportPhotoLimit = 5;

export interface FoundReportCreationViewModel {
  canPublish: boolean;
  contact: {
    currentOption: FoundReportContactOption;
    error?: string;
    options: {
      body: string;
      iconName: string;
      isSelected: boolean;
      label: string;
      value: FoundReportContactOption;
    }[];
    whatsappField: {
      error?: string;
      label: string;
      placeholder: string;
      value: string;
      visible: boolean;
    };
  };
  header: {
    eyebrow: string;
  };
  foundDetails: {
    fields: {
      condition: FoundReportFieldViewModel;
      description: FoundReportFieldViewModel;
      foundAtLabel: FoundReportFieldViewModel;
    };
    title: string;
  };
  kind: "member" | "visitor";
  location: {
    approximatePublicLabel: string;
    exactInternalLabel: string;
    exactPinOptInLabel: string;
    hasExactLocation: boolean;
    mapPreviewLabel: string;
    publicPrecisionLabel: string;
    showExactPinPublicly: boolean;
    toggleBody: string;
    toggleLabel: string;
  };
  pet: {
    fields: {
      breed: FoundReportFieldViewModel;
      description: FoundReportFieldViewModel;
    };
    title: string;
    typeOptions: {
      isSelected: boolean;
      label: FoundReportDraft["pet"]["type"];
      value: FoundReportDraft["pet"]["type"];
    }[];
  };
  photos: {
    canAddPhoto: boolean;
    countLabel: string;
    error?: string;
    helpLabel: string;
    items: FoundReportPhoto[];
    permissionBody: string;
    permissionTitle: string;
  };
  review: {
    publishActionLabel: string;
    rows: {
      label: string;
      value: string;
    }[];
    validationErrors: string[];
  };
  steps: {
    id: "details" | "location" | "contact" | "review" | "success";
    isComplete: boolean;
    label: string;
  }[];
  success: {
    body: string;
    primaryActionLabel: string;
    shareActionLabel: string;
    title: string;
  };
  title: string;
  visitorAction?: FoundReportCreationVisitorAction;
}

export interface FoundReportFieldViewModel {
  error?: string;
  label: string;
  placeholder: string;
  value: string;
}

export function createFoundReportDraft(
  overrides: Partial<FoundReportDraft> = {},
): FoundReportDraft {
  const base: FoundReportDraft = {
    contact: {
      inAppChatEnabled: true,
      whatsappEnabled: false,
      whatsappPhone: "",
    },
    foundDetails: {
      condition: "",
      description: "",
      foundAtLabel: "",
    },
    pet: {
      breed: "",
      description: "",
      type: "Perro",
    },
    photos: [],
    showExactPinPublicly: false,
  };

  return {
    ...base,
    ...overrides,
    contact: {
      ...base.contact,
      ...overrides.contact,
    },
    foundDetails: {
      ...base.foundDetails,
      ...overrides.foundDetails,
    },
    pet: {
      ...base.pet,
      ...overrides.pet,
    },
  };
}

export function buildFoundReportCreationViewModel({
  draft,
  session,
}: {
  draft: FoundReportDraft;
  session?: FoundReportCreationSession;
}): FoundReportCreationViewModel {
  const validationErrors = validateFoundReportDraft(draft);
  const contactOption = getContactOption(draft.contact);
  const canPublish = validationErrors.length === 0;

  return {
    canPublish,
    contact: {
      currentOption: contactOption,
      error: getContactError(draft.contact),
      options: buildContactOptions(contactOption),
      whatsappField: {
        error:
          draft.contact.whatsappEnabled &&
          draft.contact.whatsappPhone.trim().length === 0
            ? "Ingresa el numero de WhatsApp que quieres mostrar."
            : undefined,
        label: "Numero de WhatsApp",
        placeholder: "+591 70000000",
        value: draft.contact.whatsappPhone,
        visible: draft.contact.whatsappEnabled,
      },
    },
    header: {
      eyebrow: "Mascota encontrada",
    },
    foundDetails: {
      fields: {
        condition: {
          error:
            draft.foundDetails.condition.trim().length === 0
              ? "Describe la condicion de la mascota encontrada."
              : undefined,
          label: "Condicion",
          placeholder: "Ej. tranquila, asustada, con collar, necesita ayuda",
          value: draft.foundDetails.condition,
        },
        description: {
          error:
            draft.foundDetails.description.trim().length === 0
              ? "Agrega una descripcion de la mascota encontrada."
              : undefined,
          label: "Descripcion",
          placeholder:
            "Color, tamano, marcas visibles y donde la tienes segura",
          value: draft.foundDetails.description,
        },
        foundAtLabel: {
          error:
            draft.foundDetails.foundAtLabel.trim().length === 0
              ? "Indica cuando fue encontrada."
              : undefined,
          label: "Cuando la encontraste",
          placeholder: "Hoy, ayer, fecha y hora aproximada",
          value: draft.foundDetails.foundAtLabel,
        },
      },
      title: "Detalles de la encontrada",
    },
    kind: session?.kind ?? "member",
    location: buildLocationViewModel(draft),
    pet: buildPetViewModel(draft),
    photos: {
      canAddPhoto: draft.photos.length < foundReportPhotoLimit,
      countLabel: formatPhotoCount(draft.photos.length),
      error:
        draft.photos.length === 0 ? "Agrega al menos una foto." : undefined,
      helpLabel:
        "Maximo 5 fotos claras. Prioriza cara, cuerpo completo y senas visibles.",
      items: draft.photos.slice(0, foundReportPhotoLimit),
      permissionBody:
        "Te pediremos acceso solo para elegir fotos de esta mascota encontrada.",
      permissionTitle: "Antes de abrir tus fotos",
    },
    review: {
      publishActionLabel: canPublish
        ? "Publicar encontrada"
        : "Completar datos",
      rows: buildReviewRows({
        contactOption,
        draft,
      }),
      validationErrors,
    },
    steps: buildSteps({
      canPublish,
      draft,
    }),
    success: {
      body: "Tu reporte de mascota encontrada queda listo para que su cuidador pueda reconocerla y contactarte.",
      primaryActionLabel: "Ver reporte",
      shareActionLabel: "Compartir",
      title: "Reporte publicado",
    },
    title: "Reportar encontrada",
    visitorAction:
      session?.kind === "visitor"
        ? {
            intent: "found-report",
            label: "Iniciar sesion para reportar encontrada",
          }
        : undefined,
  };
}

export function appendFoundReportPhoto({
  draft,
  photo,
}: {
  draft: FoundReportDraft;
  photo: FoundReportPhoto;
}): FoundReportDraft {
  if (draft.photos.length >= foundReportPhotoLimit) {
    return draft;
  }

  return {
    ...draft,
    photos: [...draft.photos, photo].slice(0, foundReportPhotoLimit),
  };
}

export function removeFoundReportPhoto({
  draft,
  photoId,
}: {
  draft: FoundReportDraft;
  photoId: string;
}): FoundReportDraft {
  return {
    ...draft,
    photos: draft.photos.filter((photo) => photo.id !== photoId),
  };
}

export function selectFoundReportContactOption({
  draft,
  option,
}: {
  draft: FoundReportDraft;
  option: FoundReportContactOption;
}): FoundReportDraft {
  return {
    ...draft,
    contact: {
      ...draft.contact,
      inAppChatEnabled: option === "chat" || option === "both",
      whatsappEnabled: option === "whatsapp" || option === "both",
    },
  };
}

export function toPublishFoundPetReportInput({
  draft,
}: {
  draft: FoundReportDraft;
}): PublishFoundPetReportInput {
  const errors = validateFoundReportDraft(draft);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const exactFoundLocation = draft.exactFoundLocation;

  if (!exactFoundLocation) {
    throw new Error("Exact Found Location is required.");
  }

  return {
    condition: draft.foundDetails.condition.trim(),
    contactOption: toPublishContactOption({
      option: getContactOption(draft.contact),
      whatsappPhone: draft.contact.whatsappPhone.trim(),
    }),
    exactLocation: {
      addressLabel: exactFoundLocation.addressLabel,
      countryCode: "BO",
      latitude: exactFoundLocation.coordinates.latitude,
      locationCellLabel: exactFoundLocation.locationCellLabel,
      longitude: exactFoundLocation.coordinates.longitude,
    },
    foundAt: draft.foundDetails.foundAtLabel.trim(),
    foundDescription: draft.foundDetails.description.trim(),
    pet: {
      breed: draft.pet.breed.trim(),
      description: draft.pet.description.trim(),
      type: draft.pet.type,
    },
    photos: draft.photos.map(toPublishPhoto),
    showExactPublicLocation: draft.showExactPinPublicly,
  };
}

function validateFoundReportDraft(draft: FoundReportDraft) {
  const errors: string[] = [];

  if (draft.photos.length === 0) {
    errors.push("Agrega al menos una foto.");
  }

  if (!draft.exactFoundLocation) {
    errors.push("Selecciona donde fue encontrada.");
  }

  if (draft.foundDetails.foundAtLabel.trim().length === 0) {
    errors.push("Indica cuando fue encontrada.");
  }

  if (draft.foundDetails.condition.trim().length === 0) {
    errors.push("Describe la condicion de la mascota encontrada.");
  }

  if (draft.foundDetails.description.trim().length === 0) {
    errors.push("Agrega una descripcion de la mascota encontrada.");
  }

  if (draft.pet.description.trim().length === 0) {
    errors.push("Agrega senas visibles de la mascota encontrada.");
  }

  if (!draft.contact.inAppChatEnabled && !draft.contact.whatsappEnabled) {
    errors.push("Elige chat, WhatsApp o ambos.");
  }

  if (
    draft.contact.whatsappEnabled &&
    draft.contact.whatsappPhone.trim().length === 0
  ) {
    errors.push("Ingresa un numero de WhatsApp.");
  }

  return errors;
}

function getContactOption(contact: FoundReportContactDraft) {
  if (contact.inAppChatEnabled && contact.whatsappEnabled) {
    return "both";
  }

  if (contact.whatsappEnabled) {
    return "whatsapp";
  }

  return "chat";
}

function getContactError(contact: FoundReportContactDraft) {
  if (!contact.inAppChatEnabled && !contact.whatsappEnabled) {
    return "Elige chat, WhatsApp o ambos.";
  }

  if (contact.whatsappEnabled && contact.whatsappPhone.trim().length === 0) {
    return "Ingresa un numero para WhatsApp.";
  }

  return undefined;
}

function buildContactOptions(currentOption: FoundReportContactOption) {
  return [
    {
      body: "Conversaciones dentro de Rastro con notificaciones.",
      iconName: "message.fill",
      isSelected: currentOption === "chat",
      label: "Chat en Rastro",
      value: "chat" as const,
    },
    {
      body: "Muestra el numero que elijas para coordinar la devolucion.",
      iconName: "phone.fill",
      isSelected: currentOption === "whatsapp",
      label: "WhatsApp",
      value: "whatsapp" as const,
    },
    {
      body: "Permite chat en la app y WhatsApp en el mismo reporte.",
      iconName: "bubble.left.and.phone.fill",
      isSelected: currentOption === "both",
      label: "Ambos",
      value: "both" as const,
    },
  ];
}

function buildPetViewModel(draft: FoundReportDraft) {
  return {
    fields: {
      breed: {
        label: "Raza o descripcion corta",
        placeholder: "Mestizo, Husky mix, gato naranja...",
        value: draft.pet.breed,
      },
      description: {
        error:
          draft.pet.description.trim().length === 0
            ? "Agrega senas visibles de la mascota encontrada."
            : undefined,
        label: "Senas visibles",
        placeholder: "Color, tamano, collar, marcas o comportamiento",
        value: draft.pet.description,
      },
    },
    title: "Mascota encontrada",
    typeOptions: foundReportPetTypeOptions.map((option) => ({
      isSelected: draft.pet.type === option,
      label: option,
      value: option,
    })),
  };
}

function buildLocationViewModel(draft: FoundReportDraft) {
  const location = draft.exactFoundLocation;
  const exactInternalLabel = location
    ? `${location.addressLabel} · ${location.municipality}, ${location.department}`
    : "Selecciona el punto donde fue encontrada.";
  const approximatePublicLabel = location
    ? location.locationCellLabel
    : "Zona aproximada pendiente";

  return {
    approximatePublicLabel,
    exactInternalLabel,
    exactPinOptInLabel: "Mostrar pin exacto publicamente",
    hasExactLocation: Boolean(location),
    mapPreviewLabel: location
      ? `Punto interno en ${location.locationCellLabel}`
      : "Mapa de Bolivia pendiente",
    publicPrecisionLabel: draft.showExactPinPublicly
      ? "Pin exacto publico"
      : "Zona aproximada por defecto",
    showExactPinPublicly: draft.showExactPinPublicly,
    toggleBody:
      "Por defecto mostramos solo la zona aproximada. Activa el punto exacto solo si es seguro para ti y para la mascota.",
    toggleLabel: "Mostrar pin exacto publicamente",
  };
}

function buildReviewRows({
  contactOption,
  draft,
}: {
  contactOption: FoundReportContactOption;
  draft: FoundReportDraft;
}) {
  return [
    {
      label: "Mascota",
      value: formatPetSnapshotLabel(draft),
    },
    {
      label: "Fotos",
      value: formatPhotoCount(draft.photos.length),
    },
    {
      label: "Encontrada",
      value: draft.foundDetails.foundAtLabel || "Pendiente",
    },
    {
      label: "Ubicacion interna",
      value: draft.exactFoundLocation?.addressLabel ?? "Pendiente",
    },
    {
      label: "Ubicacion publica",
      value: draft.showExactPinPublicly
        ? "Punto exacto publico"
        : "Zona aproximada publica",
    },
    {
      label: "Contacto",
      value: contactOptionLabel(contactOption),
    },
  ];
}

function buildSteps({
  canPublish,
  draft,
}: {
  canPublish: boolean;
  draft: FoundReportDraft;
}) {
  return [
    {
      id: "details" as const,
      isComplete:
        draft.foundDetails.foundAtLabel.trim().length > 0 &&
        draft.foundDetails.condition.trim().length > 0 &&
        draft.foundDetails.description.trim().length > 0 &&
        draft.photos.length > 0,
      label: "Detalles",
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactFoundLocation),
      label: "Ubicacion",
    },
    {
      id: "contact" as const,
      isComplete: !getContactError(draft.contact),
      label: "Contacto",
    },
    {
      id: "review" as const,
      isComplete: canPublish,
      label: "Revisar",
    },
    {
      id: "success" as const,
      isComplete: false,
      label: "Publicado",
    },
  ];
}

function contactOptionLabel(option: FoundReportContactOption) {
  switch (option) {
    case "both":
      return "Chat y WhatsApp";
    case "chat":
      return "Chat en Rastro";
    case "whatsapp":
      return "WhatsApp";
  }
}

function formatPhotoCount(count: number) {
  return `${Math.min(count, foundReportPhotoLimit)}/${foundReportPhotoLimit}`;
}

function formatPetSnapshotLabel(draft: FoundReportDraft) {
  const breed = draft.pet.breed.trim();

  return breed ? `${draft.pet.type} · ${breed}` : draft.pet.type;
}

function toPublishContactOption({
  option,
  whatsappPhone,
}: {
  option: FoundReportContactOption;
  whatsappPhone: string;
}): PublishFoundReportContactOption {
  switch (option) {
    case "both":
      return {
        kind: "both",
        phoneNumber: whatsappPhone,
      };
    case "chat":
      return {
        kind: "in-app-chat",
      };
    case "whatsapp":
      return {
        kind: "whatsapp",
        phoneNumber: whatsappPhone,
      };
  }
}

function toPublishPhoto(photo: FoundReportPhoto) {
  return {
    id: photo.id,
    uri: photo.uri ?? photo.thumbUri ?? `file:///${photo.id}.jpg`,
  };
}
