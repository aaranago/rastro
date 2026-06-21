import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getShellCopy } from "../../i18n";
import { createInitialShellState, createShellModel } from "./shell-model";
import { ProfileScreen } from "./shell-screens";

const shellContext = vi.hoisted(() => ({
  requestAuthPrompt: vi.fn(),
  value: null as Record<string, unknown> | null,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");

  return {
    ...actual,
    memo: <TComponent,>(component: TComponent) => component,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useMemo: <TValue,>(factory: () => TValue) => factory(),
  };
});

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../app-states", () => ({
  AppStatePanel: "AppStatePanel",
}));

vi.mock("./shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

vi.mock("./shell-provider", () => ({
  useRastroShell: () => shellContext.value,
}));

describe("Profile visitor auth entry", () => {
  beforeEach(() => {
    const copy = getShellCopy();
    const session = { kind: "visitor" as const };

    shellContext.requestAuthPrompt.mockReset();
    shellContext.value = {
      copy,
      initiateAccountDeletion: vi.fn(),
      model: createShellModel({ copy, session }),
      requestAuthPrompt: shellContext.requestAuthPrompt,
      requestMemberPasswordReset: vi.fn(),
      session,
      signOutMember: vi.fn(),
      state: createInitialShellState(),
    };
  });

  it("opens the shared auth prompt from the visible visitor sign-in action", () => {
    const screen = renderFunctionElement(ProfileScreen());
    const button = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Iniciar sesión",
    );

    expect(button?.props.accessibilityRole).toBe("button");
    expect(button?.props.accessibilityHint).toBe(
      "Abre el ingreso o la creacion de cuenta.",
    );

    const onPress = button?.props.onPress;

    if (typeof onPress !== "function") {
      throw new Error("Expected Profile visitor auth entry to be pressable.");
    }

    (onPress as () => void)();

    expect(shellContext.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/(tabs)/(profile)",
      sourceHref: "rastro://auth/sign-in?returnTo=/perfil",
    });
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

  return Component(node.props);
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
