import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ReportMediaDraftItem,
  ReportMediaDraftSnapshot,
  ReportMediaUploadSessionClient,
  ReportMediaUploadTransport,
} from "./report-media-draft";
import {
  createReportMediaDraft,
  ReportMediaUploadFailure,
} from "./report-media-draft";
import {
  ReportMediaManager,
  uploadPendingReportMediaDraftItems,
} from "./report-media-manager";

const reactState = vi.hoisted(() => ({
  cursor: 0,
  effectCursor: 0,
  effects: [] as {
    dependencies?: readonly unknown[];
  }[],
  pendingEffects: [] as (() => void)[],
  values: [] as unknown[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: (
      effect: () => void | (() => void),
      dependencies?: readonly unknown[],
    ) => {
      const index = reactState.effectCursor;
      reactState.effectCursor += 1;
      const previous = reactState.effects[index]?.dependencies;
      const hasChanged =
        dependencies === undefined ||
        previous === undefined ||
        dependencies.length !== previous.length ||
        dependencies.some(
          (dependency, dependencyIndex) =>
            !Object.is(dependency, previous[dependencyIndex]),
        );

      if (!hasChanged) {
        return;
      }

      reactState.effects[index] = {
        dependencies: dependencies ? [...dependencies] : undefined,
      };
      reactState.pendingEffects.push(() => {
        effect();
      });
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useRef: <TValue,>(initialValue: TValue) => {
      const index = reactState.cursor;
      reactState.cursor += 1;

      if (reactState.values.length <= index) {
        reactState.values[index] = { current: initialValue };
      }

      return reactState.values[index] as React.MutableRefObject<TValue>;
    },
    useState: <TValue,>(initialValue: TValue) => {
      const index = reactState.cursor;
      reactState.cursor += 1;

      if (reactState.values.length <= index) {
        reactState.values[index] =
          typeof initialValue === "function"
            ? (initialValue as () => TValue)()
            : initialValue;
      }

      return [
        reactState.values[index],
        (nextValue: React.SetStateAction<TValue>) => {
          reactState.values[index] =
            typeof nextValue === "function"
              ? (nextValue as (current: TValue) => TValue)(
                  reactState.values[index] as TValue,
                )
              : nextValue;
        },
      ];
    },
  };
});

vi.mock("react-native", () => ({
  Modal: "Modal",
  PanResponder: {
    create: (handlers: Record<string, unknown>) => ({
      panHandlers: handlers,
    }),
  },
  Pressable: "Pressable",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  useWindowDimensions: () => ({
    fontScale: 1,
    height: 844,
    scale: 1,
    width: 390,
  }),
  View: "View",
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

beforeEach(() => {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.effects = [];
  reactState.pendingEffects = [];
  reactState.values = [];
});

describe("ReportMediaManager", () => {
  it("adds selected library images and uploads them through the continue flow", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const sourceAdapter = {
      captureWithCamera: vi.fn(),
      selectFromLibrary: vi.fn(() =>
        Promise.resolve([
          {
            height: 900,
            mimeType: "image/webp" as const,
            originalUri: "file:///library-photo.webp",
            sizeBytes: 300_000,
            width: 1200,
          },
        ]),
      ),
    };
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    await pressByLabel(screen, "Agregar desde biblioteca");

    expect(sourceAdapter.selectFromLibrary).toHaveBeenCalledOnce();
    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({
          originalUri: "file:///library-photo.webp",
          progress: 0,
          status: "selected",
          uploadUri: "file:///library-photo.webp",
        }),
      ],
      overallProgress: 0,
      readyMedia: [],
    });

    const selectedScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    expect(findText(selectedScreen, "Foto 1")).toBe(true);
    expect(findText(selectedScreen, "Portada")).toBe(true);
    expect(findText(selectedScreen, "Principal")).toBe(false);
    expect(findText(selectedScreen, "Se subira al continuar")).toBe(true);
    expect(findText(selectedScreen, "Progreso total 0%")).toBe(true);
    expect(
      findElement(
        selectedScreen,
        (element) =>
          element.props.accessibilityLabel ===
          "Foto 1 de 1, portada, pendiente de subir al continuar, progreso 0%",
      ),
    ).toBeDefined();
    expect(
      findElement(
        selectedScreen,
        (element) =>
          element.props.accessibilityLabel ===
          "Quitar foto 1 de 1, portada, pendiente de subir al continuar",
      )?.props.accessibilityState,
    ).toMatchObject({ disabled: false });
    expect(findText(selectedScreen, "Subir")).toBe(false);

    await uploadPendingReportMediaDraftItems({ draft, onSnapshotChange });

    expect(onSnapshotChange.mock.calls[1]?.[0]).toMatchObject({
      items: [
        expect.objectContaining({
          status: "authorizing",
        }),
      ],
    });
    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({
          originalUri: "file:///library-photo.webp",
          progress: 1,
          status: "ready",
          uploadUri: "file:///library-photo.webp",
        }),
      ],
      overallProgress: 1,
      readyMedia: [{ mediaId: "11111111-1111-4111-8111-111111111111" }],
    });
  });

  it("opens the native cropper immediately after selecting a library image", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const sourceAdapter = {
      captureWithCamera: vi.fn(),
      selectFromLibrary: vi.fn(() =>
        Promise.resolve([
          {
            height: 900,
            mimeType: "image/webp" as const,
            originalUri: "file:///library-photo.webp",
            sizeBytes: 300_000,
            width: 1200,
          },
        ]),
      ),
    };
    const editAdapter = {
      editImage: vi.fn((item: ReportMediaDraftItem) =>
        Promise.resolve({
          height: 800,
          localId: item.localId,
          mimeType: "image/webp" as const,
          sizeBytes: 220_000,
          uri: "file:///library-photo-cropped.webp",
          width: 800,
        }),
      ),
    };
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        editAdapter={editAdapter}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    await pressByLabel(screen, "Agregar desde biblioteca");

    expect(editAdapter.editImage).toHaveBeenCalledWith(
      expect.objectContaining({
        originalUri: "file:///library-photo.webp",
        uploadUri: "file:///library-photo.webp",
      }),
    );
    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({
          originalUri: "file:///library-photo.webp",
          status: "selected",
          uploadUri: "file:///library-photo-cropped.webp",
        }),
      ],
    });
    expect(findText(screen, "Recortar y girar")).toBe(false);
  });

  it("removes a newly selected library image when native cropping is canceled", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const sourceAdapter = {
      captureWithCamera: vi.fn(),
      selectFromLibrary: vi.fn(() =>
        Promise.resolve([
          {
            height: 900,
            mimeType: "image/webp" as const,
            originalUri: "file:///library-photo.webp",
            sizeBytes: 300_000,
            width: 1200,
          },
        ]),
      ),
    };
    const editAdapter = {
      editImage: vi.fn(() => Promise.resolve(undefined)),
    };
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        editAdapter={editAdapter}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    await pressByLabel(screen, "Agregar desde biblioteca");

    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [],
      overallProgress: 0,
      readyMedia: [],
    });
    expect(draft.getSnapshot().items).toHaveLength(0);
  });

  it("captures a camera image and stages it before upload", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const sourceAdapter = {
      captureWithCamera: vi.fn(() =>
        Promise.resolve({
          height: 900,
          mimeType: "image/webp" as const,
          originalUri: "file:///camera-photo.webp",
          sizeBytes: 300_000,
          width: 1200,
        }),
      ),
      selectFromLibrary: vi.fn(() => Promise.resolve([])),
    };
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    await pressByLabel(screen, "Agregar con cámara");

    expect(sourceAdapter.captureWithCamera).toHaveBeenCalledOnce();
    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({
          originalUri: "file:///camera-photo.webp",
          progress: 0,
          status: "selected",
          uploadUri: "file:///camera-photo.webp",
        }),
      ],
      overallProgress: 0,
      readyMedia: [],
    });
  });

  it("renders recoverable source feedback when camera permission is denied", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const sourceAdapter = {
      captureWithCamera: vi.fn(() =>
        Promise.resolve({
          canAskAgain: false,
          status: "denied" as const,
        }),
      ),
      selectFromLibrary: vi.fn(() => Promise.resolve([])),
    };
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    await pressByLabel(screen, "Agregar con cámara");

    expect(reactState.values[0]).toEqual({
      canAskAgain: false,
      status: "denied",
    });

    const feedbackScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    expect(findText(feedbackScreen, "Activa el permiso")).toBe(true);
    expect(onSnapshotChange).not.toHaveBeenCalled();
  });

  it("renders stable source feedback instead of raw native errors", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const sourceAdapter = {
      captureWithCamera: vi.fn(() =>
        Promise.resolve({
          message: "expo-file-system/legacy is unavailable.",
          status: "unavailable" as const,
        }),
      ),
      selectFromLibrary: vi.fn(() => Promise.resolve([])),
    };
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    await pressByLabel(screen, "Agregar con cámara");

    const feedbackScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    expect(
      findText(
        feedbackScreen,
        "No pudimos abrir tus fotos o cámara. Intenta nuevamente.",
      ),
    ).toBe(true);
    expect(findText(feedbackScreen, "expo-file-system")).toBe(false);
  });

  it("opens the native cropper from the edit action and preserves the original local URI", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const selected = draft.selectLocalImage({
      height: 1200,
      mimeType: "image/jpeg",
      originalUri: "file:///original-camera.jpg",
      sizeBytes: 600_000,
      width: 1600,
    });
    const editAdapter = {
      editImage: vi.fn(() =>
        Promise.resolve({
          height: 900,
          localId: selected.localId,
          mimeType: "image/webp" as const,
          sizeBytes: 280_000,
          uri: "file:///edited-crop.webp",
          width: 1200,
        }),
      ),
    };
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        editAdapter={editAdapter}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    await pressByLabel(screen, "Editar foto 1");

    expect(editAdapter.editImage).toHaveBeenCalledWith(
      expect.objectContaining({
        localId: selected.localId,
        originalUri: "file:///original-camera.jpg",
      }),
    );
    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({
          originalUri: "file:///original-camera.jpg",
          progress: 0,
          status: "selected",
          uploadUri: "file:///edited-crop.webp",
        }),
      ],
      readyMedia: [],
    });
  });

  it("recrops an already edited tile from the latest edited local URI", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
    const selected = draft.selectLocalImage({
      height: 1200,
      mimeType: "image/jpeg",
      originalUri: "file:///original-camera.jpg",
      sizeBytes: 600_000,
      width: 1600,
    });
    const editAdapter = {
      editImage: vi
        .fn()
        .mockResolvedValueOnce({
          height: 900,
          localId: selected.localId,
          mimeType: "image/webp" as const,
          sizeBytes: 280_000,
          uri: "file:///edited-crop-1.webp",
          width: 1200,
        })
        .mockResolvedValueOnce({
          height: 800,
          localId: selected.localId,
          mimeType: "image/webp" as const,
          sizeBytes: 240_000,
          uri: "file:///edited-crop-2.webp",
          width: 800,
        }),
    };
    const firstScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        editAdapter={editAdapter}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    await pressByLabel(firstScreen, "Editar foto 1");

    const secondScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        editAdapter={editAdapter}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    await pressByLabel(secondScreen, "Editar foto 1");

    expect(editAdapter.editImage.mock.calls[0]?.[0]).toMatchObject({
      localId: selected.localId,
      originalUri: "file:///original-camera.jpg",
      uploadUri: "file:///original-camera.jpg",
    });
    expect(editAdapter.editImage.mock.calls[1]?.[0]).toMatchObject({
      localId: selected.localId,
      originalUri: "file:///original-camera.jpg",
      uploadUri: "file:///edited-crop-1.webp",
    });
    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({
          originalUri: "file:///original-camera.jpg",
          status: "selected",
          uploadUri: "file:///edited-crop-2.webp",
        }),
      ],
    });
  });

  it("reflects reordering and primary selection in emitted order and visible labels", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
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
    const initialScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    expect(findText(initialScreen, "Hacer principal")).toBe(false);
    expect(findText(initialScreen, "Arriba")).toBe(false);
    expect(findText(initialScreen, "Abajo")).toBe(false);

    await pressByLabel(initialScreen, "Usar foto 2 de 2 como portada");

    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({ uploadUri: "file:///photo-2.webp" }),
        expect.objectContaining({ uploadUri: "file:///photo-1.webp" }),
      ],
      primaryLocalId: "local-photo-2",
    });

    const primaryScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    expect(findText(primaryScreen, "Foto 1")).toBe(true);
    expect(findText(primaryScreen, "Portada")).toBe(true);
    expect(findText(primaryScreen, "Principal")).toBe(false);

    await pressByLabel(primaryScreen, "Mover foto 2 de 2");

    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({ uploadUri: "file:///photo-1.webp" }),
        expect.objectContaining({ uploadUri: "file:///photo-2.webp" }),
      ],
      primaryLocalId: "local-photo-1",
    });
  });

  it("removes an item through the explicit remove action", async () => {
    const draft = createDraft();
    const onSnapshotChange = vi.fn();
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
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    await pressByLabel(screen, "Quitar foto 1");

    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [expect.objectContaining({ uploadUri: "file:///photo-2.webp" })],
      primaryLocalId: "local-photo-2",
    });
    expect(draft.getSnapshot().items).toHaveLength(1);
  });

  it("shows retry for failed uploads and retries only the failed item", async () => {
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
    await draft.uploadImage("local-photo-2");
    const onSnapshotChange = vi.fn();
    const failedScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    expect(findText(failedScreen, "Error al subir")).toBe(true);
    expect(
      findText(
        failedScreen,
        "La autorización para subir la foto venció. Reintenta la foto.",
      ),
    ).toBe(true);
    expect(findText(failedScreen, "Autorizacion vencida")).toBe(false);

    await pressByLabel(failedScreen, "Reintentar foto 2");

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
    expect(lastSnapshot(onSnapshotChange)).toMatchObject({
      items: [
        expect.objectContaining({ status: "ready" }),
        expect.objectContaining({ status: "ready" }),
      ],
    });
  });

  it("renders upload progress for an uploading item and the overall draft", async () => {
    const uploadDeferred = createDeferred<void>();
    const uploadTransport = {
      putObject: vi.fn<ReportMediaUploadTransport["putObject"]>(
        () => uploadDeferred.promise,
      ),
    } satisfies ReportMediaUploadTransport;
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
              method: "PUT",
              url: "https://uploads.example.invalid/photo-1/signed",
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
    draft.selectLocalImage({
      height: 700,
      mimeType: "image/webp",
      originalUri: "file:///photo-2.webp",
      sizeBytes: 250_000,
      width: 1000,
    });
    const uploadPromise = draft.uploadImage("local-photo-1");
    await flushPromises();
    const uploadInput = uploadTransport.putObject.mock.calls[0]?.[0];

    uploadInput?.onProgress?.(0.5);

    const progressScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        editAdapter={{
          editImage: vi.fn(),
        }}
        onSnapshotChange={vi.fn()}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    expect(findText(progressScreen, "Subiendo")).toBe(true);
    expect(findText(progressScreen, "50%")).toBe(true);
    expect(findText(progressScreen, "Progreso total 25%")).toBe(true);
    expect(
      findElement(
        progressScreen,
        (element) =>
          element.props.accessibilityLabel === "Progreso de foto 1 50%" &&
          element.props.accessibilityRole === "progressbar",
      )?.props.accessibilityValue,
    ).toMatchObject({ now: 50 });
    expect(
      findElement(
        progressScreen,
        (element) =>
          element.props.accessibilityLabel ===
          "Foto 1 de 2, portada, subiendo, progreso 50%",
      ),
    ).toBeDefined();
    expect(
      findElement(
        progressScreen,
        (element) =>
          element.props.accessibilityLabel === "Progreso total de fotos 25%" &&
          element.props.accessibilityRole === "progressbar",
      )?.props.accessibilityState,
    ).toMatchObject({ busy: true });
    expect(
      findElement(
        progressScreen,
        (element) =>
          element.props.accessibilityLabel ===
          "Editar foto 1 de 2, portada, subiendo",
      )?.props.accessibilityState,
    ).toMatchObject({ disabled: true });

    uploadDeferred.resolve();
    await uploadPromise;
  });

  it("disables edit actions when a local image URI is unavailable", () => {
    const draft = createDraft();
    draft.hydrateReadyMedia([
      {
        height: 900,
        localId: "local-photo-1",
        mediaId: "ready-media-1",
        mimeType: "image/jpeg",
        originalUri: "",
        sizeBytes: 200_000,
        uploadUri: "",
        width: 1200,
      },
    ]);
    const screen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        editAdapter={{ editImage: vi.fn() }}
        onSnapshotChange={vi.fn()}
        snapshot={draft.getSnapshot()}
        sourceAdapter={emptySourceAdapter}
      />,
    );

    expect(
      findElement(
        screen,
        (element) =>
          element.props.accessibilityLabel ===
          "Editar foto 1 de 1, portada, subida",
      )?.props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });
});

const emptySourceAdapter = {
  captureWithCamera: vi.fn(),
  selectFromLibrary: vi.fn(() => Promise.resolve([])),
};

function createDraft() {
  return createReportMediaDraft({
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
            method: "PUT",
            url: "https://uploads.example.invalid/photo-1/signed",
          },
        }),
      ),
      refreshUploadSession: vi.fn(),
    },
    uploadTransport: {
      putObject: vi.fn<ReportMediaUploadTransport["putObject"]>(() =>
        Promise.resolve(),
      ),
    },
  });
}

function createSequenceId(prefix: string) {
  let nextId = 0;

  return () => `${prefix}-${++nextId}`;
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.pendingEffects = [];
  const rendered = renderFunctionElementInner(node);

  flushEffects();
  return rendered;
}

function renderFunctionElementInner(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  if (typeof node.type === "function") {
    const Component = node.type as (props: ElementProps) => React.ReactNode;

    return renderFunctionElementInner(Component(node.props));
  }

  const children = React.Children.toArray(node.props.children).map((child) =>
    renderFunctionElementInner(child),
  );

  return React.cloneElement(node, {
    ...node.props,
    children:
      children.length === 0
        ? undefined
        : children.length === 1
          ? children[0]
          : children,
  });
}

function findElement(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement | undefined {
  const rendered = node;

  if (!React.isValidElement<ElementProps>(rendered)) {
    return undefined;
  }

  if (predicate(rendered)) {
    return rendered;
  }

  for (const child of React.Children.toArray(rendered.props.children)) {
    const found = findElement(child, predicate);

    if (found) {
      return found;
    }
  }

  return undefined;
}

function findText(node: React.ReactNode, text: string): boolean {
  const rendered = node;

  if (typeof rendered === "string") {
    return rendered === text;
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  if (
    typeof rendered.props.accessibilityLabel === "string" &&
    rendered.props.accessibilityLabel.includes(text)
  ) {
    return true;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findText(child, text),
  );
}

async function pressByLabel(node: React.ReactNode, label: string) {
  const button = findElement(
    node,
    (element) =>
      element.props.accessibilityLabel === label ||
      (typeof element.props.accessibilityLabel === "string" &&
        element.props.accessibilityLabel.startsWith(label)),
  );

  if (!button || typeof button.props.onPress !== "function") {
    throw new Error(`Could not find pressable label: ${label}`);
  }

  const onPress = button.props.onPress as () => Promise<void> | void;

  await onPress();
}

function lastSnapshot(
  onSnapshotChange: SnapshotChangeSpy,
): ReportMediaDraftSnapshot | undefined {
  const calls = onSnapshotChange.mock.calls as [ReportMediaDraftSnapshot][];

  return calls.at(-1)?.[0];
}

interface SnapshotChangeSpy {
  mock: {
    calls: unknown[][];
  };
}

function createDeferred<TValue>() {
  let resolve!: (value: TValue | PromiseLike<TValue>) => void;
  const promise = new Promise<TValue>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

function flushEffects() {
  while (reactState.pendingEffects.length > 0) {
    const effect = reactState.pendingEffects.shift();

    effect?.();
  }
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
