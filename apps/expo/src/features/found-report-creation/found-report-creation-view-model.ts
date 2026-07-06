import type {
  ReportCreationJourney,
  ReportCreationJourneyStepId,
} from "../report-creation/report-creation-journey";
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
import {
  normalizeReportCreationEventTime,
  reportCreationEventTimeValidationError,
} from "../report-creation/report-creation-event-time";
import {
  createReportCreationJourney,
  deriveReportCreationJourney,
} from "../report-creation/report-creation-journey";
import {
  appendReportCreationLocationErrors,
  appendRequiredReportCreationPhotoUploadErrors,
  getReadyUploadedReportCreationPhotos,
  getRequiredReportCreationPhotoStepError,
} from "../report-creation/report-creation-media-validation";
import { getReportCreationMinimumDescriptionError } from "../report-creation/report-creation-text-validation";
import { buildReportCreationContactViewModel } from "../report-creation/report-creation-view-model";
import { toReportLocationPublishInput } from "../report-creation/report-location-draft";
import { foundReportPetTypeOptions } from "./found-report-creation-types";

const foundReportPhotoLimit = 5;

export interface FoundReportCreationViewModel {
  canPublish: boolean;
  journey: ReportCreationJourney;
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

export interface FoundReportCreationJourneyInput {
  completedStepIds?: readonly ReportCreationJourneyStepId[];
  currentStepId?: ReportCreationJourneyStepId;
}

export interface FoundReportCreationValidationDisplayInput {
  attemptedStepId?: ReportCreationJourneyStepId;
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
    idempotencyKey: createFoundReportDraftIdempotencyKey(),
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

function createFoundReportDraftIdempotencyKey() {
  return `found-report-${createReportCreationIdSuffix()}`;
}

function createReportCreationIdSuffix() {
  const crypto = globalThis.crypto as
    | {
        randomUUID?: () => string;
      }
    | undefined;

  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function buildFoundReportCreationViewModel({
  draft,
  journey,
  session,
  validationDisplay,
}: {
  draft: FoundReportDraft;
  journey?: FoundReportCreationJourneyInput;
  session?: FoundReportCreationSession;
  validationDisplay?: FoundReportCreationValidationDisplayInput;
}): FoundReportCreationViewModel {
  const validationErrors = validateFoundReportDraft(draft);
  const readyPhotos = getReadyUploadedPhotos(draft.photos);
  const contactOption = getContactOption(draft.contact);
  const canPublish = validationErrors.length === 0;
  const showContactValidation = shouldShowValidationError(
    validationDisplay,
    "contact",
  );
  const showDetailsValidation = shouldShowValidationError(
    validationDisplay,
    "details",
  );
  const foundAtError = getFoundAtError(draft.foundDetails.foundAtLabel);

  return {
    canPublish,
    journey: buildFoundReportJourney({
      draft,
      journey,
      readyPhotos,
    }),
    contact: buildFoundContactViewModel({
      contact: draft.contact,
      currentOption: contactOption,
      options: buildContactOptions(contactOption),
      showValidation: showContactValidation,
    }),
    header: {
      eyebrow: "Mascota encontrada",
    },
    foundDetails: {
      fields: {
        condition: {
          error:
            showDetailsValidation &&
            draft.foundDetails.condition.trim().length === 0
              ? "Describe la condicion de la mascota encontrada."
              : undefined,
          label: "Condicion",
          placeholder: "Ej. tranquila, asustada, con collar, necesita ayuda",
          value: draft.foundDetails.condition,
        },
        description: {
          error: showDetailsValidation
            ? getFoundDescriptionError(draft.foundDetails.description)
            : undefined,
          label: "Descripcion",
          placeholder:
            "Color, tamano, marcas visibles y donde la tienes segura",
          value: draft.foundDetails.description,
        },
        foundAtLabel: {
          error: showDetailsValidation ? foundAtError : undefined,
          label: "Cuando la encontraste",
          placeholder: "Selecciona cuando la encontraste",
          value: draft.foundDetails.foundAtLabel,
        },
      },
      title: "Detalles de la encontrada",
    },
    kind: session?.kind ?? "member",
    location: buildLocationViewModel(draft),
    pet: buildPetViewModel(draft, showDetailsValidation),
    photos: {
      canAddPhoto: draft.photos.length < foundReportPhotoLimit,
      countLabel: formatPhotoCount(draft.photos.length),
      error: shouldShowValidationError(validationDisplay, "photos")
        ? getPhotoStepError(draft.photos)
        : undefined,
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
        photos: readyPhotos,
      }),
      validationErrors: shouldShowValidationError(validationDisplay, "review")
        ? validationErrors
        : [],
    },
    steps: buildSteps({
      canPublish,
      draft,
      readyPhotos,
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
  const readyPhotos = getReadyUploadedPhotos(draft.photos);
  const foundAt = normalizeReportCreationEventTime(
    draft.foundDetails.foundAtLabel,
  );

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  if (!foundAt) {
    throw new Error(reportCreationEventTimeValidationError);
  }

  if (!draft.exactFoundLocation) {
    throw new Error("Exact Found Location is required.");
  }

  return {
    condition: draft.foundDetails.condition.trim(),
    contactOption: toPublishContactOption({
      option: getContactOption(draft.contact),
      whatsappPhone: draft.contact.whatsappPhone.trim(),
    }),
    exactLocation: toReportLocationPublishInput(draft.exactFoundLocation),
    foundAt,
    foundDescription: draft.foundDetails.description.trim(),
    idempotencyKey: draft.idempotencyKey,
    pet: {
      breed: draft.pet.breed.trim(),
      description: draft.pet.description.trim(),
      type: draft.pet.type,
    },
    photos: readyPhotos.map(toPublishPhoto),
    showExactPublicLocation: draft.showExactPinPublicly,
  };
}

function validateFoundReportDraft(draft: FoundReportDraft) {
  const errors: string[] = [];

  appendRequiredReportCreationPhotoUploadErrors({
    errors,
    photos: draft.photos,
  });
  appendReportCreationLocationErrors({
    errors,
    location: draft.exactFoundLocation,
    missingMessage: "Selecciona donde fue encontrada.",
  });

  const foundAtError = getFoundAtError(draft.foundDetails.foundAtLabel);
  if (foundAtError) {
    errors.push(foundAtError);
  }

  if (draft.foundDetails.condition.trim().length === 0) {
    errors.push("Describe la condicion de la mascota encontrada.");
  }

  const foundDescriptionError = getFoundDescriptionError(
    draft.foundDetails.description,
  );
  if (foundDescriptionError) {
    errors.push(foundDescriptionError);
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
    errors.push("Ingresa un número de WhatsApp.");
  }

  return errors;
}

function getFoundAtError(value: string) {
  if (value.trim().length === 0) {
    return "Indica cuando fue encontrada.";
  }

  if (!normalizeReportCreationEventTime(value)) {
    return reportCreationEventTimeValidationError;
  }

  return undefined;
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
    return "Ingresa un número para WhatsApp.";
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
      body: "Muestra el número que elijas para coordinar la devolución.",
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

function buildPetViewModel(draft: FoundReportDraft, showValidation = true) {
  return {
    fields: {
      breed: {
        label: "Raza o descripcion corta",
        placeholder: "Mestizo, Husky mix, gato naranja...",
        value: draft.pet.breed,
      },
      description: {
        error:
          showValidation && draft.pet.description.trim().length === 0
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
    ? `${location.locationCellLabel} · zona de 300 m`
    : "Elige una ubicacion para calcular la zona.";

  return {
    approximatePublicLabel,
    exactInternalLabel,
    exactPinOptInLabel: "Mostrar pin exacto públicamente",
    hasExactLocation: Boolean(location),
    mapPreviewLabel: location
      ? `${location.locationCellLabel}, Bolivia`
      : "Bolivia - elige una ubicacion",
    publicPrecisionLabel: draft.showExactPinPublicly
      ? "Pin exacto publico"
      : "Zona aproximada de 300 m",
    showExactPinPublicly: draft.showExactPinPublicly,
    toggleBody:
      "Por defecto mostramos una zona de 300 m alrededor del pin. Activa el punto exacto solo si es seguro para ti y para la mascota.",
    toggleLabel: "Mostrar pin exacto públicamente",
  };
}

function buildReviewRows({
  contactOption,
  draft,
  photos,
}: {
  contactOption: FoundReportContactOption;
  draft: FoundReportDraft;
  photos: readonly FoundReportPhoto[];
}) {
  return [
    {
      label: "Mascota",
      value: formatPetSnapshotLabel(draft),
    },
    {
      label: "Fotos",
      value: formatPhotoCount(photos.length),
    },
    {
      label: "Encontrada",
      value: draft.foundDetails.foundAtLabel || "Pendiente",
    },
    {
      label: "Ubicación interna",
      value: draft.exactFoundLocation?.addressLabel ?? "Pendiente",
    },
    {
      label: "Ubicación pública",
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
  readyPhotos,
}: {
  canPublish: boolean;
  draft: FoundReportDraft;
  readyPhotos: readonly FoundReportPhoto[];
}) {
  return [
    {
      id: "details" as const,
      isComplete:
        !getFoundAtError(draft.foundDetails.foundAtLabel) &&
        draft.foundDetails.condition.trim().length > 0 &&
        !getFoundDescriptionError(draft.foundDetails.description) &&
        readyPhotos.length > 0,
      label: "Detalles",
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactFoundLocation),
      label: "Ubicación",
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

function buildFoundReportJourney({
  draft,
  journey,
  readyPhotos,
}: {
  draft: FoundReportDraft;
  journey?: FoundReportCreationJourneyInput;
  readyPhotos: readonly FoundReportPhoto[];
}) {
  if (journey?.currentStepId) {
    return createReportCreationJourney({
      completedStepIds: journey.completedStepIds,
      currentStepId: journey.currentStepId,
      reportType: "found",
    });
  }

  const stepCompletion = [
    {
      id: "chooseType" as const,
      isComplete: true,
    },
    {
      id: "photos" as const,
      isComplete:
        draft.photos.length > 0 && readyPhotos.length === draft.photos.length,
    },
    {
      id: "details" as const,
      isComplete:
        !getFoundAtError(draft.foundDetails.foundAtLabel) &&
        draft.foundDetails.condition.trim().length > 0 &&
        !getFoundDescriptionError(draft.foundDetails.description) &&
        draft.pet.description.trim().length > 0,
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactFoundLocation),
    },
    {
      id: "contact" as const,
      isComplete: !getContactError(draft.contact),
    },
  ];
  return deriveReportCreationJourney({
    currentStepIdWhenComplete: "review",
    reportType: "found",
    stepCompletion,
  });
}

function buildFoundContactViewModel({
  contact,
  currentOption,
  options,
  showValidation,
}: {
  contact: FoundReportContactDraft;
  currentOption: FoundReportContactOption;
  options: ReturnType<typeof buildContactOptions>;
  showValidation: boolean;
}) {
  const contactViewModel = buildReportCreationContactViewModel({
    contact,
    currentOption,
    error: showValidation ? getContactError(contact) : undefined,
    options,
  });

  return {
    ...contactViewModel,
    whatsappField: {
      ...contactViewModel.whatsappField,
      error: showValidation ? contactViewModel.whatsappField.error : undefined,
    },
  };
}

function shouldShowValidationError(
  validationDisplay: FoundReportCreationValidationDisplayInput | undefined,
  stepId: ReportCreationJourneyStepId,
) {
  return (
    validationDisplay === undefined ||
    validationDisplay.attemptedStepId === stepId
  );
}

function getFoundDescriptionError(value: string) {
  return getReportCreationMinimumDescriptionError({
    emptyMessage: "Agrega una descripcion de la mascota encontrada.",
    shortMessage: "Escribe una descripcion de al menos 10 caracteres.",
    value,
  });
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

function getReadyUploadedPhotos(photos: readonly FoundReportPhoto[]) {
  return getReadyUploadedReportCreationPhotos(photos);
}

function getPhotoStepError(photos: readonly FoundReportPhoto[]) {
  return getRequiredReportCreationPhotoStepError(photos);
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
    id: photo.mediaId ?? photo.id,
    uri: photo.uri ?? photo.thumbUri ?? `file:///${photo.id}.jpg`,
  };
}
