import type { ReportMediaUploadTransport } from "./report-media-draft";
import { ReportMediaUploadFailure } from "./report-media-draft";

export interface NativeReportMediaUploadProgress {
  totalBytesExpectedToSend: number;
  totalBytesSent: number;
}

export interface NativeReportMediaUploadResult {
  body: string;
  headers: Record<string, string>;
  mimeType: string | null;
  status: number;
}

export interface NativeReportMediaUploadFileSystem {
  FileSystemUploadType: {
    BINARY_CONTENT: number;
  };
  createUploadTask(
    url: string,
    fileUri: string,
    options: {
      headers: Record<string, string>;
      httpMethod: "PUT";
      uploadType: number;
    },
    onProgress?: (progress: NativeReportMediaUploadProgress) => void,
  ): {
    uploadAsync(): Promise<NativeReportMediaUploadResult | null | undefined>;
  };
}

declare const require:
  | undefined
  | ((moduleName: string) => NativeReportMediaUploadFileSystem);

export interface CreateNativeReportMediaUploadTransportInput {
  fileSystem?: NativeReportMediaUploadFileSystem;
  loadFileSystem?: () => NativeReportMediaUploadFileSystem;
}

export function createNativeReportMediaUploadTransport({
  fileSystem,
  loadFileSystem = loadExpoFileSystem,
}: CreateNativeReportMediaUploadTransportInput = {}): ReportMediaUploadTransport {
  const resolveFileSystem = () => fileSystem ?? loadFileSystem();

  return {
    async putObject(input) {
      const resolvedFileSystem = resolveFileSystem();
      const task = resolvedFileSystem.createUploadTask(
        input.upload.url,
        input.localUri,
        {
          headers: input.upload.headers,
          httpMethod: input.upload.method,
          uploadType: resolvedFileSystem.FileSystemUploadType.BINARY_CONTENT,
        },
        (progress) => {
          input.onProgress?.(
            normalizeProgress(
              progress.totalBytesSent,
              progress.totalBytesExpectedToSend,
              input.sizeBytes,
            ),
          );
        },
      );
      const result = await task.uploadAsync();

      if (!result) {
        throw new ReportMediaUploadFailure(
          "upload-failed",
          "No pudimos subir la foto.",
        );
      }

      if (result.status < 200 || result.status >= 300) {
        throw new ReportMediaUploadFailure(
          result.status === 401 || result.status === 403
            ? "authorization-expired"
            : "upload-failed",
          `No pudimos subir la foto. Estado HTTP ${result.status}.`,
        );
      }
    },
  };
}

function normalizeProgress(
  sent: number,
  expected: number,
  fallbackExpected: number,
) {
  const total = expected > 0 ? expected : fallbackExpected;

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(sent / total, 1));
}

function loadExpoFileSystem(): NativeReportMediaUploadFileSystem {
  if (typeof require !== "function") {
    throw new Error("expo-file-system/legacy is unavailable.");
  }

  return require("expo-file-system/legacy");
}
