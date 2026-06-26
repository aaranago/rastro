import { headers } from "next/headers";

import { appRouter, createTRPCContext } from "@acme/api";

import type {
  AdminSponsorPlacementCreateInput,
  AdminSponsorPlacementDetachInput,
  AdminSponsorPlacementUpdateInput,
} from "./admin-sponsor-placement-model";
import { auth } from "~/auth/server";
import { env } from "~/env";

export async function listAdminSponsorPlacements() {
  return (
    await createAdminSponsorPlacementCaller()
  ).resources.admin.listSponsorPlacements();
}

export async function createAdminSponsorPlacement(
  input: AdminSponsorPlacementCreateInput,
) {
  return (
    await createAdminSponsorPlacementCaller()
  ).resources.admin.createSponsor(input);
}

export async function updateAdminSponsorPlacement(
  input: AdminSponsorPlacementUpdateInput,
) {
  return (
    await createAdminSponsorPlacementCaller()
  ).resources.admin.updateSponsor(input);
}

export async function detachAdminSponsorPlacement(
  input: AdminSponsorPlacementDetachInput,
) {
  return (
    await createAdminSponsorPlacementCaller()
  ).resources.admin.detachSponsorPlacement(input);
}

async function createAdminSponsorPlacementCaller() {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-sponsor-placements");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context);
}
