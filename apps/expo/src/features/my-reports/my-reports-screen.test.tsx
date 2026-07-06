import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import type { MyReportSummary } from "./my-reports";
import { MyReportsScreen } from "./my-reports-screen";

(globalThis as { React?: typeof React }).React = React;

const forcedReports = vi.hoisted(() => ({
  value: [] as MyReportSummary[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: vi.fn(),
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useState: <TValue,>(initialValue: TValue | (() => TValue)) => {
      const value =
        typeof initialValue === "function"
          ? (initialValue as () => TValue)()
          : initialValue;

      if (
        typeof value === "object" &&
        value !== null &&
        "kind" in value &&
        value.kind === "idle"
      ) {
        return [
          {
            kind: "ready",
            reports: forcedReports.value,
          },
          vi.fn(),
        ];
      }

      return [value, vi.fn()];
    },
  };
});

const router = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("expo-router", () => ({
  useRouter: () => router,
}));

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("../app-states", () => ({
  AppStateScreen: (props: ElementProps) =>
    React.createElement("AppStateScreen", props, props.children),
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

describe("MyReportsScreen", () => {
  it("asks visitors to sign in before showing owned report management", () => {
    const onRequestSignIn = vi.fn();
    const screen = renderFunctionElement(
      <MyReportsScreen
        onRequestSignIn={onRequestSignIn}
        repository={createRepository()}
        session={{ kind: "visitor" }}
      />,
    );
    const state = findElement(
      screen,
      (element) => element.type === "AppStateScreen",
    );

    expect(state?.props.descriptor).toMatchObject({
      kind: "empty",
      title: "Mis reportes es para miembros",
    });

    const action = (
      state?.props as {
        onActionPress?: (action: { id: string }) => void;
      }
    ).onActionPress;
    action?.({ id: "sign-in" });

    expect(onRequestSignIn).toHaveBeenCalledOnce();
  });

  it("renders backend-owned reports and opens their public detail", () => {
    const onOpenReport = vi.fn();
    forcedReports.value = [createReport()];
    const screen = renderFunctionElement(
      <MyReportsScreen
        onOpenReport={onOpenReport}
        repository={createRepository()}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );

    expect(findText(screen, "Mis reportes")).toBe(true);
    expect(findText(screen, "Luna perdida en Sopocachi")).toBe(true);
    expect(findText(screen, "Activo")).toBe(true);

    pressByText(screen, "Ver");

    expect(onOpenReport).toHaveBeenCalledWith(
      "/(tabs)/(nearby)/reportes/perdidos/report-active",
    );
  });
});

function createRepository() {
  return {
    deleteReport: vi.fn(),
    listReports: vi.fn().mockResolvedValue(forcedReports.value),
    resolveReport: vi.fn(),
  };
}

function createReport(): MyReportSummary {
  return {
    availability: {
      label: "Activo",
      state: "active",
    },
    contact: {
      actions: [],
      hasWhatsapp: false,
      preference: "in_app_chat",
    },
    createdAt: new Date("2026-06-24T13:00:00.000Z"),
    description: "Luna salió de casa y puede estar asustada.",
    eventOccurredAt: new Date("2026-06-24T12:30:00.000Z"),
    id: "report-active",
    location: {
      latitude: -16.5,
      longitude: -68.12,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    media: [],
    outcome: null,
    owner: {
      isCurrentMember: true,
    },
    pet: {
      breed: "Siames",
      color: "gris",
      distinguishingTraits: null,
      name: "Luna",
      size: "mediana",
      species: "cat",
    },
    resolvedAt: null,
    status: "active",
    title: "Luna perdida en Sopocachi",
    type: "lost_pet",
    updatedAt: new Date("2026-06-24T13:20:00.000Z"),
  };
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  if (node.type === "Modal" && node.props.visible !== true) {
    return {
      ...node,
      props: {
        ...node.props,
        children: null,
      },
    };
  }

  if (typeof node.type !== "function") {
    return {
      ...node,
      props: {
        ...node.props,
        children: renderChildren(node.props.children),
      },
    };
  }

  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return renderFunctionElement(Component(node.props));
}

function renderChildren(children: React.ReactNode): React.ReactNode {
  if (Array.isArray(children)) {
    return children.map(renderFunctionElement);
  }

  return renderFunctionElement(children);
}

function findElement(
  node: React.ReactNode,
  predicate: (element: React.ReactElement<ElementProps>) => boolean,
): React.ReactElement<ElementProps> | undefined {
  if (!React.isValidElement<ElementProps>(node)) {
    return undefined;
  }

  if (predicate(node)) {
    return node;
  }

  return React.Children.toArray(node.props.children)
    .map((child) => findElement(child, predicate))
    .find(Boolean);
}

function findPressableByText(node: React.ReactNode, text: string) {
  return findElement(
    node,
    (element) => element.type === "Pressable" && findText(element, text),
  );
}

function pressByText(node: React.ReactNode, text: string) {
  const onPress = findPressableByText(node, text)?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(`No pressable found for ${text}.`);
  }

  const handlePress = onPress as () => void;
  handlePress();
}

function getDirectText(node: React.ReactNode): string {
  if (typeof node === "number" || typeof node === "string") {
    return String(node);
  }

  if (!React.isValidElement<ElementProps>(node)) {
    return "";
  }

  return React.Children.toArray(node.props.children)
    .map(getDirectText)
    .join("");
}

function findText(node: React.ReactNode, text: string): boolean {
  if (typeof node === "number" || typeof node === "string") {
    return String(node).includes(text);
  }

  if (!React.isValidElement<ElementProps>(node)) {
    return false;
  }

  if (getDirectText(node).includes(text)) {
    return true;
  }

  return React.Children.toArray(node.props.children).some((child) =>
    findText(child, text),
  );
}
