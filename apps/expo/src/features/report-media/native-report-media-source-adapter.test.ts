import { describe, expect, it, vi } from "vitest";

import { createNativeReportMediaSourceAdapter } from "./native-report-media-source-adapter";

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
}));

vi.mock("expo-image-picker", () => ({
  launchCameraAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(),
  requestMediaLibraryPermissionsAsync: vi.fn(),
}));

describe("native report media source adapter", () => {
  it("does not load native modules until the user chooses a media source", async () => {
    const adapter = createNativeReportMediaSourceAdapter({
      loadFileSystem: () => {
        throw new Error("File system native module unavailable");
      },
      loadImagePicker: () => {
        throw new Error("Image picker native module unavailable");
      },
    });

    await expect(adapter.pickImagesFromLibrary()).resolves.toEqual({
      message: "Image picker native module unavailable",
      status: "unavailable",
    });
  });

  it("maps a picked library image into selected local report-image metadata", async () => {
    const adapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(() =>
          Promise.resolve({
            exists: true,
            isDirectory: false,
            size: 321_000,
            uri: "file:///library/photo-1.jpg",
          }),
        ),
      },
      imagePicker: {
        launchCameraAsync: vi.fn(),
        launchImageLibraryAsync: vi.fn(() =>
          Promise.resolve({
            assets: [
              {
                height: 900,
                mimeType: "image/jpeg",
                type: "image" as const,
                uri: "file:///library/photo-1.jpg",
                width: 1200,
              },
            ],
            canceled: false as const,
          }),
        ),
        requestCameraPermissionsAsync: vi.fn(),
        requestMediaLibraryPermissionsAsync: vi.fn(() =>
          Promise.resolve({
            canAskAgain: true,
            expires: "never",
            granted: true,
            status: "granted",
          }),
        ),
      },
    });

    await expect(adapter.pickImagesFromLibrary()).resolves.toEqual({
      images: [
        {
          height: 900,
          mimeType: "image/jpeg",
          originalUri: "file:///library/photo-1.jpg",
          sizeBytes: 321_000,
          width: 1200,
        },
      ],
      status: "selected",
    });
  });

  it("returns recoverable source states when permission, picker, or native capability blocks selection", async () => {
    const deniedAdapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(),
      },
      imagePicker: {
        launchCameraAsync: vi.fn(),
        launchImageLibraryAsync: vi.fn(),
        requestCameraPermissionsAsync: vi.fn(() =>
          Promise.resolve({
            canAskAgain: false,
            expires: "never",
            granted: false,
            status: "denied",
          }),
        ),
        requestMediaLibraryPermissionsAsync: vi.fn(),
      },
    });

    await expect(deniedAdapter.launchCamera()).resolves.toEqual({
      canAskAgain: false,
      status: "denied",
    });

    const canceledAdapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(),
      },
      imagePicker: {
        launchCameraAsync: vi.fn(),
        launchImageLibraryAsync: vi.fn(() =>
          Promise.resolve({
            assets: null,
            canceled: true as const,
          }),
        ),
        requestCameraPermissionsAsync: vi.fn(),
        requestMediaLibraryPermissionsAsync: vi.fn(() =>
          Promise.resolve({
            canAskAgain: true,
            expires: "never",
            granted: true,
            status: "granted",
          }),
        ),
      },
    });

    await expect(canceledAdapter.pickImagesFromLibrary()).resolves.toEqual({
      status: "canceled",
    });

    const unavailableAdapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(),
      },
      imagePicker: {
        launchCameraAsync: vi.fn(() =>
          Promise.reject(new Error("Camera unavailable")),
        ),
        launchImageLibraryAsync: vi.fn(),
        requestCameraPermissionsAsync: vi.fn(() =>
          Promise.resolve({
            canAskAgain: true,
            expires: "never",
            granted: true,
            status: "granted",
          }),
        ),
        requestMediaLibraryPermissionsAsync: vi.fn(),
      },
    });

    await expect(unavailableAdapter.launchCamera()).resolves.toEqual({
      message: "Camera unavailable",
      status: "unavailable",
    });

    const permissionUnavailableAdapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(),
      },
      imagePicker: {
        launchCameraAsync: vi.fn(),
        launchImageLibraryAsync: vi.fn(),
        requestCameraPermissionsAsync: vi.fn(() =>
          Promise.reject(new Error("Permission API unavailable")),
        ),
        requestMediaLibraryPermissionsAsync: vi.fn(),
      },
    });

    await expect(permissionUnavailableAdapter.launchCamera()).resolves.toEqual({
      message: "Permission API unavailable",
      status: "unavailable",
    });
  });

  it("rejects selected assets with missing dimensions before upload metadata is accepted", async () => {
    const adapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(() =>
          Promise.resolve({
            exists: true,
            isDirectory: false,
            size: 321_000,
            uri: "file:///library/broken-photo.jpg",
          }),
        ),
      },
      imagePicker: {
        launchCameraAsync: vi.fn(),
        launchImageLibraryAsync: vi.fn(() =>
          Promise.resolve({
            assets: [
              {
                height: 0,
                mimeType: "image/jpeg",
                type: "image" as const,
                uri: "file:///library/broken-photo.jpg",
                width: 1200,
              },
            ],
            canceled: false as const,
          }),
        ),
        requestCameraPermissionsAsync: vi.fn(),
        requestMediaLibraryPermissionsAsync: vi.fn(() =>
          Promise.resolve({
            canAskAgain: true,
            expires: "never",
            granted: true,
            status: "granted",
          }),
        ),
      },
    });

    await expect(adapter.pickImagesFromLibrary()).resolves.toEqual({
      message: "Selected image dimensions are unavailable.",
      status: "unavailable",
    });
  });
});
