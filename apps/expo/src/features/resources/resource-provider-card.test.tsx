import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { ResourceProviderCard } from "./resource-provider-card";

(globalThis as { React?: typeof React }).React = React;

const reactHookMockState = vi.hoisted(() => ({
  stateValues: [] as unknown[],
  stateSetters: [] as ReturnType<typeof vi.fn>[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useState: <TState,>(initialState: TState) => {
      const setState = vi.fn();
      const nextState =
        reactHookMockState.stateValues.length > 0
          ? (reactHookMockState.stateValues.shift() as TState)
          : initialState;

      reactHookMockState.stateSetters.push(setState);

      return [nextState, setState] as const;
    },
  };
});

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

vi.mock("../icons/safe-material-community-icon", async () => {
  const actualReact = await vi.importActual<typeof React>("react");

  return {
    SafeMaterialCommunityIcon: (props: Record<string, unknown>) =>
      actualReact.createElement("SafeMaterialCommunityIcon", props),
  };
});

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

describe("ResourceProviderCard", () => {
  it("renders public provider fields and eligible sponsor media", () => {
    const card = renderCard({
      availabilityLabel: "Abierto",
      categoryLabel: "Veterinarias",
      contactLabels: ["Llamar", "WhatsApp", "Correo"],
      description: "Veterinaria local con atencion general.",
      distanceLabel: "800 m",
      emergencyLabel: "Urgencias",
      id: "provider-1",
      imageUrl: "https://example.com/provider-logo.png",
      isSponsored: true,
      isVerified: true,
      locationLabel: "Sopocachi, La Paz",
      name: "Clinica Veterinaria San Roque",
      serviceAreaLabel: "Atiende La Paz y El Alto",
      sponsorDisclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      sponsorImageUrl: "https://example.com/sponsor-banner.png",
      sponsorLabel: "Patrocinado",
      sponsorLogoUrl: "https://example.com/sponsor-logo.png",
      onReportProvider: vi.fn(),
    });

    expect(findText(card, "Clinica Veterinaria San Roque")).toBe(true);
    expect(findText(card, "Veterinaria local con atencion general.")).toBe(
      true,
    );
    expect(findText(card, "Sopocachi, La Paz")).toBe(true);
    expect(hasTextContent(card, "Cobertura: Atiende La Paz y El Alto")).toBe(
      true,
    );
    expect(findText(card, "800 m")).toBe(true);
    expect(hasTextContent(card, "Veterinarias · Urgencias · Abierto")).toBe(
      true,
    );
    expect(findText(card, "Verificado")).toBe(true);
    expect(findText(card, "Patrocinado")).toBe(true);
    expect(
      findText(
        card,
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      ),
    ).toBe(true);
    expect(findText(card, "Llamar")).toBe(true);
    expect(findText(card, "WhatsApp")).toBe(true);
    expect(hasTextContent(card, "+1 más")).toBe(true);
    expect(findText(card, "Reportar")).toBe(true);
    expect(collectImageUris(card)).toEqual(
      expect.arrayContaining([
        "https://example.com/provider-logo.png",
        "https://example.com/sponsor-logo.png",
        "https://example.com/sponsor-banner.png",
      ]),
    );
  });

  it("omits optional fields without empty card chrome", () => {
    const card = renderCard({
      categoryLabel: "Refugios",
      contactLabels: [],
      description: "Refugio comunitario.",
      id: "provider-2",
      isSponsored: false,
      isVerified: false,
      locationLabel: "Achumani, La Paz",
      name: "Huellas Felices",
    });

    expect(findText(card, "Huellas Felices")).toBe(true);
    expect(hasTextContent(card, "Refugios")).toBe(true);
    expect(findText(card, "Cobertura:")).toBe(false);
    expect(findText(card, "Patrocinado")).toBe(false);
    expect(findText(card, "Verificado")).toBe(false);
    expect(findText(card, "Reportar")).toBe(false);
    expect(collectImageUris(card)).toEqual([]);
  });

  it("resets sponsor media failure state when a replacement URL renders", () => {
    reactHookMockState.stateValues = [
      false,
      "https://example.com/old-logo.png",
      "https://example.com/old-banner.png",
    ];
    reactHookMockState.stateSetters = [];

    const card = renderCard({
      categoryLabel: "Veterinarias",
      contactLabels: [],
      description: "Veterinaria local.",
      id: "provider-sponsored",
      isSponsored: true,
      isVerified: false,
      locationLabel: "Sopocachi, La Paz",
      name: "Clinica con sponsor",
      sponsorImageUrl: "https://example.com/new-banner.png",
      sponsorLogoUrl: "https://example.com/new-logo.png",
    });

    expect(collectImageUris(card)).toEqual(
      expect.arrayContaining([
        "https://example.com/new-logo.png",
        "https://example.com/new-banner.png",
      ]),
    );
    expect(findText(card, "Sponsor")).toBe(false);
    expect(findText(card, "Patrocinio")).toBe(false);
  });
});

type CardProps = React.ComponentProps<typeof ResourceProviderCard>;
type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function renderCard(props: CardProps) {
  return renderFunctionElement(
    React.createElement(ResourceProviderCard, props),
  );
}

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  const component = getFunctionComponent(node.type);

  if (component) {
    return renderFunctionElement(component(node.props));
  }

  return {
    ...node,
    props: {
      ...node.props,
      children: renderChildren(node.props.children),
    },
  };
}

function renderChildren(children: React.ReactNode): React.ReactNode {
  if (Array.isArray(children)) {
    return children.map(renderFunctionElement);
  }

  return renderFunctionElement(children);
}

function getFunctionComponent(type: unknown) {
  if (typeof type === "function") {
    return type as (props: ElementProps) => React.ReactNode;
  }

  if (
    typeof type === "object" &&
    type !== null &&
    "type" in type &&
    typeof (type as { type?: unknown }).type === "function"
  ) {
    return (type as { type: (props: ElementProps) => React.ReactNode }).type;
  }

  return undefined;
}

function findText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered === text;
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findText(child, text),
  );
}

function hasTextContent(node: React.ReactNode, text: string) {
  return getTextContent(node).includes(text);
}

function getTextContent(node: React.ReactNode): string {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string" || typeof rendered === "number") {
    return String(rendered);
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return "";
  }

  return React.Children.toArray(rendered.props.children)
    .map(getTextContent)
    .join("");
}

function collectImageUris(node: React.ReactNode): string[] {
  const rendered = renderFunctionElement(node);

  if (!React.isValidElement<ElementProps>(rendered)) {
    return [];
  }

  const currentUris =
    rendered.type === "Image" ? getImageSourceUri(rendered.props.source) : [];

  return [
    ...currentUris,
    ...React.Children.toArray(rendered.props.children).flatMap((child) =>
      collectImageUris(child),
    ),
  ];
}

function getImageSourceUri(source: unknown): string[] {
  if (
    typeof source === "object" &&
    source !== null &&
    typeof (source as { uri?: unknown }).uri === "string"
  ) {
    return [(source as { uri: string }).uri];
  }

  return [];
}
