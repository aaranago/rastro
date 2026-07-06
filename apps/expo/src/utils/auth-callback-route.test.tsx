import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MobileAuthCallbackRoute from "../app/auth/callback";

(globalThis as { React?: typeof React }).React = React;

const callbackParams = vi.hoisted(() => ({
  value: {} as Record<string, string | string[] | undefined>,
}));

const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  completeMobileAuthCallback: vi.fn(),
  mobileAuthCallbackRedirectHref: "/(tabs)/(nearby)",
}));

const appState = vi.hoisted(() => ({
  capturedProps: [] as Record<string, unknown>[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => {
      effect();
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useState: <TValue,>(initialValue: TValue | (() => TValue)) => {
      const value =
        typeof initialValue === "function"
          ? (initialValue as () => TValue)()
          : initialValue;

      return [value, vi.fn()];
    },
  };
});

vi.mock("expo-router", () => ({
  router,
  useLocalSearchParams: () => callbackParams.value,
}));

vi.mock("~/features/app-states", () => ({
  AppStateScreen: (props: Record<string, unknown>) => {
    appState.capturedProps.push(props);

    return React.createElement("AppStateScreen", props);
  },
}));

vi.mock("~/utils/auth", () => auth);

describe("MobileAuthCallbackRoute", () => {
  beforeEach(() => {
    callbackParams.value = {};
    appState.capturedProps = [];
    router.replace.mockReset();
    auth.completeMobileAuthCallback.mockReset();
    auth.completeMobileAuthCallback.mockReturnValue({ ok: true });
  });

  it("replaces successful callbacks to the concrete nearby tab route", () => {
    callbackParams.value = {
      cookie: "better-auth.session_token=abc",
      transaction: "transaction-1",
    };

    void renderFunctionElements(<MobileAuthCallbackRoute />);

    expect(auth.completeMobileAuthCallback).toHaveBeenCalledWith({
      cookie: "better-auth.session_token=abc",
      error: undefined,
      error_description: undefined,
      message: undefined,
      transaction: "transaction-1",
    });
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/(nearby)");
    expect(router.replace).not.toHaveBeenCalledWith("/");
  });

  it("replaces recovery actions to the concrete nearby tab route", () => {
    auth.completeMobileAuthCallback.mockReturnValue({
      message: "No pudimos completar el ingreso.",
      ok: false,
      reason: "failed",
    });
    callbackParams.value = {
      error: "Provider not found",
    };

    void renderFunctionElements(<MobileAuthCallbackRoute />);
    router.replace.mockClear();

    const onActionPress = appState.capturedProps[0]?.onActionPress as
      | (() => void)
      | undefined;

    if (typeof onActionPress !== "function") {
      throw new Error("Expected auth callback recovery action.");
    }

    onActionPress();

    expect(router.replace).toHaveBeenCalledWith("/(tabs)/(nearby)");
    expect(router.replace).not.toHaveBeenCalledWith("/");
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function renderFunctionElements(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  const rendered =
    typeof node.type === "function"
      ? renderFunctionComponent(node)
      : node.props.children;

  React.Children.forEach(rendered, (child) => {
    void renderFunctionElements(child);
  });

  return node;
}

function renderFunctionComponent(node: React.ReactElement<ElementProps>) {
  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return Component(node.props);
}
