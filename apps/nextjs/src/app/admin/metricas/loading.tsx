import { AdminMetricsDashboard } from "~/admin-metrics-dashboard";

export default function AdminMetricsLoading() {
  return <AdminMetricsDashboard state={{ status: "loading" }} />;
}
