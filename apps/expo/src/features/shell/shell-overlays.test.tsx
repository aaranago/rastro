import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  shouldDisplayGlobalReportFab,
  shouldDisplayShellFirstRunTour,
  SignInPrompt,
} from "./shell-overlays";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    memo: <TComponent,>(component: TComponent) => component,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: () => undefined,
    useMemo: <TValue,>(factory: () => TValue) => factory(),
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
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
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

describe("ShellFabHost", () => {
  it("keeps the visitor Activity empty-state CTA clear of the global Reportar button", () => {
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
    ).toBe(true);
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
