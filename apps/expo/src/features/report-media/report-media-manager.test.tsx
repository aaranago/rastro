import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ReportMediaDraftSnapshot,
  ReportMediaUploadSessionClient,
  ReportMediaUploadTransport,
} from "./report-media-draft";
import {
  createReportMediaDraft,
  ReportMediaUploadFailure,
} from "./report-media-draft";
import { ReportMediaManager } from "./report-media-manager";

const reactState = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
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
  Pressable: "Pressable",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

beforeEach(() => {
  reactState.cursor = 0;
  reactState.values = [];
});

describe("ReportMediaManager", () => {
  it("adds selected library images, emits the selected draft snapshot, then emits the uploaded snapshot", async () => {
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
    expect(onSnapshotChange).toHaveBeenCalledTimes(3);
    expect(onSnapshotChange.mock.calls[0]?.[0]).toMatchObject({
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

    const selectedScreen = renderFunctionElement(
      <ReportMediaManager
        draft={draft}
        onSnapshotChange={onSnapshotChange}
        snapshot={draft.getSnapshot()}
        sourceAdapter={sourceAdapter}
      />,
    );

    expect(findText(selectedScreen, "Foto 1")).toBe(true);
    expect(findText(selectedScreen, "Principal")).toBe(true);
    expect(findText(selectedScreen, "Lista")).toBe(true);
    expect(findText(selectedScreen, "Progreso total 100%")).toBe(true);
    expect(
      findElement(
        selectedScreen,
        (element) =>
          element.props.accessibilityLabel ===
          "Foto 1 de 1, principal, subida, progreso 100%",
      ),
    ).toBeDefined();
    expect(
      findElement(
        selectedScreen,
        (element) =>
          element.props.accessibilityLabel ===
          "Quitar foto 1 de 1, principal, subida",
      )?.props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it("captures a camera image, emits the selected draft snapshot, then emits the uploaded snapshot", async () => {
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

    await pressByLabel(screen, "Agregar con camara");

    expect(sourceAdapter.captureWithCamera).toHaveBeenCalledOnce();
    expect(onSnapshotChange).toHaveBeenCalledTimes(3);
    expect(onSnapshotChange.mock.calls[0]?.[0]).toMatchObject({
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
          originalUri: "file:///camera-photo.webp",
          progress: 1,
          status: "ready",
          uploadUri: "file:///camera-photo.webp",
        }),
      ],
      overallProgress: 1,
      readyMedia: [{ mediaId: "11111111-1111-4111-8111-111111111111" }],
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

    await pressByLabel(screen, "Agregar con camara");

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

  it("preserves the original local URI when accepting an edited image and uploads the edit", async () => {
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

    await pressByLabel(screen, "Recortar foto 1");

    expect(editAdapter.editImage).toHaveBeenCalledWith(
      expect.objectContaining({
        localId: selected.localId,
        originalUri: "file:///original-camera.jpg",
      }),
      {
        crop: {
          height: 1200,
          originX: 200,
          originY: 0,
          width: 1200,
        },
      },
    );
    expect(onSnapshotChange).toHaveBeenCalledTimes(3);
    expect(onSnapshotChange.mock.calls[0]?.[0]).toMatchObject({
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
          originalUri: "file:///original-camera.jpg",
          progress: 1,
          status: "ready",
          uploadUri: "file:///edited-crop.webp",
        }),
      ],
      readyMedia: [{ mediaId: "11111111-1111-4111-8111-111111111111" }],
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

    await pressByLabel(initialScreen, "Hacer principal foto 2");

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
    expect(findText(primaryScreen, "Principal")).toBe(true);

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
          "Foto 1 de 2, principal, subiendo, progreso 50%",
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
          "Recortar foto 1 de 2, principal, subiendo",
      )?.props.accessibilityState,
    ).toMatchObject({ disabled: true });

    uploadDeferred.resolve();
    await uploadPromise;
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

  return renderFunctionElementInner(node);
}

function renderFunctionElementInner(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  if (typeof node.type !== "function") {
    return node;
  }

  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return renderFunctionElementInner(Component(node.props));
}

function findElement(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement | undefined {
  const rendered = renderFunctionElement(node);

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
  const rendered = renderFunctionElement(node);

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

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
