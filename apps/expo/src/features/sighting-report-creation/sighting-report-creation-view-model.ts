import type {
  ReportCreationJourney,
  ReportCreationJourneyStepId,
} from "../report-creation/report-creation-journey";
import type {
  PublishSightingReportInput,
  SightingReportContactDraft,
  SightingReportContactOption,
  SightingReportCreationSession,
  SightingReportCreationVisitorAction,
  SightingReportDraft,
  SightingReportPhoto,
} from "./sighting-report-creation-types";
import {
  createReportCreationJourney,
  deriveReportCreationJourney,
} from "../report-creation/report-creation-journey";
import {
  appendReportCreationLocationErrors,
  getOptionalReportCreationPhotoStepError,
  getReadyUploadedReportCreationPhotos,
} from "../report-creation/report-creation-media-validation";
import { getReportCreationMinimumDescriptionError } from "../report-creation/report-creation-text-validation";
import { buildReportCreationContactViewModel } from "../report-creation/report-creation-view-model";
import { toReportLocationPublishInput } from "../report-creation/report-location-draft";
import { sightingReportPetTypeOptions } from "./sighting-report-creation-types";

const sightingReportPhotoLimit = 5;
const sightingObservedAtIsoError = "Selecciona una fecha y hora valida.";

export interface SightingReportCreationViewModel {
  canPublish: boolean;
  journey: ReportCreationJourney;
  contact: {
    currentOption: SightingReportContactOption;
    error?: string;
    options: {
      body: string;
      iconName: string;
      isSelected: boolean;
      label: string;
      value: SightingReportContactOption;
    }[];
    whatsappField: SightingReportFieldViewModel & {
      visible: boolean;
    };
  };
  header: {
    eyebrow: string;
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
      breed: SightingReportFieldViewModel;
      description: SightingReportFieldViewModel;
    };
    title: string;
    typeOptions: {
      isSelected: boolean;
      label: SightingReportDraft["pet"]["type"];
      value: SightingReportDraft["pet"]["type"];
    }[];
  };
  photos: {
    canAddPhoto: boolean;
    countLabel: string;
    error?: string;
    helpLabel: string;
    items: SightingReportPhoto[];
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
  sightingDetails: {
    fields: {
      description: SightingReportFieldViewModel;
      direction: SightingReportFieldViewModel;
      observedAtLabel: SightingReportFieldViewModel;
      observedCondition: SightingReportFieldViewModel;
    };
    title: string;
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
  visitorAction?: SightingReportCreationVisitorAction;
}

export interface SightingReportFieldViewModel {
  error?: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface SightingReportCreationJourneyInput {
  completedStepIds?: readonly ReportCreationJourneyStepId[];
  currentStepId?: ReportCreationJourneyStepId;
}

export interface SightingReportCreationValidationDisplayInput {
  attemptedStepId?: ReportCreationJourneyStepId;
}

export function createSightingReportDraft(
  overrides: Partial<SightingReportDraft> = {},
): SightingReportDraft {
  const base: SightingReportDraft = {
    contact: {
      inAppChatEnabled: true,
      whatsappEnabled: false,
      whatsappPhone: "",
    },
    idempotencyKey: createSightingReportDraftIdempotencyKey(),
    pet: {
      breed: "",
      description: "",
      type: "Perro",
    },
    photos: [],
    showExactPinPublicly: false,
    sightingDetails: {
      description: "",
      direction: "",
      observedAtLabel: "",
      observedCondition: "",
    },
  };

  return {
    ...base,
    ...overrides,
    contact: {
      ...base.contact,
      ...overrides.contact,
    },
    pet: {
      ...base.pet,
      ...overrides.pet,
    },
    sightingDetails: {
      ...base.sightingDetails,
      ...overrides.sightingDetails,
    },
  };
}

export function ensureSightingReportDraftIdempotencyKey({
  createIdempotencyKey = createSightingReportDraftIdempotencyKey,
  draft,
}: {
  createIdempotencyKey?: () => string;
  draft: SightingReportDraft;
}): SightingReportDraft {
  if (draft.idempotencyKey) {
    return draft;
  }

  return {
    ...draft,
    idempotencyKey: createIdempotencyKey(),
  };
}

export function buildSightingReportCreationViewModel({
  draft,
  journey,
  session,
  validationDisplay,
}: {
  draft: SightingReportDraft;
  journey?: SightingReportCreationJourneyInput;
  session?: SightingReportCreationSession;
  validationDisplay?: SightingReportCreationValidationDisplayInput;
}): SightingReportCreationViewModel {
  const validationErrors = validateSightingReportDraft(draft);
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

  return {
    canPublish,
    journey: buildSightingReportJourney({
      draft,
      journey,
    }),
    contact: buildSightingContactViewModel({
      contact: draft.contact,
      currentOption: contactOption,
      options: buildContactOptions(contactOption),
      showValidation: showContactValidation,
    }),
    header: {
      eyebrow: "Avistamiento de mascota",
    },
    kind: session?.kind ?? "member",
    location: buildLocationViewModel(draft),
    pet: buildPetViewModel(draft, showDetailsValidation),
    photos: {
      canAddPhoto: draft.photos.length < sightingReportPhotoLimit,
      countLabel: formatPhotoCount(draft.photos.length),
      error: shouldShowValidationError(validationDisplay, "photos")
        ? getPhotoStepError(draft.photos)
        : undefined,
      helpLabel:
        "La foto es opcional. Si agregas una, prioriza senas visibles sin acercarte ni retener a la mascota.",
      items: draft.photos.slice(0, sightingReportPhotoLimit),
      permissionBody:
        "Te pediremos acceso solo si eliges agregar fotos de este avistamiento.",
      permissionTitle: "Foto opcional",
    },
    review: {
      publishActionLabel: canPublish
        ? "Publicar avistamiento"
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
    sightingDetails: buildSightingDetailsViewModel(
      draft,
      showDetailsValidation,
    ),
    steps: buildSteps({
      canPublish,
      draft,
    }),
    success: {
      body: "Tu reporte de avistamiento queda listo para que otros cuidadores entiendan cuando, donde y hacia donde se movia la mascota.",
      primaryActionLabel: "Ver avistamiento",
      shareActionLabel: "Compartir",
      title: "Avistamiento publicado",
    },
    title: "Reportar avistamiento",
    visitorAction:
      session?.kind === "visitor"
        ? {
            intent: "sighting-report",
            label: "Iniciar sesion para reportar avistamiento",
          }
        : undefined,
  };
}

export function appendSightingReportPhoto({
  draft,
  photo,
}: {
  draft: SightingReportDraft;
  photo: SightingReportPhoto;
}): SightingReportDraft {
  if (draft.photos.length >= sightingReportPhotoLimit) {
    return draft;
  }

  return {
    ...draft,
    photos: [...draft.photos, photo].slice(0, sightingReportPhotoLimit),
  };
}

export function removeSightingReportPhoto({
  draft,
  photoId,
}: {
  draft: SightingReportDraft;
  photoId: string;
}): SightingReportDraft {
  return {
    ...draft,
    photos: draft.photos.filter((photo) => photo.id !== photoId),
  };
}

export function selectSightingReportContactOption({
  draft,
  option,
}: {
  draft: SightingReportDraft;
  option: SightingReportContactOption;
}): SightingReportDraft {
  return {
    ...draft,
    contact: {
      ...draft.contact,
      inAppChatEnabled: option === "chat" || option === "both",
      whatsappEnabled: option === "whatsapp" || option === "both",
    },
  };
}

export function toPublishSightingReportInput({
  draft,
}: {
  draft: SightingReportDraft;
}): PublishSightingReportInput {
  const errors = validateSightingReportDraft(draft);
  const readyPhotos = getReadyUploadedPhotos(draft.photos);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  if (!draft.exactSightingLocation) {
    throw new Error("Exact Sighting Location is required.");
  }

  return {
    contactOption: toPublishContactOption({
      option: getContactOption(draft.contact),
      whatsappPhone: draft.contact.whatsappPhone.trim(),
    }),
    direction: draft.sightingDetails.direction.trim(),
    exactLocation: toReportLocationPublishInput(draft.exactSightingLocation),
    idempotencyKey: draft.idempotencyKey,
    observedAt: draft.sightingDetails.observedAtLabel.trim(),
    observedCondition: draft.sightingDetails.observedCondition.trim(),
    pet: {
      breed: draft.pet.breed.trim(),
      description: draft.pet.description.trim(),
      type: draft.pet.type,
    },
    photos: readyPhotos.map(toPublishPhoto),
    showExactPublicLocation: draft.showExactPinPublicly,
    sightingDescription: draft.sightingDetails.description.trim(),
  };
}

function createSightingReportDraftIdempotencyKey() {
  return `sighting-report-${createReportCreationIdSuffix()}`;
}

function createReportCreationIdSuffix() {
  const crypto = globalThis.crypto as
    | {
        randomUUID?: () => string;
      }
    | undefined;
  const randomUUID =
    typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : undefined;
  const uniqueValue =
    randomUUID ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return uniqueValue;
}

function validateSightingReportDraft(draft: SightingReportDraft) {
  const errors: string[] = [];

  appendReportCreationLocationErrors({
    errors,
    location: draft.exactSightingLocation,
    missingMessage: "Selecciona donde fue visto el animal.",
  });

  const observedAtError = getObservedAtError(
    draft.sightingDetails.observedAtLabel,
  );
  if (observedAtError) {
    errors.push(observedAtError);
  }

  if (draft.sightingDetails.observedCondition.trim().length === 0) {
    errors.push("Describe la condicion observada.");
  }

  if (draft.sightingDetails.direction.trim().length === 0) {
    errors.push("Indica hacia donde iba.");
  }

  const sightingDescriptionError = getSightingDescriptionError(
    draft.sightingDetails.description,
  );
  if (sightingDescriptionError) {
    errors.push(sightingDescriptionError);
  }

  if (draft.pet.description.trim().length === 0) {
    errors.push("Agrega senas visibles de la mascota vista.");
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

function buildSightingDetailsViewModel(
  draft: SightingReportDraft,
  showValidation = true,
) {
  return {
    fields: {
      description: {
        error: showValidation
          ? getSightingDescriptionError(draft.sightingDetails.description)
          : undefined,
        label: "Descripcion del avistamiento",
        placeholder:
          "Que viste, desde donde, si se dejaba acercar o si habia riesgos",
        value: draft.sightingDetails.description,
      },
      direction: {
        error:
          showValidation && draft.sightingDetails.direction.trim().length === 0
            ? "Indica hacia donde iba."
            : undefined,
        label: "Direccion",
        placeholder: "Ej. hacia la avenida, subiendo la calle, rumbo al parque",
        value: draft.sightingDetails.direction,
      },
      observedAtLabel: {
        error: showValidation
          ? getObservedAtError(draft.sightingDetails.observedAtLabel)
          : undefined,
        label: "Cuando la viste",
        placeholder: "Selecciona cuando la viste",
        value: draft.sightingDetails.observedAtLabel,
      },
      observedCondition: {
        error:
          showValidation &&
          draft.sightingDetails.observedCondition.trim().length === 0
            ? "Describe la condicion observada."
            : undefined,
        label: "Condicion observada",
        placeholder: "Ej. asustada, cojeando, con collar, cruzando calles",
        value: draft.sightingDetails.observedCondition,
      },
    },
    title: "Detalles del avistamiento",
  };
}

function buildPetViewModel(draft: SightingReportDraft, showValidation = true) {
  return {
    fields: {
      breed: {
        label: "Raza o descripcion corta",
        placeholder: "Mestizo, gato naranja, cachorro negro...",
        value: draft.pet.breed,
      },
      description: {
        error:
          showValidation && draft.pet.description.trim().length === 0
            ? "Agrega senas visibles de la mascota vista."
            : undefined,
        label: "Senas visibles",
        placeholder: "Color, tamano, collar, marcas o comportamiento",
        value: draft.pet.description,
      },
    },
    title: "Mascota vista",
    typeOptions: sightingReportPetTypeOptions.map((option) => ({
      isSelected: draft.pet.type === option,
      label: option,
      value: option,
    })),
  };
}

function buildLocationViewModel(draft: SightingReportDraft) {
  const location = draft.exactSightingLocation;
  const exactInternalLabel = location
    ? `${location.addressLabel} - ${location.municipality}, ${location.department}`
    : "Selecciona el punto donde fue vista.";
  const approximatePublicLabel = location
    ? `${location.locationCellLabel} · zona de 300 m`
    : "Elige una ubicacion para calcular la zona.";

  return {
    approximatePublicLabel,
    exactInternalLabel,
    exactPinOptInLabel: "Mostrar pin exacto publicamente",
    hasExactLocation: Boolean(location),
    mapPreviewLabel: location
      ? `${location.locationCellLabel}, Bolivia`
      : "Bolivia - elige una ubicacion",
    publicPrecisionLabel: draft.showExactPinPublicly
      ? "Pin exacto publico"
      : "Zona aproximada de 300 m",
    showExactPinPublicly: draft.showExactPinPublicly,
    toggleBody:
      "Por defecto mostramos una zona de 300 m alrededor del pin. Activa el punto exacto solo si no expone a la mascota ni a quien reporta.",
    toggleLabel: "Mostrar pin exacto publicamente",
  };
}

function buildReviewRows({
  contactOption,
  draft,
  photos,
}: {
  contactOption: SightingReportContactOption;
  draft: SightingReportDraft;
  photos: readonly SightingReportPhoto[];
}) {
  return [
    {
      label: "Mascota vista",
      value: formatPetSnapshotLabel(draft),
    },
    {
      label: "Fotos",
      value:
        photos.length === 0
          ? "Sin foto, datos completos"
          : formatPhotoCount(photos.length),
    },
    {
      label: "Vista",
      value: draft.sightingDetails.observedAtLabel || "Pendiente",
    },
    {
      label: "Direccion",
      value: draft.sightingDetails.direction || "Pendiente",
    },
    {
      label: "Ubicacion interna",
      value: draft.exactSightingLocation?.addressLabel ?? "Pendiente",
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
  draft: SightingReportDraft;
}) {
  return [
    {
      id: "details" as const,
      isComplete:
        !getObservedAtError(draft.sightingDetails.observedAtLabel) &&
        draft.sightingDetails.observedCondition.trim().length > 0 &&
        draft.sightingDetails.direction.trim().length > 0 &&
        !getSightingDescriptionError(draft.sightingDetails.description) &&
        draft.pet.description.trim().length > 0,
      label: "Detalles",
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactSightingLocation),
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

function buildSightingReportJourney({
  draft,
  journey,
}: {
  draft: SightingReportDraft;
  journey?: SightingReportCreationJourneyInput;
}) {
  if (journey?.currentStepId) {
    return createReportCreationJourney({
      completedStepIds: journey.completedStepIds,
      currentStepId: journey.currentStepId,
      reportType: "sighting",
    });
  }

  const stepCompletion = [
    {
      id: "chooseType" as const,
      isComplete: true,
    },
    {
      id: "photos" as const,
      isComplete: true,
    },
    {
      id: "details" as const,
      isComplete:
        !getObservedAtError(draft.sightingDetails.observedAtLabel) &&
        draft.sightingDetails.observedCondition.trim().length > 0 &&
        draft.sightingDetails.direction.trim().length > 0 &&
        !getSightingDescriptionError(draft.sightingDetails.description) &&
        draft.pet.description.trim().length > 0,
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactSightingLocation),
    },
    {
      id: "contact" as const,
      isComplete: !getContactError(draft.contact),
    },
  ];
  return deriveReportCreationJourney({
    currentStepIdWhenComplete: "review",
    reportType: "sighting",
    stepCompletion,
  });
}

function buildSightingContactViewModel({
  contact,
  currentOption,
  options,
  showValidation,
}: {
  contact: SightingReportContactDraft;
  currentOption: SightingReportContactOption;
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
  validationDisplay: SightingReportCreationValidationDisplayInput | undefined,
  stepId: ReportCreationJourneyStepId,
) {
  return (
    validationDisplay === undefined ||
    validationDisplay.attemptedStepId === stepId
  );
}

function getContactOption(contact: SightingReportContactDraft) {
  if (contact.inAppChatEnabled && contact.whatsappEnabled) {
    return "both";
  }

  if (contact.whatsappEnabled) {
    return "whatsapp";
  }

  return "chat";
}

function getContactError(contact: SightingReportContactDraft) {
  if (!contact.inAppChatEnabled && !contact.whatsappEnabled) {
    return "Elige chat, WhatsApp o ambos.";
  }

  if (contact.whatsappEnabled && contact.whatsappPhone.trim().length === 0) {
    return "Ingresa un numero para WhatsApp.";
  }

  return undefined;
}

function getObservedAtError(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return "Indica cuando fue visto.";
  }

  if (!isIsoDateTime(trimmed)) {
    return sightingObservedAtIsoError;
  }

  return undefined;
}

function isIsoDateTime(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) && Number.isFinite(Date.parse(value))
  );
}

function buildContactOptions(currentOption: SightingReportContactOption) {
  return [
    {
      body: "Conversaciones dentro de Rastro con notificaciones.",
      iconName: "message.fill",
      isSelected: currentOption === "chat",
      label: "Chat en Rastro",
      value: "chat" as const,
    },
    {
      body: "Muestra el numero que elijas para coordinar informacion.",
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

function getSightingDescriptionError(value: string) {
  return getReportCreationMinimumDescriptionError({
    emptyMessage: "Agrega una descripcion del avistamiento.",
    shortMessage: "Escribe una descripcion de al menos 10 caracteres.",
    value,
  });
}

function contactOptionLabel(option: SightingReportContactOption) {
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
  return `${Math.min(count, sightingReportPhotoLimit)}/${sightingReportPhotoLimit}`;
}

function getReadyUploadedPhotos(photos: readonly SightingReportPhoto[]) {
  return getReadyUploadedReportCreationPhotos(photos);
}

function getPhotoStepError(photos: readonly SightingReportPhoto[]) {
  return getOptionalReportCreationPhotoStepError(photos);
}

function formatPetSnapshotLabel(draft: SightingReportDraft) {
  const breed = draft.pet.breed.trim();

  return breed ? `${draft.pet.type} - ${breed}` : draft.pet.type;
}

function toPublishContactOption({
  option,
  whatsappPhone,
}: {
  option: SightingReportContactOption;
  whatsappPhone: string;
}): PublishSightingReportInput["contactOption"] {
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

function toPublishPhoto(photo: SightingReportPhoto) {
  return {
    id: photo.mediaId ?? photo.id,
    uri: photo.uri ?? photo.thumbUri ?? `file:///${photo.id}.jpg`,
  };
}
