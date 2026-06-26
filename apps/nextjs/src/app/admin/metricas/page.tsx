import type { Metadata } from "next";

import { getAdminMetricsOverview } from "~/admin-metrics-api-adapter";
import { AdminMetricsDashboard } from "~/admin-metrics-dashboard";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Métricas admin | Rastro",
};

export default async function AdminMetricsPage() {
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return null;
  }

  return <AdminMetricsDashboard state={await getAdminMetricsOverview()} />;
}
