import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicReportDetailViewModel } from "./public-report-detail";
import {
  buildPublicReportAbuseAuthReturnTo,
  PublicReportDetailContent,
  PublicReportDetailErrorState,
  PublicReportDetailUnavailableState,
} from "./public-report-detail-screen";

(globalThis as { React?: typeof React }).React = React;

const reactState = vi.hoisted(() => ({
  setters: [] as ReturnType<typeof vi.fn>[],
}));

const reactNativeMocks = vi.hoisted(() => ({
  openURL: vi.fn(),
  share: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useState: <TValue,>(initialValue: TValue | (() => TValue)) => {
      const setter = vi.fn();

      reactState.setters.push(setter);

      return [
        typeof initialValue === "function"
          ? (initialValue as () => TValue)()
          : initialValue,
        setter,
      ];
    },
    useRef: <TValue,>(initialValue: TValue) => ({ current: initialValue }),
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
  Linking: {
    openURL: reactNativeMocks.openURL,
  },
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Share: {
    share: reactNativeMocks.share,
  },
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
    flatten: (style: unknown) => {
      if (!Array.isArray(style)) {
        return style;
      }

      return style.reduce<Record<string, unknown>>((flattened, item) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(flattened, item);
        }

        return flattened;
      }, {});
    },
  },
  Text: "Text",
  TextInput: "TextInput",
  useWindowDimensions: () => ({ height: 844, scale: 1, width: 390 }),
  View: "View",
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

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

vi.mock("../shell/shell-provider", () => ({
  useRastroShell: () => ({
    requestAuthPrompt: vi.fn(),
    session: {
      kind: "visitor",
    },
  }),
}));

beforeEach(() => {
  reactState.setters = [];
  router.push.mockReset();
  reactNativeMocks.openURL.mockReset();
  reactNativeMocks.share.mockReset();
});

describe("PublicReportDetailContent", () => {
  it("renders the report detail without exposing raw ids and wires primary actions", () => {
    const onOpenLocation = vi.fn();
    const onShare = vi.fn();
    const onOpenPublicPage = vi.fn();
    const screen = renderFunctionElement(
      <PublicReportDetailContent
        onOpenLocation={onOpenLocation}
        onOpenPublicPage={onOpenPublicPage}
        onShare={onShare}
        viewModel={createViewModel()}
      />,
    );

    expect(findText(screen, "Se busca a Luna")).toBe(true);
    expect(findText(screen, "Mascota perdida")).toBe(true);
    expect(findText(screen, "Activo")).toBe(true);
    expect(findText(screen, "Qué pasó")).toBe(true);
    expect(findText(screen, "report-lost-1")).toBe(false);

    pressByText(screen, "Ver zona en mapa");
    pressByText(screen, "Compartir");
    pressByText(screen, "Abrir página pública");

    expect(onOpenLocation).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
    expect(onOpenPublicPage).toHaveBeenCalledOnce();
  });

  it("places contact actions before map and share actions", () => {
    const onOpenContactAction = vi.fn();
    const onOpenLocation = vi.fn();
    const screen = renderFunctionElement(
      <PublicReportDetailContent
        onOpenContactAction={onOpenContactAction}
        onOpenLocation={onOpenLocation}
        viewModel={createViewModel({
          contactActions: [
            {
              href: "https://wa.me/59170123456?text=Hola",
              kind: "whatsapp",
              label: "Escribir por WhatsApp",
              phoneNumber: "",
            },
            {
              href: "rastro://chats/conversation-1",
              kind: "in-app-chat",
              label: "Enviar mensaje en Rastro",
            },
          ],
          abuseReportAction: createAbuseReportAction(),
          isCurrentMember: false,
        })}
      />,
    );

    expect(getPressableTextLabels(screen)).toEqual([
      "Escribir por WhatsApp",
      "Enviar mensaje en Rastro",
      "Ver zona en mapa",
      "Compartir",
      "Reportar",
      "Abrir página pública",
    ]);
    expect(findText(screen, "+591")).toBe(false);
    expect(findText(screen, "Reportar avistamiento")).toBe(false);

    pressByText(screen, "Escribir por WhatsApp");
    pressByText(screen, "Enviar mensaje en Rastro");
    pressByText(screen, "Ver zona en mapa");

    expect(onOpenContactAction).toHaveBeenCalledTimes(2);
    expect(onOpenContactAction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        href: "https://wa.me/59170123456?text=Hola",
        kind: "whatsapp",
      }),
    );
    expect(onOpenLocation).toHaveBeenCalledWith({
      label: "Ver zona en mapa",
      url: "https://www.google.com/maps/search/?api=1&query=-16.5%2C-68.12",
    });
  });

  it("surfaces default contact action failures instead of swallowing them", async () => {
    const screen = renderFunctionElement(
      <PublicReportDetailContent
        viewModel={createViewModel({
          contactActions: [
            {
              href: "https://example.com/59170123456",
              kind: "whatsapp",
              label: "Escribir por WhatsApp",
              phoneNumber: "",
            },
          ],
          isCurrentMember: false,
        })}
      />,
    );

    pressByText(screen, "Escribir por WhatsApp");
    await flushPromises();

    expect(findStateSetterPayload("No se pudo abrir WhatsApp.")).toBe(true);
  });

  it("surfaces map and public-page open failures instead of swallowing them", async () => {
    reactNativeMocks.openURL.mockRejectedValue(new Error("blocked"));
    const screen = renderFunctionElement(
      <PublicReportDetailContent viewModel={createViewModel()} />,
    );

    pressByText(screen, "Ver zona en mapa");
    await flushPromises();
    pressByText(screen, "Abrir página pública");
    await flushPromises();

    expect(
      findStateSetterPayload("No pudimos abrir Mapas. Intenta de nuevo."),
    ).toBe(true);
    expect(
      findStateSetterPayload(
        "No pudimos abrir la página pública. Intenta de nuevo.",
      ),
    ).toBe(true);
  });

  it("surfaces share failures instead of swallowing them", async () => {
    reactNativeMocks.share.mockRejectedValue(new Error("blocked"));
    const screen = renderFunctionElement(
      <PublicReportDetailContent viewModel={createViewModel()} />,
    );

    pressByText(screen, "Compartir");
    await flushPromises();

    expect(
      findStateSetterPayload(
        "No pudimos compartir el reporte. Intenta de nuevo.",
      ),
    ).toBe(true);
  });

  it("opens the abuse report sheet on load when requested from a nearby report action", () => {
    const screen = renderFunctionElement(
      <PublicReportDetailContent
        isVisitor
        openReportAbuseOnLoad
        viewModel={createViewModel({
          abuseReportAction: createAbuseReportAction(),
          isCurrentMember: false,
          ownerNotice: null,
        })}
      />,
    );

    expect(findText(screen, "Reportar este reporte")).toBe(true);
    expect(findText(screen, "Describe el problema con al menos")).toBe(
      true,
    );
    expect(findText(screen, "Inicia sesión para reportar")).toBe(true);
  });

  it("renders multiple report images as a paged Galeria-backed carousel", () => {
    const photoUrls = Array.from(
      { length: 5 },
      (_, index) => `https://cdn.rastro.bo/asdf-${index + 1}.jpg`,
    );
    const screen = renderFunctionElement(
      <PublicReportDetailContent
        viewModel={createViewModel({
          photoUrls,
        })}
      />,
    );
    const images = findElements(screen, (element) => element.type === "Image");
    const galeriaRoots = findElements(
      screen,
      (element) => element.type === "Galeria",
    );
    const galeriaImages = findElements(
      screen,
      (element) => element.type === "Galeria.Image",
    );

    expect(findText(screen, "1 de 5")).toBe(true);
    expect(
      findElementByAccessibilityLabel(screen, "Fotos del reporte, 5 en total"),
    ).toBeTruthy();
    expect(
      findElementByAccessibilityLabel(screen, "Galeria de fotos"),
    ).toBeTruthy();
    expect(galeriaRoots).toHaveLength(2);
    expect(galeriaRoots[0]?.props.urls).toEqual(photoUrls);
    expect(galeriaImages.map((image) => image.props.index)).toEqual([
      0, 1, 2, 3, 4, 0, 1, 2, 3, 4,
    ]);
    expect(images[0]?.props).toMatchObject({
      contentFit: "contain",
      priority: "high",
      source: {
        uri: photoUrls[0],
      },
    });
    expect(
      images.map((image) => (image.props.source as { uri: string }).uri),
    ).toEqual([...photoUrls, ...photoUrls]);
    expect(
      images.slice(0, 5).every((image) => image.props.contentFit === "contain"),
    ).toBe(true);
    expect(
      images.slice(5).every((image) => image.props.contentFit === "cover"),
    ).toBe(true);
  });

  it("shows the owner guidance only for the current member", () => {
    const ownerScreen = renderFunctionElement(
      <PublicReportDetailContent viewModel={createViewModel()} />,
    );
    const visitorScreen = renderFunctionElement(
      <PublicReportDetailContent
        viewModel={createViewModel({
          isCurrentMember: false,
          ownerNotice: null,
        })}
      />,
    );

    expect(findText(ownerScreen, "Es tu reporte")).toBe(true);
    expect(findText(visitorScreen, "Es tu reporte")).toBe(false);
  });

  it("renders pending-review owner copy when the backend allows the member to see the report", () => {
    const screen = renderFunctionElement(
      <PublicReportDetailContent
        viewModel={createViewModel({
          ownerNotice: {
            body: "El equipo de Rastro lo está revisando antes de mostrarlo públicamente. Puedes verlo aquí porque es tu reporte.",
            title: "Reporte en revisión",
            tone: "review",
          },
          statusLabel: "En revisión",
          statusTone: "review",
        })}
      />,
    );

    expect(findText(screen, "En revisión")).toBe(true);
    expect(findText(screen, "Reporte en revisión")).toBe(true);
    expect(findText(screen, "lo está revisando")).toBe(true);
  });
});

describe("public report abuse auth return target", () => {
  it("keeps visitors inside the public report route and reopens the abuse sheet after sign-in", () => {
    expect(
      buildPublicReportAbuseAuthReturnTo(
        createViewModel({ appPath: "/reportes/perdidos/report-lost-1" }),
      ),
    ).toBe("/reportes/perdidos/report-lost-1?reportar=1");
  });
});

describe("PublicReportDetail load states", () => {
  it("shows unavailable moderation copy without a retry action", () => {
    const screen = renderFunctionElement(
      <PublicReportDetailUnavailableState />,
    );

    expect(findText(screen, "Reporte no disponible")).toBe(true);
    expect(findText(screen, "retirado, marcado para revisión")).toBe(true);
    expect(findText(screen, "Reintentar")).toBe(false);
  });

  it("shows a retry action for generic backend or network failures", () => {
    const onRetry = vi.fn();
    const screen = renderFunctionElement(
      <PublicReportDetailErrorState onRetry={onRetry} />,
    );

    expect(findText(screen, "No pudimos cargar el reporte")).toBe(true);
    expect(findText(screen, "Revisa tu conexión")).toBe(true);

    pressByText(screen, "Reintentar");

    expect(onRetry).toHaveBeenCalledOnce();
  });
});

function createViewModel(
  overrides: Partial<PublicReportDetailViewModel> = {},
): PublicReportDetailViewModel {
  return {
    accentColor: "#D6453D",
    accentSoftColor: "#FBE8E6",
    abuseReportAction: null,
    appPath: "/reportes/perdidos/report-lost-1",
    contactActions: [],
    contactLabel: "Chat en Rastro",
    description:
      "Se perdio cerca de la zona y puede estar asustada. Responde a su nombre.",
    descriptionTitle: "Qué pasó",
    eventLabel: "Perdida",
    eventValue: "24 jun 2026, 08:30",
    facts: [
      {
        iconName: "location.fill",
        label: "Ubicación",
        value: "La Paz",
      },
    ],
    heroIconName: "megaphone.fill",
    isCurrentMember: true,
    locationAction: {
      label: "Ver zona en mapa",
      url: "https://www.google.com/maps/search/?api=1&query=-16.5%2C-68.12",
    },
    locationLabel: "La Paz",
    locationPrivacyLabel: "Mostramos una zona aproximada por seguridad.",
    ownerNotice: {
      body: "Comparte el enlace para que más personas cerca de la zona puedan verlo.",
      title: "Es tu reporte",
      tone: "default",
    },
    photoUrls: ["https://cdn.rastro.bo/luna.jpg"],
    publicPageLabel: "Abrir página pública",
    shareMessage:
      "Ayuda a encontrar a Luna en Rastro: https://rastro.bo/reportes/perdidos/report-lost-1",
    shareTitle: "Mascota perdida: Luna",
    shareUrl: "https://rastro.bo/reportes/perdidos/report-lost-1",
    statusLabel: "Activo",
    statusTone: "active",
    subtitle: "Gato · Siames",
    title: "Se busca a Luna",
    type: "lost_pet",
    typeLabel: "Mascota perdida",
    ...overrides,
  };
}

function createAbuseReportAction(): NonNullable<
  PublicReportDetailViewModel["abuseReportAction"]
> {
  return {
    body: "Cuéntanos qué problema ves. El equipo de Rastro revisará el reporte antes de tomar acción.",
    detailHelper: "Describe el problema con al menos 10 caracteres.",
    detailLabel: "Detalle",
    detailPlaceholder: "Describe el problema con este reporte",
    label: "Reportar",
    reportId: "11111111-1111-4111-8111-111111111111",
    submitLabel: "Enviar reporte",
    successAlreadyReported: "Ya recibimos tu reporte sobre este motivo.",
    successCreated: "Gracias. El equipo de Rastro revisará este reporte.",
    title: "Reportar este reporte",
    visitorCtaLabel: "Inicia sesión para reportar",
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

function findPressableByText(node: React.ReactNode, text: string) {
  return findElement(
    node,
    (element) => element.type === "Pressable" && findText(element, text),
  );
}

function pressByText(node: React.ReactNode, text: string) {
  const onPress = findPressableByText(node, text)?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(`No pressable found for ${text}.`);
  }

  const handlePress = onPress as () => void;
  handlePress();
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function findStateSetterPayload(label: string): boolean {
  return reactState.setters.some((setter) =>
    setter.mock.calls.some(([payload]) => {
      if (!isRecord(payload)) {
        return false;
      }

      return payload.label === label;
    }),
  );
}

function getPressableTextLabels(node: React.ReactNode): string[] {
  return findElements(
    node,
    (element) =>
      element.type === "Pressable" && getDirectText(element).length > 0,
  ).map(getDirectText);
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

function findElementByAccessibilityLabel(
  node: React.ReactNode,
  accessibilityLabel: string,
) {
  return findElement(
    node,
    (element) => element.props.accessibilityLabel === accessibilityLabel,
  );
}

function findElements(
  node: React.ReactNode,
  predicate: (element: React.ReactElement<ElementProps>) => boolean,
): React.ReactElement<ElementProps>[] {
  if (!React.isValidElement<ElementProps>(node)) {
    return [];
  }

  const matches = predicate(node) ? [node] : [];
  const childMatches = React.Children.toArray(node.props.children).flatMap(
    (child) => findElements(child, predicate),
  );

  return [...matches, ...childMatches];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
