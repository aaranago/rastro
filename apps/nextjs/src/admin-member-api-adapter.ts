import { headers } from "next/headers";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

export interface AdminMemberSearchInput {
  query: string;
}

export interface AdminMemberSuspensionInput {
  memberId: string;
  reason: string;
}

export async function searchAdminMembers(input: AdminMemberSearchInput) {
  return (await createAdminMembersCaller()).admin.members.search(input);
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
