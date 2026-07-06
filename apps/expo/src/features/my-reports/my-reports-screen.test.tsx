import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MyReportsFilter, MyReportSummary } from "./my-reports";
import { buildMyReportCardViewModel } from "./my-reports";
import { MyReportsScreen } from "./my-reports-screen";

(globalThis as { React?: typeof React }).React = React;

type RegisteredEffect = () => void | (() => void);

const forcedReports = vi.hoisted(() => ({
  filter: "active" as MyReportsFilter,
  value: [] as MyReportSummary[],
}));

const forcedFeedback = vi.hoisted(() => ({
  set: vi.fn(),
  value: null as unknown,
}));

const forcedManagement = vi.hoisted(() => ({
  set: vi.fn(),
  value: undefined as unknown,
}));

const reactHooks = vi.hoisted(() => ({
  useEffect:
    vi.fn<
      (effect: RegisteredEffect, dependencies?: readonly unknown[]) => void
    >(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: reactHooks.useEffect,
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useRef: <TValue,>(initialValue: TValue) => ({ current: initialValue }),
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

      if (value === "active") {
        return [forcedReports.filter, vi.fn()];
      }

      if (value === null) {
        return [forcedFeedback.value as TValue, forcedFeedback.set];
      }

      if (
        typeof value === "object" &&
        "kind" in value &&
        value.kind === "closed"
      ) {
        return [
          (forcedManagement.value ?? value) as TValue,
          forcedManagement.set,
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
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("@legendapp/list", () => ({
  LegendList: (
    props: ElementProps & {
      data?: readonly unknown[];
      ListEmptyComponent?: React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      renderItem?: (props: { index: number; item: unknown }) => React.ReactNode;
    },
  ) => {
    const data = props.data ?? [];
    const children = [
      props.ListHeaderComponent,
      ...data.map((item, index) => props.renderItem?.({ index, item }) ?? null),
      data.length === 0 ? props.ListEmptyComponent : null,
    ];

    return React.createElement("LegendList", props, children);
  },
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
  beforeEach(() => {
    forcedReports.filter = "active";
    forcedReports.value = [];
    forcedFeedback.set.mockReset();
    forcedFeedback.value = null;
    forcedManagement.set.mockReset();
    forcedManagement.value = undefined;
    reactHooks.useEffect.mockClear();
  });

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
    expect(
      findElement(screen, (element) => element.type === "LegendList")?.props
        .data,
    ).toHaveLength(1);
    expect(
      findElement(screen, (element) => element.type === "ScrollView"),
    ).toBe(undefined);

    pressByText(screen, "Ver");

    expect(onOpenReport).toHaveBeenCalledWith(
      "/(tabs)/(nearby)/reportes/perdidos/report-active",
    );
  });

  it("does not expose public-detail navigation for retired or moderated reports", () => {
    const onOpenReport = vi.fn();
    forcedReports.filter = "retired";
    forcedReports.value = [
      createReport({
        availability: {
          label: "Oculto por moderación",
          state: "hidden",
        },
        id: "report-hidden",
      }),
    ];
    const screen = renderFunctionElement(
      <MyReportsScreen
        onOpenReport={onOpenReport}
        repository={createRepository()}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );

    expect(findText(screen, "No público")).toBe(true);
    expect(findPressableByText(screen, "Ver")).toBeUndefined();

    pressByText(screen, "Gestionar");

    expect(onOpenReport).not.toHaveBeenCalled();
  });

  it("surfaces a refresh action when a direct management report is missing", () => {
    forcedReports.value = [createReport()];

    void renderFunctionElement(
      <MyReportsScreen
        initialManageReportId="report-missing"
        repository={createRepository()}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );

    runLatestEffect();

    expect(forcedFeedback.set).toHaveBeenCalledWith({
      action: {
        accessibilityLabel:
          "Actualizar Mis reportes para buscar el reporte solicitado",
        id: "refresh",
        label: "Actualizar",
      },
      message:
        "No encontramos el reporte que querías gestionar. Actualiza la lista para volver a buscarlo.",
      tone: "warning",
    });
  });

  it("renders the missing-report refresh affordance", () => {
    const repository = createRepository();
    forcedFeedback.value = {
      action: {
        accessibilityLabel:
          "Actualizar Mis reportes para buscar el reporte solicitado",
        id: "refresh",
        label: "Actualizar",
      },
      message:
        "No encontramos el reporte que querías gestionar. Actualiza la lista para volver a buscarlo.",
      tone: "warning",
    };
    forcedReports.value = [createReport()];

    const screen = renderFunctionElement(
      <MyReportsScreen
        repository={repository}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );
    const refreshAction = findElementByAccessibilityLabel(
      screen,
      "Actualizar Mis reportes para buscar el reporte solicitado",
    );

    expect(refreshAction?.props.accessibilityRole).toBe("button");

    pressElement(refreshAction, "Expected refresh action to be pressable.");

    expect(repository.listReports).toHaveBeenCalledOnce();
  });

  it("labels the management modal and actions with the report context", () => {
    const report = createReport();
    forcedReports.value = [report];
    forcedManagement.value = {
      confirmation: null,
      kind: "open",
      pendingAction: null,
      report: buildMyReportCardViewModel(report),
    };

    const screen = renderFunctionElement(
      <MyReportsScreen
        repository={createRepository()}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );

    expect(
      findElementByAccessibilityLabel(
        screen,
        "Gestionar reporte Luna perdida en Sopocachi",
      )?.props.accessibilityViewIsModal,
    ).toBe(true);
    expect(
      findElementByAccessibilityLabel(
        screen,
        "Panel para gestionar Luna perdida en Sopocachi",
      )?.props.accessibilityViewIsModal,
    ).toBe(true);
    expect(
      findElementByAccessibilityLabel(
        screen,
        "Cerrar gestión de Luna perdida en Sopocachi",
      )?.props.accessibilityRole,
    ).toBe("button");
    expect(
      findElementByAccessibilityLabel(
        screen,
        "Confirmar que Luna perdida en Sopocachi sigue activa",
      )?.props.accessibilityRole,
    ).toBe("button");
    expect(
      findElementByAccessibilityLabel(
        screen,
        "Cerrar Luna perdida en Sopocachi como Reunida",
      )?.props.accessibilityRole,
    ).toBe("button");
    expect(
      findElementByAccessibilityLabel(
        screen,
        "Retirar reporte Luna perdida en Sopocachi",
      )?.props.accessibilityRole,
    ).toBe("button");
    expect(
      findTextElement(screen, "Gestionar reporte")?.props.selectable,
    ).not.toBe(true);
    expect(
      findTextElement(
        screen,
        "El cambio se guardará en Rastro y luego actualizaremos esta lista.",
      )?.props.selectable,
    ).not.toBe(true);
  });

  it("labels confirmation actions with the selected outcome", () => {
    const report = createReport();
    forcedReports.value = [report];
    forcedManagement.value = {
      confirmation: { kind: "resolve", outcome: "reunited" },
      kind: "open",
      pendingAction: null,
      report: buildMyReportCardViewModel(report),
    };

    const screen = renderFunctionElement(
      <MyReportsScreen
        repository={createRepository()}
        session={{ kind: "member", memberId: "member-camila" }}
      />,
    );

    expect(
      findElementByAccessibilityLabel(
        screen,
        "Cancelar cierre de Luna perdida en Sopocachi",
      )?.props.accessibilityRole,
    ).toBe("button");
    expect(
      findElementByAccessibilityLabel(
        screen,
        "Cerrar Luna perdida en Sopocachi como Reunida",
      )?.props.accessibilityRole,
    ).toBe("button");
    expect(
      findTextElement(screen, "¿Cerrar como Reunida?")?.props.selectable,
    ).not.toBe(true);
  });
});

function createRepository() {
  return {
    confirmActive: vi.fn(),
    deleteReport: vi.fn(),
    listReports: vi.fn().mockResolvedValue(forcedReports.value),
    resolveReport: vi.fn(),
  };
}

function createReport(
  overrides: Partial<MyReportSummary> = {},
): MyReportSummary {
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

function findElementByAccessibilityLabel(
  node: React.ReactNode,
  accessibilityLabel: string,
) {
  return findElement(
    node,
    (element) => element.props.accessibilityLabel === accessibilityLabel,
  );
}

function findTextElement(node: React.ReactNode, text: string) {
  return findElement(
    node,
    (element) =>
      element.type === "Text" && getDirectText(element).includes(text),
  );
}

function pressByText(node: React.ReactNode, text: string) {
  pressElement(
    findPressableByText(node, text),
    `No pressable found for ${text}.`,
  );
}

function pressElement(
  element: React.ReactElement<ElementProps> | undefined,
  errorMessage: string,
) {
  const onPress = element?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(errorMessage);
  }

  const handlePress = onPress as () => void;
  handlePress();
}

function runLatestEffect() {
  const effect = reactHooks.useEffect.mock.calls.at(-1)?.[0];

  if (typeof effect !== "function") {
    throw new Error("Expected a registered effect.");
  }

  effect();
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
