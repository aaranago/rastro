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
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => React.createElement("Link", { href }, children),
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

  it("only renders profile rows that navigate to real profile routes", () => {
    const screen = renderFunctionElement(ProfileScreen());

    expect(collectLinkHrefs(screen)).toEqual(
      expect.arrayContaining(["/mis-mascotas", "/alertas", "/ajustes"]),
    );
    expect(findText(screen, "Mis mascotas")).toBe(true);
    expect(findText(screen, "Alertas")).toBe(true);
    expect(findText(screen, "Ajustes")).toBe(true);
    expect(findText(screen, "Mis reportes")).toBe(false);
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

function collectLinkHrefs(node: React.ReactNode): string[] {
  const rendered = renderFunctionElement(node);

  if (!React.isValidElement<ElementProps>(rendered)) {
    return [];
  }

  const currentHref =
    rendered.type === "Link" && typeof rendered.props.href === "string"
      ? [rendered.props.href]
      : [];

  return [
    ...currentHref,
    ...React.Children.toArray(rendered.props.children).flatMap((child) =>
      collectLinkHrefs(child),
    ),
  ];
}

function findText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string" || typeof rendered === "number") {
    return String(rendered) === text;
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findText(child, text),
  );
}
