import type { MediaStorage } from "./media-storage";
import type {
  PersistedReportMediaUpload,
  ReportMediaRepository,
} from "./report-media-repository";

export interface CleanupMediaRepository {
  findAbandonedUploadSessions(input: {
    expiredBefore: Date;
    limit?: number;
  }): Promise<PersistedReportMediaUpload[]>;
  markUploadSessionRemoved(input: {
    mediaId: string;
    removedAt: Date;
  }): Promise<unknown>;
}

export interface CleanupMediaStorage {
  deleteObject(input: { objectKey: string }): Promise<void>;
}

export interface CleanupAbandonedReportMediaUploadsInput {
  limit?: number;
  mediaRepository: CleanupMediaRepository | ReportMediaRepository;
  mediaStorage: CleanupMediaStorage | MediaStorage;
  now?: Date;
}

export async function cleanupAbandonedReportMediaUploads({
  limit = 100,
  mediaRepository,
  mediaStorage,
  now = new Date(),
}: CleanupAbandonedReportMediaUploadsInput) {
  const abandonedUploads = await mediaRepository.findAbandonedUploadSessions({
    expiredBefore: now,
    limit,
  });
  let deletedObjects = 0;
  let removedMedia = 0;

  for (const upload of abandonedUploads) {
    await mediaStorage.deleteObject({ objectKey: upload.objectKey });
    deletedObjects += 1;

    await mediaRepository.markUploadSessionRemoved({
      mediaId: upload.id,
      removedAt: now,
    });
    removedMedia += 1;
  }

  return {
    deletedObjects,
    removedMedia,
  };
}
