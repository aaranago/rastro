import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdoptionRoute from "../../app/(tabs)/(nearby)/adopciones/[listingId]";
import SightingRoute from "../../app/(tabs)/(nearby)/reportes/avistamientos/[reportId]";
import FoundRoute from "../../app/(tabs)/(nearby)/reportes/encontrados/[reportId]";
import LostRoute from "../../app/(tabs)/(nearby)/reportes/perdidos/[reportId]";

(globalThis as { React?: typeof React }).React = React;

const params = vi.hoisted(() => ({
  value: {
    listingId: "adoption-report-1",
    reportId: "lost-report-1",
  } as {
    listingId: string;
    reportId: string;
    reportar?: string;
  },
}));

const detail = vi.hoisted(() => ({
  adapter: {
    getReportDetail: vi.fn(),
  },
  capturedProps: [] as Record<string, unknown>[],
  createApiPublicReportDetailAdapter: vi.fn(),
}));

const api = vi.hoisted(() => ({
  trpcClient: {
    report: {
      detail: {
        query: vi.fn(),
      },
    },
  },
}));

vi.mock("expo-router", () => ({
  useLocalSearchParams: () => params.value,
}));

vi.mock("~/utils/api", () => ({
  trpcClient: api.trpcClient,
}));

vi.mock("~/features/reports/public-report-detail", () => {
  detail.createApiPublicReportDetailAdapter.mockReturnValue(detail.adapter);

  return {
    createApiPublicReportDetailAdapter:
      detail.createApiPublicReportDetailAdapter,
  };
});

vi.mock("~/features/reports/public-report-detail-screen", () => ({
  PublicReportDetailScreen: (props: Record<string, unknown>) => {
    detail.capturedProps.push(props);

    return React.createElement("PublicReportDetailScreen", props);
  },
}));

vi.mock("~/features/lost-reports/public-lost-report-deep-link-screen", () => ({
  PublicLostReportDeepLinkScreen: (props: Record<string, unknown>) =>
    React.createElement("PublicLostReportDeepLinkScreen", props),
}));

vi.mock("~/features/found-reports", () => ({
  PublicFoundReportDeepLinkScreen: (props: Record<string, unknown>) =>
    React.createElement("PublicFoundReportDeepLinkScreen", props),
}));

vi.mock("~/features/sighting-reports/public-sighting-report-deep-link-screen", () => ({
  PublicSightingReportDeepLinkScreen: (props: Record<string, unknown>) =>
    React.createElement("PublicSightingReportDeepLinkScreen", props),
}));

vi.mock("~/features/adoption-listings/public-adoption-listing-deep-link-screen", () => ({
  PublicAdoptionListingDeepLinkScreen: (props: Record<string, unknown>) =>
    React.createElement("PublicAdoptionListingDeepLinkScreen", props),
}));

describe("public report detail routes", () => {
  beforeEach(() => {
    detail.capturedProps = [];
    params.value = {
      listingId: "adoption-report-1",
      reportId: "lost-report-1",
    };
  });

  it("routes lost, found, sighting, and adoption links through the API detail screen", () => {
    void renderFunctionElements(<LostRoute />);
    void renderFunctionElements(<FoundRoute />);
    void renderFunctionElements(<SightingRoute />);
    void renderFunctionElements(<AdoptionRoute />);

    expect(detail.createApiPublicReportDetailAdapter).toHaveBeenCalledWith({
      client: api.trpcClient,
    });
    expect(detail.capturedProps).toMatchObject([
      {
        adapter: detail.adapter,
        expectedType: "lost_pet",
        reportId: "lost-report-1",
      },
      {
        adapter: detail.adapter,
        expectedType: "found_pet",
        reportId: "lost-report-1",
      },
      {
        adapter: detail.adapter,
        expectedType: "sighting",
        reportId: "lost-report-1",
      },
      {
        adapter: detail.adapter,
        expectedType: "adoption",
        reportId: "adoption-report-1",
      },
    ]);
  });

  it("opens the abuse report sheet when the public route receives reportar=1", () => {
    params.value = {
      listingId: "adoption-report-1",
      reportId: "lost-report-1",
      reportar: "1",
    };

    void renderFunctionElements(<LostRoute />);
    void renderFunctionElements(<AdoptionRoute />);

    expect(detail.capturedProps).toMatchObject([
      {
        expectedType: "lost_pet",
        openReportAbuseOnLoad: true,
        reportId: "lost-report-1",
      },
      {
        expectedType: "adoption",
        openReportAbuseOnLoad: true,
        reportId: "adoption-report-1",
      },
    ]);
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
