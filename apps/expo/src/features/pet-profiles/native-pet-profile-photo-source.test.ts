import { describe, expect, it } from "vitest";

import type { PetProfileDraft } from "./pet-profile-types";
import { createNativePetProfilePhotoPicker } from "./native-pet-profile-photo-source";

const draft: PetProfileDraft = {
  breed: "Mestizo",
  description: "Collar rojo",
  name: "Tito",
  photos: [{ id: "existing-photo", uri: "file:///existing.jpg" }],
  type: "Perro",
};

describe("native Pet Profile photo picker", () => {
  it("maps the native report media picker result into a draft Pet Profile photo", async () => {
    const pickPetProfilePhoto = createNativePetProfilePhotoPicker({
      mediaSource: {
        launchCamera: () => Promise.resolve({ status: "canceled" }),
        pickImagesFromLibrary: () =>
          Promise.resolve({
            images: [
              {
                height: 800,
                mimeType: "image/jpeg",
                originalUri: "file:///picked-tito.jpg",
                sizeBytes: 120_000,
                width: 1200,
              },
            ],
            status: "selected",
          }),
      },
      now: () => 1782927800000,
    });

    await expect(pickPetProfilePhoto(draft)).resolves.toMatchObject({
      height: 800,
      id: "pet-profile-photo-1782927800000-1",
      mimeType: "image/jpeg",
      sourceUri: "file:///picked-tito.jpg",
      status: "draft",
      thumbUri: "file:///picked-tito.jpg",
      uri: "file:///picked-tito.jpg",
      width: 1200,
    });
  });

  it("returns nothing when the user cancels picking a photo", async () => {
    const pickPetProfilePhoto = createNativePetProfilePhotoPicker({
      mediaSource: {
        launchCamera: () => Promise.resolve({ status: "canceled" }),
        pickImagesFromLibrary: () => Promise.resolve({ status: "canceled" }),
      },
    });

    await expect(pickPetProfilePhoto(draft)).resolves.toBeUndefined();
  });

  it("surfaces denied photo permissions with actionable Spanish copy", async () => {
    const pickPetProfilePhoto = createNativePetProfilePhotoPicker({
      mediaSource: {
        launchCamera: () => Promise.resolve({ status: "canceled" }),
        pickImagesFromLibrary: () =>
          Promise.resolve({
            canAskAgain: false,
            status: "denied",
          }),
      },
    });

    await expect(pickPetProfilePhoto(draft)).rejects.toThrow(
      "Activa el permiso de fotos desde ajustes",
    );
  });
});
