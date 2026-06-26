import { AdminAuditLogDashboard } from "~/admin-audit-log-dashboard";

export default function AdminAuditLoading() {
  return (
    <AdminAuditLogDashboard
      query={{ limit: 50 }}
      state={{ status: "loading" }}
    />
  );
}
