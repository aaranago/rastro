import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  MemberProfileMemberSession,
  MemberProfileRepository,
  MemberProfileSettings,
} from "./member-profile";
import { MemberProfileSettingsScreen } from "./member-profile-settings-screen";

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
      reactState.pendingEffects.push(effect);
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
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

vi.mock("../shell/shell-overlays", () => ({
  ShellIcon: "ShellIcon",
}));

const member: MemberProfileMemberSession = {
  displayName: "Camila",
  email: "camila@example.com",
  kind: "member",
  memberId: "member-camila",
};

describe("MemberProfileSettingsScreen", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.effectCursor = 0;
    reactState.effects = [];
    reactState.pendingEffects = [];
    reactState.values = [];
  });

  it("loads backend values and saves only after backend confirmation", async () => {
    const update = createDeferred<MemberProfileSettings>();
    const onSaved = vi.fn();
    const repository = createScreenRepository({
      get: createSettings({
        displayName: "Camila Backend",
        phone: "+591 70123456",
        whatsapp: "+591 71234567",
      }),
      update: update.promise,
    });

    let screen = renderSettingsScreen({ onSaved, repository });
    runPendingEffects();
    await flushPromises();
    screen = renderSettingsScreen({ onSaved, repository });

    expect(repository.getSettings).toHaveBeenCalledWith(member);
    expect(
      getElementByTestID(screen, "member-profile-display-name-input").props
        .value,
    ).toBe("Camila Backend");

    changeText(
      screen,
      "member-profile-display-name-input",
      "Camila Confirmada",
    );
    changeText(screen, "member-profile-phone-input", "+591 75555555");
    press(screen, "member-profile-contact-preference-both");
    screen = renderSettingsScreen({ onSaved, repository });

    press(screen, "member-profile-save-button");

    expect(repository.updateSettings).toHaveBeenCalledWith(member, {
      defaultContactPreference: "both",
      displayName: "Camila Confirmada",
      phone: "+591 75555555",
      whatsapp: "+591 71234567",
    });
    expect(onSaved).not.toHaveBeenCalled();

    update.resolve(
      createSettings({
        defaultContactPreference: "both",
        displayName: "Camila Confirmada",
        phone: "+591 75555555",
        whatsapp: "+591 71234567",
      }),
    );
    await flushPromises();
    screen = renderSettingsScreen({ onSaved, repository });

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Camila Confirmada",
      }),
    );
    expect(findText(screen, "Ajustes guardados en Rastro.")).toBe(true);
    expect(
      getElementByTestID(screen, "member-profile-display-name-input").props
        .value,
    ).toBe("Camila Confirmada");
  });

  it("shows validation copy and does not call the backend for invalid input", async () => {
    const repository = createScreenRepository();

    let screen = renderSettingsScreen({ repository });
    runPendingEffects();
    await flushPromises();
    screen = renderSettingsScreen({ repository });

    changeText(screen, "member-profile-display-name-input", "   ");
    screen = renderSettingsScreen({ repository });
    press(screen, "member-profile-save-button");
    screen = renderSettingsScreen({ repository });

    expect(repository.updateSettings).not.toHaveBeenCalled();
    expect(findText(screen, "Ingresa tu nombre público.")).toBe(true);
  });

  it("prompts visitors to sign in without showing the editable form", () => {
    const onRequestSignIn = vi.fn();
    const repository = createScreenRepository();
    const screen = renderSettingsScreen({
      onRequestSignIn,
      repository,
      session: { kind: "visitor" },
    });

    expect(findText(screen, "Cuenta requerida")).toBe(true);
    expect(
      findElementByTestID(screen, "member-profile-display-name-input"),
    ).toBeUndefined();

    press(screen, "member-profile-sign-in-button");

    expect(onRequestSignIn).toHaveBeenCalledOnce();
    expect(repository.getSettings).not.toHaveBeenCalled();
  });

  it("shows backend failure copy without replacing the loaded draft", async () => {
    const repository = createScreenRepository({
      update: Promise.reject(
        Object.assign(new Error("validation failed"), {
          data: { code: "BAD_REQUEST" },
        }),
      ),
    });

    let screen = renderSettingsScreen({ repository });
    runPendingEffects();
    await flushPromises();
    screen = renderSettingsScreen({ repository });

    changeText(screen, "member-profile-display-name-input", "Camila Nueva");
    screen = renderSettingsScreen({ repository });
    press(screen, "member-profile-save-button");
    await flushPromises();
    screen = renderSettingsScreen({ repository });

    expect(
      findText(
        screen,
        "El backend rechazó los datos. Revisa tu nombre y teléfonos.",
      ),
    ).toBe(true);
    expect(
      getElementByTestID(screen, "member-profile-display-name-input").props
        .value,
    ).toBe("Camila Nueva");
  });

  it("shows offline failure copy when saving cannot reach the backend", async () => {
    const repository = createScreenRepository({
      update: Promise.reject(new Error("Network request failed")),
    });

    let screen = renderSettingsScreen({ repository });
    runPendingEffects();
    await flushPromises();
    screen = renderSettingsScreen({ repository });

    press(screen, "member-profile-save-button");
    await flushPromises();
    screen = renderSettingsScreen({ repository });

    expect(
      findText(
        screen,
        "No pudimos guardar tus ajustes. Revisa tu conexión e intenta de nuevo.",
      ),
    ).toBe(true);
  });

  it("does not render a fallback form when initial backend loading fails", async () => {
    const repository = createScreenRepository({
      getError: new Error("Network request failed"),
    });

    let screen = renderSettingsScreen({ repository });
    runPendingEffects();
    await flushPromises();
    screen = renderSettingsScreen({ repository });

    expect(
      findText(
        screen,
        "No pudimos cargar tus ajustes. Revisa tu conexión e intenta de nuevo.",
      ),
    ).toBe(true);
    expect(
      findElementByTestID(screen, "member-profile-display-name-input"),
    ).toBeUndefined();
  });
});

function renderSettingsScreen({
  onRequestSignIn,
  onSaved,
  repository,
  session = member,
}: {
  onRequestSignIn?: () => void;
  onSaved?: (settings: MemberProfileSettings) => void;
  repository: MemberProfileRepository;
  session?: MemberProfileMemberSession | { kind: "visitor" };
}) {
  reactState.cursor = 0;
  reactState.effectCursor = 0;

  return renderFunctionElement(
    <MemberProfileSettingsScreen
      onRequestSignIn={onRequestSignIn}
      onSaved={onSaved}
      repository={repository}
      session={session}
    />,
  );
}

function runPendingEffects() {
  const effects = [...reactState.pendingEffects];
  reactState.pendingEffects = [];

  for (const effect of effects) {
    effect();
  }
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function createScreenRepository(
  overrides: Partial<{
    get: MemberProfileSettings;
    getError: Error;
    update: MemberProfileSettings | Promise<MemberProfileSettings>;
  }> = {},
): MemberProfileRepository {
  const fallbackSettings = createSettings();

  return {
    getSettings: vi.fn<MemberProfileRepository["getSettings"]>(() =>
      overrides.getError
        ? Promise.reject(overrides.getError)
        : Promise.resolve(overrides.get ?? fallbackSettings),
    ),
    updateSettings: vi.fn<MemberProfileRepository["updateSettings"]>(() =>
      Promise.resolve(overrides.update ?? fallbackSettings),
    ),
  };
}

function createSettings(
  overrides: Partial<MemberProfileSettings> = {},
): MemberProfileSettings {
  return {
    defaultContactPreference: "whatsapp",
    displayName: "Camila",
    memberId: "member-camila",
    phone: "+591 70123456",
    updatedAt: "2026-06-30T13:00:00.000Z",
    whatsapp: "+591 71234567",
    ...overrides,
  };
}

function createDeferred<TValue>() {
  let resolveValue: (value: TValue) => void = () => undefined;
  let rejectValue: (error: unknown) => void = () => undefined;
  const promise = new Promise<TValue>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });

  return {
    promise,
    reject: rejectValue,
    resolve: resolveValue,
  };
}

function changeText(node: React.ReactNode, testID: string, value: string) {
  const element = getElementByTestID(node, testID);

  if (typeof element.props.onChangeText !== "function") {
    throw new Error("Expected text input to expose onChangeText.");
  }

  (element.props.onChangeText as (nextValue: string) => void)(value);
}

function press(node: React.ReactNode, testID: string) {
  const element = getElementByTestID(node, testID);

  if (typeof element.props.onPress !== "function") {
    throw new Error("Expected pressable element to expose onPress.");
  }

  (element.props.onPress as () => void)();
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

function getElementByTestID(
  node: React.ReactNode,
  testID: string,
): TestElement {
  const element = findElementByTestID(node, testID);

  if (!element) {
    throw new Error(`Expected testID ${testID} to exist.`);
  }

  return element;
}

function findElementByTestID(
  node: React.ReactNode,
  testID: string,
): TestElement | undefined {
  return findElement(node, (element) => element.props.testID === testID);
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
