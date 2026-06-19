import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { SignInPrompt } from "./shell-overlays";

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
    expect(findText(screen, "Contrasena")).toBeTruthy();
    expect(findText(screen, "Iniciar sesion")).toBeTruthy();
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
    expect(findText(screen, "Contrasena")).toBeTruthy();
    expect(findText(screen, "Iniciar sesion")).toBeTruthy();
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
});

function createPromptActions() {
  return {
    onClose: vi.fn(),
    onContinueAsVisitor: vi.fn(),
    onCreateAccount: () => Promise.resolve({ ok: true }),
    onSignIn: () => Promise.resolve({ ok: true }),
    onSignInWithSocialProvider: () => Promise.resolve({ ok: true }),
  };
}

function createPromptCopy() {
  return {
    authFailedLabel: "No pudimos completar el ingreso.",
    closeLabel: "Cerrar",
    createAccountLabel: "Crear cuenta",
    createAccountPendingLabel: "Creando cuenta",
    continueAsVisitorLabel: "Continuar como visitante",
    emailLabel: "Correo",
    emailPlaceholder: "tu-correo@ejemplo.com",
    formHelp: "Usa correo y contrasena para una cuenta Rastro.",
    missingCredentialsLabel: "Ingresa correo y contrasena.",
    nameLabel: "Nombre publico",
    namePlaceholder: "Opcional para crear cuenta",
    passwordLabel: "Contrasena",
    passwordPlaceholder: "Tu contrasena",
    signInLabel: "Iniciar sesion",
    signInPendingLabel: "Iniciando sesion",
    socialAuthHelp: "Tambien puedes acceder con:",
    socialProviderPendingLabel: (providerLabel: string) =>
      `${providerLabel}...`,
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

  return Component(node.props);
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
