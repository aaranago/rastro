import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SightingReportCreationScreen } from "./sighting-report-creation-screen";
import { createSightingReportDraft } from "./sighting-report-creation-view-model";

const durableDraft = vi.hoisted(() => ({
  clearDraft: vi.fn(),
  draft: null as ReturnType<typeof createSightingReportDraft> | null,
  setDraft: vi.fn(),
}));
const reactState = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: () => undefined,
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useRef: <TValue,>(value: TValue) => ({ current: value }),
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

vi.mock("../resilience/use-durable-creation-draft", () => ({
  useDurableCreationDraft: () => ({
    clearDraft: durableDraft.clearDraft,
    draft: durableDraft.draft,
    draftPersistence: {
      error: null,
      status: "ready",
    },
    setDraft: durableDraft.setDraft,
  }),
}));

describe("SightingReportCreationScreen", () => {
  beforeEach(() => {
    durableDraft.clearDraft.mockReset();
    durableDraft.clearDraft.mockResolvedValue(undefined);
    durableDraft.draft = null;
    durableDraft.setDraft.mockReset();
    reactState.cursor = 0;
    reactState.values = [];
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

    const editingScreen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );
    const publishButton = findElement(
      editingScreen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Publicar avistamiento"),
    );

    const publishAttempt = getPressableOnPress(
      publishButton,
    )() as Promise<void>;
    const pendingScreen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
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
        onPublishSightingReport={publishSightingReport}
      />,
    );

    expect(findText(successScreen, "report-sighting-backend-1")).toBe(true);
    expect(findText(successScreen, "active")).toBe(true);
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

    const pressPublish = getPressableOnPress(publishButton);
    const firstAttempt = pressPublish() as Promise<void>;
    const duplicateAttempt = pressPublish() as Promise<void>;

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

    const retryScreen = renderScreen(
      <SightingReportCreationScreen
        onPublishSightingReport={publishSightingReport}
      />,
    );

    expect(durableDraft.clearDraft).not.toHaveBeenCalled();
    expect(
      findText(
        retryScreen,
        "No pudimos publicar. Tu borrador sigue aqui para intentar de nuevo.",
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

  return renderFunctionElement(node);
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
