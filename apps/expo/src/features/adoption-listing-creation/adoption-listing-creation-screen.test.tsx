import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type { AdoptionListingDraft } from "./adoption-listing-creation-types";
import { adoptionListingCreationFixtures } from "./adoption-listing-creation-fixtures";
import { AdoptionListingCreationScreen } from "./adoption-listing-creation-screen";
import {
  createAdoptionListingDraft,
  createInitialAdoptionListingDraft,
} from "./adoption-listing-creation-view-model";

const durableDraft = vi.hoisted(() => ({
  clearDraft: vi.fn(),
  discardDraft: vi.fn(),
  draft: null as AdoptionListingDraft | null,
  draftRecovery: { status: "none" } as
    | {
        draft: {
          draft: AdoptionListingDraft;
          kind: "adoption-listing";
          savedAt: string;
          schemaVersion: 2;
        };
        status: "available";
      }
    | { reason: string; status: "incompatible" }
    | { status: "none" },
  draftResetVersion: 0,
  hookInput: null as null | {
    initialDraft: AdoptionListingDraft;
    recoveryMode?: "explicit" | "silent";
  },
  restoredDraft: null as null | {
    draft: AdoptionListingDraft;
    kind: "adoption-listing";
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
    initialDraft: AdoptionListingDraft;
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
      resumeDraft: durableDraft.resumeDraft,
      restoredDraft: durableDraft.restoredDraft,
      setDraft: durableDraft.setDraft,
    };
  },
}));

vi.mock("../report-location-picker", () => ({
  ReportLocationPickerScreen: "ReportLocationPickerScreen",
}));

describe("AdoptionListingCreationScreen", () => {
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
      (nextDraft: React.SetStateAction<AdoptionListingDraft>) => {
        const currentDraft =
          durableDraft.draft ??
          durableDraft.hookInput?.initialDraft ??
          createInitialAdoptionListingDraft({
            petProfiles: adoptionListingCreationFixtures.petProfiles,
          });
        durableDraft.draft =
          typeof nextDraft === "function"
            ? (
                nextDraft as (
                  current: AdoptionListingDraft,
                ) => AdoptionListingDraft
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

  it("starts the default adoption draft on the canonical photos step without showing validation errors", () => {
    const screen = renderScreen(<AdoptionListingCreationScreen />);

    expect(durableDraft.hookInput?.recoveryMode).toBe("explicit");
    expect(findText(screen, "Paso 1 de 5")).toBe(true);
    expect(findText(screen, "Mascota")).toBe(true);
    expect(findText(screen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(screen, "Detalles de adopcion")).toBe(false);
    expect(findText(screen, "Chat en Rastro")).toBe(false);
    expect(findText(screen, "Insignia")).toBe(false);
    expect(findText(screen, "Agrega al menos una foto.")).toBe(false);
  });

  it("exposes a route back header action that delegates to close handling", () => {
    const onClose = vi.fn();
    const screen = renderScreen(
      <AdoptionListingCreationScreen onClose={onClose} />,
    );
    const routeBackButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Volver de adopcion",
    );

    void getPressableOnPress(routeBackButton)();

    expect(routeBackButton).toBeTruthy();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the editor in a keyboard-aware safe-area frame with sticky step actions", () => {
    const screen = renderScreen(<AdoptionListingCreationScreen />);
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

  it("keeps the default draft on photos and shows only the photo-step error after continuing", () => {
    const screen = renderScreen(<AdoptionListingCreationScreen />);
    const continueButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Continuar"),
    );

    void getPressableOnPress(continueButton)();

    const attemptedScreen = renderScreen(<AdoptionListingCreationScreen />);

    expect(findText(attemptedScreen, "Paso 1 de 5")).toBe(true);
    expect(findText(attemptedScreen, "Agrega al menos una foto.")).toBe(true);
    expect(findText(attemptedScreen, "Detalles de adopcion")).toBe(false);
    expect(
      findText(attemptedScreen, "Cuenta que tipo de hogar necesita."),
    ).toBe(false);
    expect(findText(attemptedScreen, "Elige chat, WhatsApp o ambos.")).toBe(
      false,
    );
  });

  it("starts a draft with a selected pet and ready photo on details and goes back only to photos", () => {
    durableDraft.draft = createAdoptionListingDraft({
      ...createInitialAdoptionListingDraft({
        petProfiles: adoptionListingCreationFixtures.petProfiles,
      }),
      adoptionDetails: {
        adoptionSummary: "",
        healthNotes: "",
        idealHome: "",
      },
      exactLocation: adoptionListingCreationFixtures.defaultLocation,
      photos: [
        {
          alt: "Foto lista",
          id: "adoption-ready-photo",
          mediaId: "adoption-ready-media",
          status: "ready",
          uri: "file:///adoption-ready-photo.jpg",
        },
      ],
    });

    const detailsScreen = renderScreen(
      <AdoptionListingCreationScreen
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );

    expect(findText(detailsScreen, "Paso 2 de 5")).toBe(true);
    expect(findText(detailsScreen, "Detalles de adopcion")).toBe(true);
    expect(findText(detailsScreen, "Antes de abrir tus fotos")).toBe(false);
    expect(findText(detailsScreen, "Chat en Rastro")).toBe(false);
    expect(findText(detailsScreen, "Insignia")).toBe(false);

    const backButton = findElement(
      detailsScreen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    void getPressableOnPress(backButton)();

    const photosScreen = renderScreen(
      <AdoptionListingCreationScreen
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );

    expect(findText(photosScreen, "Paso 1 de 5")).toBe(true);
    expect(findText(photosScreen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(photosScreen, "Detalles de adopcion")).toBe(false);
    expect(
      findElement(
        photosScreen,
        (element) => element.props.accessibilityLabel === "Foto lista",
      ),
    ).toBeTruthy();
  });

  it("resets edited fresh journey state after discarding an offered saved draft", async () => {
    const savedDraft = createReadyDraft();
    durableDraft.draft = createDetailsStepDraft();
    durableDraft.draftRecovery = {
      draft: {
        draft: savedDraft,
        kind: "adoption-listing",
        savedAt: "2026-06-22T10:30:00.000Z",
        schemaVersion: 2,
      },
      status: "available",
    };

    const editedFreshScreen = renderScreen(
      <AdoptionListingCreationScreen
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );

    expect(findText(editedFreshScreen, "Paso 2 de 5")).toBe(true);
    expect(findText(editedFreshScreen, "Detalles de adopcion")).toBe(true);

    const discardButton = findElement(
      editedFreshScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    await getPressableOnPress(discardButton)();
    void renderScreen(
      <AdoptionListingCreationScreen
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );

    const resetScreen = renderScreen(
      <AdoptionListingCreationScreen
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );

    expect(durableDraft.discardDraft).toHaveBeenCalledTimes(1);
    expect(findText(resetScreen, "Encontramos un borrador guardado.")).toBe(
      false,
    );
    expect(findText(resetScreen, "Paso 1 de 5")).toBe(true);
    expect(findText(resetScreen, "Antes de abrir tus fotos")).toBe(true);
    expect(findText(resetScreen, "Detalles de adopcion")).toBe(false);
    expect(
      findElement(
        resetScreen,
        (element) => element.props.accessibilityLabel === "Foto lista",
      ),
    ).toBeUndefined();
  });

  it("adds photos from an injected media source instead of fixture samples", async () => {
    const pickAdoptionListingPhoto = vi.fn().mockResolvedValue({
      alt: "Foto de adopcion subida",
      id: "adoption-local-1",
      mediaId: "adoption-media-1",
      originalUri: "file:///adoption-original.jpg",
      status: "ready",
      uri: "file:///adoption-ready.jpg",
    });
    const screen = renderScreen(
      <AdoptionListingCreationScreen
        pickAdoptionListingPhoto={pickAdoptionListingPhoto}
      />,
    );
    const addPhotoButton = findElement(
      screen,
      (element) => element.props.accessibilityLabel === "Agregar foto",
    );

    await getPressableOnPress(addPhotoButton)();

    expect(pickAdoptionListingPhoto).toHaveBeenCalledTimes(1);
    expect(durableDraft.draft?.photos).toEqual([
      {
        alt: "Foto de adopcion subida",
        id: "adoption-local-1",
        mediaId: "adoption-media-1",
        originalUri: "file:///adoption-original.jpg",
        status: "ready",
        uri: "file:///adoption-ready.jpg",
      },
    ]);
  });

  it("reports the draft as published after a successful publish clears the draft", async () => {
    durableDraft.draft = createReadyDraft();
    const publishAdoptionListing = vi.fn().mockResolvedValue({
      id: "report-adoption-backend-1",
      status: "active",
    });
    const draftPublished = vi.fn();
    const openPublishedListing = vi.fn();
    const sharePublishedListing = vi.fn();

    const screen = renderScreen(
      <AdoptionListingCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedListing={openPublishedListing}
        onPublishAdoptionListing={publishAdoptionListing}
        onSharePublishedListing={sharePublishedListing}
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );
    const publishButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Publicar adopcion"),
    );

    await getPressableOnPress(publishButton)();

    const successScreen = renderScreen(
      <AdoptionListingCreationScreen
        onDraftPublished={draftPublished}
        onOpenPublishedListing={openPublishedListing}
        onPublishAdoptionListing={publishAdoptionListing}
        onSharePublishedListing={sharePublishedListing}
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );
    const shareButton = findElement(
      successScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Compartir"),
    );
    const viewListingButton = findElement(
      successScreen,
      (element) =>
        element.type === "Pressable" && findText(element, "Ver adopcion"),
    );

    void getPressableOnPress(shareButton)();
    void getPressableOnPress(viewListingButton)();

    expect(publishAdoptionListing).toHaveBeenCalledTimes(1);
    expect(durableDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(draftPublished).toHaveBeenCalledTimes(1);
    expect(sharePublishedListing).toHaveBeenCalledWith({
      id: "report-adoption-backend-1",
      status: "active",
    });
    expect(openPublishedListing).toHaveBeenCalledWith({
      id: "report-adoption-backend-1",
      status: "active",
    });
    expect(findText(successScreen, "report-adoption-backend-1")).toBe(false);
    expect(findText(successScreen, "active")).toBe(false);
  });

  it("lets people go back from review before publishing", () => {
    durableDraft.draft = createReadyDraft();

    const reviewScreen = renderScreen(
      <AdoptionListingCreationScreen
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );
    const backButton = findElement(
      reviewScreen,
      (element) => element.type === "Pressable" && findText(element, "Atrás"),
    );

    expect(findText(reviewScreen, "Publicar adopcion")).toBe(true);
    expect(findText(reviewScreen, "Continuar")).toBe(false);

    void getPressableOnPress(backButton)();

    const contactScreen = renderScreen(
      <AdoptionListingCreationScreen
        petProfiles={adoptionListingCreationFixtures.petProfiles}
      />,
    );

    expect(findText(contactScreen, "Contacto")).toBe(true);
    expect(findText(contactScreen, "Publicar adopcion")).toBe(false);
    expect(findText(contactScreen, "Continuar")).toBe(true);
  });

  it("opens the location picker from an empty location step and applies the confirmed adoption location", () => {
    durableDraft.draft = createLocationReadyDraftWithoutLocation();
    const adapter = createNearbyLocationAdapterBoundary();

    const screen = renderScreen(
      <AdoptionListingCreationScreen
        locationAdapter={adapter}
        petProfiles={adoptionListingCreationFixtures.petProfiles}
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
      <AdoptionListingCreationScreen
        locationAdapter={adapter}
        petProfiles={adoptionListingCreationFixtures.petProfiles}
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
      <AdoptionListingCreationScreen
        locationAdapter={adapter}
        petProfiles={adoptionListingCreationFixtures.petProfiles}
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

function renderScreen(node: React.ReactNode): React.ReactNode {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.refCursor = 0;

  const rendered = renderFunctionElement(node);
  flushEffects();

  return rendered;
}

function createReadyDraft() {
  const [readyPhoto] = adoptionListingCreationFixtures.photoSamples;

  if (!readyPhoto) {
    throw new Error("Expected an adoption listing photo fixture.");
  }

  return createAdoptionListingDraft({
    ...createInitialAdoptionListingDraft({
      petProfiles: adoptionListingCreationFixtures.petProfiles,
    }),
    adoptionDetails: {
      adoptionSummary:
        "Nala busca un hogar tranquilo con ventanas protegidas y rutina estable.",
      healthNotes: "Vacunas al dia y esterilizada.",
      idealHome: "Familia paciente, sin acceso a calle.",
    },
    exactLocation: adoptionListingCreationFixtures.defaultLocation,
    photos: [readyPhoto],
  });
}

function createDetailsStepDraft() {
  return createAdoptionListingDraft({
    ...createInitialAdoptionListingDraft({
      petProfiles: adoptionListingCreationFixtures.petProfiles,
    }),
    adoptionDetails: {
      adoptionSummary: "",
      healthNotes: "",
      idealHome: "",
    },
    exactLocation: adoptionListingCreationFixtures.defaultLocation,
    photos: [
      {
        alt: "Foto lista",
        id: "adoption-ready-photo",
        mediaId: "adoption-ready-media",
        status: "ready",
        uri: "file:///adoption-ready-photo.jpg",
      },
    ],
  });
}

function createLocationReadyDraftWithoutLocation() {
  const [readyPhoto] = adoptionListingCreationFixtures.photoSamples;

  if (!readyPhoto) {
    throw new Error("Expected an adoption listing photo fixture.");
  }

  return createAdoptionListingDraft({
    ...createInitialAdoptionListingDraft({
      petProfiles: adoptionListingCreationFixtures.petProfiles,
    }),
    adoptionDetails: {
      adoptionSummary:
        "Nala busca un hogar tranquilo con ventanas protegidas y rutina estable.",
      healthNotes: "Vacunas al dia y esterilizada.",
      idealHome: "Familia paciente, sin acceso a calle.",
    },
    photos: [readyPhoto],
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
