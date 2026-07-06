import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

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
