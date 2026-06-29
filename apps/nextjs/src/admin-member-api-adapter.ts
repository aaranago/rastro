import { headers } from "next/headers";

import type { RouterInputs, RouterOutputs } from "@acme/api";
import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

export interface AdminMemberSuspensionInput {
  memberId: string;
  reason: string;
}

export interface AdminMemberListInput {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?:
    | "createdAt"
    | "email"
    | "emailVerified"
    | "name"
    | "suspensionStatus";
  sortDirection?: "asc" | "desc";
}
export type AdminMemberListResult = RouterOutputs["admin"]["members"]["list"];

export async function listAdminMembers(input: AdminMemberListInput) {
  return (await createAdminMembersCaller()).admin.members.list(
    input as RouterInputs["admin"]["members"]["list"],
  );
}

export async function getAdminMemberProfile(memberId: string) {
  return (await createAdminMembersCaller()).admin.members.profile({ memberId });
}

// fallow-ignore-next-line unused-export
export async function suspendAdminMember(input: AdminMemberSuspensionInput) {
  return (await createAdminMembersCaller()).admin.members.suspend(input);
}

// fallow-ignore-next-line unused-export
export async function unsuspendAdminMember(input: AdminMemberSuspensionInput) {
  return (await createAdminMembersCaller()).admin.members.unsuspend(input);
}

async function createAdminMembersCaller() {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-members");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context);
}
