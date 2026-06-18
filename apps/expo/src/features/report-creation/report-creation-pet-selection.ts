export interface ReportCreationInlinePetDraft<TType extends string> {
  breed: string;
  description: string;
  name: string;
  type: TType | "";
}

export interface ReportCreationPetProfileOption<TType extends string, TPhoto> {
  breed: string;
  description: string;
  id: string;
  name: string;
  photos: readonly TPhoto[];
  type: TType;
}

export interface ReportCreationSelectedPet<TType extends string> {
  breedLabel?: string;
  description: string;
  id?: string;
  name: string;
  thumbnailUri?: string;
  typeLabel: TType;
}

export function appendRequiredPetSelectionErrors({
  errors,
  hasExactLocation,
  hasSelectedPet,
  photoCount,
}: {
  errors: string[];
  hasExactLocation: boolean;
  hasSelectedPet: boolean;
  photoCount: number;
}) {
  if (!hasSelectedPet) {
    errors.push("Elige un Pet Profile o crea uno en linea.");
  }

  if (photoCount === 0) {
    errors.push("Agrega al menos una foto.");
  }

  if (!hasExactLocation) {
    errors.push("Selecciona la Exact Location interna.");
  }
}

export function getReportCreationSelectedProfile<
  TProfile extends { id: string },
  TDraft extends { petProfileId?: string; petSelectionMode: string },
>(draft: TDraft, petProfiles: readonly TProfile[]) {
  if (draft.petSelectionMode !== "existing") {
    return undefined;
  }

  return petProfiles.find((profile) => profile.id === draft.petProfileId);
}

export function getReportCreationSelectedPet<TType extends string, TPhoto>({
  draftPhotos,
  getPhotoUri,
  inlinePet,
  selectedProfile,
  toOptionalLabel,
  typeOptions,
}: {
  draftPhotos: readonly TPhoto[];
  getPhotoUri: (photo: TPhoto | undefined) => string | undefined;
  inlinePet: ReportCreationInlinePetDraft<TType>;
  selectedProfile?: ReportCreationPetProfileOption<TType, TPhoto>;
  toOptionalLabel: (value: string) => string | undefined;
  typeOptions: readonly TType[];
}): ReportCreationSelectedPet<TType> | undefined {
  if (selectedProfile) {
    return {
      breedLabel: toOptionalLabel(selectedProfile.breed),
      description: selectedProfile.description,
      id: selectedProfile.id,
      name: selectedProfile.name,
      thumbnailUri: getPhotoUri(selectedProfile.photos[0]),
      typeLabel: selectedProfile.type,
    };
  }

  if (!hasValidReportCreationInlinePet(inlinePet, typeOptions)) {
    return undefined;
  }

  return {
    breedLabel: toOptionalLabel(inlinePet.breed),
    description: inlinePet.description,
    name: inlinePet.name.trim(),
    thumbnailUri: getPhotoUri(draftPhotos[0]),
    typeLabel: inlinePet.type,
  };
}

export function hasValidReportCreationInlinePet<TType extends string>(
  inlinePet: ReportCreationInlinePetDraft<TType>,
  typeOptions: readonly TType[],
): inlinePet is ReportCreationInlinePetDraft<TType> & { type: TType } {
  return (
    inlinePet.name.trim().length > 0 &&
    typeOptions.includes(inlinePet.type as TType)
  );
}
