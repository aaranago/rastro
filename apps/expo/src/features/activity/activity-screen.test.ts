import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellSession } from "../shell/shell-model";
import type { ActivityInbox, ActivityRepository } from "./activity-model";
import type { ActivityScreenProps } from "./activity-screen";
import {
  ActivityScreen,
  openActivityHref,
  resolveActivityRouterHref,
} from "./activity-screen";

(globalThis as { React?: typeof React }).React = React;

const reactState = vi.hoisted(() => ({
  cursor: 0,
  effectCursor: 0,
  effects: [] as {
    dependencies?: readonly unknown[];
  }[],
  pendingEffects: [] as (() => void | (() => void))[],
  values: [] as unknown[],
}));

const shellContext = vi.hoisted(() => ({
  requestAuthPrompt: vi.fn(),
  session: { kind: "visitor" } as ShellSession,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    memo: <TComponent>(component: TComponent) => component,
    useCallback: <TCallback>(callback: TCallback) => callback,
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
    useMemo: <TValue>(factory: () => TValue) => factory(),
    useState: <TValue>(initialValue: TValue | (() => TValue)) => {
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

vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
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

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

vi.mock("../shell/shell-provider", () => ({
  useRastroShell: () => shellContext,
}));

describe("Activity screen links", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.effectCursor = 0;
    reactState.effects = [];
    reactState.pendingEffects = [];
    reactState.values = [];
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

  it("exposes the signed-out CTA as an enabled in-app button without loading the inbox", async () => {
    const repository = createScreenRepository();
    const screen = renderActivityScreen({ repository });
    const listProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
    }>(screen);
    const emptyState = renderFunctionElement(listProps.ListEmptyComponent);
    const button = findElement(
      emptyState,
      (element) => element.type === "Pressable",
    );

    expect(button?.props.accessibilityRole).toBe("button");
    expect(button?.props.accessibilityHint).toBe(
      "Abre el ingreso o la creación de cuenta.",
    );
    expect(button?.props.accessibilityState).toEqual({ disabled: false });

    const onPress = button?.props.onPress;

    if (typeof onPress !== "function") {
      throw new Error("Expected signed-out CTA to be pressable.");
    }

    (onPress as () => void)();
    await runPendingEffects();

    expect(shellContext.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/(tabs)/(activity)",
      sourceHref: "rastro://auth/sign-in?returnTo=%2Factividad",
    });
    expect(repository.getInbox).not.toHaveBeenCalled();
  });

  it("uses a route-specific auth return target for focused profile activity screens", async () => {
    const repository = createScreenRepository();
    const screen = renderActivityScreen({
      authReturnToPath: "/mis-reportes",
      focus: "reports",
      repository,
    });
    const listProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
    }>(screen);
    const emptyState = renderFunctionElement(listProps.ListEmptyComponent);
    const button = findElement(
      emptyState,
      (element) => element.type === "Pressable",
    );
    const onPress = button?.props.onPress;

    if (typeof onPress !== "function") {
      throw new Error("Expected signed-out CTA to be pressable.");
    }

    (onPress as () => void)();
    await runPendingEffects();

    expect(shellContext.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/mis-reportes",
      sourceHref:
        "rastro://auth/sign-in?returnTo=%2Fmis-reportes",
    });
    expect(repository.getInbox).not.toHaveBeenCalled();
  });

  it("shows a loading state while member Activity is loading", async () => {
    shellContext.session = createMemberSession();
    const pendingInbox = createDeferred<ActivityInbox>();
    const repository = createScreenRepository(pendingInbox.promise);

    void renderActivityScreen({ repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ repository });
    const listProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
      data: unknown[];
    }>(screen);

    expect(listProps.data).toEqual([]);
    expect(findText(listProps.ListEmptyComponent, "Cargando actividad")).toBe(
      true,
    );
  });

  it("shows an empty member Activity state when the backend inbox is empty", async () => {
    shellContext.session = createMemberSession();
    const onOpenHref = vi.fn();
    const repository = createScreenRepository();

    void renderActivityScreen({ onOpenHref, repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ onOpenHref, repository });
    const listProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
      data: unknown[];
    }>(screen);
    const emptyAction = findElement(
      listProps.ListEmptyComponent,
      (element) => element.props.testID === "activity-empty-action",
    );

    expect(repository.getInbox).toHaveBeenCalledWith({});
    expect(listProps.data).toEqual([]);
    expect(
      findText(listProps.ListEmptyComponent, "Sin actividad todavía"),
    ).toBe(true);
    expect(findText(listProps.ListEmptyComponent, "Ver reportes cercanos")).toBe(
      true,
    );

    const onPress = emptyAction?.props.onPress;

    if (typeof onPress !== "function") {
      throw new Error("Expected empty Activity CTA to be pressable.");
    }

    (onPress as () => void)();
    expect(onOpenHref).toHaveBeenCalledWith("/(tabs)/(nearby)");
  });

  it("renders backend alert and chat rows with stable testIDs", async () => {
    shellContext.session = createMemberSession();
    const repository = createScreenRepository(
      Promise.resolve({
        alertDeliveries: [
          {
            body: "Toby fue reportado cerca de Sopocachi.",
            deliveryId: "alert-delivery-1",
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "activity-alert-1",
            occurredAt: "2026-06-30T13:00:00.000Z",
            reportId: "lost-report-1",
            status: "delivered",
            title: "Mascota perdida cerca de ti",
          },
        ],
        candidateMatches: [],
        chatSummaries: [
          {
            conversationId: "chat-conversation-1",
            href: "rastro://chats/chat-conversation-1",
            id: "activity-chat-1",
            lastMessage: {
              authorLabel: "Diego",
              id: "chat-message-1",
              text: "Lo vi cerca de la plaza.",
            },
            occurredAt: "2026-06-30T13:04:00.000Z",
            otherParticipant: {
              displayName: "Diego",
              memberId: "member-diego",
            },
            subject: {
              href: "rastro://reportes/perdidos/lost-report-1",
              id: "lost-report-1",
              kind: "lost-pet-report",
              subtitle: "Sopocachi",
              title: "Toby",
            },
          },
        ],
        moderationEvents: [],
        reportUpdates: [],
      }),
    );

    void renderActivityScreen({ repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ repository });
    const listProps = getLegendListProps<{
      data: Record<string, unknown>[];
    }>(screen);

    expect(listProps.data).toEqual([
      expect.objectContaining({
        testID: "activity-section-nearby-alerts",
        title: "Historial de alertas",
      }),
      expect.objectContaining({
        body: "Toby fue reportado cerca de Sopocachi.",
        testID: "activity-item-alert-lost-report-1",
      }),
      expect.objectContaining({
        testID: "activity-section-chats",
        title: "Mensajes",
      }),
      expect.objectContaining({
        body: "Diego: Lo vi cerca de la plaza.",
        testID: "activity-item-chat-chat-conversation-1",
      }),
    ]);
  });

  it("renders backend candidate match rows with candidate report actions", async () => {
    shellContext.session = createMemberSession();
    const repository = createScreenRepository(
      Promise.resolve({
        alertDeliveries: [],
        candidateMatches: [
          {
            candidate: {
              href: "rastro://reportes/encontrados/found-report-1",
              id: "found-report-1",
              kind: "found-pet-report",
              title: "Perro encontrado en Sopocachi",
            },
            confidence: "possible",
            createdAt: "2026-06-30T13:02:00.000Z",
            id: "match:lost-report-1:found-report-1",
            locationLabel: "Sopocachi, La Paz",
            ownedReport: {
              href: "rastro://reportes/perdidos/lost-report-1",
              id: "lost-report-1",
              title: "Toby",
            },
          },
        ],
        chatSummaries: [],
        moderationEvents: [],
        reportUpdates: [],
      }),
    );

    void renderActivityScreen({ repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ repository });
    const listProps = getLegendListProps<{
      data: Record<string, unknown>[];
    }>(screen);

    expect(listProps.data).toEqual([
      expect.objectContaining({
        testID: "activity-section-candidate-matches",
        title: "Coincidencias",
      }),
      expect.objectContaining({
        actionLabel: "Revisar coincidencia",
        body: "Perro encontrado en Sopocachi podría coincidir con Toby.",
        href: "rastro://reportes/encontrados/found-report-1",
        testID: "activity-item-match-match:lost-report-1:found-report-1",
      }),
    ]);
  });

  it("renders backend report update and moderation sections with report links", async () => {
    shellContext.session = createMemberSession();
    const repository = createScreenRepository(
      Promise.resolve({
        alertDeliveries: [],
        candidateMatches: [],
        chatSummaries: [],
        moderationEvents: [
          {
            action: "hide",
            adminId: "member-admin",
            id: "moderation-event-1",
            note: "Ubicación sensible.",
            occurredAt: "2026-06-30T13:06:00.000Z",
            reason: "Ubicación exacta expuesta",
            report: {
              availability: "hidden",
              href: "rastro://reportes/perdidos/lost-report-1",
              id: "lost-report-1",
              kind: "lost-pet-report",
              outcome: null,
              status: "active",
              title: "Toby",
              type: "lost_pet",
            },
          },
        ],
        reportUpdates: [
          {
            actorMemberId: "member_ana",
            eventType: "resolved",
            fromStatus: "active",
            id: "report-update-1",
            note: null,
            occurredAt: "2026-06-30T13:05:00.000Z",
            outcome: "reunited",
            report: {
              availability: "available",
              href: "rastro://reportes/perdidos/lost-report-1",
              id: "lost-report-1",
              kind: "lost-pet-report",
              outcome: "reunited",
              status: "closed",
              title: "Toby",
              type: "lost_pet",
            },
            toStatus: "closed",
          },
        ],
      }),
    );

    void renderActivityScreen({ repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ repository });
    const listProps = getLegendListProps<{
      data: Record<string, unknown>[];
    }>(screen);

    expect(listProps.data).toEqual([
      expect.objectContaining({
        testID: "activity-section-report-updates",
        title: "Actualizaciones",
      }),
      expect.objectContaining({
        body: "Resultado registrado: Reunida.",
        href: "rastro://reportes/perdidos/lost-report-1",
        testID: "activity-item-report-update-report-update-1",
      }),
      expect.objectContaining({
        testID: "activity-section-moderation-events",
        title: "Moderación",
      }),
      expect.objectContaining({
        body: "El equipo retiró temporalmente este reporte: Ubicación exacta expuesta.",
        href: "/mis-reportes",
        testID: "activity-item-moderation-moderation-event-1",
      }),
    ]);
  });

  it("renders the report-focused Activity screen with report updates only", async () => {
    shellContext.session = createMemberSession();
    const repository = createScreenRepository(
      Promise.resolve(createMixedActivityInbox()),
    );

    void renderActivityScreen({ focus: "reports", repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ focus: "reports", repository });
    const listProps = getLegendListProps<{
      ListHeaderComponent: React.ReactNode;
      data: Record<string, unknown>[];
    }>(screen);

    expect(findText(listProps.ListHeaderComponent, "Mis reportes")).toBe(true);
    expect(listProps.data.map((item) => item.testID)).toEqual([
      "activity-section-report-updates",
      "activity-item-report-update-report-update-1",
    ]);
  });

  it("renders the conversation-focused Activity screen with chats only", async () => {
    shellContext.session = createMemberSession();
    const repository = createScreenRepository(
      Promise.resolve(createMixedActivityInbox()),
    );

    void renderActivityScreen({ focus: "conversations", repository });
    await runPendingEffects();
    const screen = renderActivityScreen({
      focus: "conversations",
      repository,
    });
    const listProps = getLegendListProps<{
      ListHeaderComponent: React.ReactNode;
      data: Record<string, unknown>[];
    }>(screen);

    expect(findText(listProps.ListHeaderComponent, "Mis conversaciones")).toBe(
      true,
    );
    expect(listProps.data.map((item) => item.testID)).toEqual([
      "activity-section-chats",
      "activity-item-chat-chat-conversation-1",
    ]);
  });

  it("shows the stale cached inbox label while rendering cached Activity", async () => {
    shellContext.session = createMemberSession();
    const repository = createScreenRepository(
      Promise.resolve({
        alertDeliveries: [],
        candidateMatches: [],
        chatSummaries: [],
        isOffline: true,
        isStale: true,
        moderationEvents: [],
        reportUpdates: [
          {
            eventType: "updated",
            id: "report-update-1",
            occurredAt: "2026-06-30T13:05:00.000Z",
            report: {
              availability: "available",
              href: "rastro://reportes/perdidos/lost-report-1",
              id: "lost-report-1",
              kind: "lost-pet-report",
              outcome: null,
              status: "active",
              title: "Toby",
              type: "lost_pet",
            },
          },
        ],
      }),
    );

    void renderActivityScreen({ repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ repository });
    const listProps = getLegendListProps<{
      ListHeaderComponent: React.ReactNode;
    }>(screen);

    expect(
      findText(
        listProps.ListHeaderComponent,
        "Sin conexión - actividad guardada",
      ),
    ).toBe(true);
  });

  it("shows a Spanish error state with a retry action for backend failures", async () => {
    shellContext.session = createMemberSession();
    const repository: ActivityRepository = {
      getInbox: vi.fn<ActivityRepository["getInbox"]>(() =>
        Promise.reject(new Error("network down")),
      ),
    };

    void renderActivityScreen({ repository });
    await runPendingEffects();
    const screen = renderActivityScreen({ repository });
    const listProps = getLegendListProps<{
      ListEmptyComponent: React.ReactNode;
    }>(screen);
    const retryButton = findElement(
      listProps.ListEmptyComponent,
      (element) => element.props.testID === "activity-retry-button",
    );

    expect(
      findText(listProps.ListEmptyComponent, "No pudimos cargar tu actividad"),
    ).toBe(true);
    expect(findText(listProps.ListEmptyComponent, "Reintentar")).toBe(true);
    expect(retryButton?.props.accessibilityRole).toBe("button");
  });

  it("keeps Activity list recycling safe while session data changes", () => {
    const screen = renderActivityScreen();
    const listProps = getLegendListProps<{
      getItemType: (item: unknown) => string | undefined;
    }>(screen);

    expect(listProps.getItemType(undefined)).toBeUndefined();
  });

  it("ignores transient undefined list items while Activity data changes", () => {
    const screen = renderActivityScreen();
    const listProps = getLegendListProps<{
      renderItem: (props: { item: unknown }) => React.ReactNode;
    }>(screen);

    expect(listProps.renderItem({ item: undefined })).toBeNull();
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function createMemberSession(): ShellSession {
  return {
    email: "ana@example.com",
    id: "member_ana",
    kind: "member",
    name: "Ana",
  };
}

function createScreenRepository(
  result: Promise<ActivityInbox> = Promise.resolve({
    alertDeliveries: [],
    candidateMatches: [],
    chatSummaries: [],
    moderationEvents: [],
    reportUpdates: [],
  }),
): ActivityRepository {
  return {
    getInbox: vi.fn<ActivityRepository["getInbox"]>(() => result),
  };
}

function createMixedActivityInbox(): ActivityInbox {
  return {
    alertDeliveries: [
      {
        body: "Toby fue reportado cerca de Sopocachi.",
        deliveryId: "alert-delivery-1",
        href: "rastro://reportes/perdidos/lost-report-1",
        id: "activity-alert-1",
        occurredAt: "2026-06-30T13:00:00.000Z",
        reportId: "lost-report-1",
        status: "delivered",
        title: "Mascota perdida cerca de ti",
      },
    ],
    candidateMatches: [],
    chatSummaries: [
      {
        conversationId: "chat-conversation-1",
        href: "rastro://chats/chat-conversation-1",
        id: "activity-chat-1",
        lastMessage: {
          authorLabel: "Diego",
          id: "chat-message-1",
          text: "Lo vi cerca de la plaza.",
        },
        occurredAt: "2026-06-30T13:04:00.000Z",
        otherParticipant: {
          displayName: "Diego",
          memberId: "member-diego",
        },
        subject: {
          href: "rastro://reportes/perdidos/lost-report-1",
          id: "lost-report-1",
          kind: "lost-pet-report",
          subtitle: "Sopocachi",
          title: "Toby",
        },
      },
    ],
    moderationEvents: [
      {
        action: "hide",
        adminId: "member-admin",
        id: "moderation-event-1",
        note: "Ubicación sensible.",
        occurredAt: "2026-06-30T13:06:00.000Z",
        reason: "Ubicación exacta expuesta",
        report: {
          availability: "hidden",
          href: "rastro://reportes/perdidos/lost-report-1",
          id: "lost-report-1",
          kind: "lost-pet-report",
          outcome: null,
          status: "active",
          title: "Toby",
          type: "lost_pet",
        },
      },
    ],
    reportUpdates: [
      {
        actorMemberId: "member_ana",
        eventType: "resolved",
        fromStatus: "active",
        id: "report-update-1",
        note: null,
        occurredAt: "2026-06-30T13:05:00.000Z",
        outcome: "reunited",
        report: {
          availability: "available",
          href: "rastro://reportes/perdidos/lost-report-1",
          id: "lost-report-1",
          kind: "lost-pet-report",
          outcome: "reunited",
          status: "closed",
          title: "Toby",
          type: "lost_pet",
        },
        toStatus: "closed",
      },
    ],
  };
}

function createDeferred<TValue>() {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

function renderActivityScreen(
  props: Partial<ActivityScreenProps> = {},
): React.ReactNode {
  reactState.cursor = 0;
  reactState.effectCursor = 0;

  return renderFunctionElement(
    ActivityScreen({
      repository: createScreenRepository(),
      ...props,
    }),
  );
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

function getElementProps<TProps extends ElementProps>(
  node: React.ReactNode,
): TProps {
  if (!React.isValidElement<TProps>(node)) {
    throw new Error("Expected a React element.");
  }

  return node.props;
}

function getLegendListProps<TProps extends ElementProps>(
  node: React.ReactNode,
): TProps {
  const list = findElement(node, (element) => element.type === "LegendList");

  if (!list) {
    throw new Error("Expected Activity screen to render a LegendList.");
  }

  return getElementProps<TProps>(list);
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
