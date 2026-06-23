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
  rotateDegrees?: number;
  sourceUri: string;
}

export interface NativeReportMediaEditAdapter {
  editImage(
    input: NativeReportMediaEditInput,
  ): Promise<AcceptedEditedReportImage>;
}

export interface CreateNativeReportMediaEditAdapterInput {
  fileSystem?: NativeReportMediaEditFileSystem;
  imageManipulator?: NativeImageManipulator;
  loadFileSystem?: () => NativeReportMediaEditFileSystem;
  loadImageManipulator?: () => NativeImageManipulator;
}

declare const require:
  | undefined
  | ((
      moduleName: string,
    ) => NativeReportMediaEditFileSystem | NativeImageManipulator);

export function createNativeReportMediaEditAdapter({
  fileSystem,
  imageManipulator,
  loadFileSystem = loadExpoFileSystem,
  loadImageManipulator = loadExpoImageManipulator,
}: CreateNativeReportMediaEditAdapterInput = {}): NativeReportMediaEditAdapter {
  const resolveFileSystem = () => fileSystem ?? loadFileSystem();
  const resolveImageManipulator = () =>
    imageManipulator ?? loadImageManipulator();

  return {
    async editImage(input) {
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

function createManipulationActions(
  input: NativeReportMediaEditInput,
): NativeImageManipulationAction[] {
  const actions: NativeImageManipulationAction[] = [];

  if (input.crop) {
    actions.push({ crop: input.crop });
  }

  if (input.rotateDegrees) {
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
