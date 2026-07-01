import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellReportAction } from "./shell-model";
import {
  ReportActionSheet,
  ShellFabHost,
  shouldDisplayGlobalReportFab,
  shouldDisplayShellFirstRunTour,
  SignInPrompt,
} from "./shell-overlays";
import { useRastroShell } from "./shell-provider";

const api = vi.hoisted(() => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
  trpcClient: {
    report: {
      create: {
        mutate: vi.fn(),
      },
      detail: {
        query: vi.fn(),
      },
      nearby: {
        query: vi.fn(),
      },
    },
  },
}));
const router = vi.hoisted(() => ({
  push: vi.fn(),
}));
const routerLocation = vi.hoisted(() => ({
  pathname: "/",
}));
const reactEffects = vi.hoisted(() => ({
  repeatCount: 1,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    memo: <TComponent,>(component: TComponent) => component,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: (effect: () => void) => {
      for (let index = 0; index < reactEffects.repeatCount; index += 1) {
        effect();
      }
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useRef: <TValue,>(initialValue: TValue) => ({ current: initialValue }),
    useState: <TValue,>(initialValue: TValue) => [initialValue, vi.fn()],
  };
});

vi.mock("react-native", () => ({
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Modal: "Modal",
  Platform: { OS: "android" },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    absoluteFill: {},
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

vi.mock("expo-router", () => ({
  usePathname: () => routerLocation.pathname,
  useRouter: () => router,
  useSegments: () => [],
}));

vi.mock(
  "../adoption-listing-creation/adoption-listing-creation-screen",
  () => ({
    AdoptionListingCreationScreen: "AdoptionListingCreationScreen",
  }),
);

vi.mock("../found-report-creation/found-report-creation-screen", () => ({
  FoundReportCreationScreen: "FoundReportCreationScreen",
}));

vi.mock("../lost-report-creation/lost-report-creation-screen", () => ({
  LostReportCreationScreen: "LostReportCreationScreen",
}));

vi.mock("../resilience/creation-drafts", () => ({
  createCreationDraftStore: vi.fn(),
}));

vi.mock("../resilience/storage", () => ({
  createExpoSecureStoreKeyValueStorage: vi.fn(),
}));

vi.mock("../resources", () => ({
  buildResourceProviderProfileHref: (providerId: string) =>
    `/proveedores/${providerId}`,
  createStaticResourcesAdapter: () => ({
    reportProvider: vi.fn(),
  }),
}));

vi.mock("../sighting-report-creation/sighting-report-creation-screen", () => ({
  SightingReportCreationScreen: "SightingReportCreationScreen",
}));

vi.mock("./shell-provider", () => ({
  useRastroShell: vi.fn(),
}));

vi.mock("../../utils/api", () => ({
  queryClient: api.queryClient,
  trpcClient: api.trpcClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routerLocation.pathname = "/";
  reactEffects.repeatCount = 1;
});

describe("SignInPrompt", () => {
  it("renders configured Google and Facebook actions while keeping email access available", () => {
    const prompt = {
      body: "Guardamos tu seleccion: Reportar perdida.",
      intent: "lost",
      selectedIntentLabel: "Reportar perdida",
      title: "Inicia sesion para continuar",
    } as const;

    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={prompt}
        socialProviderActions={[
          {
            label: "Continuar con Google",
            provider: "google",
          },
          {
            label: "Continuar con Facebook",
            provider: "facebook",
          },
        ]}
      />,
    );

    expect(findText(screen, "Continuar con Google")).toBeTruthy();
    expect(findText(screen, "Continuar con Facebook")).toBeTruthy();
    expect(findText(screen, "Correo")).toBeTruthy();
    expect(findText(screen, "Contraseña")).toBeTruthy();
    expect(findText(screen, "Iniciar sesión")).toBeTruthy();
  });

  it("presents auth as a full-screen blocking screen with a real welcome image", () => {
    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={{
          body: "Inicia sesión para continuar.",
          title: "Inicia sesión para continuar",
        }}
        socialProviderActions={[
          {
            label: "Continuar con Google",
            provider: "google",
          },
        ]}
      />,
    );

    const modal = findElement(screen, (element) => element.type === "Modal");
    const scrollView = findElement(
      screen,
      (element) => element.type === "ScrollView",
    );
    const heroImage = findElement(
      screen,
      (element) =>
        element.type === "Image" &&
        element.props.testID === "auth-welcome-illustration",
    );

    expect(modal?.props.transparent).toBe(false);
    expect(modal?.props.presentationStyle).toBe("fullScreen");
    expect(scrollView?.props.showsVerticalScrollIndicator).toBe(false);
    expect(heroImage?.props.accessibilityRole).toBe("image");
    expect(heroImage?.props.source).toBeTruthy();
    expect(findText(screen, "+")).toBe(false);
    expect(findText(screen, "Cerrar")).toBe(false);
    expect(
      findElement(
        screen,
        (element) =>
          element.type === "Pressable" &&
          element.props.accessibilityLabel === "Cerrar",
      )?.props.accessibilityRole,
    ).toBe("button");
    expect(
      findElement(
        scrollView,
        (element) =>
          element.type === "Pressable" &&
          element.props.accessibilityLabel === "Cerrar",
      ),
    ).toBeUndefined();
  });

  it("starts in sign-in mode without public-name collection and with password reset available", () => {
    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={{
          body: "Inicia sesión para continuar.",
          title: "Inicia sesión para continuar",
        }}
        socialProviderActions={[]}
      />,
    );

    expect(findText(screen, "Correo")).toBeTruthy();
    expect(findText(screen, "Contraseña")).toBeTruthy();
    expect(findText(screen, "Nombre público")).toBe(false);
    expect(findText(screen, "Olvidé mi contraseña")).toBeTruthy();
  });

  it("exposes secondary auth actions as accessible 48 dp touch targets", () => {
    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={{
          body: "Inicia sesión para continuar.",
          title: "Inicia sesión para continuar",
        }}
        socialProviderActions={[]}
      />,
    );

    const resetAction = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Olvidé mi contraseña",
    );
    const visitorAction = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Continuar como visitante",
    );

    expect(resetAction?.props.accessibilityRole).toBe("button");
    expect(
      styleHasMinimumDimension(resetAction?.props.style, "minHeight", 48),
    ).toBe(true);
    expect(visitorAction?.props.accessibilityRole).toBe("button");
    expect(visitorAction?.props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(
      styleHasMinimumDimension(visitorAction?.props.style, "minHeight", 48),
    ).toBe(true);
  });

  it("exposes disabled state semantically on auth action buttons", () => {
    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={{
          body: "Inicia sesión para continuar.",
          title: "Inicia sesión para continuar",
        }}
        socialProviderActions={[
          {
            label: "Continuar con Google",
            provider: "google",
          },
        ]}
      />,
    );

    const signInAction = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Iniciar sesión"),
    );
    const googleAction = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Continuar con Google",
    );

    expect(signInAction?.props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(googleAction?.props.accessibilityState).toEqual({
      disabled: false,
    });
  });

  it("keeps email access as the fallback when no social providers are available", () => {
    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={{
          body: "Inicia sesion para continuar.",
          title: "Inicia sesion para continuar",
        }}
        socialProviderActions={[]}
      />,
    );

    expect(findText(screen, "Continuar con Google")).toBe(false);
    expect(findText(screen, "Continuar con Facebook")).toBe(false);
    expect(findText(screen, "Correo")).toBeTruthy();
    expect(findText(screen, "Contraseña")).toBeTruthy();
    expect(findText(screen, "Iniciar sesión")).toBeTruthy();
  });

  it("renders a preserved provider cancellation error on the auth prompt", () => {
    const cancellationMessage =
      "Cancelaste el ingreso con proveedor. Puedes intentar otra vez o usar correo y contrasena.";
    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={{
          body: "Guardamos tu seleccion: Reportar perdida.",
          error: cancellationMessage,
          intent: "lost",
          selectedIntentLabel: "Reportar perdida",
          title: "Inicia sesion para continuar",
        }}
        socialProviderActions={[
          {
            label: "Continuar con Google",
            provider: "google",
          },
        ]}
      />,
    );

    expect(findText(screen, cancellationMessage)).toBeTruthy();
  });

  it("keeps stacked email actions compact when a provider error is shown", () => {
    const screen = renderFunctionElement(
      <SignInPrompt
        actions={createPromptActions()}
        bottomInset={0}
        copy={createPromptCopy()}
        prompt={{
          body: "Guardamos tu seleccion: Reportar perdida.",
          error:
            "Cancelaste el ingreso con proveedor. Puedes intentar otra vez o usar correo y contrasena.",
          intent: "lost",
          selectedIntentLabel: "Reportar perdida",
          title: "Inicia sesion para continuar",
        }}
        socialProviderActions={[
          {
            label: "Continuar con Google",
            provider: "google",
          },
          {
            label: "Continuar con Facebook",
            provider: "facebook",
          },
        ]}
      />,
    );

    const signInAction = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Iniciar sesión"),
    );
    const createAccountAction = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Crear cuenta"),
    );

    expect(
      styleHasMaximumDimension(signInAction?.props.style, "minHeight", 54),
    ).toBe(true);
    expect(
      styleHasMaximumDimension(
        createAccountAction?.props.style,
        "minHeight",
        54,
      ),
    ).toBe(true);
  });
});

describe("ShellFirstRunTourHost", () => {
  it("suppresses a pending first-run tour while an auth prompt is active", () => {
    expect(
      shouldDisplayShellFirstRunTour({
        isSuppressed: true,
        isVisible: true,
        shouldShow: true,
      }),
    ).toBe(false);
  });

  it("keeps the first-run tour visible when pending and not suppressed", () => {
    expect(
      shouldDisplayShellFirstRunTour({
        isSuppressed: false,
        isVisible: true,
        shouldShow: true,
      }),
    ).toBe(true);
  });
});

describe("ReportActionSheet", () => {
  it("renders intentional Android report icons with accessible Spanish actions", () => {
    const actions = createReportActions();
    const screen = renderFunctionElement(
      <ReportActionSheet
        actions={actions}
        bottomInset={0}
        closeLabel="Cerrar"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        subtitle="Elige que quieres reportar"
        title="Reportar"
        visible
      />,
    );

    for (const action of actions) {
      const row = findElement(
        screen,
        (element) =>
          element.type === "Pressable" &&
          element.props.accessibilityLabel === action.label,
      );

      expect(row?.props.accessibilityRole).toBe("button");
      expect(row?.props.accessibilityHint).toBeTruthy();
    }

    expect(findDirectText(screen, "!")).toBe(true);
    expect(findDirectText(screen, "OK")).toBe(true);
    expect(findDirectText(screen, "o")).toBe(true);
    expect(findDirectText(screen, "<3")).toBe(true);
    expect(findDirectText(screen, ">")).toBe(true);
  });

  it("exposes close and backdrop dismissal as accessible actions", () => {
    const onClose = vi.fn();
    const screen = renderFunctionElement(
      <ReportActionSheet
        actions={createReportActions()}
        bottomInset={0}
        closeLabel="Cerrar"
        onClose={onClose}
        onSelect={vi.fn()}
        subtitle="Elige que quieres reportar"
        title="Reportar"
        visible
      />,
    );
    const modal = findElement(screen, (element) => element.type === "Modal");
    const closeButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Cerrar" &&
        styleHasMinimumDimension(element.props.style, "minHeight", 48),
    );
    const backdrop = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Cerrar panel de reporte",
    );

    getRequiredHandler(modal, "onRequestClose")();
    getRequiredHandler(closeButton, "onPress")();
    getRequiredHandler(backdrop, "onPress")();

    expect(modal?.props.transparent).toBe(true);
    expect(closeButton?.props.accessibilityRole).toBe("button");
    expect(
      styleHasMinimumDimension(closeButton?.props.style, "minWidth", 48),
    ).toBe(true);
    expect(backdrop?.props.accessibilityRole).toBe("button");
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("makes report type selection atomic across rapid duplicate taps", () => {
    const onSelect = vi.fn();
    const screen = renderFunctionElement(
      <ReportActionSheet
        actions={createReportActions()}
        bottomInset={0}
        closeLabel="Cerrar"
        onClose={vi.fn()}
        onSelect={onSelect}
        subtitle="Elige que quieres reportar"
        title="Reportar"
        visible
      />,
    );
    const lostAction = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Reportar pérdida",
    );

    const pressLostAction = getRequiredHandler(lostAction, "onPress");

    pressLostAction();
    pressLostAction();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("lost");
  });
});

describe("ShellFabHost", () => {
  it("keeps dense top-level tab content clear of the global Reportar button", () => {
    expect(
      shouldDisplayGlobalReportFab({
        isAuthPromptVisible: false,
        segments: ["(tabs)", "(activity)"],
        sessionKind: "visitor",
      }),
    ).toBe(false);
    expect(
      shouldDisplayGlobalReportFab({
        isAuthPromptVisible: false,
        segments: ["(tabs)", "(activity)"],
        sessionKind: "member",
      }),
    ).toBe(true);
    expect(
      shouldDisplayGlobalReportFab({
        isAuthPromptVisible: false,
        segments: ["(tabs)", "(nearby)"],
        sessionKind: "visitor",
      }),
    ).toBe(false);
    expect(
      shouldDisplayGlobalReportFab({
        isAuthPromptVisible: false,
        segments: ["(tabs)", "(resources)"],
        sessionKind: "member",
      }),
    ).toBe(false);
    expect(
      shouldDisplayGlobalReportFab({
        isAuthPromptVisible: false,
        segments: ["(tabs)", "(profile)"],
        sessionKind: "member",
      }),
    ).toBe(false);
  });

  it("routes a pending member report creation intent exactly once and clears it", () => {
    const clearPendingReportRouteIntent = vi.fn();

    reactEffects.repeatCount = 2;
    vi.mocked(useRastroShell).mockReturnValue(
      createMemberReportRouteShell({
        clearPendingReportRouteIntent,
        intent: "sighting",
        label: "Avistamiento",
        requestId: 42,
      }),
    );

    void renderFunctionElement(<ShellFabHost />);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/report-create/sighting");
    expect(clearPendingReportRouteIntent).toHaveBeenCalledTimes(1);
    expect(clearPendingReportRouteIntent).toHaveBeenCalledWith(42);
  });

  it("clears an auth return targeting the current report creation route without pushing a duplicate", () => {
    const clearAuthReturnTo = vi.fn();

    routerLocation.pathname = "/report-create/found";
    vi.mocked(useRastroShell).mockReturnValue(
      createMemberAuthReturnShell({
        authReturnTo: "/report-create/found",
        clearAuthReturnTo,
      }),
    );

    void renderFunctionElement(<ShellFabHost />);

    expect(router.push).not.toHaveBeenCalled();
    expect(clearAuthReturnTo).toHaveBeenCalledTimes(1);
  });

  it("routes an auth return targeting a different route once and clears it", () => {
    const clearAuthReturnTo = vi.fn();

    routerLocation.pathname = "/report-create/found";
    vi.mocked(useRastroShell).mockReturnValue(
      createMemberAuthReturnShell({
        authReturnTo: "/report-create/sighting",
        clearAuthReturnTo,
      }),
    );

    void renderFunctionElement(<ShellFabHost />);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/report-create/sighting");
    expect(clearAuthReturnTo).toHaveBeenCalledTimes(1);
  });
});

function createPromptActions() {
  return {
    onClose: vi.fn(),
    onContinueAsVisitor: vi.fn(),
    onCreateAccount: () => Promise.resolve({ ok: true }),
    onRequestPasswordReset: () => Promise.resolve({ ok: true }),
    onSignIn: () => Promise.resolve({ ok: true }),
    onSignInWithSocialProvider: () => Promise.resolve({ ok: true }),
  };
}

function createReportActions(): ShellReportAction[] {
  return [
    {
      icon: "megaphone.fill",
      intent: "lost",
      label: "Reportar pérdida",
      memberOnly: true,
      tone: "lost",
    },
    {
      icon: "checkmark.seal.fill",
      intent: "found",
      label: "Reportar encontrada",
      memberOnly: true,
      tone: "found",
    },
    {
      icon: "eye.fill",
      intent: "sighting",
      label: "Reportar avistamiento",
      memberOnly: true,
      tone: "sighting",
    },
    {
      icon: "heart.fill",
      intent: "adoption",
      label: "Dar en adopción",
      memberOnly: true,
      tone: "adoption",
    },
  ];
}

function createMemberReportRouteShell({
  clearPendingReportRouteIntent,
  intent,
  label,
  requestId,
}: {
  clearPendingReportRouteIntent: (requestId?: number) => void;
  intent: ShellReportAction["intent"];
  label: string;
  requestId: number;
}): ReturnType<typeof useRastroShell> {
  return {
    chooseReportIntent: vi.fn(),
    clearAuthReturnTo: vi.fn(),
    clearPendingReportRouteIntent,
    closeReportActions: vi.fn(),
    continueAsVisitor: vi.fn(),
    copy: {
      authPrompt: createPromptCopy(),
      shell: {
        close: "Cerrar",
        reportFabLabel: "Reportar",
        reportSheetSubtitle: "Elige que quieres reportar",
        reportSheetTitle: "Reportar",
      },
    },
    createAccountFromPrompt: vi.fn(),
    dismissAuthPrompt: vi.fn(),
    model: {
      reportActions: [
        {
          icon: "eye.fill",
          intent,
          label,
          memberOnly: true,
          tone: intent,
        },
      ],
    },
    openReportActions: vi.fn(),
    initiateAccountDeletion: vi.fn(),
    requestAuthPrompt: vi.fn(),
    requestMemberPasswordReset: vi.fn(),
    requestPasswordResetFromPrompt: vi.fn(),
    session: {
      id: "member-camila",
      kind: "member",
      name: "Camila",
    },
    signOutMember: vi.fn(),
    signInFromPrompt: vi.fn(),
    signInWithSocialProviderFromPrompt: vi.fn(),
    socialProviderActions: [],
    state: {
      activeSheet: null,
      authPrompt: null,
      authReturnTo: null,
      pendingReportRouteIntent: {
        intent,
        label,
        requestId,
      },
    },
  } as unknown as ReturnType<typeof useRastroShell>;
}

function createMemberAuthReturnShell({
  authReturnTo,
  clearAuthReturnTo,
}: {
  authReturnTo: string;
  clearAuthReturnTo: () => void;
}): ReturnType<typeof useRastroShell> {
  return {
    chooseReportIntent: vi.fn(),
    clearAuthReturnTo,
    clearPendingReportRouteIntent: vi.fn(),
    closeReportActions: vi.fn(),
    continueAsVisitor: vi.fn(),
    copy: {
      authPrompt: createPromptCopy(),
      shell: {
        close: "Cerrar",
        reportFabLabel: "Reportar",
        reportSheetSubtitle: "Elige que quieres reportar",
        reportSheetTitle: "Reportar",
      },
    },
    createAccountFromPrompt: vi.fn(),
    dismissAuthPrompt: vi.fn(),
    model: {
      reportActions: createReportActions(),
    },
    openReportActions: vi.fn(),
    initiateAccountDeletion: vi.fn(),
    requestAuthPrompt: vi.fn(),
    requestMemberPasswordReset: vi.fn(),
    requestPasswordResetFromPrompt: vi.fn(),
    session: {
      id: "member-camila",
      kind: "member",
      name: "Camila",
    },
    signOutMember: vi.fn(),
    signInFromPrompt: vi.fn(),
    signInWithSocialProviderFromPrompt: vi.fn(),
    socialProviderActions: [],
    state: {
      activeSheet: null,
      authPrompt: null,
      authReturnTo,
      pendingReportRouteIntent: null,
    },
  } as unknown as ReturnType<typeof useRastroShell>;
}

function createPromptCopy() {
  return {
    authFailedLabel: "No pudimos completar el ingreso.",
    closeLabel: "Cerrar",
    createAccountLabel: "Crear cuenta",
    createAccountHelp:
      "Crea una cuenta con correo, contraseña y un nombre público para tus reportes.",
    createAccountPendingLabel: "Creando cuenta",
    continueAsVisitorLabel: "Continuar como visitante",
    emailLabel: "Correo",
    emailPlaceholder: "tu-correo@ejemplo.com",
    formHelp: "Usa correo y contraseña para una cuenta Rastro.",
    missingCredentialsLabel: "Ingresa correo y contraseña.",
    missingNameLabel: "Ingresa un nombre público para crear tu cuenta.",
    nameLabel: "Nombre público",
    namePlaceholder: "Tu nombre público",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "Tu contraseña",
    passwordResetBackLabel: "Volver a iniciar sesión",
    passwordResetLabel: "Olvidé mi contraseña",
    passwordResetPendingLabel: "Enviando enlace",
    passwordResetSubmitLabel: "Enviar enlace",
    passwordResetSuccessLabel: "Revisa tu correo para cambiar tu contraseña.",
    passwordResetHelp:
      "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.",
    signInLabel: "Iniciar sesión",
    signInModeLabel: "Ya tengo cuenta",
    signInPendingLabel: "Iniciando sesión",
    socialAuthHelp: "También puedes acceder con:",
    socialProviderPendingLabel: (providerLabel: string) =>
      `${providerLabel}...`,
  };
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  let current = node;

  while (
    React.isValidElement<ElementProps>(current) &&
    typeof current.type === "function"
  ) {
    const Component = current.type as (props: ElementProps) => React.ReactNode;

    current = Component(current.props);
  }

  return current;
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

function findDirectText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered === text;
  }

  if (typeof rendered === "number") {
    return String(rendered) === text;
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  if (elementContainsExactText(rendered, text)) {
    return true;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findDirectText(child, text),
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

function getRequiredHandler(
  element: TestElement | undefined,
  propName: "onPress" | "onRequestClose",
) {
  const handler = element?.props[propName];

  if (typeof handler !== "function") {
    throw new Error(`Expected ${propName} handler.`);
  }

  return handler as () => void;
}

function elementContainsExactText(element: TestElement, text: string): boolean {
  return React.Children.toArray(element.props.children).some((child) => {
    if (typeof child === "string") {
      return child === text;
    }

    if (typeof child === "number") {
      return String(child) === text;
    }

    return false;
  });
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

function styleHasMinimumDimension(
  style: unknown,
  key: "minHeight" | "minWidth",
  minimumValue: number,
): boolean {
  const resolvedStyle = resolveStyle(style);

  if (resolvedStyle !== style) {
    return styleHasMinimumDimension(resolvedStyle, key, minimumValue);
  }

  if (Array.isArray(style)) {
    return style.some((item) =>
      styleHasMinimumDimension(item, key, minimumValue),
    );
  }

  if (!style || typeof style !== "object") {
    return false;
  }

  const value = (style as Record<string, unknown>)[key];

  return typeof value === "number" && value >= minimumValue;
}

function styleHasMaximumDimension(
  style: unknown,
  key: "minHeight" | "minWidth",
  maximumValue: number,
): boolean {
  const resolvedStyle = resolveStyle(style);

  if (resolvedStyle !== style) {
    return styleHasMaximumDimension(resolvedStyle, key, maximumValue);
  }

  if (Array.isArray(style)) {
    return style.some((item) =>
      styleHasMaximumDimension(item, key, maximumValue),
    );
  }

  if (!style || typeof style !== "object") {
    return false;
  }

  const value = (style as Record<string, unknown>)[key];

  return typeof value === "number" && value <= maximumValue;
}

function resolveStyle(style: unknown): unknown {
  if (typeof style === "function") {
    return (style as (state: { pressed: boolean }) => unknown)({
      pressed: false,
    });
  }

  return style;
}
