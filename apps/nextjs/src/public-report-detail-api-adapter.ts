import type { RouterOutputs } from "@acme/api";

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
  const caller = await createPublicReportDetailCaller();

  return getPublicReportDetailWithCaller(caller, reportId);
}

export async function getPublicReportDetailWithCaller(
  caller: PublicReportDetailCaller,
  reportId: string,
): Promise<PublicReportDetail | null> {
  if (!isUuid(reportId)) {
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
  const errorCode =
    readStringProperty(error, "code") ??
    readStringProperty(readRecordProperty(error, "data"), "code") ??
    readStringProperty(readRecordProperty(error, "shape"), "code") ??
    readStringProperty(
      readRecordProperty(readRecordProperty(error, "shape"), "data"),
      "code",
    );

  return errorCode === "NOT_FOUND";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readRecordProperty(
  value: unknown,
  property: string,
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const propertyValue = (value as Record<string, unknown>)[property];

  return typeof propertyValue === "object" && propertyValue !== null
    ? (propertyValue as Record<string, unknown>)
    : null;
}

function readStringProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const propertyValue = (value as Record<string, unknown>)[property];

  return typeof propertyValue === "string" ? propertyValue : undefined;
}
