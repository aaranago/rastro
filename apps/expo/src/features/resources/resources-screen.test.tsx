import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import type { ResourceProviderSummaryViewModel } from "./resources-view-model";
import { ResourceMapSelectedProvider } from "./resources-screen";

(globalThis as { React?: typeof React }).React = React;

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
  };
});

vi.mock("@legendapp/list", () => ({
  LegendList: "LegendList",
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

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
  useWindowDimensions: () => ({ height: 800, width: 390 }),
  View: "View",
}));

vi.mock("react-native-maps", () => ({
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock("./resources-default-api-adapter", () => ({
  defaultApiResourcesAdapter: {
    searchProviders: vi.fn(),
  },
}));

vi.mock("../nearby/nearby-expo-location-adapter", () => ({
  expoNearbyLocationAdapter: {},
}));

vi.mock("../maps/map-provider-config", () => ({
  getNativeMapProvider: () => "google",
  getNativeMapProviderState: () => ({ kind: "ready" }),
}));

describe("ResourceMapSelectedProvider", () => {
  it("renders sponsor badge, disclosure, and same-surface sponsor chips", () => {
    const preview = renderFunctionElement(
      React.createElement(ResourceMapSelectedProvider, {
        provider: {
          ...buildProviderViewModel(),
          isSponsored: true,
          sponsorDisclosure:
            "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
          sponsorLabel: "Directorio A",
          sponsorPlacementsForSurface: [
            {
              kind: "Local Sponsor Placement",
              label: "Directorio A",
              disclosure:
                "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
              eligibleSurfaces: ["resources_directory"],
              safetyPolicy: {
                recoveryPriority: {
                  label: "Recovery Priority",
                  canAffect: false,
                },
                pushNotifications: {
                  eligible: false,
                },
              },
            },
            {
              kind: "Local Sponsor Placement",
              label: "Directorio B",
              disclosure: "Patrocinado por aliado local.",
              eligibleSurfaces: ["resources_directory"],
              safetyPolicy: {
                recoveryPriority: {
                  label: "Recovery Priority",
                  canAffect: false,
                },
                pushNotifications: {
                  eligible: false,
                },
              },
            },
          ],
        },
      }),
    );

    expect(findText(preview, "Directorio A")).toBe(true);
    expect(findText(preview, "Directorio B")).toBe(true);
    expect(
      findText(
        preview,
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      ),
    ).toBe(true);
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function buildProviderViewModel(): ResourceProviderSummaryViewModel & {
  approximateLocation: { latitude: number; longitude: number };
} {
  return {
    id: "clinic-san-roque",
    name: "Clinica Veterinaria San Roque",
    categoryLabel: "Veterinarias",
    description: "Veterinaria local.",
    locationLabel: "Sopocachi, La Paz",
    approximateLocation: {
      label: "Sopocachi",
      latitude: -16.51,
      longitude: -68.12,
    },
    isVerified: true,
    isSponsored: false,
    sponsorPlacementsForSurface: [],
    contactLabels: [],
  };
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
