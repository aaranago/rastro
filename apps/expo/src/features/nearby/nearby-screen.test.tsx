import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResourceProviderSummary } from "../resources";
import type { NearbyLocationAdapter } from "./nearby-location-adapter";
import type { NearbySponsorDeliveryInput } from "./nearby-screen";
import type {
  NearbyLocationState,
  NearbyLostReportsAdapter,
  NearbyLostReportsResult,
  NearbySearchLocation,
} from "./nearby-types";
import { NearbyScreen } from "./nearby-screen";

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

const reactNativeMocks = vi.hoisted(() => ({
  share: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    memo: <TComponent,>(component: TComponent) => component,
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

vi.mock("@legendapp/list", () => ({
  LegendList: "LegendList",
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  FlatList: "FlatList",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Share: {
    share: reactNativeMocks.share,
  },
  StyleSheet: {
    absoluteFillObject: {},
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock("../maps/location-picker-map", () => ({
  ManualLocationPickerMap: "ManualLocationPickerMap",
}));

vi.mock("../maps/map-provider-config", () => ({
  getNativeMapProviderState: () => ({ kind: "ready" }),
}));

vi.mock("../maps/report-map", () => ({
  ReportMap: "ReportMap",
}));

vi.mock("./nearby-expo-location-adapter", () => ({
  expoNearbyLocationAdapter: {
    resolveForegroundLocation: vi.fn(),
  },
}));

describe("NearbyScreen launch sponsor banner", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.effectCursor = 0;
    reactState.effects = [];
    reactState.pendingEffects = [];
    reactState.refCursor = 0;
    reactState.refs = [];
    reactState.values = [];
  });

  it("renders an active launch_home_banner sponsor and records impression and open delivery", async () => {
    const adapter = createNearbyLostReportsAdapter();
    const onOpenSponsorProvider = vi.fn<(providerId: string) => void>();
    const onRecordSponsorDelivery =
      vi.fn<(input: NearbySponsorDeliveryInput) => void>();
    const sponsorProvider = createLaunchSponsorProvider();
    const secondSponsorProvider = createLaunchSponsorProvider({
      id: "22222222-2222-4222-8222-222222222222",
      imageUrl: "https://example.com/sponsor-patitas-launch.png",
      name: "Patitas La Paz",
    });
    const screen = renderNearbyScreen({
      adapter,
      launchSponsorProviders: [sponsorProvider, secondSponsorProvider],
      onOpenSponsorProvider,
      onRecordSponsorDelivery,
    });

    expect(findText(screen, "Patrocinadores locales")).toBe(true);
    expect(findText(screen, "Patrocinado")).toBe(true);
    expect(findText(screen, "Clínica Veterinaria San Roque")).toBe(true);
    expect(findText(screen, "Patitas La Paz")).toBe(true);
    expect(
      findText(
        screen,
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      ),
    ).toBe(true);
    expect(
      findElement(
        screen,
        (element) =>
          element.type === "Image" &&
          element.props.source !== null &&
          typeof element.props.source === "object" &&
          "uri" in element.props.source &&
          element.props.source.uri ===
            "https://example.com/sponsor-san-roque-launch.png",
      ),
    ).toBeDefined();

    await runPendingEffects();

    expect(onRecordSponsorDelivery).not.toHaveBeenCalled();

    const sponsorList = findElement(
      screen,
      (element) => element.props.testID === "nearby-launch-sponsor-list",
    );
    recordVisibleSponsorItems(sponsorList, [0]);

    expect(onRecordSponsorDelivery).toHaveBeenCalledTimes(1);
    const impressionDelivery = getSponsorDeliveryCall(
      onRecordSponsorDelivery,
      0,
    );
    const expectedDeliveryToken =
      "launch-home-11111111-1111-4111-8111-111111111111-delivery-token";

    expect(impressionDelivery).toEqual({
      deliveryToken: expectedDeliveryToken,
      eventType: "impression",
      idempotencyKey: impressionDelivery.idempotencyKey,
      providerId: "11111111-1111-4111-8111-111111111111",
      source: "nearby-launch-banner",
      surface: "launch_home_banner",
    });
    expect(expectString(impressionDelivery.idempotencyKey)).toMatch(
      /^launch-home:[^:]+:11111111-1111-4111-8111-111111111111:impression$/,
    );

    recordVisibleSponsorItems(sponsorList, [0]);

    expect(onRecordSponsorDelivery).toHaveBeenCalledTimes(1);

    recordVisibleSponsorItems(sponsorList, [1]);

    expect(onRecordSponsorDelivery).toHaveBeenCalledTimes(2);
    const secondImpressionDelivery = getSponsorDeliveryCall(
      onRecordSponsorDelivery,
      1,
    );

    expect(secondImpressionDelivery).toEqual({
      deliveryToken:
        "launch-home-22222222-2222-4222-8222-222222222222-delivery-token",
      eventType: "impression",
      idempotencyKey: secondImpressionDelivery.idempotencyKey,
      providerId: "22222222-2222-4222-8222-222222222222",
      source: "nearby-launch-banner",
      surface: "launch_home_banner",
    });
    expect(expectString(secondImpressionDelivery.idempotencyKey)).toMatch(
      /^launch-home:[^:]+:22222222-2222-4222-8222-222222222222:impression$/,
    );

    const rerenderedScreen = renderNearbyScreen({
      adapter,
      launchSponsorProviders: [sponsorProvider, secondSponsorProvider],
      onOpenSponsorProvider,
      onRecordSponsorDelivery,
    });

    await runPendingEffects();

    expect(onRecordSponsorDelivery).toHaveBeenCalledTimes(2);

    const sponsorCard = findElement(
      rerenderedScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel ===
          "Abrir patrocinador Clínica Veterinaria San Roque",
    );
    const onPress = sponsorCard?.props.onPress;

    if (typeof onPress !== "function") {
      throw new Error("Expected launch sponsor card to be pressable.");
    }

    (onPress as () => void)();

    expect(onRecordSponsorDelivery).toHaveBeenCalledTimes(3);
    const openDelivery = getSponsorDeliveryCall(onRecordSponsorDelivery, 2);
    expect(openDelivery).toEqual({
      deliveryToken: expectedDeliveryToken,
      eventType: "open",
      idempotencyKey: openDelivery.idempotencyKey,
      providerId: "11111111-1111-4111-8111-111111111111",
      source: "nearby-launch-banner",
      surface: "launch_home_banner",
    });
    expect(expectString(openDelivery.idempotencyKey)).toMatch(
      /^launch-home:[^:]+:11111111-1111-4111-8111-111111111111:open$/,
    );
    expect(onOpenSponsorProvider).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("NearbyScreen report actions", () => {
  beforeEach(() => {
    resetReactHarness();
    reactNativeMocks.share.mockReset();
  });

  it("shows stable load failure copy instead of raw adapter details", async () => {
    const adapter = {
      searchLostPetReports: vi
        .fn()
        .mockRejectedValue(new Error("PostGIS Backend unavailable")),
    };

    void renderNearbyScreen({ adapter });
    await runPendingEffects();
    const screen = renderNearbyScreen({ adapter });

    expect(
      findText(screen, "No pudimos cargar los reportes. Intenta nuevamente."),
    ).toBe(true);
    expect(findText(screen, "PostGIS")).toBe(false);
    expect(findText(screen, "Backend")).toBe(false);
  });

  it("surfaces list-card share failures in the header feedback", async () => {
    reactNativeMocks.share.mockRejectedValue(new Error("share blocked"));
    const adapter = createNearbyLostReportsAdapter(
      createNearbyResultWithReport(),
    );
    const onShareReport = vi.fn<(reportId: string) => void>();

    void renderNearbyScreen({
      adapter,
      onShareReport,
    });
    await runPendingEffects();
    let screen = renderNearbyScreen({
      adapter,
      onShareReport,
    });

    pressByAccessibilityLabel(screen, "Compartir Bruno");
    await flushPromises();
    screen = renderNearbyScreen({
      adapter,
      onShareReport,
    });

    expect(onShareReport).toHaveBeenCalledWith("lost-bruno");
    expect(
      findText(screen, "No pudimos compartir el reporte. Intenta de nuevo."),
    ).toBe(true);
  });

  it("keeps share and report actions available in map mode", async () => {
    reactNativeMocks.share.mockRejectedValue(new Error("share blocked"));
    const adapter = createNearbyLostReportsAdapter(
      createNearbyResultWithReport(),
    );
    const onReport = vi.fn();
    const onShareReport = vi.fn<(reportId: string) => void>();

    void renderNearbyScreen({
      adapter,
      initialMode: "map",
      onReport,
      onShareReport,
    });
    await runPendingEffects();
    let screen = renderNearbyScreen({
      adapter,
      initialMode: "map",
      onReport,
      onShareReport,
    });

    expect(
      findElement(
        screen,
        (element) => element.props.testID === "nearby-map-report-actions",
      ),
    ).toBeDefined();

    pressByAccessibilityLabel(screen, "Reportar Bruno");
    pressByAccessibilityLabel(screen, "Compartir Bruno");
    await flushPromises();
    screen = renderNearbyScreen({
      adapter,
      initialMode: "map",
      onReport,
      onShareReport,
    });

    expect(onReport).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "/reportes/perdidos/lost-bruno",
        id: "lost-bruno",
        reportKind: "lost-pet-report",
      }),
    );
    expect(onShareReport).toHaveBeenCalledWith("lost-bruno");
    expect(
      findText(screen, "No pudimos compartir el reporte. Intenta de nuevo."),
    ).toBe(true);
  });
});

describe("NearbyScreen current location actions", () => {
  beforeEach(() => {
    resetReactHarness();
  });

  it("maps rejected current-location attempts to manual fallback without leaking the throw", async () => {
    const adapter = createNearbyLostReportsAdapter();
    const locationAdapter = createNearbyLocationAdapterBoundary();
    const rejectedLocation =
      createDeferred<
        Awaited<ReturnType<NearbyLocationAdapter["resolveForegroundLocation"]>>
      >();

    locationAdapter.resolveForegroundLocation.mockReturnValueOnce(
      rejectedLocation.promise,
    );

    void renderNearbyScreen({
      adapter,
      locationAdapter,
      manualLocationOptions,
    });
    await runPendingEffects();
    let screen = renderNearbyScreen({
      adapter,
      locationAdapter,
      manualLocationOptions,
    });

    pressByAccessibilityLabel(screen, "Cambiar ubicación de búsqueda");
    screen = renderNearbyScreen({
      adapter,
      locationAdapter,
      manualLocationOptions,
    });

    const currentLocationPress = getPressableOnPress(
      findElement(
        screen,
        (element) => element.props.testID === "nearby-use-current-location",
      ),
    );
    const currentLocationAttempt = currentLocationPress();

    screen = renderNearbyScreen({
      adapter,
      locationAdapter,
      manualLocationOptions,
    });

    expect(findText(screen, "Buscando ubicación")).toBe(true);

    rejectedLocation.reject(new Error("native location failed"));

    await expect(currentLocationAttempt).resolves.toBeUndefined();

    screen = renderNearbyScreen({
      adapter,
      locationAdapter,
      manualLocationOptions,
    });

    expect(locationAdapter.resolveForegroundLocation).toHaveBeenCalledWith({
      requestPermission: true,
    });
    expect(findText(screen, "Ubicación no disponible")).toBe(true);
    expect(
      findText(
        screen,
        "Usa una ciudad, zona o punto en el mapa en Bolivia para ver reportes cercanos.",
      ),
    ).toBe(true);
    expect(findText(screen, "Buscando ubicación")).toBe(false);
    expect(findText(screen, "La Paz")).toBe(true);
    expect(findText(screen, "Elegir punto en el mapa")).toBe(true);
    expect(
      findElement(
        screen,
        (element) =>
          element.type === "Pressable" && findText(element, "La Paz"),
      ),
    ).toBeDefined();
  });
});

type NearbyScreenTestProps = React.ComponentProps<typeof NearbyScreen>;

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function renderNearbyScreen(
  props: Omit<NearbyScreenTestProps, "initialLocationState"> & {
    initialLocationState?: NearbyLocationState;
  },
) {
  reactState.cursor = 0;
  reactState.effectCursor = 0;
  reactState.refCursor = 0;

  return renderTree(
    <NearbyScreen
      initialLocationState={readyLocationState}
      manualLocationOptions={[]}
      {...props}
    />,
  );
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

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function createNearbyLostReportsAdapter(
  result: NearbyLostReportsResult = emptyNearbyResult,
): NearbyLostReportsAdapter {
  return {
    searchLostPetReports: vi.fn().mockResolvedValue(result),
  };
}

function createNearbyLocationAdapterBoundary() {
  return {
    resolveForegroundLocation:
      vi.fn<NearbyLocationAdapter["resolveForegroundLocation"]>(),
  };
}

function createNearbyResultWithReport(): NearbyLostReportsResult {
  return {
    ...emptyNearbyResult,
    reports: [
      {
        alertPriority: "urgent",
        coordinates: {
          latitude: -16.501,
          longitude: -68.121,
        },
        id: "lost-bruno",
        lastSeenAtLabel: "Hoy, 09:00",
        lastSeenSummary: "Visto cerca de la plaza.",
        locationCellLabel: "Sopocachi",
        petName: "Bruno",
        publicLocation: {
          kind: "approximate",
        },
        reportKind: "lost-pet-report",
        shareTarget: {
          appDeepLink: "rastro://reportes/perdidos/lost-bruno",
          message: "Ayuda a encontrar a Bruno en Rastro.",
          path: "/reportes/perdidos/lost-bruno",
          title: "Mascota perdida: Bruno",
          webUrl: "https://rastro.bo/reportes/perdidos/lost-bruno",
        },
        species: "Perro",
      },
    ],
  };
}

function createLaunchSponsorProvider(
  overrides: Partial<{
    id: string;
    imageUrl: string;
    name: string;
  }> = {},
): ResourceProviderSummary {
  const id = overrides.id ?? "11111111-1111-4111-8111-111111111111";
  const imageUrl =
    overrides.imageUrl ?? "https://example.com/sponsor-san-roque-launch.png";
  const name = overrides.name ?? "Clínica Veterinaria San Roque";
  const deliveryToken = `launch-home-${id}-delivery-token`;

  return {
    activeSponsorPlacements: [
      {
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        deliveryToken,
        eligibleSurfaces: ["launch_home_banner"],
        imageUrl,
        kind: "Local Sponsor Placement",
        label: "Patrocinado",
        logoUrl: "https://example.com/sponsor-san-roque-logo.png",
        safetyPolicy: {
          pushNotifications: {
            eligible: false,
          },
          recoveryPriority: {
            canAffect: false,
            label: "Recovery Priority",
          },
        },
      },
    ],
    approximateLocationLabel: "Sopocachi, La Paz",
    categoryId: "veterinary",
    contactOptions: [],
    description: "Atención veterinaria local para familias con mascotas.",
    id,
    name,
    photoUrl: "https://example.com/sponsor-san-roque-photo.png",
  };
}

function renderTree(node: React.ReactNode): React.ReactNode {
  if (isReactNodeArray(node)) {
    return node.map(renderTree);
  }

  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  const component = getFunctionComponent(node.type);

  if (component) {
    return renderTree(component(node.props));
  }

  const children = getRenderableChildren(node).map(renderTree);

  return React.cloneElement(node, undefined, ...children);
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

function getRenderableChildren(element: TestElement) {
  const children: React.ReactNode[] = [
    ...React.Children.toArray(element.props.children),
  ];

  if (element.type === "LegendList") {
    const props = element.props as ElementProps & {
      data?: readonly unknown[];
      ListEmptyComponent?: React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      renderItem?: (input: { index: number; item: unknown }) => React.ReactNode;
    };

    if (props.ListHeaderComponent) {
      appendRenderableChild(children, props.ListHeaderComponent);
    }

    if (props.data?.length && typeof props.renderItem === "function") {
      props.data.forEach((item, index) => {
        appendRenderableChild(children, props.renderItem?.({ index, item }));
      });
    }

    if (props.data?.length === 0 && props.ListEmptyComponent) {
      appendRenderableChild(children, props.ListEmptyComponent);
    }
  }

  if (element.type === "FlatList") {
    const props = element.props as ElementProps & {
      data?: readonly unknown[];
      renderItem?: (input: { index: number; item: unknown }) => React.ReactNode;
    };

    if (props.data?.length && typeof props.renderItem === "function") {
      props.data.forEach((item, index) => {
        appendRenderableChild(children, props.renderItem?.({ index, item }));
      });
    }
  }

  return children;
}

function appendRenderableChild(
  children: React.ReactNode[],
  child: React.ReactNode,
) {
  if (child === null || child === undefined || typeof child === "boolean") {
    return;
  }

  children.push(child);
}

function findElement(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement | undefined {
  const elements = findElements(node, predicate);

  return elements[0];
}

function findElements(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement[] {
  if (isReactNodeArray(node)) {
    return node.flatMap((child) => findElements(child, predicate));
  }

  if (!React.isValidElement<ElementProps>(node)) {
    return [];
  }

  const ownMatch = predicate(node) ? [node] : [];
  const childMatches = React.Children.toArray(node.props.children).flatMap(
    (child) => findElements(child, predicate),
  );

  return [...ownMatch, ...childMatches];
}

function findText(node: React.ReactNode, text: string): boolean {
  if (isReactNodeArray(node)) {
    return node.some((child) => findText(child, text));
  }

  if (typeof node === "string") {
    return node.includes(text);
  }

  if (typeof node === "number") {
    return String(node).includes(text);
  }

  if (!React.isValidElement<ElementProps>(node)) {
    return false;
  }

  return React.Children.toArray(node.props.children).some((child) =>
    findText(child, text),
  );
}

function pressByAccessibilityLabel(
  node: React.ReactNode,
  accessibilityLabel: string,
) {
  const target = findElement(
    node,
    (element) => element.props.accessibilityLabel === accessibilityLabel,
  );
  const onPress = target?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(`Expected pressable ${accessibilityLabel}.`);
  }

  (onPress as () => void)();
}

function getPressableOnPress(element: TestElement | undefined) {
  const onPress = element?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error("Expected Pressable onPress handler.");
  }

  return onPress as () => Promise<void> | void;
}

function createDeferred<TValue>() {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function isReactNodeArray(node: React.ReactNode): node is React.ReactNode[] {
  return Array.isArray(node);
}

function getSponsorDeliveryCall(
  mock: ReturnType<typeof vi.fn<(input: NearbySponsorDeliveryInput) => void>>,
  index: number,
) {
  const input = mock.mock.calls[index]?.[0];

  if (!input) {
    throw new Error(`Expected sponsor delivery call ${index + 1}.`);
  }

  return input;
}

function recordVisibleSponsorItems(
  sponsorList: TestElement | undefined,
  indices: number[],
) {
  const onViewableItemsChanged = sponsorList?.props.onViewableItemsChanged;
  const data = sponsorList?.props.data;

  if (!isUnknownArray(data) || typeof onViewableItemsChanged !== "function") {
    throw new Error("Expected sponsor FlatList viewability callback.");
  }

  const recordViewability =
    onViewableItemsChanged as SponsorViewabilityCallback;

  recordViewability({
    changed: [],
    viewableItems: indices.map((index) => ({
      index,
      isViewable: true,
      item: data[index],
      key: String(index),
    })),
  });
}

type SponsorViewabilityCallback = (input: {
  changed: unknown[];
  viewableItems: {
    index: number;
    isViewable: boolean;
    item: unknown;
    key: string;
  }[];
}) => void;

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function expectString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Expected value to be a string.");
  }

  return value;
}

const readyLocationState: NearbyLocationState = {
  kind: "ready",
  location: {
    coordinates: {
      latitude: -16.5,
      longitude: -68.1193,
    },
    countryCode: "BO",
    label: "La Paz",
    locationCellLabel: "Sopocachi",
    source: "manual",
  },
};

const manualLocationOptions = [
  {
    coordinates: {
      latitude: -16.5,
      longitude: -68.1193,
    },
    countryCode: "BO",
    department: "La Paz",
    label: "La Paz",
    locationCellLabel: "La Paz",
    manualLocationKind: "place",
    municipality: "La Paz",
    source: "manual",
  },
  {
    countryCode: "BO",
    label: "Elegir punto en el mapa",
    locationCellLabel: "Punto elegido",
    manualLocationKind: "map-pin",
    source: "manual",
  },
] as const satisfies readonly NearbySearchLocation[];

const emptyNearbyResult: NearbyLostReportsResult = {
  generatedAt: "2026-07-01T12:00:00.000Z",
  query: {
    categories: [
      "lost-pet-report",
      "found-pet-report",
      "sighting-report",
      "adoption-listing",
    ],
    location: readyLocationState.location,
    radiusKm: 5,
  },
  reports: [],
  searchBoundary: {
    center: readyLocationState.location,
    engine: "rastro-postgis-radius",
    owner: "rastro",
    publicLocationPrecision: "location-cell",
    radiusKm: 5,
  },
};
