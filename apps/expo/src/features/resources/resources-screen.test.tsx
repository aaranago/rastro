import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResourceManualLocationOption } from "./resource-location-options";
import type { ResourceProviderSummary } from "./resource-types";
import type { ResourceProviderSummaryViewModel } from "./resources-view-model";
import type { ResourcesAdapter } from "./static-resources-adapter";
import {
  ResourceMapSelectedProvider,
  ResourcesScreen,
} from "./resources-screen";

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
const routeFocus = vi.hoisted(() => ({
  isFocused: true,
}));
const reactNativePlatform = vi.hoisted(() => ({
  OS: "ios" as "android" | "ios",
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
      renderItem?: (props: { index: number; item: unknown }) => React.ReactNode;
    }) =>
      actualReact.createElement(
        "LegendList",
        { ...props, data },
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

vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    if (routeFocus.isFocused) {
      callback();
    }
  },
}));

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Platform: reactNativePlatform,
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
  routeFocus.isFocused = true;
  reactNativePlatform.OS = "ios";
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
  it("shows stable search failure copy instead of raw API details", async () => {
    const adapter = {
      ...createResourcesAdapter(),
      searchProviders: vi
        .fn()
        .mockRejectedValue(new Error("PostGIS Backend unavailable")),
    } satisfies ResourcesAdapter;
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const errorScreen = renderResourcesScreen(props);

    expect(findText(errorScreen, "No pudimos cargar recursos")).toBe(true);
    expect(
      findText(errorScreen, "Intenta nuevamente en unos segundos."),
    ).toBe(true);
    expect(findText(errorScreen, "PostGIS")).toBe(false);
    expect(findText(errorScreen, "Backend")).toBe(false);
  });

  it("records directory sponsor impressions only after a sponsored card is viewable", async () => {
    const recordSponsorDelivery = vi
      .fn<NonNullable<ResourcesAdapter["recordSponsorDelivery"]>>()
      .mockResolvedValue({
        status: "recorded",
      });
    const adapter = {
      ...createResourcesAdapter([buildSponsoredProviderSummary()]),
      recordSponsorDelivery,
    } satisfies ResourcesAdapter;
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);
    const listProps = getElementByTestId(readyScreen, "resources-list")
      .props as {
      data: ResourceProviderSummaryViewModel[];
      onViewableItemsChanged?: (info: {
        viewableItems: {
          isViewable: boolean;
          item: ResourceProviderSummaryViewModel;
        }[];
      }) => void;
      viewabilityConfig?: {
        itemVisiblePercentThreshold?: number;
      };
    };

    expect(recordSponsorDelivery).not.toHaveBeenCalled();
    expect(listProps.viewabilityConfig).toMatchObject({
      itemVisiblePercentThreshold: 50,
    });

    const sponsoredProvider = listProps.data[0];

    if (!sponsoredProvider || !listProps.onViewableItemsChanged) {
      throw new Error(
        "Expected a sponsored provider and viewability callback.",
      );
    }

    listProps.onViewableItemsChanged({
      viewableItems: [
        {
          isViewable: true,
          item: sponsoredProvider,
        },
      ],
    });

    expect(recordSponsorDelivery).toHaveBeenCalledTimes(1);
    const deliveryInput = recordSponsorDelivery.mock.calls[0]?.[0];

    expect(deliveryInput).toEqual({
      eventType: "impression",
      idempotencyKey: deliveryInput?.idempotencyKey,
      deliveryToken: "resources-directory-delivery-token",
      providerId: "clinic-san-roque-sponsored",
      source: "resources-list",
      surface: "resources_directory",
    });
    expect(deliveryInput?.idempotencyKey).toMatch(
      /^resources:[a-z0-9-]+:list:clinic-san-roque-sponsored$/,
    );

    listProps.onViewableItemsChanged({
      viewableItems: [
        {
          isViewable: true,
          item: sponsoredProvider,
        },
      ],
    });

    expect(recordSponsorDelivery).toHaveBeenCalledTimes(1);
  });

  it("records map sponsor impressions only after the selected sponsor placement is visible", async () => {
    const recordSponsorDelivery = vi
      .fn<NonNullable<ResourcesAdapter["recordSponsorDelivery"]>>()
      .mockResolvedValue({
        status: "recorded",
      });
    const adapter = {
      ...createResourcesAdapter([buildSponsoredProviderSummary()]),
      recordSponsorDelivery,
    } satisfies ResourcesAdapter;
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      initialMode: "map" as const,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);

    expect(recordSponsorDelivery).not.toHaveBeenCalled();

    triggerLayoutByTestId(
      readyScreen,
      "resources-map-selected-sponsor-disclosure",
    );

    expect(recordSponsorDelivery).toHaveBeenCalledTimes(1);
    const deliveryInput = recordSponsorDelivery.mock.calls[0]?.[0];

    expect(deliveryInput).toEqual({
      eventType: "impression",
      idempotencyKey: deliveryInput?.idempotencyKey,
      deliveryToken: "resources-directory-delivery-token",
      providerId: "clinic-san-roque-sponsored",
      source: "resources-map",
      surface: "resources_directory",
    });
    expect(deliveryInput?.idempotencyKey).toMatch(
      /^resources:[a-z0-9-]+:map:clinic-san-roque-sponsored$/,
    );

    triggerLayoutByTestId(
      readyScreen,
      "resources-map-selected-sponsor-disclosure",
    );

    expect(recordSponsorDelivery).toHaveBeenCalledTimes(1);
  });

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

    expect(
      getElementByTestId(focusedScreen, "resources-location-suggestions"),
    ).toBeDefined();
    expect(findText(focusedScreen, "Sopocachi, La Paz")).toBe(true);
    expect(adapter.searchProviders).toHaveBeenCalled();
  });

  it("labels mode and category filters for assistive actions", async () => {
    const adapter = createResourcesAdapter();
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);

    expect(
      getElementByTestId(readyScreen, "resources-mode-list").props
        .accessibilityLabel,
    ).toBe("Lista");
    expect(
      getElementByTestId(readyScreen, "resources-mode-list").props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getElementByTestId(readyScreen, "resources-mode-map").props
        .accessibilityLabel,
    ).toBe("Mapa");
    expect(
      getElementByTestId(readyScreen, "resources-mode-map").props
        .accessibilityState,
    ).toEqual({ selected: false });
    expect(
      getElementByTestId(readyScreen, "resources-category-all").props
        .accessibilityLabel,
    ).toBe("Todos los servicios");
    expect(
      getElementByTestId(readyScreen, "resources-category-all").props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getElementByTestId(readyScreen, "resources-category-veterinary").props
        .accessibilityLabel,
    ).toBe("Veterinarias");
    expect(
      getElementByTestId(readyScreen, "resources-category-veterinary").props
        .accessibilityState,
    ).toEqual({ selected: false });

    const input = getElementByTestId(readyScreen, "resources-search-input");
    const onFocus = input.props.onFocus;

    if (typeof onFocus !== "function") {
      throw new Error("Expected resource search input to expose onFocus.");
    }

    (onFocus as () => void)();
    const focusedScreen = renderResourcesScreen(props);

    expect(
      getElementByTestId(focusedScreen, "resources-location-sopocachi-la-paz")
        .props.accessibilityLabel,
    ).toBe("Sopocachi, La Paz");
    expect(
      getElementByTestId(focusedScreen, "resources-location-sopocachi-la-paz")
        .props.accessibilityState,
    ).toEqual({ selected: true });
  });

  it("keeps category filters below Android status bars when top safe-area is unavailable", async () => {
    const adapter = createResourcesAdapter();
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);
    const list = getElementByTestId(readyScreen, "resources-list");

    expect(list.props.contentContainerStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ paddingTop: 64 })]),
    );
  });

  it("labels map provider actions for assistive navigation", async () => {
    const adapter = createResourcesAdapter([buildProviderSummary()]);
    const onOpenProvider = vi.fn();
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      initialMode: "map" as const,
      manualLocationOptions: testManualLocationOptions,
      onOpenProvider,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);

    expect(
      getElementByTestId(readyScreen, "resources-map-provider-clinic-san-roque")
        .props.accessibilityLabel,
    ).toBe("Seleccionar Clínica Veterinaria San Roque, Sopocachi, La Paz");
    expect(
      getElementByTestId(readyScreen, "resources-map-provider-clinic-san-roque")
        .props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getElementByTestId(readyScreen, "resources-map-selected-provider").props
        .accessibilityLabel,
    ).toBe("Abrir Clínica Veterinaria San Roque");

    const selectedProvider = getElementByTestId(
      readyScreen,
      "resources-map-selected-provider",
    );

    expect(
      findElement(
        selectedProvider,
        (element) => element.props.children === "Clínica Veterinaria San Roque",
      )?.props.numberOfLines,
    ).toBe(2);
    expect(
      findElement(
        selectedProvider,
        (element) => element.props.children === "Ver",
      )?.props.style,
    ).toEqual(expect.objectContaining({ alignSelf: "flex-start" }));
  });

  it("keeps provider search and the native map unmounted while the route is blurred", async () => {
    routeFocus.isFocused = false;
    const adapter = createResourcesAdapter([buildProviderSummary()]);
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      initialMode: "map" as const,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const blurredScreen = renderResourcesScreen(props);

    expect(adapter.searchProviders).not.toHaveBeenCalled();
    expect(
      findElement(
        blurredScreen,
        (element) => element.props.testID === "resources-map-panel",
      ),
    ).toBeUndefined();
  });

  it("remounts the map around a newly selected manual location", async () => {
    const adapter = createResourcesAdapter([buildProviderSummary()]);
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      initialMode: "map" as const,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);
    const initialMap = getElementByType(readyScreen, "MapView");

    pressInputByTestId(readyScreen, "resources-search-input", "onFocus");
    const focusedScreen = renderResourcesScreen(props);
    changeInputTextByTestId(
      focusedScreen,
      "resources-search-input",
      "Equipetrol",
    );
    const matchesScreen = renderResourcesScreen(props);
    pressByText(matchesScreen, "Equipetrol, Santa Cruz");
    const relocatedScreen = renderResourcesScreen(props);
    const relocatedMap = getElementByType(relocatedScreen, "MapView");

    expect(relocatedMap.key).not.toBe(initialMap.key);
    expect(relocatedMap.props.initialRegion).toEqual(
      expect.objectContaining({
        latitude: -17.7833,
        longitude: -63.1821,
      }),
    );
  });

  it("uses lightweight Android map props and markers for resource maps", async () => {
    reactNativePlatform.OS = "android";
    const adapter = createResourcesAdapter([buildProviderSummary()]);
    const props = {
      adapter,
      initialLocation: testManualLocationOptions[0]?.location,
      initialMode: "map" as const,
      manualLocationOptions: testManualLocationOptions,
    };

    void renderResourcesScreen(props);
    await runPendingEffects();
    const readyScreen = renderResourcesScreen(props);
    const map = getElementByType(readyScreen, "MapView");
    const marker = getElementByType(readyScreen, "Marker");

    expect(map.props).toMatchObject({
      liteMode: true,
      showsBuildings: false,
      showsIndoors: false,
      showsPointsOfInterest: false,
      showsTraffic: false,
      toolbarEnabled: false,
    });
    expect(marker.props).toMatchObject({
      pinColor: "#146C5A",
      tracksViewChanges: false,
    });
    expect(marker.props.children).toBeUndefined();
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

function createResourcesAdapter(
  providers: readonly ResourceProviderSummary[] = [],
): ResourcesAdapter {
  return {
    getProviderProfile: vi.fn(),
    getProviderProfileDetail: vi.fn(),
    reportProvider: vi.fn(),
    searchProviders: vi.fn().mockResolvedValue(providers),
  };
}

function buildProviderSummary(): ResourceProviderSummary {
  return {
    id: "clinic-san-roque",
    name: "Clínica Veterinaria San Roque",
    categoryId: "veterinary",
    description: "Veterinaria local.",
    approximateLocationLabel: "Sopocachi, La Paz",
    approximateLocation: {
      label: "Sopocachi",
      latitude: -16.51,
      locationCell: "Sopocachi",
      longitude: -68.12,
      precision: "approximate",
    },
    isVerified: true,
    contactOptions: [],
  };
}

function buildSponsoredProviderSummary(): ResourceProviderSummary {
  return {
    ...buildProviderSummary(),
    id: "clinic-san-roque-sponsored",
    sponsorPlacement: {
      kind: "Local Sponsor Placement",
      deliveryToken: "resources-directory-delivery-token",
      label: "Directorio local",
      disclosure: "Patrocinado: apoyo local sin afectar prioridades.",
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
  };
}

function renderResourcesScreen(
  props: React.ComponentProps<typeof ResourcesScreen>,
) {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.refCursor = 0;

  const rendered = renderFunctionElement(
    React.createElement(ResourcesScreen, props),
  );

  if (!routeFocus.isFocused) {
    return rendered;
  }

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
    name: "Clínica Veterinaria San Roque",
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

function getElementByType(node: React.ReactNode, type: string): TestElement {
  const element = findElement(node, (candidate) => candidate.type === type);

  if (!element) {
    throw new Error(`Unable to find element with type "${type}".`);
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

function triggerLayoutByTestId(node: React.ReactNode, testID: string) {
  const element = getElementByTestId(node, testID);
  const onLayout = element.props.onLayout;

  if (typeof onLayout !== "function") {
    throw new Error(`Unable to trigger layout for "${testID}".`);
  }

  (onLayout as () => void)();
}

function pressInputByTestId(
  node: React.ReactNode,
  testID: string,
  handlerName: string,
) {
  const input = getElementByTestId(node, testID);
  const handler = input.props[handlerName];

  if (typeof handler !== "function") {
    throw new Error(`Expected ${testID} to expose ${handlerName}.`);
  }

  (handler as () => void)();
}

function changeInputTextByTestId(
  node: React.ReactNode,
  testID: string,
  text: string,
) {
  const input = getElementByTestId(node, testID);
  const onChangeText = input.props.onChangeText;

  if (typeof onChangeText !== "function") {
    throw new Error(`Expected ${testID} to expose onChangeText.`);
  }

  (onChangeText as (value: string) => void)(text);
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
