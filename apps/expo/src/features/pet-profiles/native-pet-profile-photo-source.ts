import type { NativeReportMediaSourceAdapter } from "../report-media/native-report-media-source-adapter";
import type { PetProfileDraft, PetProfilePhoto } from "./pet-profile-types";
import { createNativeReportMediaSourceAdapter } from "../report-media/native-report-media-source-adapter";

export interface NativePetProfilePhotoPickerInput {
  mediaSource?: NativeReportMediaSourceAdapter;
  now?: () => number;
}

export function createNativePetProfilePhotoPicker({
  mediaSource = createNativeReportMediaSourceAdapter(),
  now = Date.now,
}: NativePetProfilePhotoPickerInput = {}) {
  return async function pickPetProfilePhoto(
    draft: PetProfileDraft,
  ): Promise<PetProfilePhoto | void> {
    const result = await mediaSource.pickImagesFromLibrary();

    switch (result.status) {
      case "selected": {
        const image = result.images[0];

        if (!image) {
          throw new Error("No pudimos leer la foto seleccionada.");
        }

        return {
          height: image.height,
          id: `pet-profile-photo-${now()}-${draft.photos.length}`,
          mimeType: image.mimeType,
          sourceUri: image.originalUri,
          status: "draft",
          thumbUri: image.originalUri,
          uri: image.originalUri,
          width: image.width,
        };
      }
      case "canceled":
        return undefined;
      case "denied":
        throw new Error(
          result.canAskAgain
            ? "Permite acceso a tus fotos para agregarlas al perfil."
            : "Activa el permiso de fotos desde ajustes para agregarlas al perfil.",
        );
      case "unavailable":
        throw new Error(result.message);
    }
  };
}
