import { AdminRouteLoading } from "~/admin-ui/admin-route-state";

export default function AdminSettingsLoading() {
  return (
    <AdminRouteLoading
      description="Cargando reglas persistidas de publicación."
      title="Ajustes de publicación"
    />
  );
}
