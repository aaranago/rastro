import type { RouterOutputs } from "@acme/api";
import { isPublicReportId } from "@acme/validators";

import { readTrpcErrorCode } from "~/trpc-error-code";

export type PublicReportDetail = RouterOutputs["report"]["detail"];

export type PublicReportDetailLoader = (
  reportId: string,
) => Promise<PublicReportDetail | null>;

export interface PublicReportDetailCaller {
  report: {
    detail: (input: { id: string }) => Promise<PublicReportDetail>;
  };
}

export async function getPublicReportDetail(
  reportId: string,
): Promise<PublicReportDetail | null> {
  if (!isPublicReportId(reportId)) {
    return null;
  }

  const caller = await createPublicReportDetailCaller();

  return getPublicReportDetailWithCaller(caller, reportId);
}

export async function getPublicReportDetailWithCaller(
  caller: PublicReportDetailCaller,
  reportId: string,
): Promise<PublicReportDetail | null> {
  if (!isPublicReportId(reportId)) {
    return null;
  }

  try {
    return await caller.report.detail({ id: reportId });
  } catch (error) {
    if (isTrpcNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

async function createPublicReportDetailCaller(): Promise<PublicReportDetailCaller> {
  const [{ appRouter, createTRPCContext }, { headers }, { auth }, { env }] =
    await Promise.all([
      import("@acme/api"),
      import("next/headers"),
      import("~/auth/server"),
      import("~/env"),
    ]);
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-public-report-detail");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context);
}

function isTrpcNotFoundError(error: unknown) {
  return readTrpcErrorCode(error) === "NOT_FOUND";
}
