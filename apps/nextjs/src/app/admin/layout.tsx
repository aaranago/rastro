import type { Metadata } from "next";

import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { AdminAccessDenied, AdminShell } from "~/admin-ui/admin-shell";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Administración | Rastro",
};

export default async function AdminLayout(props: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const viewer = buildAdminModerationViewer(
    session,
    env.RASTRO_ADMIN_EMAILS,
  ).dashboardViewer;

  return (
    <AdminShell viewer={viewer}>
      {viewer.role === "admin" ? (
        props.children
      ) : (
        <AdminAccessDenied viewer={viewer} />
      )}
    </AdminShell>
  );
}
