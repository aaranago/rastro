import { headers } from "next/headers";

import type { RouterInputs } from "@acme/api";
import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

export interface AdminResourceProviderModerationQueueListInput {
  filters?: {
    city?: string;
    department?: string;
    reason?: (
      | "animal_cruelty"
      | "impersonation"
      | "incorrect_location"
      | "offensive_content"
      | "other"
      | "scam"
      | "spam"
      | "stolen_pet_concern"
    )[];
    reporterSuspension?: "any" | "none" | "reporter_suspended";
    status?: (
      | "dismissed_false_report"
      | "pending"
      | "resolved_action_taken"
      | "resolved_no_action"
    )[];
    verification?: ("unverified" | "verified")[];
  };
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?:
    | "city"
    | "createdAt"
    | "department"
    | "lastReportedAt"
    | "providerName"
    | "reason"
    | "status"
    | "verification";
  sortDirection?: "asc" | "desc";
}
export type AdminResourceProviderReviewResolutionInput =
  RouterInputs["admin"]["moderation"]["resolveResourceProviderReviewItem"];

export async function listAdminResourceProviderModerationQueueList(
  input: AdminResourceProviderModerationQueueListInput,
) {
  const caller = await createAdminModerationCaller();

  return caller.admin.moderation.resourceProviderQueueList(
    input as RouterInputs["admin"]["moderation"]["resourceProviderQueueList"],
  );
}

export async function getAdminResourceProviderModerationQueueItem(
  reviewItemId: string,
) {
  const caller = await createAdminModerationCaller();

  try {
    return await caller.admin.moderation.resourceProviderQueueItem({
      reviewItemId,
    });
  } catch (error) {
    if (isTrpcNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function resolveResourceProviderReviewItem(
  input: AdminResourceProviderReviewResolutionInput,
) {
  const caller = await createAdminModerationCaller();

  return caller.admin.moderation.resolveResourceProviderReviewItem(input);
}

async function createAdminModerationCaller() {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-moderation");
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
