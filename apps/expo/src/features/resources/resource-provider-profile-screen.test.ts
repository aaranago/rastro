import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResourceProviderProfile as ResourceProviderProfileData } from "./resource-types";
import type { ResourcesAdapter } from "./static-resources-adapter";
import {
  buildResourceProviderProfileHref,
  ResourceProviderProfileScreen,
} from "./resource-provider-profile-screen";

(globalThis as { React?: typeof React }).React = React;

const reactState = vi.hoisted(() => ({
  cursor: 0,
  effectCursor: 0,
  effects: [] as {
    dependencies?: readonly unknown[];
  }[],
  pendingEffects: [] as (() => void)[],
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
      reactState.pendingEffects.push(() => {
        effect();
      });
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
        reactState.values[index],
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

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("react-native", () => ({
  Linking: {
    openURL: () => Promise.resolve(),
  },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

describe("Resource Provider profile screen", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.effectCursor = 0;
    reactState.effects = [];
    reactState.pendingEffects = [];
    reactState.values = [];
  });

  it("builds the Recursos stack href used by search result cards", () => {
    expect(buildResourceProviderProfileHref("clinic-san-roque")).toBe(
      "/proveedores/clinic-san-roque",
    );
    expect(buildResourceProviderProfileHref("dra marta gómez")).toBe(
      "/proveedores/dra%20marta%20g%C3%B3mez",
    );
  });

  it("waits for backend confirmation before showing provider report success", async () => {
    let resolveReport:
      | ((receipt: Awaited<ReturnType<ResourcesAdapter["reportProvider"]>>) => void)
      | undefined;
    const reportProvider = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<ResourcesAdapter["reportProvider"]>>>(
          (resolve) => {
            resolveReport = resolve;
          },
        ),
    );
    const adapter = createAdapter({ reportProvider });

    void renderScreen(createProfileScreen(adapter));
    await flushEffects();
    const readyScreen = renderScreen(createProfileScreen(adapter));

    pressByText(readyScreen, "Reportar");

    const pendingScreen = renderScreen(createProfileScreen(adapter));
    expect(reportProvider).toHaveBeenCalledWith({
      detail: "Reporte enviado desde el perfil de Recursos.",
      providerId: profile.id,
      reason: "other",
    });
    expect(findText(pendingScreen, "Reportando perfil")).toBe(true);
    expect(findText(pendingScreen, "Reporte enviado")).toBe(false);

    resolveReport?.({
      status: "created",
      moderationItem: {
        detail: "Reporte enviado desde el perfil de Recursos.",
        id: "review-provider-1",
        providerId: profile.id,
        providerName: profile.name,
        reason: "other",
        reviewItem: {
          createdAt: "2026-06-26T16:00:00.000Z",
          detail: "Reporte enviado desde el perfil de Recursos.",
          id: "review-provider-1",
          kind: "abuse_report",
          reason: "other",
          reporterMemberId: "member-ana",
          status: "pending",
          targetId: profile.id,
          targetType: "resource_provider",
        },
        targetType: "resource_provider",
      },
    });
    await Promise.resolve();
    await Promise.resolve();

    const successScreen = renderScreen(createProfileScreen(adapter));

    expect(findText(successScreen, "Reporte enviado")).toBe(true);
    expect(
      findText(
        successScreen,
        "Gracias. El equipo de Rastro revisará este perfil.",
      ),
    ).toBe(true);
  });

  it("shows backend report failures instead of client-only success", async () => {
    const adapter = createAdapter({
      reportProvider: vi
        .fn<ResourcesAdapter["reportProvider"]>()
        .mockRejectedValue(new Error("Backend moderation unavailable.")),
    });

    void renderScreen(createProfileScreen(adapter));
    await flushEffects();
    const readyScreen = renderScreen(createProfileScreen(adapter));

    pressByText(readyScreen, "Reportar");
    await Promise.resolve();
    await Promise.resolve();

    const errorScreen = renderScreen(createProfileScreen(adapter));

    expect(findText(errorScreen, "No pudimos reportar")).toBe(true);
    expect(findText(errorScreen, "Backend moderation unavailable.")).toBe(true);
    expect(findText(errorScreen, "Reporte enviado")).toBe(false);
  });
});

const profile: ResourceProviderProfileData = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Clinica Veterinaria San Roque",
  categoryId: "veterinary",
  description: "Veterinaria local con atencion general y urgencias.",
  approximateLocationLabel: "Sopocachi, La Paz",
  serviceAreaLabel: "Atiende La Paz y El Alto",
  hoursLabel: "Lun - Dom: 24 horas",
  shortDescription:
    "Atencion veterinaria general y orientacion para familias cuidadoras.",
  isVerified: true,
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 2 222 1111",
    },
  ],
};

function createAdapter({
  reportProvider = vi.fn<ResourcesAdapter["reportProvider"]>(),
}: {
  reportProvider?: ResourcesAdapter["reportProvider"];
} = {}): ResourcesAdapter {
  return {
    getProviderProfile: () => Promise.resolve(profile),
    getProviderProfileDetail: (providerId) =>
      Promise.resolve({
        profile,
        providerId,
      }),
    reportProvider,
    searchProviders: () => Promise.resolve([]),
  };
}

function createProfileScreen(adapter: ResourcesAdapter) {
  return React.createElement(ResourceProviderProfileScreen, {
    adapter,
    providerId: profile.id,
  });
}

function renderScreen(node: React.ReactNode) {
  reactState.cursor = 0;
  reactState.effectCursor = 0;

  return renderFunctionElement(node);
}

async function flushEffects() {
  const pendingEffects = [...reactState.pendingEffects];
  reactState.pendingEffects = [];

  for (const effect of pendingEffects) {
    effect();
  }

  await Promise.resolve();
  await Promise.resolve();
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

function pressByText(node: React.ReactNode, text: string) {
  const button = findElement(
    node,
    (element) => element.type === "Pressable" && findText(element, text),
  );
  const onPress = button?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(`Expected pressable ${text}`);
  }

  (onPress as () => void)();
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
