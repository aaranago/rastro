import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AlertSubscriptionNativeAdapter,
  AlertSubscriptionPushRegistrationResult,
} from "./alert-subscription-native-adapter";
import type {
  AlertSubscription,
  AlertSubscriptionRepository,
  AlertSubscriptionsMemberSession,
  AlertSubscriptionsSessionState,
} from "./alert-subscriptions";
import {
  AlertSubscriptionSettingsScreen,
  persistRegisteredAlertSubscriptionPushToken,
} from "./alert-subscription-settings-screen";

(globalThis as { React?: typeof React }).React = React;

const reactState = vi.hoisted(() => ({
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
  values: [] as unknown[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: (effect: () => void | (() => void)) => {
      reactState.effects.push(effect);
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
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

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Switch: "Switch",
  Text: "Text",
  View: "View",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

vi.mock("./alert-subscription-expo-native-adapter", () => ({
  expoAlertSubscriptionNativeAdapter: {},
}));

const member: AlertSubscriptionsMemberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
};

describe("AlertSubscriptionSettingsScreen backend behavior", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.effects = [];
    reactState.values = [];
  });

  it("does not persist a push token when notification permission is denied", async () => {
    const repository = createScreenRepository();

    const feedback = await persistRegisteredAlertSubscriptionPushToken({
      memberSession: member,
      pushRegistration: {
        kind: "permission-denied",
        permission: {
          canAskAgain: false,
          granted: false,
          status: "denied",
        },
      },
      repository,
    });

    expect(repository.registerPushToken).not.toHaveBeenCalled();
    expect(feedback).toMatchObject({
      tone: "warning",
    });
    expect(feedback.message).toContain("denegado");
  });

  it("does not persist a push token when EAS project id is missing", async () => {
    const repository = createScreenRepository();

    const feedback = await persistRegisteredAlertSubscriptionPushToken({
      memberSession: member,
      pushRegistration: {
        kind: "missing-project-id",
        permission: {
          canAskAgain: true,
          granted: true,
          status: "granted",
        },
      },
      repository,
    });

    expect(repository.registerPushToken).not.toHaveBeenCalled();
    expect(feedback).toEqual({
      message:
        "Tu suscripción quedó activa. Falta configurar EAS projectId para probar push real.",
      tone: "warning",
    });
  });

  it("persists Expo push token metadata after a registered native result", async () => {
    const repository = createScreenRepository();
    const pushRegistration: AlertSubscriptionPushRegistrationResult = {
      kind: "registered",
      permission: {
        canAskAgain: true,
        granted: true,
        status: "granted",
      },
      platform: "ios",
      projectId: "eas-project-id",
      token: "ExponentPushToken[abc123]",
    };

    const feedback = await persistRegisteredAlertSubscriptionPushToken({
      memberSession: member,
      pushRegistration,
      repository,
    });

    expect(repository.registerPushToken).toHaveBeenCalledWith(member, {
      permissionStatus: "granted",
      platform: "ios",
      projectId: "eas-project-id",
      token: "ExponentPushToken[abc123]",
    });
    expect(feedback).toEqual({
      message: "Suscripción activa y notificaciones listas.",
      tone: "success",
    });
  });

  it("reloads backend state on mount and exposes pause and unsubscribe actions", async () => {
    const subscription = createSubscription({ enabled: true, radiusKm: 10 });
    const repository = createScreenRepository({
      get: subscription,
      pause: createSubscription({ enabled: false, radiusKm: 10 }),
      unsubscribe: null,
    });
    const nativeAdapter = createNativeAdapter();

    let screen = renderSettingsScreen({ nativeAdapter, repository });
    runEffects();
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    expect(repository.getAlertSubscription).toHaveBeenCalledWith(member);
    expect(findText(screen, "Alertas activas")).toBe(true);
    expect(findText(screen, "Pausar alertas")).toBe(true);
    expect(findText(screen, "Dejar de recibir alertas")).toBe(true);

    await getPressableOnPress(findPressableByText(screen, "Pausar alertas"))();
    await getPressableOnPress(
      findPressableByText(screen, "Dejar de recibir alertas"),
    )();

    expect(repository.pauseAlertSubscription).toHaveBeenCalledWith(member);
    expect(repository.unsubscribeAlertSubscription).toHaveBeenCalledWith(
      member,
    );
  });

  it("keeps alerts active when native push registration is unavailable", async () => {
    const repository = createScreenRepository();
    const nativeAdapter = createNativeAdapter({
      registerForPushNotifications: vi.fn<
        AlertSubscriptionNativeAdapter["registerForPushNotifications"]
      >(() => Promise.reject(new Error("Expo push is unavailable locally."))),
    });

    let screen = renderSettingsScreen({ nativeAdapter, repository });
    runEffects();
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    await getPressableOnPress(findPressableByText(screen, "Activar alertas"))();
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    expect(repository.enableAlertSubscription).toHaveBeenCalledWith(
      member,
      expect.objectContaining({
        radiusKm: 5,
        reason: "manual-refresh",
      }),
    );
    expect(repository.registerPushToken).not.toHaveBeenCalled();
    expect(findText(screen, "Alertas activas")).toBe(true);
    expect(
      findText(
        screen,
        "Tu suscripción quedó activa, pero este dispositivo todavía no puede recibir notificaciones. Reintenta cuando los permisos o el proyecto Expo estén listos.",
      ),
    ).toBe(true);
  });

  it("does not activate alerts around a fallback location when native location is unavailable", async () => {
    const repository = createScreenRepository();
    const nativeAdapter = createNativeAdapter({
      getForegroundLocationSnapshot: vi.fn<
        AlertSubscriptionNativeAdapter["getForegroundLocationSnapshot"]
      >(() =>
        Promise.resolve({
          kind: "permission-denied",
          permission: {
            granted: false,
            precision: "unknown",
            status: "denied",
          },
        }),
      ),
    });

    let screen = renderSettingsScreen({ nativeAdapter, repository });
    runEffects();
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    await getPressableOnPress(findPressableByText(screen, "Activar alertas"))();
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    expect(repository.enableAlertSubscription).not.toHaveBeenCalled();
    expect(findText(screen, "Alertas activas")).toBe(false);
    expect(
      findText(
        screen,
        "No pudimos detectar tu ubicación. Activa ubicación o abre Rastro en el lugar donde quieres recibir alertas.",
      ),
    ).toBe(true);
  });

  it("reuses a saved backend alert area when reactivating without native location", async () => {
    const pausedSubscription = createSubscription({ enabled: false });
    const repository = createScreenRepository({
      get: pausedSubscription,
    });
    const nativeAdapter = createNativeAdapter({
      getForegroundLocationSnapshot: vi.fn<
        AlertSubscriptionNativeAdapter["getForegroundLocationSnapshot"]
      >(() =>
        Promise.resolve({
          kind: "permission-denied",
          permission: {
            granted: false,
            precision: "unknown",
            status: "denied",
          },
        }),
      ),
    });

    let screen = renderSettingsScreen({ nativeAdapter, repository });
    runEffects();
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    await getPressableOnPress(findPressableByText(screen, "Activar alertas"))();
    await flushPromises();

    const savedLocation = pausedSubscription.dynamicAlertArea?.location;
    if (!savedLocation) {
      throw new Error("Expected paused subscription to include a saved area.");
    }

    expect(repository.enableAlertSubscription).toHaveBeenCalledWith(
      member,
      {
        lastDetectedLocation: {
          ...savedLocation,
          label: "Ultima ubicacion detectada en Sopocachi",
          source: "last",
        },
        radiusKm: 5,
        reason: "manual-refresh",
      },
    );
  });

  it("persists moving-alert interest as pending background permission", async () => {
    const updatedSubscription = createSubscription({
      movingAlerts: {
        backgroundTracking: "not-started",
        enabled: true,
        label: "Alertas mientras me muevo",
        permissionState: "not-requested",
        status: "needs-background-permission",
      },
    });
    const repository = createScreenRepository({
      get: createSubscription({ enabled: true }),
      movingAlerts: updatedSubscription,
    });
    const nativeAdapter = createNativeAdapter();

    let screen = renderSettingsScreen({ nativeAdapter, repository });
    runEffects();
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    await getSwitchOnValueChange(
      findSwitchByTestId(screen, "alert-subscription-moving-alerts-switch"),
    )(true);
    await flushPromises();
    screen = renderSettingsScreen({ nativeAdapter, repository });

    expect(repository.updateMovingAlertsPreference).toHaveBeenCalledWith(
      member,
      {
        enabled: true,
        permissionState: "not-requested",
      },
    );
    expect(findText(screen, "Necesita permiso")).toBe(true);
    expect(
      findText(
        screen,
        "Guardamos tu preferencia. Falta conceder ubicación en segundo plano antes de activar seguimiento mientras te mueves.",
      ),
    ).toBe(true);
  });

  it("keeps the visitor sign-in CTA enabled instead of disabling the advertised action", () => {
    const onRequestSignIn = vi.fn();
    const repository = createScreenRepository();
    const nativeAdapter = createNativeAdapter();
    const screen = renderSettingsScreen({
      nativeAdapter,
      onRequestSignIn,
      repository,
      session: { kind: "visitor" },
    });

    expect(findText(screen, "Sesión requerida")).toBe(true);

    const signInButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.testID === "alert-subscription-enable-button",
    );

    expect(signInButton?.props.disabled).not.toBe(true);
    void getPressableOnPress(signInButton)();

    expect(onRequestSignIn).toHaveBeenCalledOnce();
    expect(repository.enableAlertSubscription).not.toHaveBeenCalled();
  });
});

function renderSettingsScreen({
  nativeAdapter,
  onRequestSignIn,
  repository,
  session = member,
}: {
  nativeAdapter: AlertSubscriptionNativeAdapter;
  onRequestSignIn?: () => void;
  repository: AlertSubscriptionRepository;
  session?: AlertSubscriptionsSessionState;
}) {
  reactState.cursor = 0;

  return renderFunctionElement(
    <AlertSubscriptionSettingsScreen
      nativeAdapter={nativeAdapter}
      onRequestSignIn={onRequestSignIn}
      repository={repository}
      session={session}
    />,
  );
}

function runEffects() {
  const effects = [...reactState.effects];
  reactState.effects = [];

  for (const effect of effects) {
    effect();
  }
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function createScreenRepository(
  overrides: Partial<{
    get: AlertSubscription | null;
    movingAlerts: AlertSubscription;
    pause: AlertSubscription;
    unsubscribe: AlertSubscription | null;
  }> = {},
) {
  const fallbackSubscription = createSubscription();

  return {
    disableAlertSubscription: vi.fn<
      AlertSubscriptionRepository["disableAlertSubscription"]
    >(() => Promise.resolve(overrides.pause ?? fallbackSubscription)),
    enableAlertSubscription: vi.fn<
      AlertSubscriptionRepository["enableAlertSubscription"]
    >(() => Promise.resolve(fallbackSubscription)),
    getAlertSubscription: vi.fn<
      AlertSubscriptionRepository["getAlertSubscription"]
    >(() =>
      Promise.resolve(overrides.get === undefined ? null : overrides.get),
    ),
    matchNewLostPetReportAlerts: vi.fn<
      AlertSubscriptionRepository["matchNewLostPetReportAlerts"]
    >(() => Promise.resolve([])),
    pauseAlertSubscription: vi.fn<
      AlertSubscriptionRepository["pauseAlertSubscription"]
    >(() => Promise.resolve(overrides.pause ?? fallbackSubscription)),
    recordAlertAreaLocation: vi.fn<
      AlertSubscriptionRepository["recordAlertAreaLocation"]
    >(() => Promise.resolve(fallbackSubscription)),
    registerPushToken: vi.fn<AlertSubscriptionRepository["registerPushToken"]>(
      () => Promise.resolve(),
    ),
    unsubscribeAlertSubscription: vi.fn<
      AlertSubscriptionRepository["unsubscribeAlertSubscription"]
    >(() =>
      Promise.resolve(
        overrides.unsubscribe === undefined ? null : overrides.unsubscribe,
      ),
    ),
    updateMovingAlertsPreference: vi.fn<
      AlertSubscriptionRepository["updateMovingAlertsPreference"]
    >(() => Promise.resolve(overrides.movingAlerts ?? fallbackSubscription)),
  } satisfies AlertSubscriptionRepository;
}

function createNativeAdapter(
  overrides: Partial<AlertSubscriptionNativeAdapter> = {},
): AlertSubscriptionNativeAdapter {
  return {
    getForegroundLocationSnapshot: vi.fn<
      AlertSubscriptionNativeAdapter["getForegroundLocationSnapshot"]
    >(() =>
      Promise.resolve({
        coordinates: {
          capturedAt: "2026-06-30T13:00:00.000Z",
          latitude: -16.5103,
          longitude: -68.1299,
        },
        kind: "available",
        permission: {
          granted: true,
          precision: "precise",
          status: "granted",
        },
        source: "current",
      }),
    ),
    registerForPushNotifications: vi.fn<
      AlertSubscriptionNativeAdapter["registerForPushNotifications"]
    >(() =>
      Promise.resolve({
        kind: "permission-denied",
        permission: {
          granted: false,
          status: "denied",
        },
      }),
    ),
    subscribeToRefreshTriggers: vi.fn(() => () => undefined),
    ...overrides,
  };
}

function createSubscription(
  overrides: Partial<AlertSubscription> = {},
): AlertSubscription {
  return {
    createdAt: "2026-06-30T13:00:00.000Z",
    dynamicAlertArea: {
      location: {
        coordinates: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        countryCode: "BO",
        detectedAt: "2026-06-30T13:01:00.000Z",
        label: "Ubicacion actual en Sopocachi",
        locationCellLabel: "Sopocachi",
        source: "current",
      },
      reason: "manual-refresh",
      resolvedAt: "2026-06-30T13:02:00.000Z",
    },
    enabled: true,
    id: "alert-subscription-1",
    locationUpdatePolicy: {
      allowedReasons: ["app-open", "foreground", "manual-refresh"],
      alwaysOnSocket: false,
      continuousPolling: false,
      locationWatcher: false,
    },
    memberId: member.memberId,
    movingAlerts: {
      backgroundTracking: "not-started",
      enabled: false,
      label: "Alertas mientras me muevo",
      permissionState: "not-requested",
      status: "off",
    },
    notifiedLostReportIds: [],
    radiusKm: 5,
    updatedAt: "2026-06-30T13:03:00.000Z",
    ...overrides,
  };
}

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

function findPressableByText(
  node: React.ReactNode,
  text: string,
): TestElement | undefined {
  return findElement(
    node,
    (element) => element.type === "Pressable" && containsText(element, text),
  );
}

function findSwitchByTestId(
  node: React.ReactNode,
  testID: string,
): TestElement | undefined {
  return findElement(
    node,
    (element) => element.type === "Switch" && element.props.testID === testID,
  );
}

function findText(node: React.ReactNode, text: string): boolean {
  return containsText(node, text);
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

function containsText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered === text;
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    containsText(child, text),
  );
}

function getPressableOnPress(element: TestElement | undefined) {
  if (!element) {
    throw new Error("Expected pressable element to exist.");
  }

  if (typeof element.props.onPress !== "function") {
    throw new Error("Expected pressable element to have an onPress handler.");
  }

  return element.props.onPress as () => Promise<void> | void;
}

function getSwitchOnValueChange(element: TestElement | undefined) {
  if (!element) {
    throw new Error("Expected switch element to exist.");
  }

  if (typeof element.props.onValueChange !== "function") {
    throw new Error("Expected switch element to have an onValueChange handler.");
  }

  return element.props.onValueChange as (enabled: boolean) => Promise<void> | void;
}
