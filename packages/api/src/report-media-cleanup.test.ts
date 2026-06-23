import { describe, expect, it } from "vitest";

import { cleanupAbandonedReportMediaUploads } from "./report-media-cleanup";

describe("report media cleanup", () => {
  it("deletes expired pending uploads and marks their media rows removed", async () => {
    const deletedObjectKeys: string[] = [];
    const removedMediaIds: string[] = [];

    const result = await cleanupAbandonedReportMediaUploads({
      mediaRepository: {
        findAbandonedUploadSessions: () =>
          Promise.resolve([
            {
              createdAt: new Date("2026-06-21T18:00:00.000Z"),
              expectedChecksumSha256: null,
              expectedHeight: 900,
              expectedMimeType: "image/webp",
              expectedSizeBytes: 300_000,
              expectedWidth: 1200,
              expiresAt: new Date("2026-06-21T18:10:00.000Z"),
              draftId: "lost-draft-device-1",
              id: "11111111-1111-4111-8111-111111111111",
              objectKey:
                "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
              ownerId: "member-camila",
              reportType: "lost_pet",
              reportId: null,
              status: "pending",
              updatedAt: new Date("2026-06-21T18:00:00.000Z"),
            },
          ]),
        markUploadSessionRemoved: (input: { mediaId: string }) => {
          removedMediaIds.push(input.mediaId);
          return Promise.resolve();
        },
      },
      mediaStorage: {
        deleteObject: (input: { objectKey: string }) => {
          deletedObjectKeys.push(input.objectKey);
          return Promise.resolve();
        },
      },
      now: new Date("2026-06-21T19:00:00.000Z"),
    });

    expect(result).toEqual({
      deletedObjects: 1,
      removedMedia: 1,
    });
    expect(deletedObjectKeys).toEqual([
      "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
    ]);
    expect(removedMediaIds).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });

  it("deletes failed uploads after rejected metadata verification", async () => {
    const deletedObjectKeys: string[] = [];
    const removedMediaIds: string[] = [];

    const result = await cleanupAbandonedReportMediaUploads({
      mediaRepository: {
        findAbandonedUploadSessions: () =>
          Promise.resolve([
            {
              createdAt: new Date("2026-06-21T18:00:00.000Z"),
              expectedChecksumSha256: null,
              expectedHeight: 900,
              expectedMimeType: "image/webp",
              expectedSizeBytes: 300_000,
              expectedWidth: 1200,
              expiresAt: new Date("2026-06-21T18:10:00.000Z"),
              draftId: "lost-draft-device-1",
              id: "22222222-2222-4222-8222-222222222222",
              objectKey:
                "report-media/member-camila/22222222-2222-4222-8222-222222222222/original.webp",
              ownerId: "member-camila",
              reportType: "lost_pet",
              reportId: null,
              status: "failed",
              updatedAt: new Date("2026-06-21T18:12:00.000Z"),
            },
          ]),
        markUploadSessionRemoved: (input: { mediaId: string }) => {
          removedMediaIds.push(input.mediaId);
          return Promise.resolve();
        },
      },
      mediaStorage: {
        deleteObject: (input: { objectKey: string }) => {
          deletedObjectKeys.push(input.objectKey);
          return Promise.resolve();
        },
      },
      now: new Date("2026-06-21T19:00:00.000Z"),
    });

    expect(result).toEqual({
      deletedObjects: 1,
      removedMedia: 1,
    });
    expect(deletedObjectKeys).toEqual([
      "report-media/member-camila/22222222-2222-4222-8222-222222222222/original.webp",
    ]);
    expect(removedMediaIds).toEqual(["22222222-2222-4222-8222-222222222222"]);
  });
});
