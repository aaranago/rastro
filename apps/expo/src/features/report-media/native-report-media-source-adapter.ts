import type { SelectedLocalReportImage } from "./report-media-draft";

export interface NativePermissionResponse {
  canAskAgain: boolean;
  granted: boolean;
}

export interface NativeImagePickerAsset {
  fileSize?: number;
  height: number;
  mimeType?: string;
  type?: "image" | "livePhoto" | "pairedVideo" | "video" | null;
  uri: string;
  width: number;
}

export type NativeImagePickerResult =
  | {
      assets: NativeImagePickerAsset[];
      canceled: false;
    }
  | {
      assets: null;
      canceled: true;
    };

export interface NativeImagePicker {
  launchCameraAsync(
    options: Record<string, unknown>,
  ): Promise<NativeImagePickerResult>;
  launchImageLibraryAsync(
    options: Record<string, unknown>,
  ): Promise<NativeImagePickerResult>;
  requestCameraPermissionsAsync(): Promise<NativePermissionResponse>;
  requestMediaLibraryPermissionsAsync(
    writeOnly?: boolean,
  ): Promise<NativePermissionResponse>;
}

export type NativeReportMediaSourceFileInfo =
  | {
      exists: true;
      isDirectory: boolean;
      size: number;
      uri: string;
    }
  | {
      exists: false;
      uri?: string;
    };

export interface NativeReportMediaSourceFileSystem {
  cacheDirectory?: string | null;
  copyAsync?: (options: { from: string; to: string }) => Promise<void>;
  documentDirectory?: string | null;
  getInfoAsync(uri: string): Promise<NativeReportMediaSourceFileInfo>;
}

interface ExpoFileSystemModule extends NativeReportMediaSourceFileSystem {
  FileSystemUploadType?: unknown;
  createUploadTask?: unknown;
}

type NativeImagePickerModuleName =
  | "launchCameraAsync"
  | "launchImageLibraryAsync"
  | "requestCameraPermissionsAsync"
  | "requestMediaLibraryPermissionsAsync";

export type NativeReportMediaSourceResult =
  | { images: SelectedLocalReportImage[]; status: "selected" }
  | { status: "canceled" }
  | { canAskAgain: boolean; status: "denied" }
  | { message: string; status: "unavailable" };

type PermissionedNativePick = () => Promise<
  NativeReportMediaSourceResult | NativeImagePickerResult
>;

export interface NativeReportMediaSourceAdapter {
  launchCamera(): Promise<NativeReportMediaSourceResult>;
  pickImagesFromLibrary(): Promise<NativeReportMediaSourceResult>;
}

export interface CreateNativeReportMediaSourceAdapterInput {
  fileSystem?: NativeReportMediaSourceFileSystem;
  imagePicker?: NativeImagePicker;
  loadFileSystem?: () => NativeReportMediaSourceFileSystem;
  loadImagePicker?: () => NativeImagePicker;
}

declare const require:
  | undefined
  | ((moduleName: string) => ExpoFileSystemModule | NativeImagePicker);

export function createNativeReportMediaSourceAdapter({
  fileSystem,
  imagePicker,
  loadFileSystem = loadExpoFileSystem,
  loadImagePicker = loadExpoImagePicker,
}: CreateNativeReportMediaSourceAdapterInput = {}): NativeReportMediaSourceAdapter {
  const resolveFileSystem = () => fileSystem ?? loadFileSystem();
  const resolveImagePicker = () => imagePicker ?? loadImagePicker();

  return {
    async launchCamera() {
      return pickWithPermission(async () => {
        const picker = resolveImagePicker();
        const permission = await picker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          return {
            canAskAgain: permission.canAskAgain,
            status: "denied",
          };
        }

        return picker.launchCameraAsync({
          allowsEditing: false,
          base64: false,
          mediaTypes: ["images"],
          quality: 1,
        });
      });
    },
    async pickImagesFromLibrary() {
      return pickWithPermission(async () => {
        const picker = resolveImagePicker();
        const permission =
          await picker.requestMediaLibraryPermissionsAsync(false);

        if (!permission.granted) {
          return {
            canAskAgain: permission.canAskAgain,
            status: "denied",
          };
        }

        return picker.launchImageLibraryAsync({
          allowsEditing: false,
          allowsMultipleSelection: false,
          base64: false,
          mediaTypes: ["images"],
          quality: 1,
        });
      });
    },
  };

  async function pickWithPermission(
    pick: PermissionedNativePick,
  ): Promise<NativeReportMediaSourceResult> {
    try {
      const result = await pick();

      if ("status" in result) {
        return result;
      }

      if (result.canceled) {
        return { status: "canceled" };
      }

      const images = await Promise.all(
        result.assets.map((asset) => mapAssetToSelectedImage(asset)),
      );

      return {
        images,
        status: "selected",
      };
    } catch (error) {
      return {
        message:
          error instanceof Error ? error.message : "Media is unavailable.",
        status: "unavailable",
      };
    }
  }

  async function mapAssetToSelectedImage(
    asset: NativeImagePickerAsset,
  ): Promise<SelectedLocalReportImage> {
    if (asset.width <= 0 || asset.height <= 0) {
      throw new Error("Selected image dimensions are unavailable.");
    }

    const mimeType = toSupportedImageMimeType(asset.mimeType);
    const originalUri = await resolveCropperReadableAssetUri(asset, mimeType);
    const fileSize = await resolveAssetFileSize({
      ...asset,
      uri: originalUri,
    });

    return {
      height: asset.height,
      mimeType,
      originalUri,
      sizeBytes: fileSize,
      width: asset.width,
    };
  }

  async function resolveCropperReadableAssetUri(
    asset: NativeImagePickerAsset,
    mimeType: SelectedLocalReportImage["mimeType"],
  ) {
    if (isNativeFileUri(asset.uri)) {
      return asset.uri.startsWith("file://")
        ? asset.uri
        : `file://${asset.uri}`;
    }

    const fileSystem = resolveFileSystem();

    if (!fileSystem.copyAsync) {
      throw new Error("Selected image cannot be prepared for editing.");
    }

    const cacheRoot = fileSystem.cacheDirectory ?? fileSystem.documentDirectory;

    if (!cacheRoot) {
      throw new Error("Media cache is unavailable.");
    }

    const destinationUri = `${cacheRoot.replace(/\/?$/, "/")}rastro-report-media-${Date.now()}-${Math.round(
      Math.random() * 1_000_000,
    )}.${extensionForMimeType(mimeType)}`;

    await fileSystem.copyAsync({
      from: asset.uri,
      to: destinationUri,
    });

    return destinationUri;
  }

  async function resolveAssetFileSize(asset: NativeImagePickerAsset) {
    if (asset.fileSize && asset.fileSize > 0) {
      return asset.fileSize;
    }

    const info = await resolveFileSystem().getInfoAsync(asset.uri);

    if (info.exists && !info.isDirectory && info.size > 0) {
      return info.size;
    }

    throw new Error("Selected image file size is unavailable.");
  }
}

function loadExpoImagePicker(): NativeImagePicker {
  if (typeof require !== "function") {
    throw new Error("expo-image-picker is unavailable.");
  }

  return require("expo-image-picker") as Pick<
    NativeImagePicker,
    NativeImagePickerModuleName
  >;
}

function loadExpoFileSystem(): NativeReportMediaSourceFileSystem {
  if (typeof require !== "function") {
    throw new Error("expo-file-system/legacy is unavailable.");
  }

  return require("expo-file-system/legacy") as ExpoFileSystemModule;
}

function toSupportedImageMimeType(
  mimeType: string | undefined,
): SelectedLocalReportImage["mimeType"] {
  switch (mimeType) {
    case "image/jpeg":
    case "image/png":
    case "image/webp":
    case "image/heic":
    case "image/heif":
      return mimeType;
    default:
      throw new Error("Selected image type is unsupported.");
  }
}

function isNativeFileUri(uri: string) {
  return uri.startsWith("file://") || uri.startsWith("/");
}

function extensionForMimeType(mimeType: SelectedLocalReportImage["mimeType"]) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
  }
}
