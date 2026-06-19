import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  ActivityScreen,
  openActivityHref,
  resolveActivityRouterHref,
} from "./activity-screen";

vi.mock("react", async () => {
  const actual = await vi.importActual("react");

  return {
    ...actual,
    memo: <TComponent>(component: TComponent) => component,
    useCallback: <TCallback>(callback: TCallback) => callback,
    useMemo: <TValue>(factory: () => TValue) => factory(),
  };
});

vi.mock("@legendapp/list", () => ({
  LegendList: "LegendList",
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("react-native", () => ({
  Linking: {
    openURL: () => Promise.resolve(),
  },
  Pressable: "Pressable",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

vi.mock("../shell/shell-provider", () => ({
  useRastroShell: () => ({
    session: { kind: "visitor" },
  }),
}));

describe("Activity screen links", () => {
  it("converts found report deep links to the existing found-report route", () => {
    expect(
      resolveActivityRouterHref("rastro://reportes/encontrados/found-report-1"),
    ).toBe("/reportes/encontrados/found-report-1");
  });

  it("routes signed-out auth actions in app instead of opening an external URL", () => {
    const openExternalUrl = vi.fn();
    const routerPush = vi.fn();

    openActivityHref({
      href: "rastro://auth/sign-in?returnTo=/actividad",
      openExternalUrl,
      routerPush,
    });

    expect(routerPush).toHaveBeenCalledWith("/(tabs)/(profile)");
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("routes report update links to the implemented report detail route", () => {
    const openExternalUrl = vi.fn();
    const routerPush = vi.fn();

    openActivityHref({
      href: "rastro://reportes/perdidos/lost-report-1/actualizar",
      openExternalUrl,
      routerPush,
    });

    expect(routerPush).toHaveBeenCalledWith("/reportes/perdidos/lost-report-1");
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("exposes the signed-out CTA as an enabled in-app button", () => {
    const screen = renderFunctionElement(ActivityScreen({}));
    const listProps = getElementProps<{
      ListEmptyComponent: React.ReactNode;
    }>(screen);
    const emptyState = renderFunctionElement(listProps.ListEmptyComponent);
    const button = findElement(
      emptyState,
      (element) => element.type === "Pressable",
    );

    expect(button?.props.accessibilityRole).toBe("button");
    expect(button?.props.accessibilityHint).toBe(
      "Abre el perfil para iniciar sesion o crear una cuenta.",
    );
    expect(button?.props.accessibilityState).toEqual({ disabled: false });
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function getElementProps<TProps extends ElementProps>(
  node: React.ReactNode,
): TProps {
  if (!React.isValidElement<TProps>(node)) {
    throw new Error("Expected a React element.");
  }

  return node.props;
}

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
