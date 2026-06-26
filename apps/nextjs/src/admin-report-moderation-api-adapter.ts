import { headers } from "next/headers";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

export async function listAdminReportModerationQueue() {
  const caller = await createAdminReportModerationCaller();

  return caller.admin.moderation.reportQueue();
}

export async function hideAdminReportTarget(input: {
  note?: string;
  reason: string;
  reportId: string;
}) {
  const caller = await createAdminReportModerationCaller();

  return caller.admin.moderation.hideReportTarget(input);
}

export async function restoreAdminReportTarget(input: {
  note?: string;
  reason: string;
  reportId: string;
}) {
  const caller = await createAdminReportModerationCaller();

  return caller.admin.moderation.restoreReportTarget(input);
}

async function createAdminReportModerationCaller() {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-report-moderation");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context);
}
