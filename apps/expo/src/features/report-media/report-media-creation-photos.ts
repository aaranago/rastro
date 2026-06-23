import type {
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
  originalUri: string;
  progress: number;
  status: ReportMediaCreationPhotoStatus;
  thumbUri: string;
  uploadUri: string;
  uri: string;
}

export function reportMediaSnapshotToCreationPhotos(
  snapshot: ReportMediaDraftSnapshot,
): ReportMediaCreationPhoto[] {
  return orderPrimaryFirst(snapshot.items, snapshot.primaryLocalId).map(
    (item) => ({
      id: item.localId,
      localId: item.localId,
      mediaId: item.mediaId,
      originalUri: item.originalUri,
      progress: item.progress,
      status: toCreationPhotoStatus(item.status),
      thumbUri: item.uploadUri,
      uploadUri: item.uploadUri,
      uri: item.uploadUri,
    }),
  );
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
