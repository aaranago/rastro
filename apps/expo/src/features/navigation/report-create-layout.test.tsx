import type * as ReactModule from "react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("~/features/shell/shell-theme", () => ({
  shellColors: {
    background: "#FFFFFF",
  },
}));

describe("ReportCreateLayout", () => {
  it("binds native stack options to the concrete report creation routes", async () => {
    vi.stubGlobal("React", React);
    const { default: ReportCreateLayout } = await import(
      "../../app/report-create/_layout"
    );

    const screen = renderElement(<ReportCreateLayout />);
    const stack = findElement(screen, (element) => element.type === "Stack");
    const routes = findElements(
      screen,
      (element) => element.type === "Stack.Screen",
    );

    expect(stack?.props.screenOptions).toMatchObject({
      contentStyle: {
        backgroundColor: "#FFFFFF",
      },
      gestureEnabled: true,
      headerShown: false,
      presentation: "card",
    });
    expect(routes.map((route) => route.props.name)).toEqual([
      "lost",
      "found",
      "sighting",
      "adoption",
    ]);
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
  return findElements(node, predicate)[0];
}

function findElements(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement[] {
  const rendered = renderFunctionElement(node);

  if (!React.isValidElement<ElementProps>(rendered)) {
    return [];
  }

  const matches = predicate(rendered) ? [rendered] : [];

  for (const child of React.Children.toArray(rendered.props.children)) {
    matches.push(...findElements(child, predicate));
  }

  return matches;
}
