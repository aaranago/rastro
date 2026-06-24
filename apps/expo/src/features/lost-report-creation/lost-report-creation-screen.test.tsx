import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type { ReportMediaDraftSnapshot } from "../report-media";
import type { LostReportDraft } from "./lost-report-creation-types";
import { lostReportCreationFixtures } from "./lost-report-creation-fixtures";
import { LostReportCreationScreen } from "./lost-report-creation-screen";
import {
  createInitialLostReportDraft,
  createLostReportDraft,
} from "./lost-report-creation-view-model";

const durableDraft = vi.hoisted(() => ({
  clearDraft: vi.fn(),
  discardDraft: vi.fn(),
  draft: null as LostReportDraft | null,
  draftRecovery: { status: "none" } as
    | {
        draft: {
          draft: LostReportDraft;
          kind: "lost-report";
          savedAt: string;
          schemaVersion: 2;
        };
        status: "available";
      }
    | { reason: string; status: "incompatible" }
    | { status: "none" },
  draftResetVersion: 0,
  hookInput: null as null | {
    initialDraft: LostReportDraft;
    recoveryMode?: "explicit" | "silent";
  },
  restoredDraft: null as null | {
    draft: LostReportDraft;
    kind: "lost-report";
    savedAt: string;
    schemaVersion: 2;
  },
  resumeDraft: vi.fn(),
  setDraft: vi.fn(),
}));
const reactState = vi.hoisted(() => ({
  cursor: 0,
  effectCursor: 0,
  effects: [] as {
    dependencies?: readonly unknown[];
  }[],
  pendingEffects: [] as (() => void)[],
  refCursor: 0,
  refs: [] as { current: unknown }[],
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
    useRef: <TValue,>(value: TValue) => {
      const index = reactState.refCursor;
      reactState.refCursor += 1;

      if (reactState.refs.length <= index) {
        reactState.refs[index] = { current: value };
      }

      return reactState.refs[index] as { current: TValue };
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
  ActivityIndicator: "ActivityIndicator",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: {
    OS: "ios",
  },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

vi.mock("@react-native-community/datetimepicker", () => ({
  default: "DateTimePicker",
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    bottom: 34,
    left: 0,
    right: 0,
    top: 47,
  }),
}));

vi.mock("../resilience/use-durable-creation-draft", () => ({
  useDurableCreationDraft: (input: {
    initialDraft: LostReportDraft;
    recoveryMode?: "explicit" | "silent";
  }) => {
    const { initialDraft } = input;

    durableDraft.hookInput = input;
    durableDraft.draft ??= initialDraft;

    return {
      clearDraft: durableDraft.clearDraft,
      discardDraft: durableDraft.discardDraft,
      draft: durableDraft.draft,
      draftPersistence: {
        error: null,
        status: "ready",
      },
      draftRecovery: durableDraft.draftRecovery,
      draftResetVersion: durableDraft.draftResetVersion,
      hasLoaded: true,
      resumeDraft: durableDraft.resumeDraft,
      restoredDraft: durableDraft.restoredDraft,
      setDraft: durableDraft.setDraft,
    };
  },
}));

vi.mock("../report-location-picker", () => ({
  ReportLocationPickerScreen: "ReportLocationPickerScreen",
}));

describe("LostReportCreationScreen", () => {
  beforeEach(() => {
    durableDraft.clearDraft.mockReset();
    durableDraft.clearDraft.mockResolvedValue(undefined);
    durableDraft.discardDraft.mockReset();
    durableDraft.discardDraft.mockImplementation(() => {
      durableDraft.draft = durableDraft.hookInput?.initialDraft ?? null;
      durableDraft.draftRecovery = { status: "none" };
      durableDraft.draftResetVersion += 1;
      durableDraft.restoredDraft = null;

      return Promise.resolve();
    });
    durableDraft.draft = null;
    durableDraft.draftRecovery = { status: "none" };
    durableDraft.draftResetVersion = 0;
    durableDraft.hookInput = null;
    durableDraft.restoredDraft = null;
    durableDraft.resumeDraft.mockReset();
    durableDraft.resumeDraft.mockImplementation(() => {
      if (durableDraft.draftRecovery.status !== "available") {
        return;
      }

      durableDraft.draft = durableDraft.draftRecovery.draft.draft;
      durableDraft.restoredDraft = durableDraft.draftRecovery.draft;
      durableDraft.draftRecovery = { status: "none" };
      durableDraft.draftResetVersion += 1;
    });
    durableDraft.setDraft.mockReset();
    durableDraft.setDraft.mockImplementation(
      (nextDraft: React.SetStateAction<LostReportDraft>) => {
        if (!durableDraft.draft) {
          throw new Error("Expected a draft before updating it.");
        }

        durableDraft.draft =
          typeof nextDraft === "function"
            ? (nextDraft as (current: LostReportDraft) => LostReportDraft)(
                durableDraft.draft,
              )
            : nextDraft;
      },
    );
    reactState.cursor = 0;
    reactState.effectCursor = 0;
    reactState.effects = [];
    reactState.pendingEffects = [];
    reactState.refCursor = 0;
    reactState.refs = [];
    reactState.values = [];
  });

  it("offers a saved durable draft without applying it until Resume is pressed", () => {
    const savedDraft = createReadyDraft();
    durableDraft.draftRecovery = {
      draft: {
        draft: savedDraft,
        kind: "lost-report",
        savedAt: "2026-06-22T10:30:00.000Z",
        schemaVersion: 2,
      },
      status: "available",
    };

    const screen = renderScreen(<LostReportCreationScreen />);
    const resumeButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Retomar borrador"),
    );

    expect(durableDraft.hookInput?.recoveryMode).toBe("explicit");
    expect(findText(screen, "Encontramos un borrador guardado.")).toBe(true);
    expect(findText(screen, "1/5")).toBe(false);

    void getPressableOnPress(resumeButton)();

    const resumedScreen = renderScreen(<LostReportCreationScreen />);

    expect(durableDraft.resumeDraft).toHaveBeenCalledTimes(1);
    expect(findText(resumedScreen, "Encontramos un borrador guardado.")).toBe(
      false,
    );
    expect(findText(resumedScreen, "1/5")).toBe(true);
  });

  it("resets edited fresh journey state after discarding an offered saved draft", async () => {
    const savedDraft = createReadyDraft();
    durableDraft.draftRecovery = {
      draft: {
        draft: savedDraft,
        kind: "lost-report",
        savedAt: "2026-06-22T10:30:00.000Z",
        schemaVersion: 2,
      },
      status: "available",
    };

    const screen = renderScreen(<LostReportCreationScreen />);
    const addPhotoButton = findElement(
      screen,
      (element) => element.props.accessibilityLabel === "Agregar foto",
    );

    void getPressableOnPress(addPhotoButton)();

    const photoReadyScreen = renderScreen(<LostReportCreationScreen />);
    const continueButton = findElement(
      photoReadyScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    await getPressableOnPress(continueButton)();

    const editedFreshScreen = renderScreen(<LostReportCreationScreen />);

    expect(findText(editedFreshScreen, "Paso 2 de 5")).toBe(true);
    expect(findText(editedFreshScreen, "Detalles de la perdida")).toBe(true);

    const discardButton = findElement(
      editedFreshScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    await getPressableOnPress(discardButton)();
    void renderScreen(<LostReportCreationScreen />);

    const freshScreen = renderScreen(<LostReportCreationScreen />);

    expect(durableDraft.discardDraft).toHaveBeenCalledTimes(1);
    expect(findText(freshScreen, "Encontramos un borrador guardado.")).toBe(
      false,
    );
    expect(findText(freshScreen, "Paso 1 de 5")).toBe(true);
    expect(findText(freshScreen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(freshScreen, "Detalles de la perdida")).toBe(false);
    expect(findText(freshScreen, "1/5")).toBe(false);
  });

  it("starts on the canonical photos step without showing other step content or photo validation", () => {
    const screen = renderScreen(<LostReportCreationScreen />);

    expect(findText(screen, "Paso 1 de 5")).toBe(true);
    expect(findText(screen, "Fotos")).toBe(true);
    expect(findText(screen, "Detalles de la perdida")).toBe(false);
    expect(
      findText(screen, "Conversaciones dentro de Rastro con notificaciones."),
    ).toBe(false);
    expect(findText(screen, "Ubicacion publica")).toBe(false);
    expect(findText(screen, "Agrega al menos una foto.")).toBe(false);
  });

  it("exposes a route back header action that delegates to close handling", () => {
    const onClose = vi.fn();
    const screen = renderScreen(<LostReportCreationScreen onClose={onClose} />);
    const routeBackButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Volver del reporte perdido",
    );

    void getPressableOnPress(routeBackButton)();

    expect(routeBackButton).toBeTruthy();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the editor in a keyboard-aware safe-area frame with sticky step actions", () => {
    const screen = renderScreen(<LostReportCreationScreen />);
    const keyboardFrame = findElement(
      screen,
      (element) => element.type === "KeyboardAvoidingView",
    );
    const scrollView = findElement(
      screen,
      (element) => element.type === "ScrollView",
    );
    const footer = findElement(
      screen,
      (element) => element.props.testID === "report-creation-frame-footer",
    );

    expect(keyboardFrame?.props.behavior).toBe("padding");
    expect(scrollView?.props.contentInset).toEqual({ bottom: 206 });
    expect(scrollView?.props.scrollIndicatorInsets).toEqual({ bottom: 0 });
    expect(findText(scrollView, "Continuar")).toBe(false);
    expect(findText(footer, "Continuar")).toBe(true);
  });

  it("keeps default drafts on photos and shows only the photo validation after continuing", async () => {
    const screen = renderScreen(<LostReportCreationScreen />);
    const continueButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    await getPressableOnPress(continueButton)();

    const attemptedScreen = renderScreen(<LostReportCreationScreen />);

    expect(findText(attemptedScreen, "Paso 1 de 5")).toBe(true);
    expect(findText(attemptedScreen, "Agrega al menos una foto.")).toBe(true);
    expect(findText(attemptedScreen, "Detalles de la perdida")).toBe(false);
    expect(findText(attemptedScreen, "Ingresa el nombre de la mascota.")).toBe(
      false,
    );
    expect(findText(attemptedScreen, "Ubicacion publica")).toBe(false);
  });

  it("advances ready-photo drafts to details and returns to photos without rendering every section", async () => {
    const screen = renderScreen(<LostReportCreationScreen />);
    const addPhotoButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Agregar foto",
    );

    void getPressableOnPress(addPhotoButton)();

    const photoReadyScreen = renderScreen(<LostReportCreationScreen />);
    const continueButton = findElement(
      photoReadyScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    await getPressableOnPress(continueButton)();

    const detailsScreen = renderScreen(<LostReportCreationScreen />);

    expect(findText(detailsScreen, "Paso 2 de 5")).toBe(true);
    expect(findText(detailsScreen, "Detalles de la perdida")).toBe(true);
    expect(findText(detailsScreen, "Antes de abrir tus fotos")).toBe(false);
    expect(
      findText(
        detailsScreen,
        "Conversaciones dentro de Rastro con notificaciones.",
      ),
    ).toBe(false);
    expect(findText(detailsScreen, "Ubicacion publica")).toBe(false);
    expect(findText(detailsScreen, "Agrega al menos una foto.")).toBe(false);

    const backButton = findElement(
      detailsScreen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    void getPressableOnPress(backButton)();

    const photosScreen = renderScreen(<LostReportCreationScreen />);

    expect(findText(photosScreen, "Paso 1 de 5")).toBe(true);
    expect(findText(photosScreen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(photosScreen, "1/5")).toBe(true);
    expect(findText(photosScreen, "Detalles de la perdida")).toBe(false);
  });

  it("adds photos from an injected media source instead of fixture samples", async () => {
    const pickLostReportPhoto = vi.fn().mockResolvedValue({
      alt: "Foto subida desde media manager",
      id: "media-local-1",
      mediaId: "ready-media-1",
      originalUri: "file:///camera-original.jpg",
      status: "ready",
      uri: "file:///camera-ready.jpg",
    });
    const screen = renderScreen(
      <LostReportCreationScreen pickLostReportPhoto={pickLostReportPhoto} />,
    );
    const addPhotoButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Agregar foto",
    );

    await getPressableOnPress(addPhotoButton)();

    expect(pickLostReportPhoto).toHaveBeenCalledTimes(1);
    expect(durableDraft.draft?.photos).toEqual([
      {
        alt: "Foto subida desde media manager",
        id: "media-local-1",
        mediaId: "ready-media-1",
        originalUri: "file:///camera-original.jpg",
        status: "ready",
        uri: "file:///camera-ready.jpg",
      },
    ]);
  });

  it("renders an injected report media manager on the photos step and syncs its snapshot into draft photos", () => {
    const managerSnapshot = createReportMediaManagerSnapshot();
    const renderReportMediaManager = vi.fn(
      ({ onSnapshotChange }: ReportMediaManagerRenderTestProps) => (
        <View>
          <Text>Biblioteca</Text>
          <Text>Camara</Text>
          <Text>Progreso total 60%</Text>
          <Text>Reintentar</Text>
          <Text>Portada</Text>
          <Text>Usar portada</Text>
          <Pressable
            accessibilityLabel="Sincronizar fotos del manager"
            onPress={() => onSnapshotChange(managerSnapshot)}
          />
        </View>
      ),
    );
    const screen = renderScreen(
      <LostReportCreationScreen
        renderReportMediaManager={renderReportMediaManager}
      />,
    );

    expect(findText(screen, "Biblioteca")).toBe(true);
    expect(findText(screen, "Camara")).toBe(true);
    expect(findText(screen, "Progreso total 60%")).toBe(true);
    expect(findText(screen, "Reintentar")).toBe(true);
    expect(findText(screen, "Portada")).toBe(true);
    expect(findText(screen, "Usar portada")).toBe(true);
    expect(findText(screen, "Principal")).toBe(false);
    expect(findText(screen, "Antes de abrir tus fotos")).toBe(false);
    expect(renderReportMediaManager).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [],
      }),
    );

    const syncButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Sincronizar fotos del manager",
    );

    void getPressableOnPress(syncButton)();

    expect(durableDraft.draft?.photos.map((photo) => photo.id)).toEqual([
      "local-ready",
      "local-uploading",
    ]);
    expect(durableDraft.draft?.photos).toEqual([
      expect.objectContaining({
        id: "local-ready",
        localId: "local-ready",
        mediaId: "ready-media-1",
        originalUri: "file:///ready-original.jpg",
        progress: 1,
        status: "ready",
        thumbUri: "file:///ready-upload.jpg",
        uploadUri: "file:///ready-upload.jpg",
        uri: "file:///ready-upload.jpg",
      }),
      expect.objectContaining({
        id: "local-uploading",
        localId: "local-uploading",
        originalUri: "file:///uploading-original.jpg",
        progress: 0.2,
        status: "uploading",
        thumbUri: "file:///uploading-upload.jpg",
        uploadUri: "file:///uploading-upload.jpg",
        uri: "file:///uploading-upload.jpg",
      }),
    ]);
  });

  it("uploads staged media manager photos before continuing from photos", async () => {
    const readySnapshot: ReportMediaDraftSnapshot = {
      items: [
        {
          height: 900,
          localId: "local-ready",
          mediaId: "ready-media-1",
          mimeType: "image/jpeg",
          originalUri: "file:///ready-original.jpg",
          progress: 1,
          retryable: false,
          sizeBytes: 200_000,
          status: "ready",
          uploadUri: "file:///ready-upload.jpg",
          width: 1200,
        },
      ],
      overallProgress: 1,
      primaryLocalId: "local-ready",
      readyMedia: [{ mediaId: "ready-media-1" }],
    };
    const uploadPendingImages = vi.fn(() => Promise.resolve(readySnapshot));
    const renderReportMediaManager = vi.fn(
      ({ onControllerChange }: ReportMediaManagerRenderTestProps) => {
        onControllerChange?.({
          getSnapshot: () => readySnapshot,
          uploadPendingImages,
        });

        return (
          <View>
            <Text>Media manager listo</Text>
          </View>
        );
      },
    );
    const screen = renderScreen(
      <LostReportCreationScreen
        renderReportMediaManager={renderReportMediaManager}
      />,
    );
    const continueButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    await getPressableOnPress(continueButton)();

    const detailsScreen = renderScreen(
      <LostReportCreationScreen
        renderReportMediaManager={renderReportMediaManager}
      />,
    );

    expect(uploadPendingImages).toHaveBeenCalledOnce();
    expect(durableDraft.draft?.photos).toMatchObject([
      {
        localId: "local-ready",
        mediaId: "ready-media-1",
        status: "ready",
        uri: "file:///ready-upload.jpg",
      },
    ]);
    expect(findText(detailsScreen, "Paso 2 de 5")).toBe(true);
    expect(findText(detailsScreen, "Detalles de la perdida")).toBe(true);
  });

  it("reports the draft as published after a successful publish clears the draft", async () => {
    durableDraft.draft = createReadyDraft();
    const publishLostReport = vi.fn().mockResolvedValue({
      id: "report-lost-backend-1",
      status: "active",
    });
    const draftPublished = vi.fn();
    const openPublishedReport = vi.fn();
    const sharePublishedReport = vi.fn();

    const screen = renderScreen(
      <LostReportCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedReport={openPublishedReport}
        onPublishLostReport={publishLostReport}
        onSharePublishedReport={sharePublishedReport}
        petProfiles={lostReportCreationFixtures.petProfiles}
      />,
    );
    const publishButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Publicar reporte"),
    );

    await getPressableOnPress(publishButton)();

    const successScreen = renderScreen(
      <LostReportCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedReport={openPublishedReport}
        onPublishLostReport={publishLostReport}
        onSharePublishedReport={sharePublishedReport}
        petProfiles={lostReportCreationFixtures.petProfiles}
      />,
    );
    const shareButton = findElement(
      successScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Compartir"),
    );
    const viewReportButton = findElement(
      successScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Ver reporte"),
    );

    void getPressableOnPress(shareButton)();
    void getPressableOnPress(viewReportButton)();

    expect(publishLostReport).toHaveBeenCalledTimes(1);
    expect(durableDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(draftPublished).toHaveBeenCalledTimes(1);
    expect(sharePublishedReport).toHaveBeenCalledWith({
      id: "report-lost-backend-1",
      status: "active",
    });
    expect(openPublishedReport).toHaveBeenCalledWith({
      id: "report-lost-backend-1",
      status: "active",
    });
    expect(findText(successScreen, "report-lost-backend-1")).toBe(false);
    expect(findText(successScreen, "active")).toBe(false);
  });

  it("lets people go back from review before publishing", () => {
    durableDraft.draft = createReadyDraft();

    const reviewScreen = renderScreen(
      <LostReportCreationScreen
        petProfiles={lostReportCreationFixtures.petProfiles}
      />,
    );
    const backButton = findElement(
      reviewScreen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    expect(findText(reviewScreen, "Publicar reporte")).toBe(true);
    expect(findText(reviewScreen, "Continuar")).toBe(false);

    void getPressableOnPress(backButton)();

    const contactScreen = renderScreen(
      <LostReportCreationScreen
        petProfiles={lostReportCreationFixtures.petProfiles}
      />,
    );

    expect(findText(contactScreen, "Contacto")).toBe(true);
    expect(findText(contactScreen, "Publicar reporte")).toBe(false);
    expect(findText(contactScreen, "Continuar")).toBe(true);
  });

  it("opens the location picker from an empty location step and applies the confirmed location", () => {
    durableDraft.draft = createLocationReadyDraftWithoutLocation();
    const adapter = createNearbyLocationAdapterBoundary();

    const screen = renderScreen(
      <LostReportCreationScreen
        locationAdapter={adapter}
        petProfiles={lostReportCreationFixtures.petProfiles}
      />,
    );
    const chooseLocationButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Elegir ubicacion"),
    );

    expect(
      findText(screen, "Selecciona un punto exacto para uso interno."),
    ).toBe(true);
    expect(findText(screen, "Plaza Abaroa")).toBe(false);

    void getPressableOnPress(chooseLocationButton)();

    const pickerScreen = renderScreen(
      <LostReportCreationScreen
        locationAdapter={adapter}
        petProfiles={lostReportCreationFixtures.petProfiles}
      />,
    );
    const picker = findElement(
      pickerScreen,
      (element) => element.type === "ReportLocationPickerScreen",
    );

    expect(picker?.props.adapter).toBe(adapter);

    const confirmedLocation = {
      addressLabel: "Parque Urbano Central",
      coordinates: {
        latitude: -16.5092,
        longitude: -68.1234,
      },
      department: "La Paz",
      locationCellLabel: "Centro, La Paz",
      municipality: "La Paz",
    };

    (picker?.props.onConfirm as (location: typeof confirmedLocation) => void)(
      confirmedLocation,
    );

    const updatedScreen = renderScreen(
      <LostReportCreationScreen
        locationAdapter={adapter}
        petProfiles={lostReportCreationFixtures.petProfiles}
      />,
    );

    expect(findText(updatedScreen, "Cambiar ubicacion")).toBe(true);
    expect(findText(updatedScreen, "Parque Urbano Central")).toBe(true);
    expect(durableDraft.draft.exactLocation).toEqual(confirmedLocation);
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

interface ReportMediaManagerRenderTestProps {
  mediaDraftId: string;
  onControllerChange?: (controller: {
    getSnapshot: () => ReportMediaDraftSnapshot;
    uploadPendingImages: () => Promise<ReportMediaDraftSnapshot>;
  }) => void;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  photos: readonly unknown[];
}

function renderScreen(node: React.ReactNode): React.ReactNode {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.refCursor = 0;

  const rendered = renderFunctionElement(node);
  flushEffects();

  return rendered;
}

function createReadyDraft() {
  const [readyPhoto] = lostReportCreationFixtures.photoSamples;

  if (!readyPhoto) {
    throw new Error("Expected a lost report photo fixture.");
  }

  return createLostReportDraft({
    exactLocation: lostReportCreationFixtures.defaultLocation,
    lostDetails: {
      circumstances: "Se perdio cerca de la zona.",
      lastSeenAtLabel: "2026-06-18T10:50:00.000Z",
      markings: "Collar rojo.",
    },
    petProfileId: lostReportCreationFixtures.petProfiles[0]?.id,
    photos: [readyPhoto],
  });
}

function createLocationReadyDraftWithoutLocation() {
  const [readyPhoto] = lostReportCreationFixtures.photoSamples;

  if (!readyPhoto) {
    throw new Error("Expected a lost report photo fixture.");
  }

  return createLostReportDraft({
    ...createInitialLostReportDraft({
      petProfiles: lostReportCreationFixtures.petProfiles,
    }),
    lostDetails: {
      circumstances: "Se perdio cerca de la zona.",
      lastSeenAtLabel: "2026-06-18T10:50:00.000Z",
      markings: "Collar rojo.",
    },
    petProfileId: lostReportCreationFixtures.petProfiles[0]?.id,
    photos: [readyPhoto],
  });
}

function createNearbyLocationAdapterBoundary(): NearbyLocationAdapter {
  return {
    resolveForegroundLocation: vi.fn(),
  };
}

function createReportMediaManagerSnapshot(): ReportMediaDraftSnapshot {
  return {
    items: [
      {
        height: 900,
        localId: "local-uploading",
        mimeType: "image/jpeg",
        originalUri: "file:///uploading-original.jpg",
        progress: 0.2,
        retryable: false,
        sizeBytes: 200_000,
        status: "uploading",
        uploadUri: "file:///uploading-upload.jpg",
        width: 1200,
      },
      {
        height: 900,
        localId: "local-ready",
        mediaId: "ready-media-1",
        mimeType: "image/jpeg",
        originalUri: "file:///ready-original.jpg",
        progress: 1,
        retryable: false,
        sizeBytes: 200_000,
        status: "ready",
        uploadUri: "file:///ready-upload.jpg",
        width: 1200,
      },
    ],
    overallProgress: 0.6,
    primaryLocalId: "local-ready",
    readyMedia: [{ mediaId: "ready-media-1" }],
  };
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

function getPressableOnPress(element: TestElement | undefined) {
  const onPress = element?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error("Expected Pressable onPress handler.");
  }

  return onPress as () => Promise<void> | void;
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

function flushEffects() {
  const pendingEffects = reactState.pendingEffects;
  reactState.pendingEffects = [];

  for (const effect of pendingEffects) {
    effect();
  }
}
