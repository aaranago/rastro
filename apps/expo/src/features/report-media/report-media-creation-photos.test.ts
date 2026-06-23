import { describe, expect, it } from "vitest";

import type { ReportMediaDraftSnapshot } from "./report-media-draft";
import { reportMediaSnapshotToCreationPhotos } from "./report-media-creation-photos";

describe("report media creation photos", () => {
  it("maps draft snapshot items into creation photos with the primary item first", () => {
    const snapshot = {
      items: [
        createSnapshotItem({
          localId: "local-uploading",
          originalUri: "file:///uploading-original.jpg",
          progress: 0.35,
          status: "uploading",
          uploadUri: "file:///uploading-upload.jpg",
        }),
        createSnapshotItem({
          localId: "local-ready",
          mediaId: "ready-media-1",
          originalUri: "file:///ready-original.jpg",
          progress: 1,
          status: "ready",
          uploadUri: "file:///ready-upload.jpg",
        }),
        createSnapshotItem({
          localId: "local-failed",
          mediaId: "failed-media-1",
          originalUri: "file:///failed-original.jpg",
          progress: 0.5,
          status: "failed",
          uploadUri: "file:///failed-upload.jpg",
        }),
        createSnapshotItem({
          localId: "local-selected",
          originalUri: "file:///selected-original.jpg",
          progress: 0,
          status: "selected",
          uploadUri: "file:///selected-upload.jpg",
        }),
      ],
      overallProgress: 0.46,
      primaryLocalId: "local-ready",
      readyMedia: [{ mediaId: "ready-media-1" }],
    } satisfies ReportMediaDraftSnapshot;

    expect(reportMediaSnapshotToCreationPhotos(snapshot)).toEqual([
      {
        id: "local-ready",
        localId: "local-ready",
        mediaId: "ready-media-1",
        originalUri: "file:///ready-original.jpg",
        progress: 1,
        status: "ready",
        thumbUri: "file:///ready-upload.jpg",
        uploadUri: "file:///ready-upload.jpg",
        uri: "file:///ready-upload.jpg",
      },
      expect.objectContaining({
        id: "local-uploading",
        progress: 0.35,
        status: "uploading",
      }),
      expect.objectContaining({
        id: "local-failed",
        mediaId: "failed-media-1",
        status: "error",
      }),
      expect.objectContaining({
        id: "local-selected",
        status: "draft",
      }),
    ]);
  });
});

function createSnapshotItem(
  overrides: Partial<ReportMediaDraftSnapshot["items"][number]>,
): ReportMediaDraftSnapshot["items"][number] {
  return {
    height: 900,
    localId: "local-photo",
    mimeType: "image/jpeg",
    originalUri: "file:///photo-original.jpg",
    progress: 0,
    retryable: false,
    sizeBytes: 200_000,
    status: "selected",
    uploadUri: "file:///photo-upload.jpg",
    width: 1200,
    ...overrides,
  };
}
