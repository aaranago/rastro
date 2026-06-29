import { headers } from "next/headers";

import { appRouter, createTRPCContext } from "@acme/api";

import type {
  AdminResourceProviderAttachSponsorInput,
  AdminResourceProviderCreateInput,
  AdminResourceProviderDeleteInput,
  AdminResourceProviderDetachSponsorInput,
  AdminResourceProviderListInput,
  AdminResourceProviderListResult,
  AdminResourceProviderUpdateInput,
  AdminResourceProviderUpdateVerificationInput,
} from "~/admin-resource-provider-admin-model";
import { auth } from "~/auth/server";
import { env } from "~/env";

const defaultAdminResourceProviderListInput = {
  page: 1,
  pageSize: 10,
} satisfies AdminResourceProviderListInput;

export async function listAdminResourceProviderProfiles(
  input: AdminResourceProviderListInput = defaultAdminResourceProviderListInput,
): Promise<AdminResourceProviderListResult> {
  return (await createAdminResourcesCaller()).resources.admin.listProviders(
    input,
  );
}

export async function createAdminResourceProvider(
  input: AdminResourceProviderCreateInput,
) {
  return (await createAdminResourcesCaller()).resources.admin.createProvider(
    input,
  );
}

export async function updateAdminResourceProvider(
  input: AdminResourceProviderUpdateInput,
) {
  return (await createAdminResourcesCaller()).resources.admin.updateProvider(
    input,
  );
}

export async function deleteAdminResourceProvider(
  input: AdminResourceProviderDeleteInput,
) {
  return (await createAdminResourcesCaller()).resources.admin.deleteProvider(
    input,
  );
}

export async function updateAdminResourceProviderVerification(
  input: AdminResourceProviderUpdateVerificationInput,
) {
  return (
    await createAdminResourcesCaller()
  ).resources.admin.updateVerification(input);
}

export async function attachAdminResourceProviderSponsor(
  input: AdminResourceProviderAttachSponsorInput,
) {
  return (await createAdminResourcesCaller()).resources.admin.attachSponsor(
    input,
  );
}

export async function detachAdminResourceProviderSponsor(
  input: AdminResourceProviderDetachSponsorInput,
) {
  return (await createAdminResourcesCaller()).resources.admin.detachSponsor(
    input,
  );
}

async function createAdminResourcesCaller() {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-resources");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context);
}
