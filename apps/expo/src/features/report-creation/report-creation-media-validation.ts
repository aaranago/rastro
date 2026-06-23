import type { ReportLocationDraft } from "./report-location-draft";
import { appendRequiredPetSelectionErrors } from "./report-creation-pet-selection";
import { validateReportLocationDraft } from "./report-location-draft";

export interface ReportCreationPhotoUploadState {
  mediaId?: string;
  status?: "draft" | "error" | "ready" | "uploading";
}

export function getReadyUploadedReportCreationPhotos<
  TPhoto extends ReportCreationPhotoUploadState,
>(photos: readonly TPhoto[]) {
  return photos.filter(
    (photo) => photo.status === "ready" && Boolean(photo.mediaId),
  );
}

export function getRequiredReportCreationPhotoStepError(
  photos: readonly ReportCreationPhotoUploadState[],
) {
  if (photos.length === 0) {
    return "Agrega al menos una foto.";
  }

  return getOptionalReportCreationPhotoStepError(photos);
}

export function getOptionalReportCreationPhotoStepError(
  photos: readonly ReportCreationPhotoUploadState[],
) {
  if (photos.some((photo) => photo.status === "error")) {
    return "Reintenta las fotos con error antes de continuar.";
  }

  if (
    photos.length > 0 &&
    getReadyUploadedReportCreationPhotos(photos).length !== photos.length
  ) {
    return "Espera a que las fotos terminen de subirse.";
  }

  return undefined;
}

export function appendRequiredReportCreationDraftErrors<
  TPhoto extends ReportCreationPhotoUploadState,
>({
  errors,
  exactLocation,
  hasSelectedPet,
  photos,
}: {
  errors: string[];
  exactLocation?: ReportLocationDraft;
  hasSelectedPet: boolean;
  photos: readonly TPhoto[];
}) {
  appendRequiredPetSelectionErrors({
    errors,
    hasExactLocation: Boolean(exactLocation),
    hasSelectedPet,
    photoCount: photos.length,
  });

  const photoStepError =
    photos.length > 0
      ? getRequiredReportCreationPhotoStepError(photos)
      : undefined;

  if (photoStepError) {
    errors.push(photoStepError);
  }

  if (exactLocation) {
    errors.push(...validateReportLocationDraft(exactLocation));
  }
}

export function appendRequiredReportCreationPhotoUploadErrors<
  TPhoto extends ReportCreationPhotoUploadState,
>({ errors, photos }: { errors: string[]; photos: readonly TPhoto[] }) {
  const photoStepError = getRequiredReportCreationPhotoStepError(photos);

  if (photoStepError) {
    errors.push(photoStepError);
  }
}

export function appendReportCreationLocationErrors({
  errors,
  location,
  missingMessage,
}: {
  errors: string[];
  location?: ReportLocationDraft;
  missingMessage: string;
}) {
  if (!location) {
    errors.push(missingMessage);
    return;
  }

  errors.push(...validateReportLocationDraft(location));
}
