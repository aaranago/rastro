import type {
  PetProfileDraft,
  PetProfilePhoto,
  PetProfilesSessionState,
  PetProfileSummary,
  PetProfileType,
} from "./pet-profile-types";
import {
  petProfilePhotoLimit,
  petProfileTypeOptions,
} from "./pet-profile-types";

export { petProfilePhotoLimit, petProfileTypeOptions };

export interface PetProfileCardViewModel {
  id: string;
  name: string;
  typeLabel: string;
  breedLabel?: string;
  description: string;
  photoCountLabel: string;
  thumbnailUri?: string;
  relatedSummaryLabel: string;
  updatedAtLabel?: string;
}

export interface PetProfileDetailViewModel {
  id: string;
  name: string;
  typeLabel: string;
  breedLabel?: string;
  description: string;
  photoCountLabel: string;
  photos: PetProfilePhoto[];
  relatedRecords: {
    id: string;
    title: string;
    statusLabel: string;
    metaLabel: string;
  }[];
  relatedSummaryLabel: string;
  editActionLabel: string;
}

export type MisMascotasViewModel =
  | {
      kind: "visitor";
      canCreate: false;
      title: string;
      explanationTitle: string;
      explanationBody: string;
      createActionLabel: string;
    }
  | {
      kind: "member";
      canCreate: true;
      title: string;
      subtitle: string;
      createActionLabel: string;
      state: "empty" | "ready";
      emptyState?: {
        title: string;
        body: string;
      };
      cards: PetProfileCardViewModel[];
      selectedProfile?: PetProfileDetailViewModel;
    };

export interface PetProfileFormViewModel {
  mode: "create" | "edit";
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  fields: {
    name: PetProfileFieldViewModel;
    breed: PetProfileFieldViewModel;
    description: PetProfileFieldViewModel;
  };
  typeOptions: {
    value: PetProfileType;
    label: PetProfileType;
    isSelected: boolean;
  }[];
  photos: PetProfilePhoto[];
  photoCountLabel: string;
  canAddPhoto: boolean;
  addPhotoLabel: string;
  photoHelpLabel: string;
}

export interface PetProfileFieldViewModel {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
}

export function buildMisMascotasViewModel({
  profiles,
  selectedProfileId,
  session,
}: {
  profiles: readonly PetProfileSummary[];
  selectedProfileId?: string;
  session: PetProfilesSessionState;
}): MisMascotasViewModel {
  if (session.kind === "visitor") {
    return {
      canCreate: false,
      createActionLabel: "Inicia sesion para crear",
      explanationBody:
        "Como visitante puedes conocer para que sirven los perfiles de mascota. Inicia sesion como miembro para crear y reutilizarlos en reportes.",
      explanationTitle: "Guarda datos una sola vez",
      kind: "visitor",
      title: "Mis mascotas",
    };
  }

  const cards = profiles.map(buildPetProfileCardViewModel);
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];

  return {
    canCreate: true,
    cards,
    createActionLabel: "Crear perfil de mascota",
    emptyState:
      cards.length === 0
        ? {
            body: "Crea un perfil para reutilizar fotos y datos cuando necesites iniciar reportes.",
            title: "Aun no tienes mascotas",
          }
        : undefined,
    kind: "member",
    selectedProfile: selectedProfile
      ? buildPetProfileDetailViewModel(selectedProfile)
      : undefined,
    state: cards.length === 0 ? "empty" : "ready",
    subtitle:
      "Perfiles de mascota del miembro cuidador, listos para reportes y futuras selecciones.",
    title: "Mis mascotas",
  };
}

function buildPetProfileCardViewModel(
  profile: PetProfileSummary,
): PetProfileCardViewModel {
  return {
    breedLabel: toOptionalLabel(profile.breed),
    description: profile.description,
    id: profile.id,
    name: profile.name,
    photoCountLabel: formatPhotoCount(profile.photos.length),
    relatedSummaryLabel: formatRelatedSummary(profile),
    thumbnailUri: getPrimaryThumbUri(profile.photos),
    typeLabel: profile.type,
    updatedAtLabel: profile.updatedAtLabel,
  };
}

function buildPetProfileDetailViewModel(
  profile: PetProfileSummary,
): PetProfileDetailViewModel {
  return {
    breedLabel: toOptionalLabel(profile.breed),
    description: profile.description,
    editActionLabel: "Editar",
    id: profile.id,
    name: profile.name,
    photoCountLabel: formatPhotoCount(profile.photos.length),
    photos: profile.photos,
    relatedRecords: profile.relatedRecords.map((record) => ({
      id: record.id,
      metaLabel:
        record.outcomeLabel ??
        record.updatedAtLabel ??
        relatedKindLabel(record.kind),
      statusLabel: record.status === "active" ? "Activo" : "Cerrado",
      title: record.title,
    })),
    relatedSummaryLabel: formatRelatedSummary(profile),
    typeLabel: profile.type,
  };
}

export function buildPetProfileFormViewModel({
  draft,
  mode,
}: {
  draft: PetProfileDraft;
  mode: "create" | "edit";
}): PetProfileFormViewModel {
  const normalizedName = draft.name.trim();
  const hasValidType = isPetProfileType(draft.type);
  const canAddPhoto = draft.photos.length < petProfilePhotoLimit;

  return {
    addPhotoLabel: canAddPhoto ? "Agregar foto" : "Limite alcanzado",
    canAddPhoto,
    canSubmit: normalizedName.length > 0 && hasValidType,
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
        error: normalizedName.length === 0 ? "Ingresa el nombre." : undefined,
        label: "Nombre",
        placeholder: "Nombre de la mascota",
        value: draft.name,
      },
    },
    mode,
    photoCountLabel: formatPhotoCount(draft.photos.length),
    photoHelpLabel:
      "Al subir fotos, Rastro prepara miniaturas y retira datos de ubicacion.",
    photos: draft.photos,
    submitLabel: mode === "create" ? "Guardar perfil" : "Guardar cambios",
    title:
      mode === "create"
        ? "Crear perfil de mascota"
        : "Editar perfil de mascota",
    typeOptions: petProfileTypeOptions.map((option) => ({
      isSelected: draft.type === option,
      label: option,
      value: option,
    })),
  };
}

export function createPetProfileFromDraft({
  caretakerMemberId,
  draft,
  id,
}: {
  caretakerMemberId: string;
  draft: PetProfileDraft;
  id: string;
}): PetProfileSummary {
  if (!isPetProfileType(draft.type)) {
    throw new Error("Pet Profile type must be one of the supported options.");
  }

  return {
    breed: draft.breed.trim(),
    caretakerMemberId,
    description: draft.description.trim(),
    id,
    name: draft.name.trim(),
    photos: normalizeDraftPhotos(draft.photos),
    relatedRecords: [],
    type: draft.type,
  };
}

export function isPetProfileType(value: unknown): value is PetProfileType {
  return petProfileTypeOptions.includes(value as PetProfileType);
}

function formatPhotoCount(count: number) {
  return `${Math.min(count, petProfilePhotoLimit)}/${petProfilePhotoLimit}`;
}

function getPrimaryThumbUri(photos: readonly PetProfilePhoto[]) {
  const primary = photos[0];

  if (!primary) {
    return undefined;
  }

  return primary.thumbUri ?? primary.uri;
}

function formatRelatedSummary(profile: PetProfileSummary) {
  const activeCount = profile.relatedRecords.filter(
    (record) => record.status === "active",
  ).length;
  const closedCount = profile.relatedRecords.filter(
    (record) => record.status === "closed",
  ).length;
  const parts: string[] = [];

  if (activeCount > 0) {
    parts.push(`${activeCount} reporte${activeCount === 1 ? "" : "s"} activo`);
  }

  if (closedCount > 0) {
    parts.push(`${closedCount} cerrado${closedCount === 1 ? "" : "s"}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Sin reportes activos";
}

function relatedKindLabel(
  kind: PetProfileSummary["relatedRecords"][number]["kind"],
) {
  switch (kind) {
    case "lost-report":
      return "Reporte de perdida";
    case "found-report":
      return "Reporte de encontrada";
    case "sighting-report":
      return "Avistamiento";
    case "adoption-listing":
      return "Adopcion";
  }
}

function toOptionalLabel(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeDraftPhotos(
  photos: readonly PetProfilePhoto[],
): PetProfilePhoto[] {
  return photos.slice(0, petProfilePhotoLimit).map((photo, index) => {
    const sourceUri = getSourceUri(photo);
    const thumbUri = getThumbnailUri(photo, sourceUri);
    const uri = getCompressedUri(photo, sourceUri);

    return {
      ...photo,
      compression: photo.compression ?? createCompressionMetadata(),
      exif: photo.exif ?? createExifMetadata(),
      id: photo.id,
      mimeType: photo.mimeType ?? "image/jpeg",
      position: index,
      sourceUri,
      status: photo.status ?? "ready",
      thumbnail: photo.thumbnail ?? createThumbnailMetadata(thumbUri),
      thumbUri,
      uri,
    };
  });
}

function getSourceUri(photo: PetProfilePhoto) {
  return photo.sourceUri ?? photo.uri ?? "";
}

function getThumbnailUri(photo: PetProfilePhoto, sourceUri: string) {
  return (
    photo.thumbUri ??
    photo.thumbnail?.uri ??
    (sourceUri ? `${sourceUri}#rastro-thumbnail` : undefined)
  );
}

function getCompressedUri(photo: PetProfilePhoto, sourceUri: string) {
  if (photo.uri?.includes("#rastro-compressed")) {
    return photo.uri;
  }

  return sourceUri ? `${sourceUri}#rastro-compressed` : photo.uri;
}

function createCompressionMetadata() {
  return {
    applied: true,
    maxDimensionPx: 1600,
    outputMimeType: "image/jpeg" as const,
    quality: 0.82,
  };
}

function createExifMetadata() {
  return {
    locationStripped: true,
    stripped: true,
  };
}

function createThumbnailMetadata(uri?: string) {
  return {
    generated: true,
    height: 320,
    uri: uri ?? "",
    width: 320,
  };
}
