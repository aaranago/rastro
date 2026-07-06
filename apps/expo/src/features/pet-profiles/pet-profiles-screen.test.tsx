import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PetProfileRepository } from "./pet-profiles";
import { MisMascotasScreen } from "./pet-profiles-screen";

(globalThis as { React?: typeof React }).React = React;

const reactState = vi.hoisted(() => ({
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
  refCursor: 0,
  refs: [] as { current: unknown }[],
  values: [] as unknown[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: (effect: () => void | (() => void)) => {
      reactState.effects.push(effect);
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useRef: <TValue,>(initialValue: TValue) => {
      const index = reactState.refCursor;
      reactState.refCursor += 1;

      if (reactState.refs.length <= index) {
        reactState.refs[index] = { current: initialValue };
      }

      return reactState.refs[index] as { current: TValue };
    },
    useState: <TValue,>(initialValue: TValue | (() => TValue)) => {
      const index = reactState.cursor;
      reactState.cursor += 1;

      if (reactState.values.length <= index) {
        reactState.values[index] =
          typeof initialValue === "function"
            ? (initialValue as () => TValue)()
            : initialValue;
      }

      return [
        reactState.values[index] as TValue,
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

vi.mock("@legendapp/list", () => ({
  LegendList: "LegendList",
}));

vi.mock("../report-creation/report-creation-ui", () => ({
  ReportCreationDraftPersistenceAlert: "ReportCreationDraftPersistenceAlert",
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

describe("MisMascotasScreen visitor actions", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.effects = [];
    reactState.refCursor = 0;
    reactState.refs = [];
    reactState.values = [];
  });

  it("keeps the visitor sign-in CTA enabled when a route handler is provided", () => {
    const onRequestSignIn = vi.fn();
    const screen = renderFunctionElement(
      <MisMascotasScreen
        onRequestSignIn={onRequestSignIn}
        session={{ kind: "visitor" }}
      />,
    );
    const signInButton = findPressableByText(
      screen,
      "Inicia sesión para crear",
    );

    expect(signInButton?.props.disabled).toBe(false);
    getPressableOnPress(signInButton)();

    expect(onRequestSignIn).toHaveBeenCalledOnce();
  });

  it("uses the create form as the primary empty state after Crear ahora", () => {
    const screen = renderFunctionElement(
      <MisMascotasScreen
        initialProfiles={[]}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const initialListProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
      ListHeaderComponent: React.ReactNode;
    }>(screen);
    const initialEmptyState = renderFunctionElement(
      initialListProps.ListEmptyComponent,
    );
    const initialHeader = renderFunctionElement(
      initialListProps.ListHeaderComponent,
    );

    expect(containsText(initialHeader, "Crear perfil de mascota")).toBe(false);
    expect(containsText(initialEmptyState, "Crear ahora")).toBe(true);
    getPressableOnPress(findPressableByText(initialEmptyState, "Crear ahora"))();

    resetRenderCursor();

    const nextScreen = renderFunctionElement(
      <MisMascotasScreen
        initialProfiles={[]}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const nextListProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
      ListFooterComponent: React.ReactNode;
      ListHeaderComponent: React.ReactNode;
    }>(nextScreen);
    const nextEmptyState = renderFunctionElement(
      nextListProps.ListEmptyComponent,
    );
    const nextFooter = renderFunctionElement(nextListProps.ListFooterComponent);
    const nextHeader = renderFunctionElement(nextListProps.ListHeaderComponent);

    expect(containsText(nextEmptyState, "Crear perfil de mascota")).toBe(true);
    expect(containsText(nextEmptyState, "Nombre")).toBe(true);
    expect(containsText(nextEmptyState, "Ingresa el nombre.")).toBe(false);
    expect(containsText(nextEmptyState, "Aún no tienes mascotas")).toBe(false);
    expect(containsText(nextFooter, "Crear perfil de mascota")).toBe(false);
    expect(containsText(nextHeader, "Crear perfil de mascota")).toBe(false);
  });

  it("waits for name input before showing create-form validation copy", () => {
    const screen = renderFunctionElement(
      <MisMascotasScreen
        initialProfiles={[]}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const initialListProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
    }>(screen);
    const initialEmptyState = renderFunctionElement(
      initialListProps.ListEmptyComponent,
    );

    getPressableOnPress(findPressableByText(initialEmptyState, "Crear ahora"))();
    resetRenderCursor();

    const emptyFormScreen = renderFunctionElement(
      <MisMascotasScreen
        initialProfiles={[]}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const emptyFormListProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
    }>(emptyFormScreen);
    const emptyForm = renderFunctionElement(
      emptyFormListProps.ListEmptyComponent,
    );

    expect(containsText(emptyForm, "Ingresa el nombre.")).toBe(false);

    changeTextByPlaceholder(emptyForm, "Nombre de la mascota", "Mora");
    resetRenderCursor();

    const namedFormScreen = renderFunctionElement(
      <MisMascotasScreen
        initialProfiles={[]}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const namedFormListProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
    }>(namedFormScreen);
    const namedForm = renderFunctionElement(
      namedFormListProps.ListEmptyComponent,
    );

    expect(containsText(namedForm, "Ingresa el nombre.")).toBe(false);

    changeTextByPlaceholder(namedForm, "Nombre de la mascota", "");
    resetRenderCursor();

    const clearedFormScreen = renderFunctionElement(
      <MisMascotasScreen
        initialProfiles={[]}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const clearedFormListProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
    }>(clearedFormScreen);
    const clearedForm = renderFunctionElement(
      clearedFormListProps.ListEmptyComponent,
    );

    expect(containsText(clearedForm, "Ingresa el nombre.")).toBe(true);
  });

  it("does not show an empty-pets state while member profiles are loading", () => {
    const screen = renderFunctionElement(
      <MisMascotasScreen
        repository={createPendingRepository()}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const listProps = getLegendListProps<{ ListEmptyComponent: React.ReactNode }>(
      screen,
    );
    const emptyState = renderFunctionElement(listProps.ListEmptyComponent);

    expect(containsText(emptyState, "Cargando tus mascotas")).toBe(true);
    expect(containsText(emptyState, "Aún no tienes mascotas")).toBe(false);
  });

  it("shows a retryable load failure instead of a false empty state", async () => {
    const repository = createFailingRepository();
    void renderFunctionElement(
      <MisMascotasScreen
        repository={repository}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );

    await runPendingEffects();
    resetRenderCursor();

    const nextScreen = renderFunctionElement(
      <MisMascotasScreen
        repository={repository}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const listProps = getLegendListProps<{ ListEmptyComponent: React.ReactNode }>(
      nextScreen,
    );
    const emptyState = renderFunctionElement(listProps.ListEmptyComponent);

    expect(containsText(emptyState, "No pudimos cargar tus mascotas")).toBe(
      true,
    );
    expect(containsText(emptyState, "Reintentar")).toBe(true);
    expect(containsText(emptyState, "Aún no tienes mascotas")).toBe(false);
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function resetRenderCursor() {
  reactState.cursor = 0;
  reactState.refCursor = 0;
}

function createPendingRepository() {
  const pendingProfiles = new Promise<never>((resolve) => {
    void resolve;
  });
  const repository: PetProfileRepository = {
    createPetProfile: vi.fn(() =>
      Promise.reject(new Error("Not used in this test.")),
    ),
    getPetProfile: vi.fn(() => Promise.resolve(null)),
    listPetProfiles: vi.fn(() => pendingProfiles),
    updatePetProfile: vi.fn(() =>
      Promise.reject(new Error("Not used in this test.")),
    ),
  };

  return repository;
}

function createFailingRepository() {
  const repository: PetProfileRepository = {
    createPetProfile: vi.fn(() =>
      Promise.reject(new Error("Not used in this test.")),
    ),
    getPetProfile: vi.fn(() => Promise.resolve(null)),
    listPetProfiles: vi.fn().mockRejectedValue(new Error("offline")),
    updatePetProfile: vi.fn(() =>
      Promise.reject(new Error("Not used in this test.")),
    ),
  };

  return repository;
}

async function runPendingEffects() {
  const effects = [...reactState.effects];
  reactState.effects = [];

  for (const effect of effects) {
    effect();
  }

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function getLegendListProps<TProps extends ElementProps>(
  node: React.ReactNode,
): TProps {
  const list = findElement(node, (element) => element.type === "LegendList");

  if (!list) {
    throw new Error("Expected MisMascotasScreen to render a LegendList.");
  }

  return list.props as TProps;
}

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  if (typeof node.type !== "function") {
    return node;
  }

  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return renderFunctionElement(Component(node.props));
}

function findPressableByText(
  node: React.ReactNode,
  text: string,
): TestElement | undefined {
  return findElement(
    node,
    (element) => element.type === "Pressable" && containsText(element, text),
  );
}

function changeTextByPlaceholder(
  node: React.ReactNode,
  placeholder: string,
  value: string,
) {
  const input = findElement(
    node,
    (element) =>
      element.type === "TextInput" && element.props.placeholder === placeholder,
  );
  const onChangeText = input?.props.onChangeText;

  if (typeof onChangeText !== "function") {
    throw new Error(`Expected text input with placeholder ${placeholder}.`);
  }

  (onChangeText as (nextValue: string) => void)(value);
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

function containsText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered.includes(text);
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    containsText(child, text),
  );
}

function getPressableOnPress(element: TestElement | undefined) {
  if (!element) {
    throw new Error("Expected pressable element to exist.");
  }

  if (typeof element.props.onPress !== "function") {
    throw new Error("Expected pressable element to have an onPress handler.");
  }

  return element.props.onPress as () => void;
}
