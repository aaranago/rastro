import { describe, expect, it, vi } from "vitest";

import { createApiReportMediaUploadSessionClient } from "./report-media-upload-session-client";

describe("report media upload-session API client", () => {
  it("uses the report API upload-session contract for create, complete, and refresh", async () => {
    const api = {
      report: {
        completeUploadSession: {
          mutate: vi.fn(({ mediaId }: { mediaId: string }) =>
            Promise.resolve({
              mediaId,
              objectKey: `report-media/member-camila/${mediaId}/original.webp`,
              status: "ready" as const,
            }),
          ),
        },
        createUploadSession: {
          mutate: vi.fn(() =>
            Promise.resolve({
              expiresAt: new Date("2026-06-21T18:05:00.000Z"),
              mediaId: "11111111-1111-4111-8111-111111111111",
              objectKey:
                "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
              upload: {
                headers: { "content-type": "image/webp" },
                method: "PUT" as const,
                url: "https://uploads.example.invalid/report-media/member-camila/signed",
              },
            }),
          ),
        },
        refreshUploadSession: {
          mutate: vi.fn(({ mediaId }: { mediaId: string }) =>
            Promise.resolve({
              expiresAt: new Date("2026-06-21T18:20:00.000Z"),
              mediaId,
              objectKey: `report-media/member-camila/${mediaId}/original.webp`,
              upload: {
                headers: { "content-type": "image/webp" },
                method: "PUT" as const,
                url: "https://uploads.example.invalid/report-media/member-camila/refreshed",
              },
            }),
          ),
        },
      },
    };
    const client = createApiReportMediaUploadSessionClient({ client: api });

    await expect(
      client.createUploadSession({
        checksumSha256: "sha256-test",
        draftId: "lost-draft-device-1",
        height: 900,
        mimeType: "image/webp",
        reportType: "lost_pet",
        sizeBytes: 300_000,
        width: 1200,
      }),
    ).resolves.toMatchObject({
      mediaId: "11111111-1111-4111-8111-111111111111",
      upload: {
        method: "PUT",
      },
    });
    await expect(
      client.completeUploadSession({
        mediaId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual({
      mediaId: "11111111-1111-4111-8111-111111111111",
      objectKey:
        "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
      status: "ready",
    });
    await expect(
      client.refreshUploadSession({
        mediaId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toMatchObject({
      mediaId: "11111111-1111-4111-8111-111111111111",
      upload: {
        url: "https://uploads.example.invalid/report-media/member-camila/refreshed",
      },
    });

    expect(api.report.createUploadSession.mutate).toHaveBeenCalledWith({
      checksumSha256: "sha256-test",
      draftId: "lost-draft-device-1",
      height: 900,
      mimeType: "image/webp",
      reportType: "lost_pet",
      sizeBytes: 300_000,
      width: 1200,
    });
    expect(api.report.completeUploadSession.mutate).toHaveBeenCalledWith({
      mediaId: "11111111-1111-4111-8111-111111111111",
    });
    expect(api.report.refreshUploadSession.mutate).toHaveBeenCalledWith({
      mediaId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
