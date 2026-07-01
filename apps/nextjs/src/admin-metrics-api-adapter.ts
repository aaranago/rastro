import { headers } from "next/headers";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

export interface AdminMetricsSummary {
  abuseReportCount: number;
  activeSponsorPlacementCount: number;
  auditEventCount: number;
  hiddenContentCount: number;
  pendingModerationCount: number;
  resourceProviderCount: number;
  sponsorImpressionCount: number;
  sponsorOpenCount: number;
  suspendedMemberCount: number;
  verifiedResourceProviderCount: number;
}

export interface AdminMetricsLocationRow {
  abuseReportCount: number;
  activeSponsorPlacementCount: number;
  auditEventCount: number;
  city?: string | null;
  department: string;
  hiddenContentCount: number;
  pendingModerationCount: number;
  resourceProviderCount: number;
  sponsorImpressionCount: number;
  sponsorOpenCount: number;
  suspendedMemberCount: number;
  verifiedResourceProviderCount: number;
}

export interface AdminMetricsOverview {
  byCity: AdminMetricsLocationRow[];
  byDepartment: AdminMetricsLocationRow[];
  generatedAt?: Date | string | null;
  summary: AdminMetricsSummary;
}

export type AdminMetricsOverviewState =
  | {
      metrics: AdminMetricsOverview;
      status: "ready";
    }
  | {
      message: string;
      status: "error";
    };

interface ExpectedAdminMetricsCaller {
  admin: {
    metrics?: {
      overview?: () => Promise<AdminMetricsOverview>;
      summary?: () => Promise<AdminMetricsOverview>;
    };
  };
}

export async function getAdminMetricsOverview(): Promise<AdminMetricsOverviewState> {
  try {
    const caller = await createAdminMetricsCaller();
    const metricsRouter = caller.admin.metrics;

    if (typeof metricsRouter?.overview === "function") {
      return {
        metrics: await metricsRouter.overview(),
        status: "ready",
      };
    }

    if (typeof metricsRouter?.summary === "function") {
      return {
        metrics: await metricsRouter.summary(),
        status: "ready",
      };
    }

    throw new MissingAdminMetricsContractError();
  } catch (error) {
    return {
      message: getAdminMetricsErrorMessage(error),
      status: "error",
    };
  }
}

async function createAdminMetricsCaller(): Promise<ExpectedAdminMetricsCaller> {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-metrics");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(
    context,
  ) as unknown as ExpectedAdminMetricsCaller;
}

class MissingAdminMetricsContractError extends Error {
  constructor() {
    super("admin.metrics.overview or admin.metrics.summary is not registered");
  }
}

function getAdminMetricsErrorMessage(error: unknown) {
  if (error instanceof MissingAdminMetricsContractError) {
    return "El contrato admin.metrics.overview o admin.metrics.summary todavía no está disponible en el backend.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return `No se pudieron cargar las métricas operativas: ${error.message}`;
  }

  return "No se pudieron cargar las métricas operativas.";
}
