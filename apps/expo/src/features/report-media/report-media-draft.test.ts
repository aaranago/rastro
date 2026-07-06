import { describe, expect, it, vi } from "vitest";

import type {
  ReportMediaUploadSessionClient,
  ReportMediaUploadTransport,
} from "./report-media-draft";
import {
  createReportMediaDraft,
  ReportMediaUploadFailure,
} from "./report-media-draft";

describe("report media draft", () => {
  it("turns a selected local image into a ready media ID through backend-owned upload sessions", async () => {
    const createUploadSession = vi.fn<
      ReportMediaUploadSessionClient["createUploadSession"]
    >(() =>
      Promise.resolve({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "11111111-1111-4111-8111-111111111111",
        objectKey:
          "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
        upload: {
          headers: {
            "content-type": "image/webp",
            "x-amz-checksum-sha256": "sha256-test",
          },
          method: "PUT",
          url: "https://uploads.example.invalid/report-media/member-camila/signed",
        },
      }),
    );
    const completeUploadSession = vi.fn<
      ReportMediaUploadSessionClient["completeUploadSession"]
    >(() =>
      Promise.resolve({
        mediaId: "11111111-1111-4111-8111-111111111111",
        objectKey:
          "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
        status: "ready",
      }),
    );
    const uploadTransport = {
      putObject: vi.fn<ReportMediaUploadTransport["putObject"]>(() =>
        Promise.resolve(),
      ),
    } satisfies ReportMediaUploadTransport;
    const draft = createReportMediaDraft({
      draftId: "lost-draft-device-1",
      makeLocalId: () => "local-photo-1",
      reportType: "lost_pet",
      uploadSessions: {
        completeUploadSession,
        createUploadSession,
        refreshUploadSession: vi.fn(),
      },
      uploadTransport,
    });

    const selected = draft.selectLocalImage({
      checksumSha256: "sha256-test",
      height: 900,
      mimeType: "image/webp",
      originalUri: "file:///photo-1.webp",
      sizeBytes: 300_000,
      width: 1200,
    });

    expect(selected).toMatchObject({
      localId: "local-photo-1",
      originalUri: "file:///photo-1.webp",
      status: "selected",
      uploadUri: "file:///photo-1.webp",
    });

    await expect(draft.uploadImage("local-photo-1")).resolves.toMatchObject({
      mediaId: "11111111-1111-4111-8111-111111111111",
      progress: 1,
      status: "ready",
    });
    expect(createUploadSession).toHaveBeenCalledWith({
      checksumSha256: "sha256-test",
      draftId: "lost-draft-device-1",
      height: 900,
      mimeType: "image/webp",
      reportType: "lost_pet",
      sizeBytes: 300_000,
      width: 1200,
    });
    expect(uploadTransport.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        localUri: "file:///photo-1.webp",
        mimeType: "image/webp",
        sizeBytes: 300_000,
        upload: {
          headers: {
            "content-type": "image/webp",
            "x-amz-checksum-sha256": "sha256-test",
          },
          method: "PUT",
          url: "https://uploads.example.invalid/report-media/member-camila/signed",
        },
      }),
    );
    expect(completeUploadSession).toHaveBeenCalledWith({
      mediaId: "11111111-1111-4111-8111-111111111111",
    });
    expect(draft.getSnapshot()).toMatchObject({
      overallProgress: 1,
      readyMedia: [
        {
          mediaId: "11111111-1111-4111-8111-111111111111",
        },
      ],
    });
  });

  it("keeps a failed upload retryable without losing the selected local image", async () => {
    const uploadTransport = {
      putObject: vi.fn<ReportMediaUploadTransport["putObject"]>(() =>
        Promise.reject(new Error("Sin conexion")),
      ),
    } satisfies ReportMediaUploadTransport;
    const draft = createReportMediaDraft({
      draftId: "lost-draft-device-1",
      makeLocalId: () => "local-photo-1",
      reportType: "lost_pet",
      uploadSessions: {
        completeUploadSession: vi.fn(),
        createUploadSession: vi.fn<
          ReportMediaUploadSessionClient["createUploadSession"]
        >(() =>
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
        refreshUploadSession: vi.fn(),
      },
      uploadTransport,
    });
    draft.selectLocalImage({
      height: 900,
      mimeType: "image/webp",
      originalUri: "file:///photo-1.webp",
      sizeBytes: 300_000,
      width: 1200,
    });

    await expect(draft.uploadImage("local-photo-1")).resolves.toMatchObject({
      errorMessage:
        "No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.",
      failureReason: "upload-failed",
      mediaId: "11111111-1111-4111-8111-111111111111",
      originalUri: "file:///photo-1.webp",
      retryable: true,
      status: "failed",
      uploadUri: "file:///photo-1.webp",
    });
    expect(draft.getSnapshot()).toMatchObject({
      readyMedia: [],
      items: [
        {
          localId: "local-photo-1",
          status: "failed",
        },
      ],
    });
  });

  it("retries one failed image through refreshed upload authorization without reuploading ready media", async () => {
    const createUploadSession = vi
      .fn<ReportMediaUploadSessionClient["createUploadSession"]>()
      .mockResolvedValueOnce({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "11111111-1111-4111-8111-111111111111",
        objectKey:
          "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
        upload: {
          headers: { "content-type": "image/webp" },
          method: "PUT",
          url: "https://uploads.example.invalid/photo-1/signed",
        },
      })
      .mockResolvedValueOnce({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "22222222-2222-4222-8222-222222222222",
        objectKey:
          "report-media/member-camila/22222222-2222-4222-8222-222222222222/original.webp",
        upload: {
          headers: { "content-type": "image/webp" },
          method: "PUT",
          url: "https://uploads.example.invalid/photo-2/expired",
        },
      });
    const refreshUploadSession = vi.fn<
      ReportMediaUploadSessionClient["refreshUploadSession"]
    >(() =>
      Promise.resolve({
        expiresAt: new Date("2026-06-21T18:20:00.000Z"),
        mediaId: "22222222-2222-4222-8222-222222222222",
        objectKey:
          "report-media/member-camila/22222222-2222-4222-8222-222222222222/original.webp",
        upload: {
          headers: { "content-type": "image/webp" },
          method: "PUT",
          url: "https://uploads.example.invalid/photo-2/refreshed",
        },
      }),
    );
    const completeUploadSession = vi.fn<
      ReportMediaUploadSessionClient["completeUploadSession"]
    >(({ mediaId }) =>
      Promise.resolve({
        mediaId,
        objectKey: `report-media/member-camila/${mediaId}/original.webp`,
        status: "ready",
      }),
    );
    const uploadTransport = {
      putObject: vi
        .fn<ReportMediaUploadTransport["putObject"]>()
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(
          new ReportMediaUploadFailure(
            "authorization-expired",
            "Autorizacion vencida",
          ),
        )
        .mockResolvedValueOnce(),
    } satisfies ReportMediaUploadTransport;
    let nextLocalId = 0;
    const draft = createReportMediaDraft({
      draftId: "lost-draft-device-1",
      makeLocalId: () => `local-photo-${++nextLocalId}`,
      reportType: "lost_pet",
      uploadSessions: {
        completeUploadSession,
        createUploadSession,
        refreshUploadSession,
      },
      uploadTransport,
    });
    draft.selectLocalImage({
      height: 900,
      mimeType: "image/webp",
      originalUri: "file:///photo-1.webp",
      sizeBytes: 300_000,
      width: 1200,
    });
    draft.selectLocalImage({
      height: 700,
      mimeType: "image/webp",
      originalUri: "file:///photo-2.webp",
      sizeBytes: 250_000,
      width: 1000,
    });
    await draft.uploadImage("local-photo-1");
    await expect(draft.uploadImage("local-photo-2")).resolves.toMatchObject({
      failureReason: "authorization-expired",
      mediaId: "22222222-2222-4222-8222-222222222222",
      retryable: true,
      status: "failed",
    });

    await expect(draft.retryUpload("local-photo-2")).resolves.toMatchObject({
      mediaId: "22222222-2222-4222-8222-222222222222",
      status: "ready",
    });
    expect(refreshUploadSession).toHaveBeenCalledWith({
      mediaId: "22222222-2222-4222-8222-222222222222",
    });
    expect(
      uploadTransport.putObject.mock.calls.map(([input]) => input.localUri),
    ).toEqual([
      "file:///photo-1.webp",
      "file:///photo-2.webp",
      "file:///photo-2.webp",
    ]);
    expect(draft.getSnapshot().readyMedia).toEqual([
      { mediaId: "11111111-1111-4111-8111-111111111111" },
      { mediaId: "22222222-2222-4222-8222-222222222222" },
    ]);
  });

  it("uploads the accepted edited image while preserving the original local asset for recrop", async () => {
    const createUploadSession = vi.fn<
      ReportMediaUploadSessionClient["createUploadSession"]
    >(() =>
      Promise.resolve({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "11111111-1111-4111-8111-111111111111",
        objectKey:
          "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
        upload: {
          headers: {
            "content-type": "image/webp",
            "x-amz-checksum-sha256": "edited-sha256",
          },
          method: "PUT",
          url: "https://uploads.example.invalid/report-media/member-camila/signed",
        },
      }),
    );
    const uploadTransport = {
      putObject: vi.fn<ReportMediaUploadTransport["putObject"]>(() =>
        Promise.resolve(),
      ),
    } satisfies ReportMediaUploadTransport;
    const draft = createReportMediaDraft({
      draftId: "lost-draft-device-1",
      makeLocalId: () => "local-photo-1",
      reportType: "lost_pet",
      uploadSessions: {
        completeUploadSession: vi.fn<
          ReportMediaUploadSessionClient["completeUploadSession"]
        >(({ mediaId }) =>
          Promise.resolve({
            mediaId,
            objectKey: `report-media/member-camila/${mediaId}/original.webp`,
            status: "ready" as const,
          }),
        ),
        createUploadSession,
        refreshUploadSession: vi.fn(),
      },
      uploadTransport,
    });
    draft.selectLocalImage({
      height: 1200,
      mimeType: "image/jpeg",
      originalUri: "file:///original-camera.jpg",
      sizeBytes: 600_000,
      width: 1600,
    });

    expect(
      draft.acceptEditedImage({
        checksumSha256: "edited-sha256",
        height: 900,
        localId: "local-photo-1",
        mimeType: "image/webp",
        sizeBytes: 280_000,
        uri: "file:///edited-crop.webp",
        width: 1200,
      }),
    ).toMatchObject({
      checksumSha256: "edited-sha256",
      height: 900,
      originalUri: "file:///original-camera.jpg",
      status: "selected",
      uploadUri: "file:///edited-crop.webp",
      width: 1200,
    });

    await draft.uploadImage("local-photo-1");

    expect(createUploadSession).toHaveBeenCalledWith({
      checksumSha256: "edited-sha256",
      draftId: "lost-draft-device-1",
      height: 900,
      mimeType: "image/webp",
      reportType: "lost_pet",
      sizeBytes: 280_000,
      width: 1200,
    });
    expect(uploadTransport.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        localUri: "file:///edited-crop.webp",
        mimeType: "image/webp",
        sizeBytes: 280_000,
      }),
    );
  });

  it("hydrates persisted ready media in order without starting uploads", () => {
    const uploadTransport = {
      putObject: vi.fn<ReportMediaUploadTransport["putObject"]>(() =>
        Promise.resolve(),
      ),
    } satisfies ReportMediaUploadTransport;
    const draft = createReportMediaDraft({
      draftId: "lost-draft-device-1",
      makeLocalId: createSequenceId("local-photo"),
      reportType: "lost_pet",
      uploadSessions: {
        completeUploadSession: vi.fn(),
        createUploadSession: vi.fn(),
        refreshUploadSession: vi.fn(),
      },
      uploadTransport,
    });

    const snapshot = draft.hydrateReadyMedia([
      {
        height: 900,
        localId: "persisted-local-2",
        mediaId: "ready-media-2",
        mimeType: "image/webp",
        originalUri: "file:///persisted-original-2.webp",
        sizeBytes: 220_000,
        uploadUri: "file:///persisted-upload-2.webp",
        width: 1200,
      },
      {
        height: 700,
        localId: "persisted-local-1",
        mediaId: "ready-media-1",
        mimeType: "image/jpeg",
        originalUri: "file:///persisted-original-1.jpg",
        sizeBytes: 180_000,
        uploadUri: "file:///persisted-upload-1.jpg",
        width: 1000,
      },
    ]);

    expect(snapshot).toMatchObject({
      items: [
        {
          localId: "persisted-local-2",
          mediaId: "ready-media-2",
          originalUri: "file:///persisted-original-2.webp",
          progress: 1,
          status: "ready",
          uploadUri: "file:///persisted-upload-2.webp",
        },
        {
          localId: "persisted-local-1",
          mediaId: "ready-media-1",
          originalUri: "file:///persisted-original-1.jpg",
          progress: 1,
          status: "ready",
          uploadUri: "file:///persisted-upload-1.jpg",
        },
      ],
      overallProgress: 1,
      primaryLocalId: "persisted-local-2",
      readyMedia: [{ mediaId: "ready-media-2" }, { mediaId: "ready-media-1" }],
    });
    expect(uploadTransport.putObject).not.toHaveBeenCalled();
  });

  it("derives publish-ready media IDs from draft order and moves the primary image first", async () => {
    const createUploadSession = vi
      .fn<ReportMediaUploadSessionClient["createUploadSession"]>()
      .mockResolvedValueOnce({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "11111111-1111-4111-8111-111111111111",
        objectKey:
          "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
        upload: {
          headers: { "content-type": "image/webp" },
          method: "PUT",
          url: "https://uploads.example.invalid/photo-1/signed",
        },
      })
      .mockResolvedValueOnce({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "22222222-2222-4222-8222-222222222222",
        objectKey:
          "report-media/member-camila/22222222-2222-4222-8222-222222222222/original.webp",
        upload: {
          headers: { "content-type": "image/webp" },
          method: "PUT",
          url: "https://uploads.example.invalid/photo-2/signed",
        },
      });
    const draft = createReportMediaDraft({
      draftId: "lost-draft-device-1",
      makeLocalId: createSequenceId("local-photo"),
      reportType: "lost_pet",
      uploadSessions: {
        completeUploadSession: vi.fn<
          ReportMediaUploadSessionClient["completeUploadSession"]
        >(({ mediaId }) =>
          Promise.resolve({
            mediaId,
            objectKey: `report-media/member-camila/${mediaId}/original.webp`,
            status: "ready" as const,
          }),
        ),
        createUploadSession,
        refreshUploadSession: vi.fn(),
      },
      uploadTransport: {
        putObject: vi.fn(() => Promise.resolve()),
      },
    });
    draft.selectLocalImage({
      height: 900,
      mimeType: "image/webp",
      originalUri: "file:///photo-1.webp",
      sizeBytes: 300_000,
      width: 1200,
    });
    draft.selectLocalImage({
      height: 700,
      mimeType: "image/webp",
      originalUri: "file:///photo-2.webp",
      sizeBytes: 250_000,
      width: 1000,
    });
    await draft.uploadImage("local-photo-1");
    await draft.uploadImage("local-photo-2");

    draft.moveImage("local-photo-2", 0);

    expect(draft.getSnapshot()).toMatchObject({
      primaryLocalId: "local-photo-2",
      readyMedia: [
        { mediaId: "22222222-2222-4222-8222-222222222222" },
        { mediaId: "11111111-1111-4111-8111-111111111111" },
      ],
    });

    draft.setPrimaryImage("local-photo-1");

    expect(draft.getSnapshot()).toMatchObject({
      primaryLocalId: "local-photo-1",
      readyMedia: [
        { mediaId: "11111111-1111-4111-8111-111111111111" },
        { mediaId: "22222222-2222-4222-8222-222222222222" },
      ],
    });
  });

  it("removes a local image from draft state and the publish-ready media list", async () => {
    const createUploadSession = vi
      .fn<ReportMediaUploadSessionClient["createUploadSession"]>()
      .mockResolvedValueOnce({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "11111111-1111-4111-8111-111111111111",
        objectKey:
          "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
        upload: {
          headers: { "content-type": "image/webp" },
          method: "PUT",
          url: "https://uploads.example.invalid/photo-1/signed",
        },
      })
      .mockResolvedValueOnce({
        expiresAt: new Date("2026-06-21T18:05:00.000Z"),
        mediaId: "22222222-2222-4222-8222-222222222222",
        objectKey:
          "report-media/member-camila/22222222-2222-4222-8222-222222222222/original.webp",
        upload: {
          headers: { "content-type": "image/webp" },
          method: "PUT",
          url: "https://uploads.example.invalid/photo-2/signed",
        },
      });
    const draft = createReportMediaDraft({
      draftId: "lost-draft-device-1",
      makeLocalId: createSequenceId("local-photo"),
      reportType: "lost_pet",
      uploadSessions: {
        completeUploadSession: vi.fn<
          ReportMediaUploadSessionClient["completeUploadSession"]
        >(({ mediaId }) =>
          Promise.resolve({
            mediaId,
            objectKey: `report-media/member-camila/${mediaId}/original.webp`,
            status: "ready" as const,
          }),
        ),
        createUploadSession,
        refreshUploadSession: vi.fn(),
      },
      uploadTransport: {
        putObject: vi.fn(() => Promise.resolve()),
      },
    });
    draft.selectLocalImage({
      height: 900,
      mimeType: "image/webp",
      originalUri: "file:///photo-1.webp",
      sizeBytes: 300_000,
      width: 1200,
    });
    draft.selectLocalImage({
      height: 700,
      mimeType: "image/webp",
      originalUri: "file:///photo-2.webp",
      sizeBytes: 250_000,
      width: 1000,
    });
    await draft.uploadImage("local-photo-1");
    await draft.uploadImage("local-photo-2");

    expect(draft.removeImage("local-photo-1")).toMatchObject({
      items: [
        {
          localId: "local-photo-2",
        },
      ],
      primaryLocalId: "local-photo-2",
      readyMedia: [{ mediaId: "22222222-2222-4222-8222-222222222222" }],
    });
  });
});

function createSequenceId(prefix: string) {
  let nextId = 0;

  return () => `${prefix}-${++nextId}`;
}
