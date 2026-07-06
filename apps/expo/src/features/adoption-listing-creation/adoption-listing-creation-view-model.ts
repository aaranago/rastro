import type {
  AdoptionListingContactOption as PublishAdoptionListingContactOption,
  PublishAdoptionListingInput,
} from "../adoption-listings/adoption-listings";
import type { PetProfileSummary } from "../pet-profiles/pet-profile-types";
import type {
  ReportCreationJourney,
  ReportCreationJourneyStepId,
} from "../report-creation/report-creation-journey";
import type {
  AdoptionListingContactChoice,
  AdoptionListingContactDraft,
  AdoptionListingCreationSession,
  AdoptionListingDraft,
  AdoptionListingPetProfileOption,
  AdoptionListingPetSelectionMode,
  AdoptionListingPetType,
  AdoptionListingPhoto,
} from "./adoption-listing-creation-types";
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
  getReportCreationSelectedPet,
  getReportCreationSelectedProfile,
  hasValidReportCreationInlinePet,
} from "../report-creation/report-creation-pet-selection";
import { getReportCreationMinimumDescriptionError } from "../report-creation/report-creation-text-validation";
import { toReportLocationPublishInput } from "../report-creation/report-location-draft";
import {
  adoptionListingPetTypeOptions,
  toAdoptionListingPetProfileOption,
} from "./adoption-listing-creation-types";

export { adoptionListingPetTypeOptions };

const adoptionListingPhotoLimit = 5;

export interface AdoptionListingFieldViewModel {
  error?: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface AdoptionListingCreationViewModel {
  adoptionDetails: {
    fields: {
      adoptionSummary: AdoptionListingFieldViewModel;
      healthNotes: AdoptionListingFieldViewModel;
      idealHome: AdoptionListingFieldViewModel;
    };
    title: string;
  };
  canPublish: boolean;
  journey: ReportCreationJourney;
  contact: {
    currentOption: AdoptionListingContactChoice;
    error?: string;
    options: {
      body: string;
      iconName: string;
      isSelected: boolean;
      label: string;
      value: AdoptionListingContactChoice;
    }[];
    whatsappField: AdoptionListingFieldViewModel & {
      visible: boolean;
    };
  };
  kind: "member";
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
  petProfile: {
    selectedLabel: string;
  };
  petSelection: {
    inlineForm: {
      fields: {
        breed: AdoptionListingFieldViewModel;
        description: AdoptionListingFieldViewModel;
        name: AdoptionListingFieldViewModel;
      };
      modeLabel: string;
      typeOptions: {
        isSelected: boolean;
        label: AdoptionListingPetType;
        value: AdoptionListingPetType;
      }[];
    };
    mode: AdoptionListingPetSelectionMode;
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
    items: AdoptionListingPhoto[];
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
    typeLabel: AdoptionListingPetType;
  };
  steps: {
    id: "pet" | "details" | "location" | "contact" | "review" | "success";
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
  verificationBadge: {
    label?: string;
    required: false;
    visible: boolean;
  };
}

export function createAdoptionListingDraft(
  overrides: Partial<AdoptionListingDraft> = {},
): AdoptionListingDraft {
  const base: AdoptionListingDraft = {
    adoptionDetails: {
      adoptionSummary:
        "Busca un hogar responsable donde pueda recibir tiempo, cuidado y carino.",
      healthNotes: "",
      idealHome: "",
    },
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
    id: createAdoptionListingDraftId(),
    petSelectionMode: "existing",
    photos: [],
    showExactPinPublicly: false,
  };

  return {
    ...base,
    ...overrides,
    adoptionDetails: {
      ...base.adoptionDetails,
      ...overrides.adoptionDetails,
    },
    contact: {
      ...base.contact,
      ...overrides.contact,
    },
    inlinePet: {
      ...base.inlinePet,
      ...overrides.inlinePet,
    },
  };
}

function createAdoptionListingDraftId() {
  return `adoption-listing-${createReportCreationIdSuffix()}`;
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

export interface AdoptionListingCreationJourneyInput {
  completedStepIds?: readonly ReportCreationJourneyStepId[];
  currentStepId?: ReportCreationJourneyStepId;
}

export interface AdoptionListingCreationValidationDisplayInput {
  attemptedStepId?: ReportCreationJourneyStepId;
}

export function createInitialAdoptionListingDraft({
  petProfiles,
  selectedPetProfileId,
}: {
  petProfiles: readonly (AdoptionListingPetProfileOption | PetProfileSummary)[];
  selectedPetProfileId?: string;
}): AdoptionListingDraft {
  const selectedProfile = selectedPetProfileId
    ? petProfiles.find((profile) => profile.id === selectedPetProfileId)
    : undefined;
  const firstProfile = selectedProfile ?? petProfiles[0];

  return createAdoptionListingDraft({
    petProfileId: firstProfile?.id,
    petSelectionMode: firstProfile ? "existing" : "inline-create",
  });
}

export function buildAdoptionListingCreationViewModel({
  draft,
  journey,
  petProfiles,
  session,
  validationDisplay,
}: {
  draft: AdoptionListingDraft;
  journey?: AdoptionListingCreationJourneyInput;
  petProfiles: readonly (AdoptionListingPetProfileOption | PetProfileSummary)[];
  session?: AdoptionListingCreationSession;
  validationDisplay?: AdoptionListingCreationValidationDisplayInput;
}): AdoptionListingCreationViewModel {
  const profileOptions = petProfiles.map(toAdoptionListingPetProfileOption);
  const selectedProfile = getSelectedProfile(draft, profileOptions);
  const selectedPet = getSelectedPet(draft, selectedProfile);
  const effectivePhotos = getEffectivePhotos(draft, selectedProfile);
  const readyPhotos = getReadyUploadedPhotos(effectivePhotos);
  const validationErrors = validateAdoptionListingDraft({
    draft,
    petProfiles: profileOptions,
  });
  const contactOption = getContactOption(draft.contact);
  const canPublish = validationErrors.length === 0;
  const verificationBadge =
    session?.kind === "member" ? session.verificationBadge : undefined;
  const showContactValidation = shouldShowValidationError(
    validationDisplay,
    "contact",
  );
  const showDetailsValidation = shouldShowValidationError(
    validationDisplay,
    "details",
  );
  const showPhotosValidation = shouldShowValidationError(
    validationDisplay,
    "photos",
  );

  return {
    adoptionDetails: buildAdoptionDetailsViewModel(
      draft,
      showDetailsValidation,
    ),
    canPublish,
    journey: buildAdoptionListingJourney({
      draft,
      effectivePhotos,
      journey,
      readyPhotos,
      selectedPet,
    }),
    contact: {
      currentOption: contactOption,
      error: showContactValidation ? getContactError(draft.contact) : undefined,
      options: buildContactOptions(contactOption),
      whatsappField: {
        error:
          showContactValidation &&
          draft.contact.whatsappEnabled &&
          draft.contact.whatsappPhone.trim().length === 0
            ? "Ingresa el número de WhatsApp que quieres mostrar."
            : undefined,
        label: "Numero de WhatsApp",
        placeholder: "+591 70000000",
        value: draft.contact.whatsappPhone,
        visible: draft.contact.whatsappEnabled,
      },
    },
    kind: "member",
    location: buildLocationViewModel(draft),
    petProfile: {
      selectedLabel: selectedPet
        ? `${selectedPet.name} · ${selectedPet.typeLabel}`
        : "Crear perfil en linea",
    },
    petSelection: {
      inlineForm: buildInlinePetForm({
        draft: draft.inlinePet,
        showValidation: showPhotosValidation,
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
      canAddPhoto: effectivePhotos.length < adoptionListingPhotoLimit,
      countLabel: formatPhotoCount(effectivePhotos.length),
      error: showPhotosValidation
        ? getPhotoStepError(effectivePhotos)
        : undefined,
      helpLabel:
        "Maximo 5 fotos. Rastro prepara miniaturas y retira datos de ubicacion antes de subirlas.",
      items: effectivePhotos,
      permissionBody:
        "Te pediremos acceso solo para elegir fotos de esta adopción.",
      permissionTitle: "Antes de abrir tus fotos",
    },
    review: {
      publishActionLabel: canPublish ? "Publicar adopción" : "Completar datos",
      rows: buildReviewRows({
        contactOption,
        draft,
        photos: readyPhotos,
        selectedPet,
        verificationBadge,
      }),
      validationErrors: shouldShowValidationError(validationDisplay, "review")
        ? validationErrors
        : [],
    },
    selectedPet,
    steps: buildSteps({
      canPublish,
      draft,
      readyPhotos,
      selectedPet,
    }),
    success: {
      body: "Tu adopción ya puede mostrarse cerca de la zona aproximada y compartirse con la comunidad.",
      primaryActionLabel: "Ver adopción",
      shareActionLabel: "Compartir",
      title: "Adopción publicada",
    },
    title: "Dar en adopción",
    verificationBadge: {
      label: verificationBadge?.label,
      required: false,
      visible: Boolean(verificationBadge),
    },
  };
}

export function toPublishAdoptionListingInput({
  draft,
  petProfiles = [],
}: {
  draft: AdoptionListingDraft;
  petProfiles?: readonly (
    | AdoptionListingPetProfileOption
    | PetProfileSummary
  )[];
}): PublishAdoptionListingInput {
  const profileOptions = petProfiles.map(toAdoptionListingPetProfileOption);
  const selectedProfile = getSelectedProfile(draft, profileOptions);
  const photos = getEffectivePhotos(draft, selectedProfile);
  const readyPhotos = getReadyUploadedPhotos(photos);
  const errors = validateAdoptionListingDraft({
    draft,
    petProfiles: profileOptions,
  });

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  if (!draft.exactLocation) {
    throw new Error("Exact Location is required.");
  }

  return {
    adoptionSummary: draft.adoptionDetails.adoptionSummary.trim(),
    contactOption: toPublishContactOption({
      option: getContactOption(draft.contact),
      whatsappPhone: draft.contact.whatsappPhone,
    }),
    exactLocation: toReportLocationPublishInput(draft.exactLocation),
    healthNotes: optionalTrimmed(draft.adoptionDetails.healthNotes),
    idempotencyKey: draft.id,
    idealHome: optionalTrimmed(draft.adoptionDetails.idealHome),
    petProfile: selectedProfile
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
          kind: "inline",
          profile: {
            breed: draft.inlinePet.breed.trim(),
            description: draft.inlinePet.description.trim(),
            name: draft.inlinePet.name.trim(),
            photos: readyPhotos.map(toPetProfilePhotoSource),
            type: requireAdoptionListingPetType(draft.inlinePet.type),
          },
        },
    photos: readyPhotos.map(toPetProfilePhotoSource),
    showExactPublicLocation: draft.showExactPinPublicly,
  };
}

export function appendAdoptionListingPhoto({
  draft,
  photo,
}: {
  draft: AdoptionListingDraft;
  photo: AdoptionListingPhoto;
}): AdoptionListingDraft {
  if (draft.photos.length >= adoptionListingPhotoLimit) {
    return draft;
  }

  return {
    ...draft,
    photos: [...draft.photos, photo].slice(0, adoptionListingPhotoLimit),
  };
}

export function removeAdoptionListingPhoto({
  draft,
  photoId,
}: {
  draft: AdoptionListingDraft;
  photoId: string;
}): AdoptionListingDraft {
  return {
    ...draft,
    photos: draft.photos.filter((photo) => photo.id !== photoId),
  };
}

export function selectAdoptionListingContactOption({
  draft,
  option,
}: {
  draft: AdoptionListingDraft;
  option: AdoptionListingContactChoice;
}): AdoptionListingDraft {
  return {
    ...draft,
    contact: {
      ...draft.contact,
      inAppChatEnabled: option === "chat" || option === "both",
      whatsappEnabled: option === "whatsapp" || option === "both",
    },
  };
}

function validateAdoptionListingDraft({
  draft,
  petProfiles,
}: {
  draft: AdoptionListingDraft;
  petProfiles: readonly AdoptionListingPetProfileOption[];
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

  const adoptionSummaryError = getAdoptionSummaryError(
    draft.adoptionDetails.adoptionSummary,
  );
  if (adoptionSummaryError) {
    errors.push(adoptionSummaryError);
  }

  if (!draft.contact.inAppChatEnabled && !draft.contact.whatsappEnabled) {
    errors.push("Elige al menos una Contact Option.");
  }

  if (
    draft.contact.whatsappEnabled &&
    draft.contact.whatsappPhone.trim().length === 0
  ) {
    errors.push("Ingresa un número de WhatsApp.");
  }

  return errors;
}

function buildAdoptionDetailsViewModel(
  draft: AdoptionListingDraft,
  showValidation = true,
) {
  return {
    fields: {
      adoptionSummary: {
        error: showValidation
          ? getAdoptionSummaryError(draft.adoptionDetails.adoptionSummary)
          : undefined,
        label: "Sobre la adopción",
        placeholder:
          "Personalidad, historia y el cuidado que necesita para su nuevo hogar",
        value: draft.adoptionDetails.adoptionSummary,
      },
      healthNotes: {
        label: "Salud y cuidados",
        placeholder: "Vacunas, esterilizacion, medicamentos o cuidados",
        value: draft.adoptionDetails.healthNotes,
      },
      idealHome: {
        label: "Hogar ideal",
        placeholder: "Familia, espacio, otras mascotas o rutinas importantes",
        value: draft.adoptionDetails.idealHome,
      },
    },
    title: "Detalles de adopción",
  };
}

function buildContactOptions(currentOption: AdoptionListingContactChoice) {
  return [
    {
      body: "Conversaciones dentro de Rastro con notificaciones.",
      iconName: "message.fill",
      isSelected: currentOption === "chat",
      label: "Chat en Rastro",
      value: "chat" as const,
    },
    {
      body: "Muestra el número que elijas para contacto directo.",
      iconName: "phone.fill",
      isSelected: currentOption === "whatsapp",
      label: "WhatsApp",
      value: "whatsapp" as const,
    },
    {
      body: "Permite chat en la app y WhatsApp en la misma adopción.",
      iconName: "bubble.left.and.phone.fill",
      isSelected: currentOption === "both",
      label: "Ambos",
      value: "both" as const,
    },
  ];
}

function getAdoptionSummaryError(value: string) {
  return getReportCreationMinimumDescriptionError({
    emptyMessage: "Cuenta que tipo de hogar necesita.",
    shortMessage: "Describe la adopción con al menos 10 caracteres.",
    value,
  });
}

function buildInlinePetForm({
  draft,
  showValidation,
}: {
  draft: AdoptionListingDraft["inlinePet"];
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
        placeholder: "Color, personalidad, senas o cuidados relevantes",
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
    typeOptions: adoptionListingPetTypeOptions.map((option) => ({
      isSelected: draft.type === option,
      label: option,
      value: option,
    })),
  };
}

function buildLocationViewModel(draft: AdoptionListingDraft) {
  const location = draft.exactLocation;
  const exactInternalLabel = location
    ? `${location.addressLabel} · ${location.municipality}, ${location.department}`
    : "Selecciona un punto exacto para uso interno.";
  const approximatePublicLabel = location
    ? `${location.locationCellLabel} · zona de 300 m`
    : "Elige una ubicacion para calcular la zona.";

  return {
    approximatePublicLabel,
    exactInternalLabel,
    hasExactLocation: Boolean(location),
    mapPreviewLabel: location
      ? `${location.locationCellLabel}, Bolivia`
      : "Bolivia - elige una ubicacion",
    publicPrecisionLabel: draft.showExactPinPublicly
      ? "Pin exacto publico"
      : "Zona aproximada de 300 m",
    showExactPinPublicly: draft.showExactPinPublicly,
    exactPinOptInLabel: "Mostrar pin exacto públicamente",
    toggleBody:
      "Por defecto mostramos una zona de 300 m alrededor del pin. Activa el punto exacto solo si es seguro compartirlo.",
    toggleLabel: "Mostrar pin exacto públicamente",
  };
}

function buildReviewRows({
  contactOption,
  draft,
  photos,
  selectedPet,
  verificationBadge,
}: {
  contactOption: AdoptionListingContactChoice;
  draft: AdoptionListingDraft;
  photos: readonly AdoptionListingPhoto[];
  selectedPet?: AdoptionListingCreationViewModel["selectedPet"];
  verificationBadge?: { label: string };
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
      label: "Ubicación interna",
      value: draft.exactLocation?.addressLabel ?? "Pendiente",
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
    {
      label: "Verificacion",
      value: verificationBadge?.label ?? "No requerida",
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
  draft: AdoptionListingDraft;
  readyPhotos: readonly AdoptionListingPhoto[];
  selectedPet?: AdoptionListingCreationViewModel["selectedPet"];
}) {
  return [
    {
      id: "pet" as const,
      isComplete: Boolean(selectedPet) && readyPhotos.length > 0,
      label: "Mascota",
    },
    {
      id: "details" as const,
      isComplete: !getAdoptionSummaryError(
        draft.adoptionDetails.adoptionSummary,
      ),
      label: "Detalles",
    },
    {
      id: "location" as const,
      isComplete: Boolean(draft.exactLocation),
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

function buildAdoptionListingJourney({
  draft,
  effectivePhotos,
  journey,
  readyPhotos,
  selectedPet,
}: {
  draft: AdoptionListingDraft;
  effectivePhotos: readonly AdoptionListingPhoto[];
  journey?: AdoptionListingCreationJourneyInput;
  readyPhotos: readonly AdoptionListingPhoto[];
  selectedPet?: AdoptionListingCreationViewModel["selectedPet"];
}) {
  if (journey?.currentStepId) {
    return createReportCreationJourney({
      completedStepIds: journey.completedStepIds,
      currentStepId: journey.currentStepId,
      reportType: "adoption",
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
        Boolean(selectedPet) &&
        effectivePhotos.length > 0 &&
        readyPhotos.length === effectivePhotos.length,
    },
    {
      id: "details" as const,
      isComplete: !getAdoptionSummaryError(
        draft.adoptionDetails.adoptionSummary,
      ),
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
    reportType: "adoption",
    stepCompletion,
  });
}

function shouldShowValidationError(
  validationDisplay: AdoptionListingCreationValidationDisplayInput | undefined,
  stepId: ReportCreationJourneyStepId,
) {
  return (
    validationDisplay === undefined ||
    validationDisplay.attemptedStepId === stepId
  );
}

function getSelectedProfile(
  draft: AdoptionListingDraft,
  petProfiles: readonly AdoptionListingPetProfileOption[],
) {
  return getReportCreationSelectedProfile(draft, petProfiles);
}

function getSelectedPet(
  draft: AdoptionListingDraft,
  selectedProfile?: AdoptionListingPetProfileOption,
): AdoptionListingCreationViewModel["selectedPet"] {
  return getReportCreationSelectedPet({
    draftPhotos: draft.photos,
    getPhotoUri,
    inlinePet: draft.inlinePet,
    selectedProfile,
    toOptionalLabel,
    typeOptions: adoptionListingPetTypeOptions,
  });
}

function hasValidInlinePet(draft: AdoptionListingDraft) {
  return hasValidReportCreationInlinePet(
    draft.inlinePet,
    adoptionListingPetTypeOptions,
  );
}

function requireAdoptionListingPetType(
  value: AdoptionListingDraft["inlinePet"]["type"],
): AdoptionListingPetType {
  if (
    !adoptionListingPetTypeOptions.includes(value as AdoptionListingPetType)
  ) {
    throw new Error("Pet Profile type must be one of the supported options.");
  }

  return value as AdoptionListingPetType;
}

function getEffectivePhotos(
  draft: AdoptionListingDraft,
  selectedProfile?: AdoptionListingPetProfileOption,
) {
  const sourcePhotos =
    draft.photos.length > 0 ? draft.photos : (selectedProfile?.photos ?? []);

  return sourcePhotos.slice(0, adoptionListingPhotoLimit);
}

function getReadyUploadedPhotos(photos: readonly AdoptionListingPhoto[]) {
  return getReadyUploadedReportCreationPhotos(photos);
}

function getPhotoStepError(photos: readonly AdoptionListingPhoto[]) {
  return getRequiredReportCreationPhotoStepError(photos);
}

function getContactOption(contact: AdoptionListingContactDraft) {
  if (contact.inAppChatEnabled && contact.whatsappEnabled) {
    return "both";
  }

  if (contact.whatsappEnabled) {
    return "whatsapp";
  }

  return "chat";
}

function getContactError(contact: AdoptionListingContactDraft) {
  if (!contact.inAppChatEnabled && !contact.whatsappEnabled) {
    return "Elige chat, WhatsApp o ambos.";
  }

  if (contact.whatsappEnabled && contact.whatsappPhone.trim().length === 0) {
    return "Ingresa un número para WhatsApp.";
  }

  return undefined;
}

function contactOptionLabel(option: AdoptionListingContactChoice) {
  if (option === "both") {
    return "Chat en Rastro y WhatsApp";
  }

  if (option === "whatsapp") {
    return "WhatsApp";
  }

  return "Chat en Rastro";
}

function toPublishContactOption({
  option,
  whatsappPhone,
}: {
  option: AdoptionListingContactChoice;
  whatsappPhone: string;
}): PublishAdoptionListingContactOption {
  if (option === "chat") {
    return {
      kind: "in-app-chat",
    };
  }

  return {
    kind: option,
    phoneNumber: whatsappPhone.trim(),
  };
}

function toPetProfilePhotoSource(photo: AdoptionListingPhoto) {
  const uri = photo.uri ?? photo.thumbUri;

  if (!uri) {
    throw new Error("Photo URI is required.");
  }

  return {
    id: photo.mediaId ?? photo.id,
    uri,
  };
}

function formatPetProfileSubtitle(profile: AdoptionListingPetProfileOption) {
  return [profile.type, profile.breed].filter(Boolean).join(" · ");
}

function formatPhotoCount(count: number) {
  return `${count}/${adoptionListingPhotoLimit} fotos`;
}

function getPhotoUri(photo: AdoptionListingPhoto | undefined) {
  return photo?.thumbUri ?? photo?.uri;
}

function toOptionalLabel(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalTrimmed(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}
