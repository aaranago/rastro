import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type { ReportMediaDraftSnapshot } from "../report-media";
import type { FoundReportDraft } from "./found-report-creation-types";
import { foundReportCreationFixtures } from "./found-report-creation-fixtures";
import { FoundReportCreationScreen } from "./found-report-creation-screen";
import { createFoundReportDraft } from "./found-report-creation-view-model";

const durableDraft = vi.hoisted(() => ({
  clearDraft: vi.fn(),
  discardDraft: vi.fn(),
  draft: null as FoundReportDraft | null,
  draftRecovery: { status: "none" } as
    | {
        draft: {
          draft: FoundReportDraft;
          kind: "found-report";
          savedAt: string;
          schemaVersion: 2;
        };
        status: "available";
      }
    | { reason: string; status: "incompatible" }
    | { status: "none" },
  draftResetVersion: 0,
  hookInput: null as null | {
    initialDraft: FoundReportDraft;
    recoveryMode?: "explicit" | "silent";
  },
  restoredDraft: null as null | {
    draft: FoundReportDraft;
    kind: "found-report";
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

vi.mock("expo-image", () => ({
  Image: "Image",
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
    initialDraft: FoundReportDraft;
    recoveryMode?: "explicit" | "silent";
  }) => {
    const { initialDraft } = input;

    durableDraft.hookInput = input;

    return {
      clearDraft: durableDraft.clearDraft,
      discardDraft: durableDraft.discardDraft,
      draft: durableDraft.draft ?? initialDraft,
      draftPersistence: {
        error: null,
        status: "ready",
      },
      draftRecovery: durableDraft.draftRecovery,
      draftResetVersion: durableDraft.draftResetVersion,
      hasLoaded: true,
      resumeDraft: durableDraft.resumeDraft,
      restoredDraft: durableDraft.restoredDraft,
      setDraft: (nextDraft: React.SetStateAction<typeof initialDraft>) => {
        const currentDraft = durableDraft.draft ?? initialDraft;
        durableDraft.draft =
          typeof nextDraft === "function"
            ? (
                nextDraft as (
                  current: typeof initialDraft,
                ) => typeof initialDraft
              )(currentDraft)
            : nextDraft;
        durableDraft.setDraft(nextDraft);
      },
    };
  },
}));

vi.mock("../report-location-picker", () => ({
  ReportLocationPickerScreen: "ReportLocationPickerScreen",
}));

describe("FoundReportCreationScreen", () => {
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
    reactState.cursor = 0;
    reactState.effectCursor = 0;
    reactState.effects = [];
    reactState.pendingEffects = [];
    reactState.refCursor = 0;
    reactState.refs = [];
    reactState.values = [];
  });

  it("starts members on the canonical photos step without showing later sections or validation", () => {
    const screen = renderScreen(<FoundReportCreationScreen />);

    expect(durableDraft.hookInput?.recoveryMode).toBe("explicit");
    expect(findText(screen, "Paso 2 de 8")).toBe(true);
    expect(findText(screen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(screen, "Detalles de la encontrada")).toBe(false);
    expect(findText(screen, "Ubicacion y privacidad")).toBe(false);
    expect(findText(screen, "Chat en Rastro")).toBe(false);
    expect(findText(screen, "Completar datos")).toBe(false);
    expect(findText(screen, "Agrega al menos una foto.")).toBe(false);
  });

  it("exposes a route back header action that delegates to close handling", () => {
    const onClose = vi.fn();
    const screen = renderScreen(
      <FoundReportCreationScreen onClose={onClose} />,
    );
    const routeBackButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Volver del reporte encontrado",
    );

    void getPressableOnPress(routeBackButton)();

    expect(routeBackButton).toBeTruthy();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the editor in a keyboard-aware safe-area frame with sticky step actions", () => {
    const screen = renderScreen(<FoundReportCreationScreen />);
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
    expect(scrollView?.props.contentInset).toEqual({ bottom: 122 });
    expect(scrollView?.props.scrollIndicatorInsets).toEqual({ bottom: 122 });
    expect(findText(scrollView, "Continuar")).toBe(false);
    expect(findText(footer, "Continuar")).toBe(true);
  });

  it("keeps members on photos and shows only the photo error when continuing without a photo", () => {
    const screen = renderScreen(<FoundReportCreationScreen />);
    const continueButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    void getPressableOnPress(continueButton)();

    const attemptedScreen = renderScreen(<FoundReportCreationScreen />);

    expect(findText(attemptedScreen, "Paso 2 de 8")).toBe(true);
    expect(findText(attemptedScreen, "Agrega al menos una foto.")).toBe(true);
    expect(findText(attemptedScreen, "Indica cuando fue encontrada.")).toBe(
      false,
    );
    expect(
      findText(
        attemptedScreen,
        "Describe la condicion de la mascota encontrada.",
      ),
    ).toBe(false);
    expect(findText(attemptedScreen, "Elige chat, WhatsApp o ambos.")).toBe(
      false,
    );
  });

  it("advances a valid photo step to details and goes back to photos with draft data preserved", () => {
    const screen = renderScreen(<FoundReportCreationScreen />);
    const addPhotoButton = findElement(
      screen,
      (element) => element.props.accessibilityLabel === "Agregar foto",
    );

    void getPressableOnPress(addPhotoButton)();

    const photoReadyScreen = renderScreen(<FoundReportCreationScreen />);
    const continueButton = findElement(
      photoReadyScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    void getPressableOnPress(continueButton)();

    const detailsScreen = renderScreen(<FoundReportCreationScreen />);

    expect(findText(detailsScreen, "Paso 3 de 8")).toBe(true);
    expect(findText(detailsScreen, "Detalles de la encontrada")).toBe(true);
    expect(findText(detailsScreen, "Antes de abrir tus fotos")).toBe(false);
    expect(findText(detailsScreen, "Ubicacion y privacidad")).toBe(false);
    expect(findText(detailsScreen, "Chat en Rastro")).toBe(false);

    const backButton = findElement(
      detailsScreen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    void getPressableOnPress(backButton)();

    const photosScreen = renderScreen(<FoundReportCreationScreen />);

    expect(findText(photosScreen, "Paso 2 de 8")).toBe(true);
    expect(findText(photosScreen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(photosScreen, "1/5")).toBe(true);
    expect(findText(photosScreen, "Detalles de la encontrada")).toBe(false);
  });

  it("resets edited fresh journey state after discarding an offered saved draft", async () => {
    const savedDraft = createReadyDraft();
    durableDraft.draftRecovery = {
      draft: {
        draft: savedDraft,
        kind: "found-report",
        savedAt: "2026-06-22T10:30:00.000Z",
        schemaVersion: 2,
      },
      status: "available",
    };

    const screen = renderScreen(<FoundReportCreationScreen />);
    const addPhotoButton = findElement(
      screen,
      (element) => element.props.accessibilityLabel === "Agregar foto",
    );

    void getPressableOnPress(addPhotoButton)();

    const photoReadyScreen = renderScreen(<FoundReportCreationScreen />);
    const continueButton = findElement(
      photoReadyScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    void getPressableOnPress(continueButton)();

    const editedFreshScreen = renderScreen(<FoundReportCreationScreen />);

    expect(findText(editedFreshScreen, "Paso 3 de 8")).toBe(true);
    expect(findText(editedFreshScreen, "Detalles de la encontrada")).toBe(true);

    const discardButton = findElement(
      editedFreshScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    await getPressableOnPress(discardButton)();
    void renderScreen(<FoundReportCreationScreen />);

    const resetScreen = renderScreen(<FoundReportCreationScreen />);

    expect(durableDraft.discardDraft).toHaveBeenCalledTimes(1);
    expect(findText(resetScreen, "Encontramos un borrador guardado.")).toBe(
      false,
    );
    expect(findText(resetScreen, "Paso 2 de 8")).toBe(true);
    expect(findText(resetScreen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(resetScreen, "Detalles de la encontrada")).toBe(false);
    expect(findText(resetScreen, "1/5")).toBe(false);
  });

  it("adds photos from an injected media source instead of fixture samples", async () => {
    const pickFoundReportPhoto = vi.fn().mockResolvedValue({
      alt: "Foto encontrada subida",
      id: "found-local-1",
      mediaId: "found-media-1",
      originalUri: "file:///found-original.jpg",
      status: "ready",
      uri: "file:///found-ready.jpg",
    });
    const screen = renderScreen(
      <FoundReportCreationScreen pickFoundReportPhoto={pickFoundReportPhoto} />,
    );
    const addPhotoButton = findElement(
      screen,
      (element) => element.props.accessibilityLabel === "Agregar foto",
    );

    await getPressableOnPress(addPhotoButton)();

    expect(pickFoundReportPhoto).toHaveBeenCalledTimes(1);
    expect(durableDraft.draft?.photos).toEqual([
      {
        alt: "Foto encontrada subida",
        id: "found-local-1",
        mediaId: "found-media-1",
        originalUri: "file:///found-original.jpg",
        status: "ready",
        uri: "file:///found-ready.jpg",
      },
    ]);
  });

  it("renders an injected report media manager on the shared-style photo step and syncs manager photos", () => {
    const managerSnapshot = createReportMediaManagerSnapshot();
    const renderReportMediaManager = vi.fn(
      ({ onSnapshotChange }: ReportMediaManagerRenderTestProps) => (
        <View>
          <Text>Biblioteca</Text>
          <Text>Camara</Text>
          <Text>Progreso total 60%</Text>
          <Text>Reintentar</Text>
          <Text>Principal</Text>
          <Text>Arriba</Text>
          <Text>Abajo</Text>
          <Pressable
            accessibilityLabel="Sincronizar fotos encontradas del manager"
            onPress={() => onSnapshotChange(managerSnapshot)}
          />
        </View>
      ),
    );
    const screen = renderScreen(
      <FoundReportCreationScreen
        renderReportMediaManager={renderReportMediaManager}
      />,
    );

    expect(findText(screen, "Biblioteca")).toBe(true);
    expect(findText(screen, "Camara")).toBe(true);
    expect(findText(screen, "Progreso total 60%")).toBe(true);
    expect(findText(screen, "Reintentar")).toBe(true);
    expect(findText(screen, "Principal")).toBe(true);
    expect(findText(screen, "Arriba")).toBe(true);
    expect(findText(screen, "Abajo")).toBe(true);
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
        element.props.accessibilityLabel ===
          "Sincronizar fotos encontradas del manager",
    );

    void getPressableOnPress(syncButton)();

    expect(durableDraft.draft?.photos.map((photo) => photo.id)).toEqual([
      "local-ready",
      "local-uploading",
    ]);
    expect(durableDraft.draft?.photos).toEqual([
      expect.objectContaining({
        localId: "local-ready",
        mediaId: "ready-media-1",
        status: "ready",
      }),
      expect.objectContaining({
        localId: "local-uploading",
        progress: 0.2,
        status: "uploading",
      }),
    ]);
  });

  it("renders the visitor handoff and calls the member sign-in action", () => {
    const requestMemberSignIn = vi.fn();
    const screen = renderScreen(
      <FoundReportCreationScreen
        onRequestMemberSignIn={requestMemberSignIn}
        session={{ kind: "visitor" }}
      />,
    );
    const signInButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Iniciar sesion para reportar encontrada"),
    );

    expect(findText(screen, "Iniciar sesion para reportar encontrada")).toBe(
      true,
    );

    void getPressableOnPress(signInButton)();

    expect(requestMemberSignIn).toHaveBeenCalledWith({
      intent: "found-report",
      label: "Iniciar sesion para reportar encontrada",
    });
  });

  it("reports the draft as published after a successful publish clears the draft", async () => {
    durableDraft.draft = createReadyDraft();
    const publishFoundReport = vi.fn().mockResolvedValue({
      id: "report-found-backend-1",
      status: "active",
    });
    const draftPublished = vi.fn();

    const screen = renderScreen(
      <FoundReportCreationScreen
        onDraftPublished={draftPublished}
        onPublishFoundReport={publishFoundReport}
      />,
    );
    const publishButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Publicar encontrada"),
    );

    await getPressableOnPress(publishButton)();

    const successScreen = renderScreen(
      <FoundReportCreationScreen
        onDraftPublished={draftPublished}
        onPublishFoundReport={publishFoundReport}
      />,
    );

    expect(publishFoundReport).toHaveBeenCalledTimes(1);
    expect(durableDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(draftPublished).toHaveBeenCalledTimes(1);
    expect(findText(successScreen, "report-found-backend-1")).toBe(true);
    expect(findText(successScreen, "active")).toBe(true);
  });

  it("opens the location picker from an empty location step and applies the confirmed found location", () => {
    durableDraft.draft = createLocationReadyDraftWithoutLocation();
    const adapter = createNearbyLocationAdapterBoundary();

    const screen = renderScreen(
      <FoundReportCreationScreen locationAdapter={adapter} />,
    );
    const chooseLocationButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Elegir ubicacion"),
    );

    expect(findText(screen, "Selecciona el punto donde fue encontrada.")).toBe(
      true,
    );
    expect(findText(screen, "Plaza Villarroel")).toBe(false);

    void getPressableOnPress(chooseLocationButton)();

    const pickerScreen = renderScreen(
      <FoundReportCreationScreen locationAdapter={adapter} />,
    );
    const picker = findElement(
      pickerScreen,
      (element) => element.type === "ReportLocationPickerScreen",
    );

    expect(picker?.props.adapter).toBe(adapter);

    const confirmedLocation = {
      addressLabel: "Mercado Camacho",
      coordinates: {
        latitude: -16.4978,
        longitude: -68.1339,
      },
      department: "La Paz",
      locationCellLabel: "Centro, La Paz",
      municipality: "La Paz",
    };

    (picker?.props.onConfirm as (location: typeof confirmedLocation) => void)(
      confirmedLocation,
    );

    const updatedScreen = renderScreen(
      <FoundReportCreationScreen locationAdapter={adapter} />,
    );

    expect(findText(updatedScreen, "Cambiar ubicacion")).toBe(true);
    expect(findText(updatedScreen, "Mercado Camacho")).toBe(true);
    expect(durableDraft.draft.exactFoundLocation).toEqual(confirmedLocation);
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

interface ReportMediaManagerRenderTestProps {
  mediaDraftId: string;
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
  const [readyPhoto] = foundReportCreationFixtures.photoSamples;

  if (!readyPhoto) {
    throw new Error("Expected a found report photo fixture.");
  }

  return createFoundReportDraft({
    exactFoundLocation: foundReportCreationFixtures.defaultLocation,
    foundDetails: {
      condition: "Tranquila y con collar rojo.",
      description: "Gata joven encontrada esperando junto al jardin.",
      foundAtLabel: "Hoy, hace 20 min",
    },
    pet: {
      breed: "Mestiza",
      description: "Pelaje gris con mancha blanca en el pecho.",
      type: "Gato",
    },
    photos: [readyPhoto],
  });
}

function createLocationReadyDraftWithoutLocation() {
  const [readyPhoto] = foundReportCreationFixtures.photoSamples;

  if (!readyPhoto) {
    throw new Error("Expected a found report photo fixture.");
  }

  return createFoundReportDraft({
    foundDetails: {
      condition: "Tranquila y con collar rojo.",
      description: "Gata joven encontrada esperando junto al jardin.",
      foundAtLabel: "Hoy, hace 20 min",
    },
    pet: {
      breed: "Mestiza",
      description: "Pelaje gris con mancha blanca en el pecho.",
      type: "Gato",
    },
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
