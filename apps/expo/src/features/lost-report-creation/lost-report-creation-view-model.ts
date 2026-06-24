import type {
  LostPetReportContactOption as PublishLostPetReportContactOption,
  PublishLostPetReportInput,
} from "../lost-reports/lost-reports";
import type { PetProfileSummary } from "../pet-profiles/pet-profile-types";
import type { PetProfilePhotoSource } from "../pet-profiles/pet-profiles";
import type {
  ReportCreationJourney,
  ReportCreationJourneyStepId,
} from "../report-creation/report-creation-journey";
import type {
  LostReportContactDraft,
  LostReportContactOption,
  LostReportDraft,
  LostReportPetProfileOption,
  LostReportPetSelectionMode,
  LostReportPetType,
  LostReportPhoto,
  LostReportPublishPayload,
} from "./lost-report-creation-types";
import {
  createReportCreationJourney,
  deriveReportCreationJourney,
} from "../report-creation/report-creation-journey";
import {
  appendRequiredReportCreationDraftErrors,
  getReadyUploadedReportCreationPhotos,
  getRequiredReportCreationPhotoStepError,
} from "../report-creation/report-creation-media-validation";
import {
  normalizeReportCreationEventTime,
  reportCreationEventTimeValidationError,
} from "../report-creation/report-creation-event-time";
import {
  getReportCreationSelectedPet,
  getReportCreationSelectedProfile,
  hasValidReportCreationInlinePet,
} from "../report-creation/report-creation-pet-selection";
import { toReportLocationPublishInput } from "../report-creation/report-location-draft";
import { lostReportPetTypeOptions } from "./lost-report-creation-types";

export { lostReportPetTypeOptions };

const lostReportPhotoLimit = 5;

export interface LostReportCreationViewModel {
  canPublish: boolean;
  journey: ReportCreationJourney;
  kind: "member";
  contact: {
    currentOption: LostReportContactOption;
    error?: string;
    options: {
      body: string;
      iconName: string;
      isSelected: boolean;
      label: string;
      value: LostReportContactOption;
    }[];
    whatsappField: {
      error?: string;
      label: string;
      placeholder: string;
      value: string;
      visible: boolean;
    };
  };
  location: {
    approximatePublicLabel: string;
    exactPinOptInLabel: string;
    exactInternalLabel: string;
    hasExactLocation: boolean;
    mapPreviewLabel: string;
    publicPrecisionLabel: string;
    showExactPinPublicly: boolean;
    toggleBody: string;
    toggleLabel: string;
  };
  petProfile: {
    selectedLabel: string;
  };
  lostDetails: {
    fields: {
      circumstances: LostReportFieldViewModel;
      lastSeenAtLabel: LostReportFieldViewModel;
      markings: LostReportFieldViewModel;
    };
    title: string;
  };
  petSelection: {
    inlineForm: {
      fields: {
        breed: LostReportFieldViewModel;
        description: LostReportFieldViewModel;
        name: LostReportFieldViewModel;
      };
      modeLabel: string;
      typeOptions: {
        isSelected: boolean;
        label: LostReportPetType;
        value: LostReportPetType;
      }[];
    };
    mode: LostReportPetSelectionMode;
    options: {
      body: string;
      id: string;
      isSelected: boolean;
      photoCountLabel: string;
      thumbnailUri?: string;
      title: string;
    }[];
  };
  photos: {
    canAddPhoto: boolean;
    countLabel: string;
    error?: string;
    helpLabel: string;
    items: LostReportPhoto[];
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
  selectedPet?: {
    breedLabel?: string;
    description: string;
    id?: string;
    name: string;
    thumbnailUri?: string;
    typeLabel: LostReportPetType;
  };
  steps: {
    id: "details" | "location" | "contact" | "review" | "success";
    isComplete: boolean;
    label: string;
  }[];
  success: {
    body: string;
    localSponsorPlacement?: LostReportSuccessLocalSponsorPlacement;
    primaryActionLabel: string;
    shareActionLabel: string;
    title: string;
  };
  title: string;
}

export interface LostReportSuccessLocalSponsorPlacement {
  actionLabel: string;
  body: string;
  categoryLabel: string;
  id: string;
  name: string;
  paidDisclosure: string;
  recoveryPriorityDisclosure: string;
  reportActionLabel: string;
  sponsorLabel: string;
  title: string;
}

export interface LostReportFieldViewModel {
  error?: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface LostReportCreationJourneyInput {
  completedStepIds?: readonly ReportCreationJourneyStepId[];
  currentStepId?: ReportCreationJourneyStepId;
}

export interface LostReportCreationValidationDisplayInput {
  attemptedStepId?: ReportCreationJourneyStepId;
}

export function createLostReportDraft(
  overrides: Partial<LostReportDraft> = {},
): LostReportDraft {
  const base: LostReportDraft = {
    contact: {
      inAppChatEnabled: true,
      whatsappEnabled: false,
      whatsappPhone: "",
    },
    inlinePet: {
      breed: "",
      description: "",
      name: "",
      type: "",
    },
    lostDetails: {
      circumstances:
        "Se perdio cerca de la zona y puede estar asustada. Responde a su nombre.",
      lastSeenAtLabel: "Hoy, hace 30 min",
      markings: "Collar visible y senas faciles de reconocer.",
    },
    id: createLostReportDraftId(),
    petSelectionMode: "existing",
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
    inlinePet: {
      ...base.inlinePet,
      ...overrides.inlinePet,
    },
    lostDetails: {
      ...base.lostDetails,
      ...overrides.lostDetails,
    },
  };
}

function createLostReportDraftId() {
  return `lost-report-${createReportCreationIdSuffix()}`;
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

export function createInitialLostReportDraft({
  petProfiles,
}: {
  petProfiles: readonly (LostReportPetProfileOption | PetProfileSummary)[];
}): LostReportDraft {
  const firstProfile = petProfiles[0];

  return createLostReportDraft({
    petProfileId: firstProfile?.id,
    petSelectionMode: firstProfile ? "existing" : "inline-create",
  });
}

export function buildLostReportCreationViewModel({
  draft,
  journey,
  petProfiles,
  session: _session,
  validationDisplay,
}: {
  draft: LostReportDraft;
  journey?: LostReportCreationJourneyInput;
  petProfiles: readonly (LostReportPetProfileOption | PetProfileSummary)[];
  session?: unknown;
  validationDisplay?: LostReportCreationValidationDisplayInput;
}): LostReportCreationViewModel {
  const profileOptions = petProfiles.map(toLostReportPetProfileOption);
  const selectedProfile = getSelectedProfile(draft, profileOptions);
  const selectedPet = getSelectedPet(draft, selectedProfile);
  const effectivePhotos = getEffectivePhotos(draft, selectedProfile);
  const readyPhotos = getReadyUploadedPhotos(effectivePhotos);
  const validationErrors = validateLostReportDraft({
    draft,
    petProfiles,
  });
  const contactOption = getContactOption(draft.contact);
  const canPublish = validationErrors.length === 0;
  const journeyViewModel = buildLostReportJourney({
    draft,
    effectivePhotos,
    journey,
    readyPhotos,
    selectedPet,
  });
  const showContactValidation = shouldShowValidationError(
    validationDisplay,
    "contact",
  );
  const showDetailsValidation = shouldShowValidationError(
    validationDisplay,
    "details",
  );
  const lastSeenAtError = getLastSeenAtError(
    draft.lostDetails.lastSeenAtLabel,
  );

  return {
    canPublish,
    journey: journeyViewModel,
    kind: "member",
    contact: {
      currentOption: contactOption,
      error: showContactValidation ? getContactError(draft.contact) : undefined,
      options: buildContactOptions(contactOption),
      whatsappField: {
        error:
          showContactValidation &&
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
    location: buildLocationViewModel(draft),
    lostDetails: {
      fields: {
        circumstances: {
          error:
            showDetailsValidation &&
            draft.lostDetails.circumstances.trim().length === 0
              ? "Cuenta que paso."
              : undefined,
          label: "Que paso",
          placeholder: "Ej. salio por la puerta, se asusto por ruido...",
          value: draft.lostDetails.circumstances,
        },
        lastSeenAtLabel: {
          error: showDetailsValidation ? lastSeenAtError : undefined,
          label: "Ultima vez vista",
          placeholder: "Hoy, ayer, fecha y hora aproximada",
          value: draft.lostDetails.lastSeenAtLabel,
        },
        markings: {
          label: "Senas y comportamiento",
          placeholder: "Collar, manchas, miedos o como llamarla",
          value: draft.lostDetails.markings,
        },
      },
      title: "Detalles de la perdida",
    },
    petSelection: {
      inlineForm: buildInlinePetForm({
        draft: draft.inlinePet,
        showValidation: showDetailsValidation,
      }),
      mode: draft.petSelectionMode,
      options: profileOptions.map((profile) => ({
        body: formatPetProfileSubtitle(profile),
        id: profile.id,
        isSelected:
          draft.petSelectionMode === "existing" &&
          profile.id === draft.petProfileId,
        photoCountLabel: formatPhotoCount(profile.photos.length),
        thumbnailUri: getPhotoUri(profile.photos[0]),
        title: profile.name,
      })),
    },
    photos: {
      canAddPhoto: effectivePhotos.length < lostReportPhotoLimit,
      countLabel: formatPhotoCount(effectivePhotos.length),
      error: shouldShowValidationError(validationDisplay, "photos")
        ? getPhotoStepError(effectivePhotos)
        : undefined,
      helpLabel:
        "Maximo 5 fotos. Rastro prepara miniaturas y retira datos de ubicacion antes de subirlas.",
      items: effectivePhotos,
      permissionBody:
        "Te pediremos acceso solo para elegir fotos de este reporte. Tambien puedes usar la camara cuando el flujo este conectado.",
      permissionTitle: "Antes de abrir tus fotos",
    },
    review: {
      publishActionLabel: canPublish ? "Publicar reporte" : "Completar datos",
      rows: buildReviewRows({
        contactOption,
        draft,
        photos: effectivePhotos,
        selectedPet,
      }),
      validationErrors: shouldShowValidationError(validationDisplay, "review")
        ? validationErrors
        : [],
    },
    selectedPet,
    steps: buildSteps({ canPublish, draft, readyPhotos, selectedPet }),
    success: {
      body: "Tu reporte de mascota perdida ya puede mostrarse cerca de la zona aproximada y compartirse con la comunidad.",
      localSponsorPlacement: lostReportSuccessLocalSponsorPlacement,
      primaryActionLabel: "Ver reporte",
      shareActionLabel: "Compartir",
      title: "Reporte publicado",
    },
    petProfile: {
      selectedLabel: selectedPet
        ? `${selectedPet.name} · ${selectedPet.typeLabel}`
        : "Crear perfil en linea",
    },
    title: "Reportar perdida",
  };
}

const lostReportSuccessLocalSponsorPlacement: LostReportSuccessLocalSponsorPlacement =
  {
    actionLabel: "Ver recurso",
    body: "Atencion veterinaria y orientacion local para primeros cuidados mientras compartes el reporte.",
    categoryLabel: "Veterinaria",
    id: "clinic-san-roque",
    name: "Clinica Veterinaria San Roque",
    paidDisclosure: "Colocacion pagada",
    recoveryPriorityDisclosure:
      "No cambia la prioridad de tu reporte ni donde aparece.",
    reportActionLabel: "Reportar",
    sponsorLabel: "Patrocinado",
    title: "Recurso local cercano",
  };

export function toPublishLostPetReportInput({
  draft,
  petProfiles = [],
}: {
  draft: LostReportDraft;
  petProfiles?: readonly (LostReportPetProfileOption | PetProfileSummary)[];
}): PublishLostPetReportInput {
  const profileOptions = petProfiles.map(toLostReportPetProfileOption);
  const payload = createLostPetReportPublishPayload({
    draft,
    petProfiles: profileOptions,
  });
  const lastSeenAt = normalizeReportCreationEventTime(
    draft.lostDetails.lastSeenAtLabel,
  );

  if (!lastSeenAt) {
    throw new Error(reportCreationEventTimeValidationError);
  }

  return {
    contactOption: toPublishContactOption({
      option: payload.contactOption,
      whatsappPhone: payload.whatsappPhone,
    }),
    exactLocation: toReportLocationPublishInput(payload.exactLocation),
    idempotencyKey: draft.id,
    lastSeenAt,
    lastSeenDescription: draft.lostDetails.circumstances,
    petProfile:
      payload.selectedPet.kind === "existing"
        ? {
            kind: "existing",
            petProfileId: payload.selectedPet.petProfileId,
            profile: payload.selectedPet.profile,
          }
        : {
            kind: "inline",
            profile: {
              breed: payload.selectedPet.breed,
              description: payload.selectedPet.description,
              name: payload.selectedPet.name,
              photos: draft.photos.map(toPetProfilePhotoSource),
              type: payload.selectedPet.type,
            },
          },
    photos: payload.photos.map(toPetProfilePhotoSource),
    showExactPublicLocation: payload.publicLocation.kind === "exact",
  };
}

function createLostPetReportPublishPayload({
  draft,
  petProfiles,
}: {
  draft: LostReportDraft;
  petProfiles: readonly LostReportPetProfileOption[];
}): LostReportPublishPayload {
  const selectedProfile = getSelectedProfile(draft, petProfiles);
  const photos = getEffectivePhotos(draft, selectedProfile);
  const readyPhotos = getReadyUploadedPhotos(photos);
  const errors = validateLostReportDraft({ draft, petProfiles });

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  if (!draft.exactLocation) {
    throw new Error("Exact Location is required.");
  }

  return {
    contactOption: getContactOption(draft.contact),
    exactLocation: draft.exactLocation,
    photos: readyPhotos,
    publicLocation: {
      kind: draft.showExactPinPublicly ? "exact" : "approximate",
      label: draft.showExactPinPublicly
        ? draft.exactLocation.addressLabel
        : draft.exactLocation.locationCellLabel,
    },
    reportType: "lost-pet-report",
    selectedPet: selectedProfile
      ? {
          kind: "existing",
          petProfileId: selectedProfile.id,
          profile: {
            breed: selectedProfile.breed,
            description: selectedProfile.description,
            name: selectedProfile.name,
            type: selectedProfile.type,
          },
        }
      : {
          breed: draft.inlinePet.breed.trim(),
          description: draft.inlinePet.description.trim(),
          kind: "inline-create",
          name: draft.inlinePet.name.trim(),
          type: requireLostReportPetType(draft.inlinePet.type),
        },
    whatsappPhone: draft.contact.whatsappEnabled
      ? draft.contact.whatsappPhone.trim()
      : undefined,
  };
}

export function selectLostReportContactOption({
  draft,
  option,
}: {
  draft: LostReportDraft;
  option: LostReportContactOption;
}): LostReportDraft {
  return {
    ...draft,
    contact: {
      ...draft.contact,
      inAppChatEnabled: option === "chat" || option === "both",
      whatsappEnabled: option === "whatsapp" || option === "both",
    },
  };
}

export function appendLostReportPhoto({
  draft,
  photo,
}: {
  draft: LostReportDraft;
  photo: LostReportPhoto;
}): LostReportDraft {
  if (draft.photos.length >= lostReportPhotoLimit) {
    return draft;
  }

  return {
    ...draft,
    photos: [...draft.photos, photo].slice(0, lostReportPhotoLimit),
  };
}

export function removeLostReportPhoto({
  draft,
  photoId,
}: {
  draft: LostReportDraft;
  photoId: string;
}): LostReportDraft {
  return {
    ...draft,
    photos: draft.photos.filter((photo) => photo.id !== photoId),
  };
}

function isLostReportPetType(value: unknown): value is LostReportPetType {
  return lostReportPetTypeOptions.includes(value as LostReportPetType);
}

function requireLostReportPetType(value: LostReportDraft["inlinePet"]["type"]) {
  if (!isLostReportPetType(value)) {
    throw new Error("Pet Profile type must be one of the supported options.");
  }

  return value;
}

function validateLostReportDraft({
  draft,
  petProfiles,
}: {
  draft: LostReportDraft;
  petProfiles: readonly LostReportPetProfileOption[];
}) {
  const errors: string[] = [];
  const selectedProfile = getSelectedProfile(draft, petProfiles);
  const photos = getEffectivePhotos(draft, selectedProfile);

  appendRequiredReportCreationDraftErrors({
    errors,
    exactLocation: draft.exactLocation,
    hasSelectedPet: Boolean(selectedProfile) || hasValidInlinePet(draft),
    photos,
  });

  const lastSeenAtError = getLastSeenAtError(
    draft.lostDetails.lastSeenAtLabel,
  );
  if (lastSeenAtError) {
    errors.push(lastSeenAtError);
  }

  if (draft.lostDetails.circumstances.trim().length === 0) {
    errors.push("Agrega detalles de la perdida.");
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

function getLastSeenAtError(value: string) {
  if (value.trim().length === 0) {
    return "Indica cuando la viste por ultima vez.";
  }

  if (!normalizeReportCreationEventTime(value)) {
    return reportCreationEventTimeValidationError;
  }

  return undefined;
}

function buildContactOptions(currentOption: LostReportContactOption) {
  return [
    {
      body: "Conversaciones dentro de Rastro con notificaciones.",
      iconName: "message.fill",
      isSelected: currentOption === "chat",
      label: "Chat en Rastro",
      value: "chat" as const,
    },
    {
      body: "Muestra el numero que elijas para contacto directo.",
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

function buildInlinePetForm({
  draft,
  showValidation,
}: {
  draft: LostReportDraft["inlinePet"];
  showValidation: boolean;
}) {
  return {
    fields: {
      breed: {
        label: "Raza",
        placeholder: "Mestizo, Siames, Labrador...",
        value: draft.breed,
      },
      description: {
        label: "Descripcion y marcas",
        placeholder: "Color, collar, manchas o senas visibles",
        value: draft.description,
      },
      name: {
        error:
          showValidation && draft.name.trim().length === 0
            ? "Ingresa el nombre de la mascota."
            : undefined,
        label: "Nombre",
        placeholder: "Nombre de la mascota",
        value: draft.name,
      },
    },
    modeLabel: "Crear Pet Profile en linea",
    typeOptions: lostReportPetTypeOptions.map((option) => ({
      isSelected: draft.type === option,
      label: option,
      value: option,
    })),
  };
}

function buildLocationViewModel(draft: LostReportDraft) {
  const location = draft.exactLocation;
  const exactInternalLabel = location
    ? `${location.addressLabel} · ${location.municipality}, ${location.department}`
    : "Selecciona un punto exacto para uso interno.";
  const approximatePublicLabel = location
    ? location.locationCellLabel
    : "Zona aproximada pendiente";

  return {
    approximatePublicLabel,
    exactInternalLabel,
    hasExactLocation: Boolean(location),
    mapPreviewLabel: location
      ? `Pin interno en ${location.locationCellLabel}`
      : "Mapa de Bolivia pendiente",
    publicPrecisionLabel: draft.showExactPinPublicly
      ? "Pin exacto publico"
      : "Zona aproximada por defecto",
    showExactPinPublicly: draft.showExactPinPublicly,
    exactPinOptInLabel: "Mostrar pin exacto publicamente",
    toggleBody:
      "Por defecto mostramos solo la zona aproximada. Activa el punto exacto solo si es seguro compartirlo.",
    toggleLabel: "Mostrar pin exacto publicamente",
  };
}

function buildReviewRows({
  contactOption,
  draft,
  photos,
  selectedPet,
}: {
  contactOption: LostReportContactOption;
  draft: LostReportDraft;
  photos: readonly LostReportPhoto[];
  selectedPet?: LostReportCreationViewModel["selectedPet"];
}) {
  return [
    {
      label: "Mascota",
      value: selectedPet
        ? `${selectedPet.name} · ${selectedPet.typeLabel}`
        : "Pendiente",
    },
    {
      label: "Fotos",
      value: formatPhotoCount(photos.length),
    },
    {
      label: "Ubicacion interna",
      value: draft.exactLocation?.addressLabel ?? "Pendiente",
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
  readyPhotos,
  selectedPet,
}: {
  canPublish: boolean;
  draft: LostReportDraft;
  readyPhotos: readonly LostReportPhoto[];
  selectedPet?: LostReportCreationViewModel["selectedPet"];
}) {
  return [
    {
      id: "details" as const,
      isComplete:
        Boolean(selectedPet) &&
        readyPhotos.length > 0 &&
        !getLastSeenAtError(draft.lostDetails.lastSeenAtLabel),
      label: "Detalles",
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactLocation),
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

function buildLostReportJourney({
  draft,
  effectivePhotos,
  journey,
  readyPhotos,
  selectedPet,
}: {
  draft: LostReportDraft;
  effectivePhotos: readonly LostReportPhoto[];
  journey?: LostReportCreationJourneyInput;
  readyPhotos: readonly LostReportPhoto[];
  selectedPet?: LostReportCreationViewModel["selectedPet"];
}) {
  if (journey?.currentStepId) {
    return createReportCreationJourney({
      completedStepIds: journey.completedStepIds,
      currentStepId: journey.currentStepId,
      reportType: "lost",
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
        effectivePhotos.length > 0 &&
        readyPhotos.length === effectivePhotos.length,
    },
    {
      id: "details" as const,
      isComplete:
        Boolean(selectedPet) &&
        !getLastSeenAtError(draft.lostDetails.lastSeenAtLabel) &&
        draft.lostDetails.circumstances.trim().length > 0,
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactLocation),
    },
    {
      id: "contact" as const,
      isComplete: !getContactError(draft.contact),
    },
  ];
  return deriveReportCreationJourney({
    currentStepIdWhenComplete: "review",
    reportType: "lost",
    stepCompletion,
  });
}

function shouldShowValidationError(
  validationDisplay: LostReportCreationValidationDisplayInput | undefined,
  stepId: ReportCreationJourneyStepId,
) {
  return (
    validationDisplay === undefined ||
    validationDisplay.attemptedStepId === stepId
  );
}

function getSelectedProfile(
  draft: LostReportDraft,
  petProfiles: readonly LostReportPetProfileOption[],
) {
  return getReportCreationSelectedProfile(draft, petProfiles);
}

function getSelectedPet(
  draft: LostReportDraft,
  selectedProfile?: LostReportPetProfileOption,
): LostReportCreationViewModel["selectedPet"] {
  return getReportCreationSelectedPet({
    draftPhotos: draft.photos,
    getPhotoUri,
    inlinePet: draft.inlinePet,
    selectedProfile,
    toOptionalLabel,
    typeOptions: lostReportPetTypeOptions,
  });
}

function hasValidInlinePet(draft: LostReportDraft) {
  return hasValidReportCreationInlinePet(
    draft.inlinePet,
    lostReportPetTypeOptions,
  );
}

function getEffectivePhotos(
  draft: LostReportDraft,
  _selectedProfile?: LostReportPetProfileOption,
) {
  return draft.photos.slice(0, lostReportPhotoLimit);
}

function getReadyUploadedPhotos(photos: readonly LostReportPhoto[]) {
  return getReadyUploadedReportCreationPhotos(photos);
}

function getPhotoStepError(photos: readonly LostReportPhoto[]) {
  return getRequiredReportCreationPhotoStepError(photos);
}

function getContactOption(contact: LostReportContactDraft) {
  if (contact.inAppChatEnabled && contact.whatsappEnabled) {
    return "both";
  }

  if (contact.whatsappEnabled) {
    return "whatsapp";
  }

  return "chat";
}

function getContactError(contact: LostReportContactDraft) {
  if (!contact.inAppChatEnabled && !contact.whatsappEnabled) {
    return "Elige chat, WhatsApp o ambos.";
  }

  if (contact.whatsappEnabled && contact.whatsappPhone.trim().length === 0) {
    return "Ingresa un numero para WhatsApp.";
  }

  return undefined;
}

function contactOptionLabel(option: LostReportContactOption) {
  switch (option) {
    case "both":
      return "Chat y WhatsApp";
    case "chat":
      return "Chat en Rastro";
    case "whatsapp":
      return "WhatsApp";
  }
}

function formatPetProfileSubtitle(profile: LostReportPetProfileOption) {
  const breedLabel = toOptionalLabel(profile.breed);

  return breedLabel ? `${profile.type} · ${breedLabel}` : profile.type;
}

function formatPhotoCount(count: number) {
  return `${Math.min(count, lostReportPhotoLimit)}/${lostReportPhotoLimit}`;
}

function getPhotoUri(photo?: LostReportPhoto) {
  if (!photo) {
    return undefined;
  }

  return photo.thumbUri ?? photo.uri;
}

function toOptionalLabel(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function toLostReportPetProfileOption(
  profile: LostReportPetProfileOption | PetProfileSummary,
): LostReportPetProfileOption {
  return {
    breed: profile.breed,
    description: profile.description,
    id: profile.id,
    name: profile.name,
    photos: profile.photos.map((photo) => ({
      alt: photo.alt,
      id: photo.id,
      status: photo.status,
      thumbUri: photo.thumbUri,
      uri: photo.uri,
    })),
    type: profile.type,
  };
}

function toPetProfilePhotoSource(
  photo: LostReportPhoto,
): PetProfilePhotoSource {
  return {
    id: photo.mediaId ?? photo.id,
    uri: photo.uri ?? photo.thumbUri ?? `file:///${photo.id}.jpg`,
  };
}

function toPublishContactOption({
  option,
  whatsappPhone,
}: {
  option: LostReportContactOption;
  whatsappPhone?: string;
}): PublishLostPetReportContactOption {
  switch (option) {
    case "both":
      return {
        kind: "both",
        phoneNumber: whatsappPhone ?? "",
      };
    case "chat":
      return {
        kind: "in-app-chat",
      };
    case "whatsapp":
      return {
        kind: "whatsapp",
        phoneNumber: whatsappPhone ?? "",
      };
  }
}
