import type {
  CreateUploadSessionInput,
  ReportMediaInput,
  ReportType,
  UploadSessionIdInput,
} from "@acme/validators";

export type ReportMediaDraftItemStatus =
  | "authorizing"
  | "failed"
  | "ready"
  | "selected"
  | "uploading";

export type ReportMediaFailureReason =
  | "authorization-expired"
  | "authorization-failed"
  | "upload-failed";

export class ReportMediaUploadFailure extends Error {
  readonly reason: ReportMediaFailureReason;

  constructor(reason: ReportMediaFailureReason, message: string) {
    super(message);
    this.name = "ReportMediaUploadFailure";
    this.reason = reason;
  }
}

export interface SelectedLocalReportImage {
  checksumSha256?: string;
  height: number;
  mimeType: CreateUploadSessionInput["mimeType"];
  originalUri: string;
  sizeBytes: number;
  width: number;
}

export interface AcceptedEditedReportImage {
  checksumSha256?: string;
  height: number;
  localId: string;
  mimeType: CreateUploadSessionInput["mimeType"];
  sizeBytes: number;
  uri: string;
  width: number;
}

export interface HydratedReadyReportMedia {
  checksumSha256?: string;
  height?: number;
  localId: string;
  mediaId: string;
  mimeType?: CreateUploadSessionInput["mimeType"];
  originalUri: string;
  sizeBytes?: number;
  uploadUri: string;
  width?: number;
}

export interface ReportMediaUploadInstruction {
  headers: Record<string, string>;
  method: "PUT";
  url: string;
}

export interface ReportMediaUploadSession {
  expiresAt: Date | string;
  mediaId: string;
  objectKey: string;
  upload: ReportMediaUploadInstruction;
}

export interface CompletedReportMediaUpload {
  mediaId: string;
  objectKey: string;
  status: "ready";
}

export interface ReportMediaUploadSessionClient {
  completeUploadSession(
    input: UploadSessionIdInput,
  ): Promise<CompletedReportMediaUpload>;
  createUploadSession(
    input: CreateUploadSessionInput,
  ): Promise<ReportMediaUploadSession>;
  refreshUploadSession(
    input: UploadSessionIdInput,
  ): Promise<ReportMediaUploadSession>;
}

export interface ReportMediaUploadTransportInput {
  localUri: string;
  mimeType: CreateUploadSessionInput["mimeType"];
  onProgress?: (progress: number) => void;
  sizeBytes: number;
  upload: ReportMediaUploadInstruction;
}

export interface ReportMediaUploadTransport {
  putObject(input: ReportMediaUploadTransportInput): Promise<void>;
}

export interface ReportMediaDraftItem {
  checksumSha256?: string;
  errorMessage?: string;
  failureReason?: ReportMediaFailureReason;
  height: number;
  localId: string;
  mediaId?: string;
  mimeType: CreateUploadSessionInput["mimeType"];
  objectKey?: string;
  originalUri: string;
  progress: number;
  retryable: boolean;
  sizeBytes: number;
  status: ReportMediaDraftItemStatus;
  uploadUri: string;
  width: number;
}

export interface ReportMediaDraftSnapshot {
  items: ReportMediaDraftItem[];
  overallProgress: number;
  primaryLocalId?: string;
  readyMedia: ReportMediaInput[];
}

export interface CreateReportMediaDraftInput {
  draftId: string;
  makeLocalId?: () => string;
  reportType: ReportType;
  uploadSessions: ReportMediaUploadSessionClient;
  uploadTransport: ReportMediaUploadTransport;
}

export interface ReportMediaDraft {
  acceptEditedImage(input: AcceptedEditedReportImage): ReportMediaDraftItem;
  getSnapshot(): ReportMediaDraftSnapshot;
  hydrateReadyMedia(
    input: readonly HydratedReadyReportMedia[],
  ): ReportMediaDraftSnapshot;
  moveImage(localId: string, toIndex: number): ReportMediaDraftSnapshot;
  removeImage(localId: string): ReportMediaDraftSnapshot;
  retryUpload(localId: string): Promise<ReportMediaDraftItem>;
  selectLocalImage(input: SelectedLocalReportImage): ReportMediaDraftItem;
  setPrimaryImage(localId: string): ReportMediaDraftSnapshot;
  uploadImage(localId: string): Promise<ReportMediaDraftItem>;
}

let defaultLocalIdSequence = 0;

export function createReportMediaDraft({
  draftId,
  makeLocalId = () => `local-report-media-${++defaultLocalIdSequence}`,
  reportType,
  uploadSessions,
  uploadTransport,
}: CreateReportMediaDraftInput): ReportMediaDraft {
  return new InMemoryReportMediaDraft({
    draftId,
    makeLocalId,
    reportType,
    uploadSessions,
    uploadTransport,
  });
}

type ResolvedCreateReportMediaDraftInput = Omit<
  CreateReportMediaDraftInput,
  "makeLocalId"
> & {
  makeLocalId: () => string;
};

class InMemoryReportMediaDraft implements ReportMediaDraft {
  private readonly draftId: string;
  private readonly items: ReportMediaDraftItem[] = [];
  private readonly makeLocalId: () => string;
  private readonly reportType: ReportType;
  private readonly uploadSessions: ReportMediaUploadSessionClient;
  private readonly uploadTransport: ReportMediaUploadTransport;

  constructor({
    draftId,
    makeLocalId,
    reportType,
    uploadSessions,
    uploadTransport,
  }: ResolvedCreateReportMediaDraftInput) {
    this.draftId = draftId;
    this.makeLocalId = makeLocalId;
    this.reportType = reportType;
    this.uploadSessions = uploadSessions;
    this.uploadTransport = uploadTransport;
  }

  acceptEditedImage(input: AcceptedEditedReportImage): ReportMediaDraftItem {
    const item = this.findItem(input.localId);

    delete item.errorMessage;
    delete item.failureReason;
    delete item.mediaId;
    delete item.objectKey;

    item.checksumSha256 = input.checksumSha256;
    item.height = input.height;
    item.mimeType = input.mimeType;
    item.progress = 0;
    item.retryable = false;
    item.sizeBytes = input.sizeBytes;
    item.status = "selected";
    item.uploadUri = input.uri;
    item.width = input.width;

    return cloneItem(item);
  }

  getSnapshot(): ReportMediaDraftSnapshot {
    return {
      items: this.items.map(cloneItem),
      overallProgress: calculateOverallProgress(this.items),
      primaryLocalId: this.items[0]?.localId,
      readyMedia: this.items.flatMap((item) =>
        item.status === "ready" && item.mediaId
          ? [{ mediaId: item.mediaId }]
          : [],
      ),
    };
  }

  hydrateReadyMedia(
    input: readonly HydratedReadyReportMedia[],
  ): ReportMediaDraftSnapshot {
    const existingKeys = new Set(
      this.items.flatMap((item) => [item.localId, item.mediaId ?? ""]),
    );

    for (const readyMedia of input) {
      if (
        existingKeys.has(readyMedia.localId) ||
        existingKeys.has(readyMedia.mediaId)
      ) {
        continue;
      }

      const item = {
        checksumSha256: readyMedia.checksumSha256,
        height: readyMedia.height ?? 1,
        localId: readyMedia.localId,
        mediaId: readyMedia.mediaId,
        mimeType: readyMedia.mimeType ?? "image/jpeg",
        originalUri: readyMedia.originalUri,
        progress: 1,
        retryable: false,
        sizeBytes: readyMedia.sizeBytes ?? 0,
        status: "ready",
        uploadUri: readyMedia.uploadUri,
        width: readyMedia.width ?? 1,
      } satisfies ReportMediaDraftItem;

      this.items.push(item);
      existingKeys.add(item.localId);
      existingKeys.add(item.mediaId);
    }

    return this.getSnapshot();
  }

  moveImage(localId: string, toIndex: number): ReportMediaDraftSnapshot {
    const fromIndex = this.items.findIndex((item) => item.localId === localId);

    if (fromIndex === -1) {
      throw new Error(`Report media item was not found: ${localId}`);
    }

    const [item] = this.items.splice(fromIndex, 1);

    if (!item) {
      throw new Error(`Report media item was not found: ${localId}`);
    }

    const boundedIndex = Math.max(0, Math.min(toIndex, this.items.length));
    this.items.splice(boundedIndex, 0, item);

    return this.getSnapshot();
  }

  removeImage(localId: string): ReportMediaDraftSnapshot {
    const index = this.items.findIndex((item) => item.localId === localId);

    if (index === -1) {
      throw new Error(`Report media item was not found: ${localId}`);
    }

    this.items.splice(index, 1);

    return this.getSnapshot();
  }

  async retryUpload(localId: string): Promise<ReportMediaDraftItem> {
    const item = this.findItem(localId);

    if (item.status !== "failed" || !item.retryable) {
      throw new Error(`Report media item is not retryable: ${localId}`);
    }

    item.status = "authorizing";
    item.progress = 0;

    return this.uploadWithSession(item, () => {
      if (item.mediaId) {
        return this.uploadSessions.refreshUploadSession({
          mediaId: item.mediaId,
        });
      }

      return this.uploadSessions.createUploadSession(
        this.createUploadSessionInput(item),
      );
    });
  }

  selectLocalImage(input: SelectedLocalReportImage): ReportMediaDraftItem {
    const item = {
      checksumSha256: input.checksumSha256,
      height: input.height,
      localId: this.makeLocalId(),
      mimeType: input.mimeType,
      originalUri: input.originalUri,
      progress: 0,
      retryable: false,
      sizeBytes: input.sizeBytes,
      status: "selected",
      uploadUri: input.originalUri,
      width: input.width,
    } satisfies ReportMediaDraftItem;

    this.items.push(item);

    return cloneItem(item);
  }

  setPrimaryImage(localId: string): ReportMediaDraftSnapshot {
    return this.moveImage(localId, 0);
  }

  async uploadImage(localId: string): Promise<ReportMediaDraftItem> {
    const item = this.findItem(localId);
    item.status = "authorizing";
    item.progress = 0;

    return this.uploadWithSession(item, () =>
      this.uploadSessions.createUploadSession(
        this.createUploadSessionInput(item),
      ),
    );
  }

  private createUploadSessionInput(
    item: ReportMediaDraftItem,
  ): CreateUploadSessionInput {
    return {
      checksumSha256: item.checksumSha256,
      draftId: this.draftId,
      height: item.height,
      mimeType: item.mimeType,
      reportType: this.reportType,
      sizeBytes: item.sizeBytes,
      width: item.width,
    };
  }

  private findItem(localId: string) {
    const item = this.items.find((candidate) => candidate.localId === localId);

    if (!item) {
      throw new Error(`Report media item was not found: ${localId}`);
    }

    return item;
  }

  private async uploadWithSession(
    item: ReportMediaDraftItem,
    createSession: () => Promise<ReportMediaUploadSession>,
  ): Promise<ReportMediaDraftItem> {
    try {
      const session = await createSession();
      item.mediaId = session.mediaId;
      item.objectKey = session.objectKey;
      item.status = "uploading";

      await this.uploadTransport.putObject({
        localUri: item.uploadUri,
        mimeType: item.mimeType,
        onProgress: (progress) => {
          item.progress = clampProgress(progress);
        },
        sizeBytes: item.sizeBytes,
        upload: session.upload,
      });

      const completed = await this.uploadSessions.completeUploadSession({
        mediaId: session.mediaId,
      });

      item.errorMessage = undefined;
      item.failureReason = undefined;
      item.mediaId = completed.mediaId;
      item.objectKey = completed.objectKey;
      item.progress = 1;
      item.retryable = false;
      item.status = "ready";
    } catch (error) {
      item.errorMessage = errorMessage(error);
      item.failureReason = failureReason(error, item);
      item.retryable = true;
      item.status = "failed";
    }

    return cloneItem(item);
  }
}

function calculateOverallProgress(items: ReportMediaDraftItem[]) {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((total, item) => total + item.progress, 0) / items.length;
}

function clampProgress(progress: number) {
  if (progress < 0) {
    return 0;
  }

  if (progress > 1) {
    return 1;
  }

  return progress;
}

function cloneItem(item: ReportMediaDraftItem): ReportMediaDraftItem {
  return { ...item };
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No pudimos subir la foto.";
}

function failureReason(
  error: unknown,
  item: ReportMediaDraftItem,
): ReportMediaFailureReason {
  if (error instanceof ReportMediaUploadFailure) {
    return error.reason;
  }

  return item.mediaId ? "upload-failed" : "authorization-failed";
}
