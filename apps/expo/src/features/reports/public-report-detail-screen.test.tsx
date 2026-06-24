import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import type { PublicReportDetailViewModel } from "./public-report-detail";
import { PublicReportDetailContent } from "./public-report-detail-screen";

(globalThis as { React?: typeof React }).React = React;

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
  };
});

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Linking: {
    openURL: vi.fn(),
  },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Share: {
    share: vi.fn(),
  },
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

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

describe("PublicReportDetailContent", () => {
  it("renders the report detail without exposing raw ids and wires primary actions", () => {
    const onShare = vi.fn();
    const onOpenPublicPage = vi.fn();
    const screen = renderFunctionElement(
      <PublicReportDetailContent
        onOpenPublicPage={onOpenPublicPage}
        onShare={onShare}
        viewModel={createViewModel()}
      />,
    );

    expect(findText(screen, "Se busca a Luna")).toBe(true);
    expect(findText(screen, "Mascota perdida")).toBe(true);
    expect(findText(screen, "Activo")).toBe(true);
    expect(findText(screen, "Que paso")).toBe(true);
    expect(findText(screen, "report-lost-1")).toBe(false);

    pressByText(screen, "Compartir");
    pressByText(screen, "Abrir pagina publica");

    expect(onShare).toHaveBeenCalledOnce();
    expect(onOpenPublicPage).toHaveBeenCalledOnce();
  });

  it("shows the owner guidance only for the current member", () => {
    const ownerScreen = renderFunctionElement(
      <PublicReportDetailContent viewModel={createViewModel()} />,
    );
    const visitorScreen = renderFunctionElement(
      <PublicReportDetailContent
        viewModel={createViewModel({ isCurrentMember: false })}
      />,
    );

    expect(findText(ownerScreen, "Es tu reporte")).toBe(true);
    expect(findText(visitorScreen, "Es tu reporte")).toBe(false);
  });
});

function createViewModel(
  overrides: Partial<PublicReportDetailViewModel> = {},
): PublicReportDetailViewModel {
  return {
    accentColor: "#D6453D",
    accentSoftColor: "#FBE8E6",
    contactLabel: "Chat en Rastro",
    description:
      "Se perdio cerca de la zona y puede estar asustada. Responde a su nombre.",
    descriptionTitle: "Que paso",
    eventLabel: "Perdida",
    eventValue: "24 jun 2026, 08:30",
    facts: [
      {
        iconName: "location.fill",
        label: "Ubicacion",
        value: "La Paz",
      },
    ],
    heroIconName: "megaphone.fill",
    isCurrentMember: true,
    locationLabel: "La Paz",
    locationPrivacyLabel: "Mostramos una zona aproximada por seguridad.",
    photoUrls: ["https://cdn.rastro.bo/luna.jpg"],
    publicPageLabel: "Abrir pagina publica",
    shareMessage:
      "Ayuda a encontrar a Luna en Rastro: https://rastro.bo/reportes/perdidos/report-lost-1",
    shareTitle: "Mascota perdida: Luna",
    shareUrl: "https://rastro.bo/reportes/perdidos/report-lost-1",
    statusLabel: "Activo",
    statusTone: "active",
    subtitle: "Gato · Siames",
    title: "Se busca a Luna",
    type: "lost_pet",
    typeLabel: "Mascota perdida",
    ...overrides,
  };
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
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

function findText(node: React.ReactNode, text: string): boolean {
  if (typeof node === "string") {
    return node.includes(text);
  }

  if (!React.isValidElement<ElementProps>(node)) {
    return false;
  }

  return React.Children.toArray(node.props.children).some((child) =>
    findText(child, text),
  );
}
