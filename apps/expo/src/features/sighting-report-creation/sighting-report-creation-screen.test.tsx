import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import { SightingReportCreationScreen } from "./sighting-report-creation-screen";
import { createSightingReportDraft } from "./sighting-report-creation-view-model";

const durableDraft = vi.hoisted(() => ({
  clearDraft: vi.fn(),
  discardDraft: vi.fn(),
  draft: null as ReturnType<typeof createSightingReportDraft> | null,
  draftRecovery: { status: "none" } as
    | {
        draft: {
          draft: ReturnType<typeof createSightingReportDraft>;
          kind: "sighting-report";
          savedAt: string;
          schemaVersion: 2;
        };
        status: "available";
      }
    | { reason: string; status: "incompatible" }
    | { status: "none" },
  draftResetVersion: 0,
  hookInput: null as null | {
    initialDraft: ReturnType<typeof createSightingReportDraft>;
    recoveryMode?: "explicit" | "silent";
  },
  restoredDraft: null as null | {
    draft: ReturnType<typeof createSightingReportDraft>;
    kind: "sighting-report";
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
    initialDraft: ReturnType<typeof createSightingReportDraft>;
    recoveryMode?: "explicit" | "silent";
  }) => {
    durableDraft.hookInput = input;

    return {
      clearDraft: durableDraft.clearDraft,
      discardDraft: durableDraft.discardDraft,
      draft: durableDraft.draft ?? input.initialDraft,
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

describe("SightingReportCreationScreen", () => {
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
      (
        nextDraft: React.SetStateAction<
          ReturnType<typeof createSightingReportDraft>
        >,
      ) => {
        const currentDraft =
          durableDraft.draft ??
          durableDraft.hookInput?.initialDraft ??
          createSightingReportDraft();
        durableDraft.draft =
          typeof nextDraft === "function"
            ? (
                nextDraft as (
                  current: ReturnType<typeof createSightingReportDraft>,
                ) => ReturnType<typeof createSightingReportDraft>
              )(currentDraft)
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

  it("starts default member drafts on the canonical details step without validation noise", () => {
    const screen = renderScreen(<SightingReportCreationScreen />);

    expect(durableDraft.hookInput?.recoveryMode).toBe("explicit");
    expect(findText(screen, "Paso 2 de 5")).toBe(true);
    expect(findText(screen, "Detalles del avistamiento")).toBe(true);
    expect(findText(screen, "Mascota vista")).toBe(true);
    expect(findText(screen, "Fotos opcionales")).toBe(false);
    expect(findText(screen, "Chat en Rastro")).toBe(false);
    expect(findText(screen, "Publicar avistamiento")).toBe(false);
    expect(findText(screen, "Indica cuándo fue visto.")).toBe(false);
    expect(findText(screen, "Describe la condición observada.")).toBe(false);
    expect(findText(screen, "Indica hacia dónde iba.")).toBe(false);
    expect(findText(screen, "Agrega una descripción del avistamiento.")).toBe(
      false,
    );
    expect(findText(screen, "Agrega señas visibles de la mascota vista.")).toBe(
      false,
    );
  });

  it("exposes a route back header action that delegates to close handling", () => {
    const onClose = vi.fn();
    const screen = renderScreen(
      <SightingReportCreationScreen onClose={onClose} />,
    );
    const routeBackButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Volver del avistamiento",
    );

    void getPressableOnPress(routeBackButton)();

    expect(routeBackButton).toBeTruthy();
    expect(routeBackButton?.props.hitSlop).toBe(12);
    expect(routeBackButton?.props.pressRetentionOffset).toBe(18);
    expect(routeBackButton?.props.testID).toBe("report-creation-close-button");
    expect(routeBackButton?.props.style).toMatchObject({
      minHeight: 48,
      minWidth: 48,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the editor in a keyboard-aware safe-area frame with sticky step actions", () => {
    const screen = renderScreen(<SightingReportCreationScreen />);
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

  it("resets edited fresh journey state after discarding an offered saved draft", async () => {
    const savedDraft = createReadyDraft();
    durableDraft.draftRecovery = {
      draft: {
        draft: savedDraft,
        kind: "sighting-report",
        savedAt: "2026-06-22T10:30:00.000Z",
        schemaVersion: 2,
      },
      status: "available",
    };

    const screen = renderScreen(<SightingReportCreationScreen />);
    const backButton = findElement(
      screen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    void getPressableOnPress(backButton)();

    const editedFreshScreen = renderScreen(<SightingReportCreationScreen />);

    expect(findText(editedFreshScreen, "Paso 1 de 5")).toBe(true);
    expect(findText(editedFreshScreen, "Fotos opcionales")).toBe(true);

    const discardButton = findElement(
      editedFreshScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    await getPressableOnPress(discardButton)();
    void renderScreen(<SightingReportCreationScreen />);

    const resetScreen = renderScreen(<SightingReportCreationScreen />);

    expect(durableDraft.discardDraft).toHaveBeenCalledTimes(1);
    expect(findText(resetScreen, "Encontramos un borrador guardado.")).toBe(
      false,
    );
    expect(findText(resetScreen, "Paso 2 de 5")).toBe(true);
    expect(findText(resetScreen, "Detalles del avistamiento")).toBe(true);
    expect(findText(resetScreen, "Fotos opcionales")).toBe(false);
  });

  it("keeps default drafts on details and shows only details errors after continuing", () => {
    const screen = renderScreen(<SightingReportCreationScreen />);
    const continueButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    void getPressableOnPress(continueButton)();

    const attemptedScreen = renderScreen(<SightingReportCreationScreen />);

    expect(findText(attemptedScreen, "Paso 2 de 5")).toBe(true);
    expect(findText(attemptedScreen, "Detalles del avistamiento")).toBe(true);
    expect(findText(attemptedScreen, "Fotos opcionales")).toBe(false);
    expect(findText(attemptedScreen, "Chat en Rastro")).toBe(false);
    expect(findText(attemptedScreen, "Publicar avistamiento")).toBe(false);
    expect(findText(attemptedScreen, "Indica cuándo fue visto.")).toBe(true);
    expect(findText(attemptedScreen, "Describe la condición observada.")).toBe(
      true,
    );
    expect(findText(attemptedScreen, "Indica hacia dónde iba.")).toBe(true);
    expect(
      findText(attemptedScreen, "Agrega una descripción del avistamiento."),
    ).toBe(true);
    expect(
      findText(attemptedScreen, "Agrega señas visibles de la mascota vista."),
    ).toBe(true);
    expect(
      findText(attemptedScreen, "Selecciona dónde fue visto el animal."),
    ).toBe(false);
    expect(findText(attemptedScreen, "Elige chat, WhatsApp o ambos.")).toBe(
      false,
    );
  });

  it("adds optional photos from an injected media source instead of fixture samples", async () => {
    const pickSightingReportPhoto = vi.fn().mockResolvedValue({
      alt: "Foto de avistamiento subida",
      id: "sighting-local-1",
      mediaId: "sighting-media-1",
      originalUri: "file:///sighting-original.jpg",
      status: "ready",
      uri: "file:///sighting-ready.jpg",
    });
    const initialDraft = createSightingReportDraft();
    const detailsScreen = renderScreen(
      <SightingReportCreationScreen
        initialDraft={initialDraft}
        pickSightingReportPhoto={pickSightingReportPhoto}
      />,
    );
    const backButton = findElement(
      detailsScreen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    void getPressableOnPress(backButton)();

    const photosScreen = renderScreen(
      <SightingReportCreationScreen
        initialDraft={initialDraft}
        pickSightingReportPhoto={pickSightingReportPhoto}
      />,
    );
    const addPhotoButton = findElement(
      photosScreen,
      (element) => element.props.accessibilityLabel === "Agregar foto opcional",
    );

    if (!addPhotoButton) {
      throw new Error("Expected optional add photo button.");
    }

    await getPressableOnPress(addPhotoButton)();

    expect(pickSightingReportPhoto).toHaveBeenCalledTimes(1);
    expect(durableDraft.draft?.photos).toEqual([
      {
        alt: "Foto de avistamiento subida",
        id: "sighting-local-1",
        mediaId: "sighting-media-1",
        originalUri: "file:///sighting-original.jpg",
        status: "ready",
        uri: "file:///sighting-ready.jpg",
      },
    ]);
  });

  it("adds a stable idempotency key to a restored draft before publishing", async () => {
    const { idempotencyKey: _oldDraftMissingKey, ...restoredDraft } =
      createSightingReportDraft({
        exactSightingLocation: {
          addressLabel: "Plaza Abaroa, La Paz",
          coordinates: {
            latitude: -16.5103,
            longitude: -68.1299,
          },
          department: "La Paz",
          locationCellLabel: "Sopocachi",
          municipality: "La Paz",
        },
        pet: {
          breed: "Mestizo",
          description: "Patas blancas, collar verde y orejas caidas.",
          type: "Perro",
        },
        sightingDetails: {
          description:
            "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
          direction: "Iba hacia la avenida 20 de Octubre.",
          observedAtLabel: "2026-06-18T10:15:00.000Z",
          observedCondition:
            "Asustado, caminando rapido, sin heridas visibles.",
        },
      });
    durableDraft.draft = restoredDraft;
    const publishSightingReport = vi.fn().mockResolvedValue({
      id: "report-sighting-backend-1",
      status: "active",
    });

    const screen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );
    const publishButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Publicar avistamiento"),
    );

    await getPressableOnPress(publishButton)();

    expect(publishSightingReport).not.toHaveBeenCalled();

    const confirmationScreen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );
    const confirmPublishButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Confirmar y publicar"),
    );

    await getPressableOnPress(confirmPublishButton)();

    const publishedInput = publishSightingReport.mock.calls[0]?.[0] as
      | { idempotencyKey?: string }
      | undefined;

    expect(publishedInput?.idempotencyKey).toMatch(/^sighting-report-/);
    expect(durableDraft.setDraft).toHaveBeenCalledWith(expect.any(Function));

    const persistDraftKey = durableDraft.setDraft.mock.calls[0]?.[0] as (
      draft: typeof restoredDraft,
    ) => typeof restoredDraft & { idempotencyKey?: string };

    expect(persistDraftKey(restoredDraft).idempotencyKey).toMatch(
      /^sighting-report-/,
    );
  });

  it("shows backend report ID and state only after publish confirmation", async () => {
    durableDraft.draft = createSightingReportDraft({
      exactSightingLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        coordinates: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        department: "La Paz",
        locationCellLabel: "Sopocachi",
        municipality: "La Paz",
      },
      idempotencyKey: "sighting-draft-stable-key-1",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      sightingDetails: {
        description:
          "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
        direction: "Iba hacia la avenida 20 de Octubre.",
        observedAtLabel: "2026-06-18T10:15:00.000Z",
        observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      },
    });

    let confirmPublish:
      | ((confirmation: { id: string; status: "active" }) => void)
      | undefined;
    const publishSightingReport = vi.fn(
      () =>
        new Promise<{ id: string; status: "active" }>((resolve) => {
          confirmPublish = resolve;
        }),
    );
    const draftPublished = vi.fn();
    const openPublishedReport = vi.fn();
    const sharePublishedReport = vi.fn();

    const editingScreen = renderScreen(
      <SightingReportCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedReport={openPublishedReport}
        onPublishSightingReport={publishSightingReport}
        onSharePublishedReport={sharePublishedReport}
      />,
    );
    const publishButton = findElement(
      editingScreen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Publicar avistamiento"),
    );

    await getPressableOnPress(publishButton)();

    expect(publishSightingReport).not.toHaveBeenCalled();

    const confirmationScreen = renderScreen(
      <SightingReportCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedReport={openPublishedReport}
        onPublishSightingReport={publishSightingReport}
        onSharePublishedReport={sharePublishedReport}
      />,
    );
    const confirmPublishButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Confirmar y publicar"),
    );

    expect(findText(confirmationScreen, "Reporte de avistamiento")).toBe(true);
    expect(findText(confirmationScreen, "Contacto")).toBe(true);

    const publishAttempt = getPressableOnPress(
      confirmPublishButton,
    )() as Promise<void>;
    const pendingScreen = renderScreen(
      <SightingReportCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedReport={openPublishedReport}
        onPublishSightingReport={publishSightingReport}
        onSharePublishedReport={sharePublishedReport}
      />,
    );

    expect(findText(pendingScreen, "report-sighting-backend-1")).toBe(false);
    expect(findText(pendingScreen, "active")).toBe(false);

    confirmPublish?.({
      id: "report-sighting-backend-1",
      status: "active",
    });
    await publishAttempt;

    const successScreen = renderScreen(
      <SightingReportCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedReport={openPublishedReport}
        onPublishSightingReport={publishSightingReport}
        onSharePublishedReport={sharePublishedReport}
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
        element.type === "Pressable" && findText(element, "Ver avistamiento"),
    );

    void getPressableOnPress(shareButton)();
    void getPressableOnPress(viewReportButton)();

    expect(durableDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(draftPublished).toHaveBeenCalledTimes(1);
    expect(sharePublishedReport).toHaveBeenCalledWith({
      id: "report-sighting-backend-1",
      status: "active",
    });
    expect(openPublishedReport).toHaveBeenCalledWith({
      id: "report-sighting-backend-1",
      status: "active",
    });
    expect(findText(successScreen, "report-sighting-backend-1")).toBe(false);
    expect(findText(successScreen, "active")).toBe(false);
  });

  it("lets people go back from review before publishing", () => {
    durableDraft.draft = createReadyDraft();

    const reviewScreen = renderScreen(<SightingReportCreationScreen />);
    const backButton = findElement(
      reviewScreen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    expect(findText(reviewScreen, "Publicar avistamiento")).toBe(true);
    expect(findText(reviewScreen, "Continuar")).toBe(false);

    void getPressableOnPress(backButton)();

    const contactScreen = renderScreen(<SightingReportCreationScreen />);

    expect(findText(contactScreen, "Contacto")).toBe(true);
    expect(findText(contactScreen, "Publicar avistamiento")).toBe(false);
    expect(findText(contactScreen, "Continuar")).toBe(true);
  });

  it("submits one backend request when publish is tapped repeatedly during a slow response", async () => {
    durableDraft.draft = createReadyDraft();
    let confirmPublish:
      | ((confirmation: { id: string; status: "active" }) => void)
      | undefined;
    const publishSightingReport = vi.fn(
      () =>
        new Promise<{ id: string; status: "active" }>((resolve) => {
          confirmPublish = resolve;
        }),
    );

    const screen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );
    const publishButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Publicar avistamiento"),
    );

    await getPressableOnPress(publishButton)();

    const confirmationScreen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );
    const confirmPublishButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Confirmar y publicar"),
    );
    const pressConfirm = getPressableOnPress(confirmPublishButton);
    const firstAttempt = pressConfirm() as Promise<void>;
    const duplicateAttempt = pressConfirm() as Promise<void>;

    await duplicateAttempt;
    expect(publishSightingReport).toHaveBeenCalledTimes(1);
    expect(durableDraft.clearDraft).not.toHaveBeenCalled();

    confirmPublish?.({
      id: "report-sighting-backend-1",
      status: "active",
    });
    await firstAttempt;

    expect(durableDraft.clearDraft).toHaveBeenCalledTimes(1);
  });

  it("opens the location picker from an empty location step and applies the confirmed sighting location", () => {
    durableDraft.draft = createLocationReadyDraftWithoutLocation();
    const adapter = createNearbyLocationAdapterBoundary();

    const screen = renderScreen(
      <SightingReportCreationScreen locationAdapter={adapter} />,
    );
    const chooseLocationButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Elegir ubicación"),
    );

    expect(findText(screen, "Selecciona el punto donde fue vista.")).toBe(true);
    expect(findText(screen, "Plaza Abaroa")).toBe(false);

    void getPressableOnPress(chooseLocationButton)();

    const pickerScreen = renderScreen(
      <SightingReportCreationScreen locationAdapter={adapter} />,
    );
    const picker = findElement(
      pickerScreen,
      (element) => element.type === "ReportLocationPickerScreen",
    );

    expect(picker?.props.adapter).toBe(adapter);

    const confirmedLocation = {
      addressLabel: "Avenida Arce",
      coordinates: {
        latitude: -16.5071,
        longitude: -68.1271,
      },
      department: "La Paz",
      locationCellLabel: "Sopocachi, La Paz",
      municipality: "La Paz",
    };

    (picker?.props.onConfirm as (location: typeof confirmedLocation) => void)(
      confirmedLocation,
    );

    const updatedScreen = renderScreen(
      <SightingReportCreationScreen locationAdapter={adapter} />,
    );

    expect(findText(updatedScreen, "Cambiar ubicación")).toBe(true);
    expect(findText(updatedScreen, "Avenida Arce")).toBe(true);
    expect(durableDraft.draft.exactSightingLocation).toEqual(confirmedLocation);
  });

  it("keeps the draft and offers retry when backend publish fails", async () => {
    durableDraft.draft = createReadyDraft();
    const publishSightingReport = vi
      .fn()
      .mockRejectedValue(new Error("backend unavailable"));

    const screen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );
    const publishButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Publicar avistamiento"),
    );

    await getPressableOnPress(publishButton)();

    const confirmationScreen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );
    const confirmPublishButton = findElement(
      confirmationScreen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Confirmar y publicar"),
    );

    await getPressableOnPress(confirmPublishButton)();

    const retryScreen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );

    expect(durableDraft.clearDraft).not.toHaveBeenCalled();
    expect(
      findText(
        retryScreen,
        "No pudimos publicar. Tu borrador sigue aquí para intentar de nuevo.",
      ),
    ).toBe(true);
    expect(findText(retryScreen, "Publicar avistamiento")).toBe(true);
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function renderScreen(node: React.ReactNode): React.ReactNode {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.refCursor = 0;

  const rendered = renderFunctionElement(node);
  flushEffects();

  return rendered;
}

function createReadyDraft() {
  return createSightingReportDraft({
    exactSightingLocation: {
      addressLabel: "Plaza Abaroa, La Paz",
      coordinates: {
        latitude: -16.5103,
        longitude: -68.1299,
      },
      department: "La Paz",
      locationCellLabel: "Sopocachi",
      municipality: "La Paz",
    },
    idempotencyKey: "sighting-draft-stable-key-1",
    pet: {
      breed: "Mestizo",
      description: "Patas blancas, collar verde y orejas caidas.",
      type: "Perro",
    },
    sightingDetails: {
      description:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
      direction: "Iba hacia la avenida 20 de Octubre.",
      observedAtLabel: "2026-06-18T10:15:00.000Z",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
    },
  });
}

function createLocationReadyDraftWithoutLocation() {
  return createSightingReportDraft({
    pet: {
      breed: "Mestizo",
      description: "Patas blancas, collar verde y orejas caidas.",
      type: "Perro",
    },
    sightingDetails: {
      description:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
      direction: "Iba hacia la avenida 20 de Octubre.",
      observedAtLabel: "2026-06-18T10:15:00.000Z",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
    },
  });
}

function createNearbyLocationAdapterBoundary(): NearbyLocationAdapter {
  return {
    resolveForegroundLocation: vi.fn(),
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
