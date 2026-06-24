import type { AcceptedEditedReportImage } from "./report-media-draft";

export type NativeImageManipulationAction =
  | {
      crop: {
        height: number;
        originX: number;
        originY: number;
        width: number;
      };
    }
  | { rotate: number };

export interface NativeImageCropPickerResult {
  cropRect?: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  height: number;
  mime?: string;
  path: string;
  size?: number;
  width: number;
}

export interface NativeImageCropPicker {
  openCropper(options: {
    compressImageMaxHeight?: number;
    compressImageMaxWidth?: number;
    compressImageQuality?: number;
    cropperActiveWidgetColor?: string;
    cropperCancelColor?: string;
    cropperCancelText?: string;
    cropperChooseColor?: string;
    cropperChooseText?: string;
    cropperNavigationBarLight?: boolean;
    cropperStatusBarLight?: boolean;
    cropperToolbarColor?: string;
    cropperToolbarTitle?: string;
    cropperToolbarWidgetColor?: string;
    enableRotationGesture?: boolean;
    forceJpg?: boolean;
    freeStyleCropEnabled?: boolean;
    height: number;
    hideBottomControls?: boolean;
    mediaType?: "photo";
    path: string;
    showCropFrame?: boolean;
    showCropGuidelines?: boolean;
    width: number;
  }): Promise<NativeImageCropPickerResult>;
}

export interface NativeImageManipulator {
  manipulateAsync(
    uri: string,
    actions: NativeImageManipulationAction[],
    saveOptions: {
      base64: false;
      compress: number;
      format: "jpeg" | "png" | "webp";
    },
  ): Promise<{
    height: number;
    uri: string;
    width: number;
  }>;
}

export type NativeReportMediaEditFileInfo =
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

export interface NativeReportMediaEditFileSystem {
  getInfoAsync(uri: string): Promise<NativeReportMediaEditFileInfo>;
}

export type NativeEditableImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

export interface NativeReportMediaEditInput {
  crop?: {
    height: number;
    originX: number;
    originY: number;
    width: number;
  };
  export: {
    compress?: number;
    mimeType: NativeEditableImageMimeType;
  };
  localId: string;
  rotateBeforeCrop?: boolean;
  rotateDegrees?: number;
  sourceUri: string;
}

export interface NativeReportMediaEditAdapter {
  editImage(
    input: NativeReportMediaEditInput,
  ): Promise<AcceptedEditedReportImage>;
}

export interface CreateNativeReportMediaEditAdapterInput {
  imageCropPicker?: NativeImageCropPicker;
  fileSystem?: NativeReportMediaEditFileSystem;
  imageManipulator?: NativeImageManipulator;
  loadImageCropPicker?: () => NativeImageCropPicker;
  loadFileSystem?: () => NativeReportMediaEditFileSystem;
  loadImageManipulator?: () => NativeImageManipulator;
}

declare const require:
  | undefined
  | ((
      moduleName: string,
    ) =>
      | NativeImageCropPicker
      | { default: NativeImageCropPicker }
      | NativeReportMediaEditFileSystem
      | NativeImageManipulator);

export function createNativeReportMediaEditAdapter({
  fileSystem,
  imageCropPicker,
  imageManipulator,
  loadImageCropPicker = loadReactNativeImageCropPicker,
  loadFileSystem = loadExpoFileSystem,
  loadImageManipulator = loadExpoImageManipulator,
}: CreateNativeReportMediaEditAdapterInput = {}): NativeReportMediaEditAdapter {
  const resolveImageCropPicker = () => imageCropPicker ?? loadImageCropPicker();
  const resolveFileSystem = () => fileSystem ?? loadFileSystem();
  const resolveImageManipulator = () =>
    imageManipulator ?? loadImageManipulator();

  return {
    async editImage(input) {
      if (!input.crop && !input.rotateDegrees) {
        return editImageWithNativeCropper({
          cropPicker: resolveImageCropPicker(),
          fileSystem: resolveFileSystem(),
          input,
        });
      }

      const actions = createManipulationActions(input);
      const mimeType = input.export.mimeType;
      const result = await resolveImageManipulator().manipulateAsync(
        input.sourceUri,
        actions,
        {
          base64: false,
          compress: input.export.compress ?? 0.85,
          format: saveFormatForMimeType(mimeType),
        },
      );
      const sizeBytes = await getExistingFileSize(
        resolveFileSystem(),
        result.uri,
      );

      return {
        height: result.height,
        localId: input.localId,
        mimeType,
        sizeBytes,
        uri: result.uri,
        width: result.width,
      };
    },
  };
}

async function editImageWithNativeCropper({
  cropPicker,
  fileSystem,
  input,
}: {
  cropPicker: NativeImageCropPicker;
  fileSystem: NativeReportMediaEditFileSystem;
  input: NativeReportMediaEditInput;
}): Promise<AcceptedEditedReportImage> {
  const result = await cropPicker.openCropper({
    compressImageMaxHeight: 1600,
    compressImageMaxWidth: 1600,
    compressImageQuality: 0.86,
    cropperActiveWidgetColor: "#147A68",
    cropperCancelColor: "#147A68",
    cropperCancelText: "Cancelar",
    cropperChooseColor: "#147A68",
    cropperChooseText: "Aplicar",
    cropperNavigationBarLight: false,
    cropperStatusBarLight: false,
    cropperToolbarColor: "#101713",
    cropperToolbarTitle: "Editar foto",
    cropperToolbarWidgetColor: "#FFFFFF",
    enableRotationGesture: true,
    forceJpg: input.export.mimeType === "image/jpeg",
    freeStyleCropEnabled: true,
    height: 1200,
    hideBottomControls: false,
    mediaType: "photo",
    path: normalizeCropPickerInputPath(input.sourceUri),
    showCropFrame: true,
    showCropGuidelines: true,
    width: 1200,
  });
  const uri = normalizeCropPickerResultUri(result.path);
  const sizeBytes =
    result.size && result.size > 0
      ? result.size
      : await getExistingFileSize(fileSystem, uri);

  return {
    height: result.height,
    localId: input.localId,
    mimeType: toEditableOutputMimeType(result.mime) ?? input.export.mimeType,
    sizeBytes,
    uri,
    width: result.width,
  };
}

function createManipulationActions(
  input: NativeReportMediaEditInput,
): NativeImageManipulationAction[] {
  const actions: NativeImageManipulationAction[] = [];

  if (input.rotateBeforeCrop && input.rotateDegrees) {
    actions.push({ rotate: input.rotateDegrees });
  }

  if (input.crop) {
    actions.push({ crop: input.crop });
  }

  if (!input.rotateBeforeCrop && input.rotateDegrees) {
    actions.push({ rotate: input.rotateDegrees });
  }

  return actions;
}

async function getExistingFileSize(
  fileSystem: NativeReportMediaEditFileSystem,
  uri: string,
): Promise<number> {
  const info = await fileSystem.getInfoAsync(uri);

  if (info.exists && !info.isDirectory && info.size > 0) {
    return info.size;
  }

  throw new Error("Edited image file size is unavailable.");
}

function saveFormatForMimeType(
  mimeType: NativeReportMediaEditInput["export"]["mimeType"],
): "jpeg" | "png" | "webp" {
  switch (mimeType) {
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

function normalizeCropPickerInputPath(uri: string) {
  return uri.startsWith("/") ? `file://${uri}` : uri;
}

function normalizeCropPickerResultUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

function toEditableOutputMimeType(
  mimeType: string | undefined,
): NativeReportMediaEditInput["export"]["mimeType"] | undefined {
  switch (mimeType) {
    case "image/jpeg":
    case "image/png":
    case "image/webp":
      return mimeType;
    default:
      return undefined;
  }
}

function loadReactNativeImageCropPicker(): NativeImageCropPicker {
  if (typeof require !== "function") {
    throw new Error("react-native-image-crop-picker is unavailable.");
  }

  const module = require("react-native-image-crop-picker") as
    | NativeImageCropPicker
    | { default: NativeImageCropPicker };

  return "openCropper" in module ? module : module.default;
}

function loadExpoImageManipulator(): NativeImageManipulator {
  if (typeof require !== "function") {
    throw new Error("expo-image-manipulator is unavailable.");
  }

  return require("expo-image-manipulator") as NativeImageManipulator;
}

function loadExpoFileSystem(): NativeReportMediaEditFileSystem {
  if (typeof require !== "function") {
    throw new Error("expo-file-system/legacy is unavailable.");
  }

  return require("expo-file-system/legacy") as NativeReportMediaEditFileSystem;
}
