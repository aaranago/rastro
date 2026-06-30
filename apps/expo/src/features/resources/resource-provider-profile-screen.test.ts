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

const api = vi.hoisted(() => ({
  trpcClient: {
    resources: {
      detail: {
        query: vi.fn(),
      },
      nearby: {
        query: vi.fn(),
      },
      reportProvider: {
        mutate: vi.fn(),
      },
    },
  },
}));

const linking = vi.hoisted(() => ({
  canOpenURL: vi.fn(),
  openURL: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
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
      reactState.pendingEffects.push(() => {
        effect();
      });
    },
    useMemo: <TValue>(factory: () => TValue) => factory(),
    useRef: <TValue>(initialValue: TValue) => {
      const index = reactState.cursor;
      reactState.cursor += 1;

      if (reactState.values.length <= index) {
        reactState.values[index] = { current: initialValue };
      }

      return reactState.values[index] as React.MutableRefObject<TValue>;
    },
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

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

vi.mock("@nandorojo/galeria", async () => {
  const actualReact = await vi.importActual<typeof React>("react");
  const GaleriaImage = (props: ElementProps) =>
    actualReact.createElement("Galeria.Image", props, props.children);
  const GaleriaRoot = Object.assign(
    (props: ElementProps) =>
      actualReact.createElement("Galeria", props, props.children),
    { Image: GaleriaImage },
  );

  return {
    Galeria: GaleriaRoot,
  };
});

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Linking: linking,
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    absoluteFill: {},
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
    flatten: (style: unknown) => style,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock("../../utils/api", () => ({
  trpcClient: api.trpcClient,
}));

describe("Resource Provider profile screen", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.effectCursor = 0;
    reactState.effects = [];
    reactState.pendingEffects = [];
    reactState.values = [];
    linking.canOpenURL.mockReset();
    linking.openURL.mockReset();
    linking.canOpenURL.mockResolvedValue(true);
    linking.openURL.mockResolvedValue(undefined);
  });

  it("builds the Recursos stack href used by search result cards", () => {
    expect(buildResourceProviderProfileHref("clinic-san-roque")).toBe(
      "/proveedores/clinic-san-roque",
    );
    expect(buildResourceProviderProfileHref("dra marta gómez")).toBe(
      "/proveedores/dra%20marta%20g%C3%B3mez",
    );
    expect(
      buildResourceProviderProfileHref("clinic-san-roque", { report: true }),
    ).toBe("/proveedores/clinic-san-roque?report=1");
  });

  it("renders provider and sponsor images as separate profile media", async () => {
    const adapter = createAdapter();

    void renderScreen(createProfileScreen(adapter));
    await flushEffects();
    const readyScreen = renderScreen(createProfileScreen(adapter));
    const imageUris = collectImageUris(readyScreen);

    expect(imageUris).toEqual(
      expect.arrayContaining([
        "https://example.com/provider-photo.png",
        "https://example.com/provider-logo.png",
        "https://example.com/sponsor-logo.png",
        "https://example.com/sponsor-banner.png",
      ]),
    );
    expect(
      findText(
        readyScreen,
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      ),
    ).toBe(true);
  });

  it("shows a compact fallback when an attached provider image fails", async () => {
    const adapter = createAdapter({
      providerProfile: {
        ...profile,
        photoUrl: "https://example.com/broken-provider-photo.png",
      },
    });

    void renderScreen(createProfileScreen(adapter));
    await flushEffects();
    const readyScreen = renderScreen(createProfileScreen(adapter));

    triggerImageErrorByUri(
      readyScreen,
      "https://example.com/broken-provider-photo.png",
    );

    const fallbackScreen = renderScreen(createProfileScreen(adapter));

    expect(findText(fallbackScreen, "No pudimos cargar esta foto")).toBe(true);
    expect(findText(fallbackScreen, "Clinica Veterinaria San Roque")).toBe(
      true,
    );
  });

  it("does not reserve a blank hero when provider detail has no photo", async () => {
    const adapter = createAdapter({
      providerProfile: {
        ...profile,
        photoUrl: undefined,
      },
    });

    void renderScreen(createProfileScreen(adapter));
    await flushEffects();
    const readyScreen = renderScreen(createProfileScreen(adapter));

    expect(findText(readyScreen, "Sin foto del proveedor")).toBe(true);
    expect(findText(readyScreen, "Veterinaria")).toBe(true);
  });

  it("shows inline feedback when the device cannot open a contact URL", async () => {
    const adapter = createAdapter();

    void renderScreen(createProfileScreen(adapter));
    await flushEffects();
    const readyScreen = renderScreen(createProfileScreen(adapter));
    linking.canOpenURL.mockResolvedValueOnce(false);

    pressByText(readyScreen, "Llamar");
    await flushPromises();

    const feedbackScreen = renderScreen(createProfileScreen(adapter));

    expect(linking.canOpenURL).toHaveBeenCalledWith("tel:+59122221111");
    expect(linking.openURL).not.toHaveBeenCalled();
    expect(findText(feedbackScreen, "No pudimos abrir el enlace")).toBe(true);
    expect(
      findText(
        feedbackScreen,
        'No encontramos una app compatible para abrir "Llamar".',
      ),
    ).toBe(true);
  });

  it("shows inline feedback when opening a provider link fails", async () => {
    const adapter = createAdapter({
      providerProfile: {
        ...profile,
        websiteUrl: "https://sanroque.example.bo",
      },
    });

    void renderScreen(createProfileScreen(adapter));
    await flushEffects();
    const readyScreen = renderScreen(createProfileScreen(adapter));
    linking.openURL.mockRejectedValueOnce(new Error("No browser available."));

    pressByText(readyScreen, "Sitio web");
    await flushPromises();

    const feedbackScreen = renderScreen(createProfileScreen(adapter));

    expect(linking.canOpenURL).toHaveBeenCalledWith(
      "https://sanroque.example.bo",
    );
    expect(linking.openURL).toHaveBeenCalledWith("https://sanroque.example.bo");
    expect(findText(feedbackScreen, "No pudimos abrir el enlace")).toBe(true);
    expect(
      findText(
        feedbackScreen,
        'No encontramos una app compatible para abrir "Sitio web".',
      ),
    ).toBe(true);
  });

  it("opens the provider report workflow from a route intent", async () => {
    const adapter = createAdapter();

    void renderScreen(
      createProfileScreen(adapter, { initiallyReportProvider: true }),
    );
    await flushEffects();
    void renderScreen(
      createProfileScreen(adapter, { initiallyReportProvider: true }),
    );
    await flushEffects();

    const reportScreen = renderScreen(
      createProfileScreen(adapter, { initiallyReportProvider: true }),
    );

    expect(findText(reportScreen, "Reportar proveedor")).toBe(true);
    expect(findText(reportScreen, "Ubicación incorrecta")).toBe(true);
  });

  it("waits for backend confirmation before showing provider report success", async () => {
    let resolveReport:
      | ((
          receipt: Awaited<ReturnType<ResourcesAdapter["reportProvider"]>>,
        ) => void)
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

    pressByText(readyScreen, "Reportar proveedor");

    const confirmationScreen = renderScreen(createProfileScreen(adapter));
    expect(findText(confirmationScreen, "Reportar proveedor")).toBe(true);
    expect(findText(confirmationScreen, "Ubicación incorrecta")).toBe(true);

    pressByText(confirmationScreen, "Enviar");

    const pendingScreen = renderScreen(createProfileScreen(adapter));
    expect(reportProvider).toHaveBeenCalledWith({
      detail: "Reporte de proveedor: ubicación incorrecta.",
      providerId: profile.id,
      reason: "incorrect_location",
    });
    expect(findText(pendingScreen, "Reportando perfil")).toBe(true);
    expect(findText(pendingScreen, "Reporte enviado")).toBe(false);

    resolveReport?.({
      status: "created",
      moderationItem: {
        detail: "Reporte de proveedor: ubicación incorrecta.",
        id: "review-provider-1",
        providerId: profile.id,
        providerName: profile.name,
        reason: "incorrect_location",
        reviewItem: {
          createdAt: "2026-06-26T16:00:00.000Z",
          detail: "Reporte de proveedor: ubicación incorrecta.",
          id: "review-provider-1",
          kind: "abuse_report",
          reason: "incorrect_location",
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

    pressByText(readyScreen, "Reportar proveedor");
    const confirmationScreen = renderScreen(createProfileScreen(adapter));
    pressByText(confirmationScreen, "Enviar");
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
  logoUrl: "https://example.com/provider-logo.png",
  photoUrl: "https://example.com/provider-photo.png",
  sponsorPlacement: {
    kind: "Local Sponsor Placement",
    label: "Patrocinado",
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    logoUrl: "https://example.com/sponsor-logo.png",
    imageUrl: "https://example.com/sponsor-banner.png",
    eligibleSurfaces: ["provider_details"],
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
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 2 222 1111",
    },
  ],
};

function createAdapter({
  providerProfile = profile,
  reportProvider = vi.fn<ResourcesAdapter["reportProvider"]>(),
}: {
  providerProfile?: ResourceProviderProfileData;
  reportProvider?: ResourcesAdapter["reportProvider"];
} = {}): ResourcesAdapter {
  return {
    getProviderProfile: () => Promise.resolve(providerProfile),
    getProviderProfileDetail: (providerId) =>
      Promise.resolve({
        profile: providerProfile,
        providerId,
      }),
    reportProvider,
    searchProviders: () => Promise.resolve([]),
  };
}

function createProfileScreen(
  adapter: ResourcesAdapter,
  props: Partial<
    React.ComponentProps<typeof ResourceProviderProfileScreen>
  > = {},
) {
  return React.createElement(ResourceProviderProfileScreen, {
    adapter,
    ...props,
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

async function flushPromises() {
  await Promise.resolve();
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

function triggerImageErrorByUri(node: React.ReactNode, uri: string) {
  const image = findElement(
    node,
    (element) =>
      element.type === "Image" &&
      getImageSourceUri(element.props.source)[0] === uri,
  );
  const onError = image?.props.onError;

  if (typeof onError !== "function") {
    throw new Error(`Expected image ${uri} to expose onError`);
  }

  (onError as () => void)();
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
