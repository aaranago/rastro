import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import NearbyRoute from "../../app/(tabs)/(nearby)";

(globalThis as { React?: typeof React }).React = React;

const router = vi.hoisted(() => ({
  push: vi.fn(),
}));
const reactState = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
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
const resources = vi.hoisted(() => ({
  adapter: {
    getActiveSponsorPlacements: vi.fn().mockResolvedValue({ providers: [] }),
    recordSponsorDelivery: vi.fn().mockResolvedValue({ status: "recorded" }),
  },
  buildResourceProviderProfileHref: vi.fn(
    (providerId: string) => `/proveedores/${providerId}`,
  ),
  createApiResourcesAdapter: vi.fn(),
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

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => {
      effect();
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useState: <TValue,>(initialValue: TValue) => {
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

vi.mock("~/features/resources", () => ({
  buildResourceProviderProfileHref: resources.buildResourceProviderProfileHref,
}));

vi.mock("~/features/resources/resources-api-adapter", () => {
  resources.createApiResourcesAdapter.mockReturnValue(resources.adapter);

  return {
    createApiResourcesAdapter: resources.createApiResourcesAdapter,
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
    reactState.cursor = 0;
    reactState.values = [];

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
    expect(resources.createApiResourcesAdapter).toHaveBeenCalledWith({
      client: api.trpcClient,
    });
    expect(resources.adapter.getActiveSponsorPlacements).toHaveBeenCalledWith({
      limit: 3,
      surface: "launch_home_banner",
    });
    expect(nearby.capturedProps?.launchSponsorProviders).toEqual([]);

    const onOpenSponsorProvider = nearby.capturedProps?.onOpenSponsorProvider;

    if (typeof onOpenSponsorProvider !== "function") {
      throw new Error("Expected sponsor provider navigation callback.");
    }

    const openSponsorProvider = onOpenSponsorProvider as (
      providerId: string,
    ) => void;

    openSponsorProvider("11111111-1111-4111-8111-111111111111");
    expect(resources.buildResourceProviderProfileHref).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(router.push).toHaveBeenCalledWith(
      "/proveedores/11111111-1111-4111-8111-111111111111",
    );

    const onRecordSponsorDelivery =
      nearby.capturedProps?.onRecordSponsorDelivery;

    if (typeof onRecordSponsorDelivery !== "function") {
      throw new Error("Expected sponsor delivery callback.");
    }

    const recordSponsorDelivery = onRecordSponsorDelivery as (input: {
      eventType: "impression" | "open";
      idempotencyKey?: string;
      providerId: string;
      source: string;
      surface: "launch_home_banner";
    }) => void;

    recordSponsorDelivery({
      eventType: "impression",
      idempotencyKey:
        "launch-home:session-1:11111111-1111-4111-8111-111111111111:impression",
      providerId: "11111111-1111-4111-8111-111111111111",
      source: "nearby-launch-banner",
      surface: "launch_home_banner",
    });
    expect(resources.adapter.recordSponsorDelivery).toHaveBeenCalledWith({
      eventType: "impression",
      idempotencyKey:
        "launch-home:session-1:11111111-1111-4111-8111-111111111111:impression",
      providerId: "11111111-1111-4111-8111-111111111111",
      source: "nearby-launch-banner",
      surface: "launch_home_banner",
    });
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
