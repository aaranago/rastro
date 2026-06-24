import type {
  HydratedReadyReportMedia,
  ReportMediaDraftItem,
  ReportMediaDraftItemStatus,
  ReportMediaDraftSnapshot,
} from "./report-media-draft";

export type ReportMediaCreationPhotoStatus =
  | "draft"
  | "error"
  | "ready"
  | "uploading";

export interface ReportMediaCreationPhoto {
  id: string;
  localId: string;
  mediaId?: string;
  height?: number;
  mimeType?: ReportMediaDraftItem["mimeType"];
  originalUri: string;
  progress: number;
  sizeBytes?: number;
  status: ReportMediaCreationPhotoStatus;
  thumbUri: string;
  uploadUri: string;
  uri: string;
  width?: number;
}

export function reportMediaSnapshotToCreationPhotos(
  snapshot: ReportMediaDraftSnapshot,
): ReportMediaCreationPhoto[] {
  return orderPrimaryFirst(snapshot.items, snapshot.primaryLocalId).map(
    (item) => ({
      id: item.localId,
      height: item.height,
      localId: item.localId,
      mediaId: item.mediaId,
      mimeType: item.mimeType,
      originalUri: item.originalUri,
      progress: item.progress,
      sizeBytes: item.sizeBytes,
      status: toCreationPhotoStatus(item.status),
      thumbUri: item.uploadUri,
      uploadUri: item.uploadUri,
      uri: item.uploadUri,
      width: item.width,
    }),
  );
}

export function reportMediaCreationPhotosToHydratedReadyMedia(
  photos: readonly unknown[],
): HydratedReadyReportMedia[] {
  const hydratedPhotos: HydratedReadyReportMedia[] = [];

  for (const photo of photos) {
    const hydratedPhoto = toHydratedReadyMedia(photo);

    if (hydratedPhoto) {
      hydratedPhotos.push(hydratedPhoto);
    }
  }

  return hydratedPhotos;
}

function orderPrimaryFirst(
  items: readonly ReportMediaDraftItem[],
  primaryLocalId?: string,
) {
  if (!primaryLocalId) {
    return [...items];
  }

  const primary = items.find((item) => item.localId === primaryLocalId);

  if (!primary) {
    return [...items];
  }

  return [primary, ...items.filter((item) => item.localId !== primaryLocalId)];
}

function toCreationPhotoStatus(
  status: ReportMediaDraftItemStatus,
): ReportMediaCreationPhotoStatus {
  switch (status) {
    case "failed":
      return "error";
    case "ready":
      return "ready";
    case "authorizing":
    case "uploading":
      return "uploading";
    case "selected":
      return "draft";
  }
}

function isCreationPhotoRecord(
  photo: unknown,
): photo is Record<string, unknown> {
  return typeof photo === "object" && photo !== null;
}

function toHydratedReadyMedia(
  photo: unknown,
): HydratedReadyReportMedia | undefined {
  if (!isCreationPhotoRecord(photo) || photo.status !== "ready") {
    return undefined;
  }

  const mediaId = stringValue(photo.mediaId);
  const uploadUri = localUriValue(photo);

  if (!mediaId || !uploadUri) {
    return undefined;
  }

  const hydratedPhoto: HydratedReadyReportMedia = {
    localId: stringValue(photo.localId) ?? stringValue(photo.id) ?? mediaId,
    mediaId,
    originalUri: stringValue(photo.originalUri) ?? uploadUri,
    uploadUri,
  };

  applyHydratedPhotoMetadata(hydratedPhoto, photo);
  return hydratedPhoto;
}

function localUriValue(photo: Record<string, unknown>) {
  return (
    stringValue(photo.uploadUri) ??
    stringValue(photo.uri) ??
    stringValue(photo.thumbUri)
  );
}

function applyHydratedPhotoMetadata(
  hydratedPhoto: HydratedReadyReportMedia,
  photo: Record<string, unknown>,
) {
  const height = numberValue(photo.height);
  const mimeType = mimeTypeValue(photo.mimeType);
  const sizeBytes = numberValue(photo.sizeBytes);
  const width = numberValue(photo.width);

  if (height !== undefined) {
    hydratedPhoto.height = height;
  }

  if (mimeType !== undefined) {
    hydratedPhoto.mimeType = mimeType;
  }

  if (sizeBytes !== undefined) {
    hydratedPhoto.sizeBytes = sizeBytes;
  }

  if (width !== undefined) {
    hydratedPhoto.width = width;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function mimeTypeValue(
  value: unknown,
): ReportMediaDraftItem["mimeType"] | undefined {
  return value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp"
    ? value
    : undefined;
}
