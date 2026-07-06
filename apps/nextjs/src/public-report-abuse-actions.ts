"use server";

import { redirect } from "next/navigation";

import { createReportAbuseReportInputSchema } from "@acme/validators";

import { buildAuthHomeHref, sanitizeAuthReturnTo } from "~/auth/return-to";
import { auth } from "~/auth/server";
import { readTrpcErrorCode } from "~/trpc-error-code";

const readString = (formData: FormData, key: string) => {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
};

export async function reportPublicReportAbuse(formData: FormData) {
  const returnTo = sanitizeAuthReturnTo(readString(formData, "returnTo"));
  const parsed = createReportAbuseReportInputSchema.safeParse({
    detail: readString(formData, "detail"),
    reason: readString(formData, "reason"),
    reportId: readString(formData, "reportId"),
  });

  if (!parsed.success) {
    redirectToReport(returnTo, "invalid");
  }

  let status: string;

  try {
    const caller = await createPublicReportAbuseCaller();
    const result = await caller.report.reportAbuse(parsed.data);

    status = result.status;
  } catch (error) {
    if (isTrpcUnauthorizedError(error)) {
      redirect(buildAuthHomeHref("signin-required", returnTo));
    }

    redirectToReport(returnTo, "error");
  }

  redirectToReport(returnTo, status);
}

async function createPublicReportAbuseCaller() {
  const [{ appRouter, createTRPCContext }, { env }, { headers }] =
    await Promise.all([
      import("@acme/api"),
      import("~/env"),
      import("next/headers"),
    ]);
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-public-report-abuse");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context);
}

function redirectToReport(returnTo: string | undefined, status: string): never {
  const url = new URL(returnTo ?? "/", "https://rastro.bo");
  url.searchParams.set("reportAbuse", status);
  url.hash = "reportar";

  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function isTrpcUnauthorizedError(error: unknown) {
  return readTrpcErrorCode(error) === "UNAUTHORIZED";
}
