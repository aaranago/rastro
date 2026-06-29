import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FoundReportCreationVisitorAction } from "../found-report-creation/found-report-creation-types";
import { ReportCreationRouteScreen } from "./report-creation-route-screen";

const router = vi.hoisted(() => ({
  canGoBack: vi.fn(() => true),
  dismiss: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
const navigation = vi.hoisted(() => {
  const value = {
    addListener: vi.fn((eventName: string, listener: BeforeRemoveListener) => {
      if (eventName === "beforeRemove") {
        value.beforeRemoveListener = listener;
      }

      return value.removeBeforeRemoveListener;
    }),
    beforeRemoveListener: null as BeforeRemoveListener | null,
    dispatch: vi.fn(),
    removeBeforeRemoveListener: vi.fn(() => {
      value.beforeRemoveListener = null;
    }),
  };

  return value;
});
const shell = vi.hoisted(() => ({
  requestAuthPrompt: vi.fn(),
  value: null as ShellValue | null,
}));
const draftPersistence = vi.hoisted(() => ({
  draftStore: {},
  storage: {},
}));
const reactState = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
}));
const api = vi.hoisted(() => ({
  trpcClient: {
    report: {
      create: {
        mutate: vi.fn(),
      },
      detail: {
        query: vi.fn(),
      },
      nearby: {
        query: vi.fn(),
      },
    },
  },
}));
const nearby = vi.hoisted(() => ({
  expoNearbyLocationAdapter: {
    resolveForegroundLocation: vi.fn(),
  },
}));
const resourcesAdapter = vi.hoisted(() => ({
  createApiResourcesAdapter: vi.fn(),
  reportProvider: vi.fn(),
}));
const publishAdapters = vi.hoisted(() => ({
  adoptionHandler: vi.fn(),
  createApiAdoptionListingPublishHandler: vi.fn(),
  createApiFoundReportPublishHandler: vi.fn(),
  createApiLostReportPublishHandler: vi.fn(),
  foundHandler: vi.fn(),
  lostHandler: vi.fn(),
}));
const reportMedia = vi.hoisted(() => {
  const snapshot = {
    items: [],
    overallProgress: 0,
    readyMedia: [],
  };
  const draft = {
    acceptEditedImage: vi.fn(),
    getSnapshot: vi.fn(() => snapshot),
    hydrateReadyMedia: vi.fn(() => snapshot),
    moveImage: vi.fn(),
    removeImage: vi.fn(),
    retryUpload: vi.fn(),
    selectLocalImage: vi.fn(),
    setPrimaryImage: vi.fn(),
    uploadImage: vi.fn(),
  };

  return {
    draft,
    editAdapter: {
      editImage: vi.fn(),
    },
    snapshot,
    sourceAdapter: {
      launchCamera: vi.fn(),
      pickImagesFromLibrary: vi.fn(),
    },
    uploadSessionClient: {
      completeUploadSession: vi.fn(),
      createUploadSession: vi.fn(),
      refreshUploadSession: vi.fn(),
    },
    uploadTransport: {
      putObject: vi.fn(),
    },
    createApiReportMediaUploadSessionClient: vi.fn(),
    createNativeReportMediaEditAdapter: vi.fn(),
    createNativeReportMediaSourceAdapter: vi.fn(),
    createNativeReportMediaUploadTransport: vi.fn(),
    createReportMediaDraft: vi.fn(),
    reportMediaCreationPhotosToHydratedReadyMedia: vi.fn(
      (photos: readonly unknown[]) =>
        photos.flatMap((photo) => {
          if (
            typeof photo !== "object" ||
            photo === null ||
            !("status" in photo) ||
            photo.status !== "ready" ||
            !("mediaId" in photo) ||
            typeof photo.mediaId !== "string"
          ) {
            return [];
          }

          const uploadUri =
            "uploadUri" in photo && typeof photo.uploadUri === "string"
              ? photo.uploadUri
              : "uri" in photo && typeof photo.uri === "string"
                ? photo.uri
                : undefined;

          if (!uploadUri) {
            return [];
          }

          return [
            {
              localId:
                "localId" in photo && typeof photo.localId === "string"
                  ? photo.localId
                  : "id" in photo && typeof photo.id === "string"
                    ? photo.id
                    : photo.mediaId,
              mediaId: photo.mediaId,
              originalUri:
                "originalUri" in photo && typeof photo.originalUri === "string"
                  ? photo.originalUri
                  : uploadUri,
              uploadUri,
            },
          ];
        }),
    ),
    uploadPendingReportMediaDraftItems: vi.fn(
      ({
        draft,
        onSnapshotChange,
      }: {
        draft: { getSnapshot: () => unknown };
        onSnapshotChange: (snapshot: unknown) => void;
      }) => {
        const snapshot = draft.getSnapshot();
        onSnapshotChange(snapshot);
        return Promise.resolve(snapshot);
      },
    ),
  };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: (effect: () => void) => {
      effect();
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useRef: <TValue,>(initialValue: TValue) => ({
      current: initialValue,
    }),
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
  Share: {
    share: vi.fn(),
  },
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("expo-router", () => ({
  useNavigation: () => navigation,
  useRouter: () => router,
}));

vi.mock("../app-states", () => ({
  AppStateScreen: "AppStateScreen",
}));

vi.mock(
  "../adoption-listing-creation/adoption-listing-creation-screen",
  () => ({
    AdoptionListingCreationScreen: "AdoptionListingCreationScreen",
  }),
);

vi.mock(
  "../adoption-listing-creation/adoption-listing-publish-adapter",
  () => ({
    createApiAdoptionListingPublishHandler:
      publishAdapters.createApiAdoptionListingPublishHandler,
  }),
);

vi.mock("../found-report-creation/found-report-creation-screen", () => ({
  FoundReportCreationScreen: "FoundReportCreationScreen",
}));

vi.mock("../found-report-creation/found-report-publish-adapter", () => ({
  createApiFoundReportPublishHandler:
    publishAdapters.createApiFoundReportPublishHandler,
}));

vi.mock("../lost-report-creation/lost-report-creation-screen", () => ({
  LostReportCreationScreen: "LostReportCreationScreen",
}));

vi.mock("../lost-report-creation/lost-report-publish-adapter", () => ({
  createApiLostReportPublishHandler:
    publishAdapters.createApiLostReportPublishHandler,
}));

vi.mock("../nearby/nearby-expo-location-adapter", () => ({
  expoNearbyLocationAdapter: nearby.expoNearbyLocationAdapter,
}));

vi.mock("../report-media", () => ({
  ReportMediaManager: "ReportMediaManager",
  createApiReportMediaUploadSessionClient:
    reportMedia.createApiReportMediaUploadSessionClient,
  createNativeReportMediaEditAdapter:
    reportMedia.createNativeReportMediaEditAdapter,
  createNativeReportMediaSourceAdapter:
    reportMedia.createNativeReportMediaSourceAdapter,
  createNativeReportMediaUploadTransport:
    reportMedia.createNativeReportMediaUploadTransport,
  createReportMediaDraft: reportMedia.createReportMediaDraft,
  reportMediaCreationPhotosToHydratedReadyMedia:
    reportMedia.reportMediaCreationPhotosToHydratedReadyMedia,
  uploadPendingReportMediaDraftItems:
    reportMedia.uploadPendingReportMediaDraftItems,
}));

vi.mock("../resilience/creation-drafts", () => ({
  createCreationDraftStore: vi.fn(() => draftPersistence.draftStore),
}));

vi.mock("../resilience/storage", () => ({
  createExpoSecureStoreKeyValueStorage: vi.fn(() => draftPersistence.storage),
}));

vi.mock("../resources", () => ({
  buildResourceProviderProfileHref: (providerId: string) =>
    `/proveedores/${providerId}`,
}));

vi.mock("../resources/resources-api-adapter", () => ({
  createApiResourcesAdapter: resourcesAdapter.createApiResourcesAdapter,
}));

vi.mock("../sighting-report-creation/sighting-report-creation-screen", () => ({
  SightingReportCreationScreen: "SightingReportCreationScreen",
}));

vi.mock("../sighting-report-creation/sighting-report-publish-adapter", () => ({
  createApiSightingReportPublishHandler: vi.fn(() => vi.fn()),
}));

vi.mock("../shell/shell-provider", () => ({
  useRastroShell: () => shell.value,
}));

vi.mock("../../utils/api", () => ({
  trpcClient: api.trpcClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  navigation.beforeRemoveListener = null;
  navigation.dispatch = vi.fn();
  router.canGoBack.mockReturnValue(true);
  reactState.cursor = 0;
  reactState.values = [];
  reportMedia.createReportMediaDraft.mockReset();
  reportMedia.createApiReportMediaUploadSessionClient.mockReturnValue(
    reportMedia.uploadSessionClient,
  );
  reportMedia.createNativeReportMediaEditAdapter.mockReturnValue(
    reportMedia.editAdapter,
  );
  reportMedia.createNativeReportMediaSourceAdapter.mockReturnValue(
    reportMedia.sourceAdapter,
  );
  reportMedia.createNativeReportMediaUploadTransport.mockReturnValue(
    reportMedia.uploadTransport,
  );
  reportMedia.createReportMediaDraft.mockReturnValue(reportMedia.draft);
  resourcesAdapter.createApiResourcesAdapter.mockReturnValue({
    reportProvider: resourcesAdapter.reportProvider,
  });
  resourcesAdapter.reportProvider.mockResolvedValue({
    moderationItem: {},
    status: "created",
  });
  publishAdapters.createApiLostReportPublishHandler.mockReturnValue(
    publishAdapters.lostHandler,
  );
  publishAdapters.createApiFoundReportPublishHandler.mockReturnValue(
    publishAdapters.foundHandler,
  );
  publishAdapters.createApiAdoptionListingPublishHandler.mockReturnValue(
    publishAdapters.adoptionHandler,
  );
  shell.value = createShellValue({
    session: {
      id: "member-camila",
      kind: "member",
      name: "Camila",
    },
  });
});

describe("ReportCreationRouteScreen", () => {
  it("renders the selected member creation screen with scoped durable drafts and backend sponsor reporting", async () => {
    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );

    expect(lostScreen?.props.draftScopeId).toBe("member-camila");
    expect(lostScreen?.props.draftStore).toBe(draftPersistence.draftStore);
    expect(lostScreen?.props.onOpenSponsorPlacement).toEqual(
      expect.any(Function),
    );
    expect(lostScreen?.props.onReportSponsorPlacement).toEqual(
      expect.any(Function),
    );
    expect(resourcesAdapter.createApiResourcesAdapter).toHaveBeenCalledWith({
      client: api.trpcClient,
    });

    const reportSponsorPlacement: unknown =
      lostScreen?.props.onReportSponsorPlacement;

    if (typeof reportSponsorPlacement !== "function") {
      throw new Error("Expected sponsor placement report callback.");
    }

    const reportSponsorPlacementCallback = reportSponsorPlacement as (
      sponsorPlacementId: string,
    ) => Promise<unknown>;

    await expect(
      reportSponsorPlacementCallback("11111111-1111-4111-8111-111111111111"),
    ).resolves.toMatchObject({
      status: "created",
    });
    expect(resourcesAdapter.reportProvider).toHaveBeenCalledWith({
      detail: "Reporte enviado desde una colocacion patrocinada.",
      providerId: "11111111-1111-4111-8111-111111111111",
      reason: "other",
    });
  });

  it.each([
    ["lost", "LostReportCreationScreen"],
    ["found", "FoundReportCreationScreen"],
    ["sighting", "SightingReportCreationScreen"],
    ["adoption", "AdoptionListingCreationScreen"],
  ] as const)(
    "passes the production location adapter to the %s creation screen",
    (intent, screenType) => {
      const screen = renderScreen(
        <ReportCreationRouteScreen intent={intent} />,
      );
      const creationScreen = findElement(
        screen,
        (element) => element.type === screenType,
      );

      expect(creationScreen?.props.locationAdapter).toBe(
        nearby.expoNearbyLocationAdapter,
      );
    },
  );

  it.each([
    [
      "lost",
      "LostReportCreationScreen",
      "onPublishLostReport",
      "createApiLostReportPublishHandler",
      "lostHandler",
    ],
    [
      "found",
      "FoundReportCreationScreen",
      "onPublishFoundReport",
      "createApiFoundReportPublishHandler",
      "foundHandler",
    ],
    [
      "adoption",
      "AdoptionListingCreationScreen",
      "onPublishAdoptionListing",
      "createApiAdoptionListingPublishHandler",
      "adoptionHandler",
    ],
  ] as const)(
    "wires the production backend publish handler for %s creation",
    (intent, screenType, propName, factoryName, handlerName) => {
      const screen = renderScreen(
        <ReportCreationRouteScreen intent={intent} />,
      );
      const creationScreen = findElement(
        screen,
        (element) => element.type === screenType,
      );

      expect(publishAdapters[factoryName]).toHaveBeenCalledWith({
        client: api.trpcClient,
      });
      expect(creationScreen?.props[propName]).toBe(
        publishAdapters[handlerName],
      );
    },
  );

  it.each([
    ["lost", "LostReportCreationScreen", "lost_pet"],
    ["found", "FoundReportCreationScreen", "found_pet"],
    ["sighting", "SightingReportCreationScreen", "sighting"],
    ["adoption", "AdoptionListingCreationScreen", "adoption"],
  ] as const)(
    "hosts production report media for the %s creation route",
    async (intent, screenType, reportType) => {
      const screen = renderScreen(
        <ReportCreationRouteScreen intent={intent} />,
      );
      const creationScreen = findElement(
        screen,
        (element) => element.type === screenType,
      );
      const renderReportMediaManager =
        creationScreen?.props.renderReportMediaManager;

      if (!isReportMediaManagerRender(renderReportMediaManager)) {
        throw new Error("Expected report media manager render callback.");
      }

      const childSnapshotChange = vi.fn();
      const controllerChange = vi.fn();
      const mediaDraftId = `${intent}-durable-media-draft-1`;
      const managerHost = renderFunctionElement(
        renderReportMediaManager({
          mediaDraftId,
          onControllerChange: controllerChange,
          onSnapshotChange: childSnapshotChange,
          photos: [],
        }),
      );
      const mediaManager = findElement(
        managerHost,
        (element) => element.type === "ReportMediaManager",
      );
      const nextSnapshot = {
        items: [],
        overallProgress: 1,
        readyMedia: [{ mediaId: "ready-media-1" }],
      };

      expect(
        reportMedia.createApiReportMediaUploadSessionClient,
      ).toHaveBeenCalledWith({ client: api.trpcClient });
      expect(
        reportMedia.createNativeReportMediaSourceAdapter,
      ).toHaveBeenCalled();
      expect(reportMedia.createNativeReportMediaEditAdapter).toHaveBeenCalled();
      expect(
        reportMedia.createNativeReportMediaUploadTransport,
      ).toHaveBeenCalled();
      expect(reportMedia.createReportMediaDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          draftId: mediaDraftId,
          reportType,
          uploadSessions: reportMedia.uploadSessionClient,
          uploadTransport: reportMedia.uploadTransport,
        }),
      );
      expect(mediaManager?.props.draft).toBe(reportMedia.draft);
      expect(mediaManager?.props.snapshot).toBe(reportMedia.snapshot);
      expect(mediaManager?.props.sourceAdapter).toEqual(expect.any(Object));
      expect(mediaManager?.props.editAdapter).toEqual(expect.any(Object));
      expect(controllerChange).toHaveBeenCalledTimes(1);

      reportMedia.sourceAdapter.pickImagesFromLibrary.mockResolvedValueOnce({
        canAskAgain: false,
        status: "denied",
      });

      await expect(
        (
          mediaManager?.props.sourceAdapter as {
            selectFromLibrary: () => Promise<unknown>;
          }
        ).selectFromLibrary(),
      ).resolves.toEqual({
        canAskAgain: false,
        status: "denied",
      });

      await (
        mediaManager?.props.editAdapter as {
          editImage: (
            item: {
              localId: string;
              mimeType: "image/jpeg";
              originalUri: string;
              uploadUri: string;
            },
            options: {
              crop: {
                height: number;
                originX: number;
                originY: number;
                width: number;
              };
              rotateDegrees: number;
              rotateBeforeCrop?: boolean;
            },
          ) => Promise<unknown>;
        }
      ).editImage(
        {
          localId: "local-photo-1",
          mimeType: "image/jpeg",
          originalUri: "file:///camera/original.jpg",
          uploadUri: "file:///edited/previous.jpg",
        },
        {
          crop: {
            height: 900,
            originX: 100,
            originY: 25,
            width: 1200,
          },
          rotateBeforeCrop: true,
          rotateDegrees: 90,
        },
      );

      expect(reportMedia.editAdapter.editImage).toHaveBeenCalledWith(
        expect.objectContaining({
          crop: {
            height: 900,
            originX: 100,
            originY: 25,
            width: 1200,
          },
          localId: "local-photo-1",
          rotateBeforeCrop: true,
          rotateDegrees: 90,
          sourceUri: "file:///edited/previous.jpg",
        }),
      );

      const controller = toReportMediaStepController(
        controllerChange.mock.calls[0]?.[0],
      );

      expect(controller.getSnapshot()).toBe(reportMedia.snapshot);
      await controller.uploadPendingImages();

      const pendingUploadCall = toPendingUploadInput(
        reportMedia.uploadPendingReportMediaDraftItems.mock.calls[0]?.[0],
      );

      expect(pendingUploadCall.draft).toBe(reportMedia.draft);
      expect(typeof pendingUploadCall.onSnapshotChange).toBe("function");

      (mediaManager?.props.onSnapshotChange as (snapshot: unknown) => void)(
        nextSnapshot,
      );

      expect(childSnapshotChange).toHaveBeenCalledWith(nextSnapshot);
    },
  );

  it("reuses a report media draft when the photo step remounts", () => {
    const firstDraft = createMockReportMediaDraft("first");
    const secondDraft = createMockReportMediaDraft("second");
    reportMedia.createReportMediaDraft
      .mockReturnValueOnce(firstDraft)
      .mockReturnValueOnce(secondDraft);

    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );
    const renderReportMediaManager = lostScreen?.props.renderReportMediaManager;

    if (!isReportMediaManagerRender(renderReportMediaManager)) {
      throw new Error("Expected report media manager render callback.");
    }

    const firstHost = renderFunctionElement(
      renderReportMediaManager({
        mediaDraftId: "lost-durable-media-draft-1",
        onSnapshotChange: vi.fn(),
        photos: [],
      }),
    );
    const firstManager = findElement(
      firstHost,
      (element) => element.type === "ReportMediaManager",
    );
    const secondHost = renderFunctionElement(
      renderReportMediaManager({
        mediaDraftId: "lost-durable-media-draft-1",
        onSnapshotChange: vi.fn(),
        photos: [],
      }),
    );
    const secondManager = findElement(
      secondHost,
      (element) => element.type === "ReportMediaManager",
    );

    expect(reportMedia.createReportMediaDraft).toHaveBeenCalledTimes(1);
    expect(firstManager?.props.draft).toBe(firstDraft);
    expect(secondManager?.props.draft).toBe(firstDraft);
  });

  it("hydrates ready report media from persisted creation photos in order", () => {
    const screen = renderScreen(<ReportCreationRouteScreen intent="found" />);
    const foundScreen = findElement(
      screen,
      (element) => element.type === "FoundReportCreationScreen",
    );
    const renderReportMediaManager =
      foundScreen?.props.renderReportMediaManager;

    if (!isReportMediaManagerRender(renderReportMediaManager)) {
      throw new Error("Expected report media manager render callback.");
    }

    void renderFunctionElement(
      renderReportMediaManager({
        mediaDraftId: "found-durable-media-draft-1",
        onSnapshotChange: vi.fn(),
        photos: [
          {
            id: "persisted-local-2",
            localId: "persisted-local-2",
            mediaId: "ready-media-2",
            originalUri: "file:///persisted-original-2.webp",
            status: "ready",
            uploadUri: "file:///persisted-upload-2.webp",
          },
          {
            id: "persisted-local-uploading",
            mediaId: "uploading-media",
            status: "uploading",
            uploadUri: "file:///persisted-uploading.webp",
          },
          {
            id: "persisted-local-missing-uri",
            mediaId: "missing-uri-media",
            status: "ready",
          },
          {
            id: "persisted-local-1",
            mediaId: "ready-media-1",
            status: "ready",
            uri: "file:///persisted-upload-1.jpg",
          },
        ],
      }),
    );

    expect(reportMedia.draft.hydrateReadyMedia).toHaveBeenCalledWith([
      {
        localId: "persisted-local-2",
        mediaId: "ready-media-2",
        originalUri: "file:///persisted-original-2.webp",
        uploadUri: "file:///persisted-upload-2.webp",
      },
      {
        localId: "persisted-local-1",
        mediaId: "ready-media-1",
        originalUri: "file:///persisted-upload-1.jpg",
        uploadUri: "file:///persisted-upload-1.jpg",
      },
    ]);
  });

  it("asks before closing a stacked lost creation route", () => {
    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(lostScreen, "onClose")();

    const confirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );

    expect(router.dismiss).not.toHaveBeenCalled();
    expect(findText(confirmationScreen, "Descartar borrador")).toBe(true);
    expect(findText(confirmationScreen, "Seguir editando")).toBe(true);
  });

  it("closes a member route without discard after the child reports publish completion", () => {
    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(lostScreen, "onDraftPublished")();

    const completedScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const completedLostScreen = findElement(
      completedScreen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(completedLostScreen, "onClose")();

    const closedScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );

    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(findText(closedScreen, "Descartar borrador")).toBe(false);
    expect(findText(closedScreen, "Seguir editando")).toBe(false);
  });

  it("lets native removal continue after the child reports publish completion", () => {
    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(lostScreen, "onDraftPublished")();

    void renderScreen(<ReportCreationRouteScreen intent="lost" />);

    const beforeRemoveEvent = triggerNativeBeforeRemove({
      source: "native-stack",
      type: "GO_BACK",
    });
    const completedScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );

    expect(beforeRemoveEvent.preventDefault).not.toHaveBeenCalled();
    expect(findText(completedScreen, "Descartar borrador")).toBe(false);
    expect(findText(completedScreen, "Seguir editando")).toBe(false);
  });

  it("asks before native-removing a dirty lost creation route", () => {
    void renderScreen(<ReportCreationRouteScreen intent="lost" />);

    const beforeRemoveEvent = triggerNativeBeforeRemove({
      source: "native-stack",
      type: "GO_BACK",
    });

    const confirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );

    expect(beforeRemoveEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(findText(confirmationScreen, "Descartar borrador")).toBe(true);
    expect(findText(confirmationScreen, "Seguir editando")).toBe(true);
  });

  it("keeps editing after cancelling the discard confirmation", () => {
    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(lostScreen, "onClose")();

    const confirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const keepEditingButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Seguir editando"),
    );

    getPressableOnPress(keepEditingButton)();

    const editingScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );

    expect(router.dismiss).not.toHaveBeenCalled();
    expect(findText(editingScreen, "Descartar borrador")).toBe(false);
    expect(findText(editingScreen, "Seguir editando")).toBe(false);
    expect(
      findElement(
        editingScreen,
        (element) => element.type === "LostReportCreationScreen",
      ),
    ).toBeTruthy();
  });

  it("clears a pending native removal action after cancelling the discard confirmation", () => {
    void renderScreen(<ReportCreationRouteScreen intent="lost" />);

    triggerNativeBeforeRemove({
      source: "native-stack",
      type: "GO_BACK",
    });

    const nativeConfirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const keepEditingButton = findElement(
      nativeConfirmationScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Seguir editando"),
    );

    getPressableOnPress(keepEditingButton)();

    const editingScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const lostScreen = findElement(
      editingScreen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(lostScreen, "onClose")();

    const explicitCloseConfirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const discardButton = findElement(
      explicitCloseConfirmationScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    getPressableOnPress(discardButton)();

    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("dismisses a stacked lost creation route after confirming discard", () => {
    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(lostScreen, "onClose")();

    const confirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const discardButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    getPressableOnPress(discardButton)();

    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("continues a confirmed native removal with the saved navigation action", () => {
    const nativeAction = {
      source: "native-stack",
      type: "GO_BACK",
    };

    void renderScreen(<ReportCreationRouteScreen intent="lost" />);

    triggerNativeBeforeRemove(nativeAction);

    const confirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const discardButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    getPressableOnPress(discardButton)();

    expect(navigation.dispatch).toHaveBeenCalledWith(nativeAction);
    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("falls back to dismissing the route when confirmed native removal cannot dispatch", () => {
    navigation.dispatch = undefined as unknown as typeof navigation.dispatch;

    void renderScreen(<ReportCreationRouteScreen intent="lost" />);

    triggerNativeBeforeRemove({
      source: "native-stack",
      type: "GO_BACK",
    });

    const confirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const discardButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    getPressableOnPress(discardButton)();

    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("falls back to nearby after confirming discard from a direct-loaded route", () => {
    router.canGoBack.mockReturnValue(false);

    const screen = renderScreen(<ReportCreationRouteScreen intent="lost" />);
    const lostScreen = findElement(
      screen,
      (element) => element.type === "LostReportCreationScreen",
    );

    getRequiredHandler(lostScreen, "onClose")();

    const confirmationScreen = renderScreen(
      <ReportCreationRouteScreen intent="lost" />,
    );
    const discardButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    getPressableOnPress(discardButton)();

    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/(nearby)");
  });

  it("keeps supported visitor report routes on the existing visitor handoff path", () => {
    shell.value = createShellValue({ session: { kind: "visitor" } });

    const screen = renderScreen(<ReportCreationRouteScreen intent="found" />);
    const foundScreen = findElement(
      screen,
      (element) => element.type === "FoundReportCreationScreen",
    );

    expect(foundScreen?.props.session).toEqual({ kind: "visitor" });

    const requestMemberSignIn = foundScreen?.props.onRequestMemberSignIn;

    if (!isVisitorHandoffCallback(requestMemberSignIn)) {
      throw new Error("Expected visitor handoff callback.");
    }

    requestMemberSignIn({ intent: "found-report", label: "Ingresar" });

    expect(shell.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/report-create/found",
      sourceHref: "rastro://auth/sign-in?returnTo=%2Freport-create%2Ffound",
    });
  });

  it("closes a visitor found handoff route immediately because no draft has been edited", () => {
    shell.value = createShellValue({ session: { kind: "visitor" } });

    const screen = renderScreen(<ReportCreationRouteScreen intent="found" />);
    const foundScreen = findElement(
      screen,
      (element) => element.type === "FoundReportCreationScreen",
    );

    getRequiredHandler(foundScreen, "onClose")();

    const closedScreen = renderScreen(
      <ReportCreationRouteScreen intent="found" />,
    );

    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(findText(closedScreen, "Descartar borrador")).toBe(false);
    expect(findText(closedScreen, "Seguir editando")).toBe(false);
  });

  it("lets native removal continue for visitor found routes because no draft has been edited", () => {
    shell.value = createShellValue({ session: { kind: "visitor" } });

    void renderScreen(<ReportCreationRouteScreen intent="found" />);

    const beforeRemoveEvent = triggerNativeBeforeRemove({
      source: "native-stack",
      type: "GO_BACK",
    });

    const screen = renderScreen(<ReportCreationRouteScreen intent="found" />);

    expect(beforeRemoveEvent.preventDefault).not.toHaveBeenCalled();
    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(findText(screen, "Descartar borrador")).toBe(false);
    expect(findText(screen, "Seguir editando")).toBe(false);
  });
});

interface ShellValue {
  model: {
    appStates: {
      states: {
        loading: {
          kind: "loading";
          title: string;
        };
      };
    };
    session: ShellSessionValue;
  };
  requestAuthPrompt: (request: {
    returnTo: string;
    sourceHref: string;
  }) => void;
  session: ShellSessionValue;
}

type ShellSessionValue =
  | { kind: "visitor" }
  | {
      id: string;
      kind: "member";
      name?: string;
    };

function createShellValue({
  session,
}: {
  session: ShellSessionValue;
}): ShellValue {
  return {
    model: {
      appStates: {
        states: {
          loading: {
            kind: "loading",
            title: "Cargando Rastro",
          },
        },
      },
      session,
    },
    requestAuthPrompt: shell.requestAuthPrompt,
    session,
  };
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

type VisitorHandoffCallback = (
  action: FoundReportCreationVisitorAction,
) => void;

type ReportMediaManagerRender = (props: {
  mediaDraftId: string;
  onControllerChange?: (controller: unknown) => void;
  onSnapshotChange: (snapshot: unknown) => void;
  photos: readonly unknown[];
}) => React.ReactNode;

interface BeforeRemoveEvent {
  data?: {
    action?: unknown;
  };
  preventDefault: () => void;
}

type BeforeRemoveListener = (event: BeforeRemoveEvent) => void;

function isVisitorHandoffCallback(
  value: unknown,
): value is VisitorHandoffCallback {
  return typeof value === "function";
}

function isReportMediaManagerRender(
  value: unknown,
): value is ReportMediaManagerRender {
  return typeof value === "function";
}

function toReportMediaStepController(value: unknown): {
  getSnapshot: () => unknown;
  uploadPendingImages: () => Promise<unknown>;
} {
  if (!isRecord(value)) {
    throw new Error("Expected report media step controller.");
  }

  const getSnapshot = value.getSnapshot;
  const uploadPendingImages = value.uploadPendingImages;

  if (
    typeof getSnapshot !== "function" ||
    typeof uploadPendingImages !== "function"
  ) {
    throw new Error("Expected report media step controller.");
  }

  return {
    getSnapshot: getSnapshot as () => unknown,
    uploadPendingImages: uploadPendingImages as () => Promise<unknown>,
  };
}

function toPendingUploadInput(value: unknown): {
  draft: unknown;
  onSnapshotChange: unknown;
} {
  if (!isRecord(value)) {
    throw new Error("Expected pending upload input.");
  }

  return {
    draft: value.draft,
    onSnapshotChange: value.onSnapshotChange,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createMockReportMediaDraft(id: string) {
  return {
    acceptEditedImage: vi.fn(),
    getSnapshot: vi.fn(() => ({
      items: [
        {
          height: 900,
          localId: `${id}-local-photo`,
          mediaId: `${id}-media`,
          mimeType: "image/jpeg",
          originalUri: `file:///${id}-original.jpg`,
          progress: 1,
          retryable: false,
          sizeBytes: 200_000,
          status: "ready",
          uploadUri: `file:///${id}-upload.jpg`,
          width: 1200,
        },
      ],
      overallProgress: 1,
      primaryLocalId: `${id}-local-photo`,
      readyMedia: [{ mediaId: `${id}-media` }],
    })),
    hydrateReadyMedia: vi.fn(),
    moveImage: vi.fn(),
    removeImage: vi.fn(),
    retryUpload: vi.fn(),
    selectLocalImage: vi.fn(),
    setPrimaryImage: vi.fn(),
    uploadImage: vi.fn(),
  };
}

function renderScreen(node: React.ReactNode): React.ReactNode {
  reactState.cursor = 0;

  return renderFunctionElement(node);
}

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  let current = node;

  while (
    React.isValidElement<ElementProps>(current) &&
    typeof current.type === "function"
  ) {
    const Component = current.type as (props: ElementProps) => React.ReactNode;

    current = Component(current.props);
  }

  return current;
}

function findText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered.includes(text);
  }

  if (typeof rendered === "number") {
    return String(rendered).includes(text);
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  if (elementContainsText(rendered, text)) {
    return true;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findText(child, text),
  );
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

function getRequiredHandler(
  element: TestElement | undefined,
  propName: "onClose" | "onDraftPublished",
) {
  const handler = element?.props[propName];

  if (typeof handler !== "function") {
    throw new Error(`Expected ${propName} handler.`);
  }

  return handler as () => void;
}

function getPressableOnPress(element: TestElement | undefined) {
  const onPress = element?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error("Expected Pressable onPress handler.");
  }

  return onPress as () => void;
}

function triggerNativeBeforeRemove(action?: unknown): BeforeRemoveEvent {
  const listener = navigation.beforeRemoveListener;

  if (!listener) {
    throw new Error("Expected native beforeRemove listener.");
  }

  const event: BeforeRemoveEvent = {
    data: action ? { action } : undefined,
    preventDefault: vi.fn(),
  };

  listener(event);

  return event;
}

function elementContainsText(element: TestElement, text: string): boolean {
  return React.Children.toArray(element.props.children).some((child) => {
    if (typeof child === "string") {
      return child.includes(text);
    }

    if (typeof child === "number") {
      return String(child).includes(text);
    }

    return false;
  });
}
