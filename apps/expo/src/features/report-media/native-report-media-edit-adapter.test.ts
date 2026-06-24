import { describe, expect, it, vi } from "vitest";

import { createNativeReportMediaEditAdapter } from "./native-report-media-edit-adapter";

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
}));

vi.mock("expo-image-manipulator", () => ({
  manipulateAsync: vi.fn(),
}));

describe("native report media edit adapter", () => {
  it("does not load native modules while creating the adapter", () => {
    expect(() =>
      createNativeReportMediaEditAdapter({
        loadImageCropPicker: () => {
          throw new Error("Image cropper native module unavailable");
        },
        loadFileSystem: () => {
          throw new Error("File system native module unavailable");
        },
        loadImageManipulator: () => {
          throw new Error("Image manipulator native module unavailable");
        },
      }),
    ).not.toThrow();
  });

  it("opens the native cropper for interactive edits and maps its local file metadata", async () => {
    const openCropper = vi.fn(() =>
      Promise.resolve({
        height: 1180,
        mime: "image/jpeg",
        path: "/data/user/0/bo.rastro.app/cache/crop-result.jpg",
        size: 245_000,
        width: 1180,
      }),
    );
    const adapter = createNativeReportMediaEditAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(),
      },
      imageCropPicker: {
        openCropper,
      },
      loadImageManipulator: () => {
        throw new Error("Image manipulator should not be used");
      },
    });

    await expect(
      adapter.editImage({
        export: {
          mimeType: "image/jpeg",
        },
        localId: "local-photo-1",
        sourceUri: "file:///camera/original.jpg",
      }),
    ).resolves.toEqual({
      height: 1180,
      localId: "local-photo-1",
      mimeType: "image/jpeg",
      sizeBytes: 245_000,
      uri: "file:///data/user/0/bo.rastro.app/cache/crop-result.jpg",
      width: 1180,
    });

    expect(openCropper).toHaveBeenCalledWith(
      expect.objectContaining({
        cropperCancelText: "Cancelar",
        cropperChooseText: "Aplicar",
        cropperToolbarTitle: "Editar foto",
        enableRotationGesture: true,
        freeStyleCropEnabled: true,
        height: 1200,
        mediaType: "photo",
        path: "file:///camera/original.jpg",
        showCropFrame: true,
        showCropGuidelines: true,
        width: 1200,
      }),
    );
  });

  it("applies rotation before crop and returns accepted edited image metadata with local file size", async () => {
    const manipulateAsync = vi.fn(() =>
      Promise.resolve({
        height: 900,
        uri: "file:///edited/local-photo-1.webp",
        width: 1200,
      }),
    );
    const adapter = createNativeReportMediaEditAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(() =>
          Promise.resolve({
            exists: true,
            isDirectory: false,
            size: 280_000,
            uri: "file:///edited/local-photo-1.webp",
          }),
        ),
      },
      imageManipulator: {
        manipulateAsync,
      },
    });

    await expect(
      adapter.editImage({
        crop: {
          height: 900,
          originX: 100,
          originY: 25,
          width: 1200,
        },
        export: {
          compress: 0.82,
          mimeType: "image/webp",
        },
        localId: "local-photo-1",
        rotateBeforeCrop: true,
        rotateDegrees: 90,
        sourceUri: "file:///camera/original.jpg",
      }),
    ).resolves.toEqual({
      height: 900,
      localId: "local-photo-1",
      mimeType: "image/webp",
      sizeBytes: 280_000,
      uri: "file:///edited/local-photo-1.webp",
      width: 1200,
    });

    expect(manipulateAsync).toHaveBeenCalledWith(
      "file:///camera/original.jpg",
      [
        {
          rotate: 90,
        },
        {
          crop: {
            height: 900,
            originX: 100,
            originY: 25,
            width: 1200,
          },
        },
      ],
      {
        base64: false,
        compress: 0.82,
        format: "webp",
      },
    );
  });
});
