import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      message: "No pudimos abrir tus fotos o cámara. Intenta nuevamente.",
      status: "unavailable",
    });
  });

  it("maps a picked library image into selected local report-image metadata", async () => {
    const launchImageLibraryAsync = vi.fn(() =>
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
    );
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
        launchImageLibraryAsync,
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
    expect(launchImageLibraryAsync).toHaveBeenCalledWith({
      allowsEditing: false,
      allowsMultipleSelection: false,
      base64: false,
      mediaTypes: ["images"],
      quality: 1,
    });
  });

  it("copies Android content picker assets into cache before returning them for editing", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_725_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const copyAsync = vi.fn(() => Promise.resolve());
    const getInfoAsync = vi.fn((uri: string) =>
      Promise.resolve({
        exists: true,
        isDirectory: false,
        size: uri.startsWith("file:///cache/") ? 456_000 : 0,
        uri,
      }),
    );
    const adapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        cacheDirectory: "file:///cache/",
        copyAsync,
        getInfoAsync,
      },
      imagePicker: {
        launchCameraAsync: vi.fn(),
        launchImageLibraryAsync: vi.fn(() =>
          Promise.resolve({
            assets: [
              {
                height: 1000,
                mimeType: "image/jpeg",
                type: "image" as const,
                uri: "content://media/external/images/media/42",
                width: 1000,
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
          height: 1000,
          mimeType: "image/jpeg",
          originalUri:
            "file:///cache/rastro-report-media-1725000000000-420000.jpg",
          sizeBytes: 456_000,
          width: 1000,
        },
      ],
      status: "selected",
    });
    expect(copyAsync).toHaveBeenCalledWith({
      from: "content://media/external/images/media/42",
      to: "file:///cache/rastro-report-media-1725000000000-420000.jpg",
    });
    expect(getInfoAsync).toHaveBeenCalledWith(
      "file:///cache/rastro-report-media-1725000000000-420000.jpg",
    );
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

    const launchCameraAsync = vi.fn(() =>
      Promise.reject(new Error("Camera unavailable")),
    );
    const unavailableAdapter = createNativeReportMediaSourceAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(),
      },
      imagePicker: {
        launchCameraAsync,
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
      message: "No pudimos abrir tus fotos o cámara. Intenta nuevamente.",
      status: "unavailable",
    });
    expect(launchCameraAsync).toHaveBeenCalledWith({
      allowsEditing: false,
      base64: false,
      mediaTypes: ["images"],
      quality: 1,
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
      message: "No pudimos abrir tus fotos o cámara. Intenta nuevamente.",
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
      message: "No pudimos abrir tus fotos o cámara. Intenta nuevamente.",
      status: "unavailable",
    });
  });
});
