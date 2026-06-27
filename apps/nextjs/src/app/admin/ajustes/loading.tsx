import { AdminRouteLoading } from "~/admin-ui/admin-route-state";

export default function AdminSettingsLoading() {
  return (
    <AdminRouteLoading
      description="Cargando reglas persistidas de publicación."
      eyebrow="ADMIN-006"
      title="Ajustes de publicación"
    />
  );
}
