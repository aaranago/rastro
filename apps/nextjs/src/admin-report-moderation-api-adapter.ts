import { headers } from "next/headers";

import type { RouterInputs } from "@acme/api";
import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

export interface AdminReportModerationQueueListInput {
  filters?: {
    city?: string;
    department?: string;
    falseReportState?: "any" | "marked_false" | "not_false";
    reason?: string;
    risk?: "any" | "caretaker_suspended" | "none";
    type?: ("adoption" | "found_pet" | "lost_pet" | "sighting")[];
    visibility?: "any" | "hidden" | "visible";
  };
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?:
    | "city"
    | "createdAt"
    | "department"
    | "falseReportState"
    | "title"
    | "type"
    | "updatedAt"
    | "visibility";
  sortDirection?: "asc" | "desc";
}
export async function listAdminReportModerationQueueList(
  input: AdminReportModerationQueueListInput,
) {
  const caller = await createAdminReportModerationCaller();

  return caller.admin.moderation.reportQueueList(
    input as RouterInputs["admin"]["moderation"]["reportQueueList"],
  );
}

export async function getAdminReportModerationQueueItem(id: string) {
  const caller = await createAdminReportModerationCaller();

  try {
    return await caller.admin.moderation.reportQueueItem({ id });
  } catch (error) {
    if (isTrpcNotFoundError(error)) {
      return null;
    }

    throw error;
  }
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

export async function markFalseReportTarget(input: {
  note?: string;
  reason: string;
  reportId: string;
}) {
  const caller = await createAdminReportModerationCaller();

  return caller.admin.moderation.markFalseReportTarget(input);
}

export async function unmarkFalseReportTarget(input: {
  note?: string;
  reason: string;
  reportId: string;
}) {
  const caller = await createAdminReportModerationCaller();

  return caller.admin.moderation.unmarkFalseReportTarget(input);
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

function isTrpcNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "NOT_FOUND"
  );
}
