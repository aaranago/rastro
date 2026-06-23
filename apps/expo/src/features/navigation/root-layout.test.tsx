import type * as ReactModule from "react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", async () => {
  const React = await vi.importActual<typeof ReactModule>("react");

  return {
    QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement("QueryClientProvider", null, children),
  };
});

vi.mock("expo-router/stack", async () => {
  const React = await vi.importActual<typeof ReactModule>("react");
  const Stack = Object.assign(
    ({ children, ...props }: StackProps) =>
      React.createElement("Stack", props, children),
    {
      Screen: (props: StackScreenProps) =>
        React.createElement("Stack.Screen", props),
    },
  );

  return {
    default: Stack,
  };
});

vi.mock("expo-status-bar", async () => {
  const React = await vi.importActual<typeof ReactModule>("react");

  return {
    StatusBar: (props: Record<string, unknown>) =>
      React.createElement("StatusBar", props),
  };
});

vi.mock("~/features/shell/shell-provider", async () => {
  const React = await vi.importActual<typeof ReactModule>("react");

  return {
    RastroShellProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement("RastroShellProvider", null, children),
  };
});

vi.mock("~/features/shell/shell-theme", () => ({
  shellColors: {
    background: "#FFFFFF",
  },
}));

vi.mock("~/utils/api", () => ({
  queryClient: {},
}));

describe("RootLayout", () => {
  it("allows native route removal gestures for report creation routes", async () => {
    vi.stubGlobal("React", React);
    const { default: RootLayout } = await import("../../app/_layout");
    const screen = renderElement(<RootLayout />);
    const reportCreateRoute = findElement(
      screen,
      (element) =>
        element.type === "Stack.Screen" &&
        element.props.name === "report-create",
    );

    expect(reportCreateRoute?.props.options).toMatchObject({
      gestureEnabled: true,
      headerShown: false,
      presentation: "card",
    });
  });
});

interface StackProps {
  children?: React.ReactNode;
  screenOptions?: Record<string, unknown>;
}

interface StackScreenProps {
  name: string;
  options?: Record<string, unknown>;
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function renderElement(node: React.ReactNode): React.ReactNode {
  return renderFunctionElement(node);
}

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
