import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResourceProviderSummaryViewModel } from "./resources-view-model";
import type { ResourceManualLocationOption } from "./resource-location-options";
import type { ResourcesAdapter } from "./static-resources-adapter";
import { ResourceMapSelectedProvider, ResourcesScreen } from "./resources-screen";

(globalThis as { React?: typeof React }).React = React;

const reactState = vi.hoisted(() => ({
  cursor: 0,
  effectCursor: 0,
  effects: [] as {
    dependencies?: readonly unknown[];
  }[],
  pendingEffects: [] as (() => void | (() => void))[],
  refCursor: 0,
  refs: [] as { current: unknown }[],
  values: [] as unknown[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: (
      effect: () => void | (() => void),
      dependencies?: readonly unknown[],
    ) => {
      const index = reactState.effectCursor;
      reactState.effectCursor += 1;
      const previous = reactState.effects[index]?.dependencies;
      const hasChanged =
        dependencies === undefined ||
        previous === undefined ||
        dependencies.length !== previous.length ||
        dependencies.some(
          (dependency, dependencyIndex) =>
            !Object.is(dependency, previous[dependencyIndex]),
        );

      if (!hasChanged) {
        return;
      }

      reactState.effects[index] = {
        dependencies: dependencies ? [...dependencies] : undefined,
      };
      reactState.pendingEffects.push(effect);
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

vi.mock("@legendapp/list", async () => {
  const actualReact = await vi.importActual<typeof React>("react");

  return {
    LegendList: ({
      data,
      ListEmptyComponent,
      ListHeaderComponent,
      renderItem,
      ...props
    }: {
      data?: readonly unknown[];
      ListEmptyComponent?: React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      renderItem?: (props: {
        index: number;
        item: unknown;
      }) => React.ReactNode;
    }) =>
      actualReact.createElement(
        "LegendList",
        props,
        ListHeaderComponent,
        data && data.length > 0 && renderItem
          ? data.map((item, index) => renderItem({ index, item }))
          : ListEmptyComponent,
      ),
  };
});

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

beforeEach(() => {
  resetReactHarness();
});

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

describe("ResourcesScreen", () => {
  it("reveals manual search suggestions from notice actions without a route callback", async () => {
    const adapter = createResourcesAdapter();
    const props = {
      adapter,
      initialLocation: {
        kind: "denied" as const,
        label: "Ubicación desactivada",
      },
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);

    pressByText(readyScreen, "Buscar zona manual");
    const focusedScreen = renderResourcesScreen(props);

    expect(getElementByTestId(focusedScreen, "resources-location-suggestions"))
      .toBeDefined();
    expect(findText(focusedScreen, "Sopocachi, La Paz")).toBe(true);
    expect(adapter.searchProviders).toHaveBeenCalled();
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

const testManualLocationOptions = [
  {
    keywords: ["sopocachi", "la paz"],
    location: {
      coordinate: { latitude: -16.510231, longitude: -68.123881 },
      countryCode: "BO",
      kind: "manual",
      label: "Sopocachi, La Paz",
      locationCellLabel: "Sopocachi",
      manualLocationKind: "place",
    },
  },
  {
    keywords: ["equipetrol", "santa cruz"],
    location: {
      coordinate: { latitude: -17.7833, longitude: -63.1821 },
      countryCode: "BO",
      kind: "manual",
      label: "Equipetrol, Santa Cruz",
      locationCellLabel: "Equipetrol",
      manualLocationKind: "place",
    },
  },
] satisfies readonly ResourceManualLocationOption[];

function createResourcesAdapter(): ResourcesAdapter {
  return {
    getProviderProfile: vi.fn(),
    getProviderProfileDetail: vi.fn(),
    reportProvider: vi.fn(),
    searchProviders: vi.fn().mockResolvedValue([]),
  };
}

function renderResourcesScreen(
  props: React.ComponentProps<typeof ResourcesScreen>,
) {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.refCursor = 0;

  return renderFunctionElement(React.createElement(ResourcesScreen, props));
}

function resetReactHarness() {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.effects = [];
  reactState.pendingEffects = [];
  reactState.refCursor = 0;
  reactState.refs = [];
  reactState.values = [];
}

async function runPendingEffects() {
  const effects = [...reactState.pendingEffects];
  reactState.pendingEffects = [];

  for (const effect of effects) {
    effect();
  }

  await Promise.resolve();
  await Promise.resolve();
}

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

function getElementByTestId(
  node: React.ReactNode,
  testID: string,
): TestElement {
  const element = findElement(
    node,
    (candidate) => candidate.props.testID === testID,
  );

  if (!element) {
    throw new Error(`Unable to find element with testID "${testID}".`);
  }

  return element;
}

function pressByText(node: React.ReactNode, text: string) {
  const button = findElement(
    node,
    (element) => element.type === "Pressable" && findText(element, text),
  );
  const onPress = button?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(`Unable to press "${text}".`);
  }

  (onPress as () => void)();
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
    const match = findElement(child, predicate);

    if (match) {
      return match;
    }
  }

  return undefined;
}
