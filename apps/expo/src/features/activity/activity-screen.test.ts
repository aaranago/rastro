import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellSession } from "../shell/shell-model";
import {
  ActivityScreen,
  openActivityHref,
  resolveActivityRouterHref,
} from "./activity-screen";

const shellContext = vi.hoisted(() => ({
  requestAuthPrompt: vi.fn(),
  session: { kind: "visitor" } as ShellSession,
}));

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
  useRastroShell: () => shellContext,
}));

describe("Activity screen links", () => {
  beforeEach(() => {
    shellContext.requestAuthPrompt.mockReset();
    shellContext.session = { kind: "visitor" };
  });

  it("converts found report deep links to the existing found-report route", () => {
    expect(
      resolveActivityRouterHref("rastro://reportes/encontrados/found-report-1"),
    ).toBe("/reportes/encontrados/found-report-1");
  });

  it("does not resolve auth sign-in links to a Profile route", () => {
    expect(
      resolveActivityRouterHref("rastro://auth/sign-in?returnTo=/actividad"),
    ).toBeNull();
  });

  it("opens the shell auth prompt for signed-out auth actions instead of routing to Perfil", () => {
    const openAuthPrompt = vi.fn();
    const openExternalUrl = vi.fn();
    const routerPush = vi.fn();

    openActivityHref({
      href: "rastro://auth/sign-in?returnTo=/actividad",
      openAuthPrompt,
      openExternalUrl,
      routerPush,
    });

    expect(openAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/(tabs)/(activity)",
      sourceHref: "rastro://auth/sign-in?returnTo=/actividad",
    });
    expect(routerPush).not.toHaveBeenCalled();
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
      "Abre el ingreso o la creacion de cuenta.",
    );
    expect(button?.props.accessibilityState).toEqual({ disabled: false });

    const onPress = button?.props.onPress;

    if (typeof onPress !== "function") {
      throw new Error("Expected signed-out CTA to be pressable.");
    }

    (onPress as () => void)();

    expect(shellContext.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/(tabs)/(activity)",
      sourceHref: "rastro://auth/sign-in?returnTo=/actividad",
    });
  });

  it("shows an empty member Activity state instead of fixture rows for a fresh member", () => {
    shellContext.session = {
      email: "ana@example.com",
      id: "member_ana",
      kind: "member",
      name: "Ana",
    };

    const screen = renderFunctionElement(ActivityScreen({}));
    const listProps = getElementProps<{
      ListEmptyComponent: React.ReactNode;
      data: unknown[];
    }>(screen);

    expect(listProps.data).toEqual([]);
    expect(
      findText(listProps.ListEmptyComponent, "Sin actividad todavía"),
    ).toBe(true);
  });

  it("keeps Activity list recycling safe while session data changes", () => {
    const screen = renderFunctionElement(ActivityScreen({}));
    const listProps = getElementProps<{
      getItemType: (item: unknown) => string | undefined;
    }>(screen);

    expect(listProps.getItemType(undefined)).toBeUndefined();
  });

  it("ignores transient undefined list items while Activity data changes", () => {
    const screen = renderFunctionElement(ActivityScreen({}));
    const listProps = getElementProps<{
      renderItem: (props: { item: unknown }) => React.ReactNode;
    }>(screen);

    expect(listProps.renderItem({ item: undefined })).toBeNull();
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
