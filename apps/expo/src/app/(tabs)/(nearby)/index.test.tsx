import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import NearbyRoute from "./index";

(globalThis as { React?: typeof React }).React = React;

const router = vi.hoisted(() => ({
  push: vi.fn(),
}));

const nearby = vi.hoisted(() => ({
  apiAdapter: {
    searchLostPetReports: vi.fn(),
  },
  cachedAdapter: {
    searchLostPetReports: vi.fn(),
  },
  capturedProps: null as Record<string, unknown> | null,
  createApiNearbyLostReportsAdapter: vi.fn(),
  createCachedNearbyLostReportsAdapter: vi.fn(),
}));

const cache = vi.hoisted(() => ({
  value: {
    read: vi.fn(),
    write: vi.fn(),
  },
  createInMemoryLastLoadedCache: vi.fn(),
}));

const api = vi.hoisted(() => ({
  trpcClient: {
    report: {
      nearby: {
        query: vi.fn(),
      },
    },
  },
}));

vi.mock("react-native", () => ({
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  View: "View",
}));

vi.mock("expo-router", () => ({
  useRouter: () => router,
}));

vi.mock("~/features/nearby", () => {
  nearby.createApiNearbyLostReportsAdapter.mockReturnValue(nearby.apiAdapter);
  nearby.createCachedNearbyLostReportsAdapter.mockReturnValue(
    nearby.cachedAdapter,
  );

  return {
    createApiNearbyLostReportsAdapter: nearby.createApiNearbyLostReportsAdapter,
    createCachedNearbyLostReportsAdapter:
      nearby.createCachedNearbyLostReportsAdapter,
    NearbyScreen: (props: Record<string, unknown>) => {
      nearby.capturedProps = props;

      return React.createElement("NearbyScreen", props);
    },
  };
});

vi.mock("~/features/resilience/last-loaded-cache", () => {
  cache.createInMemoryLastLoadedCache.mockReturnValue(cache.value);

  return {
    createInMemoryLastLoadedCache: cache.createInMemoryLastLoadedCache,
  };
});

vi.mock("~/features/shell/shell-screens", () => ({
  NearbyShellStateBridge: () => React.createElement("NearbyShellStateBridge"),
}));

vi.mock("~/features/shell/shell-theme", () => ({
  shellColors: {
    background: "#fff",
  },
}));

vi.mock("~/utils/api", () => ({
  trpcClient: api.trpcClient,
}));

describe("Nearby production route", () => {
  it("passes the API-backed nearby adapter instead of relying on fixture defaults", () => {
    void renderFunctionElements(NearbyRoute());

    expect(nearby.createApiNearbyLostReportsAdapter).toHaveBeenCalledWith({
      client: api.trpcClient,
    });
    expect(cache.createInMemoryLastLoadedCache).toHaveBeenCalled();
    expect(nearby.createCachedNearbyLostReportsAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: cache.value,
        source: nearby.apiAdapter,
      }),
    );
    expect(nearby.capturedProps?.adapter).toBe(nearby.cachedAdapter);
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
