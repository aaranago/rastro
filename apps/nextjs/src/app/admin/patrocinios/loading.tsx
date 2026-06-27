import { AdminRouteLoading } from "~/admin-ui/admin-route-state";

export default function AdminSponsorsLoading() {
  return (
    <AdminRouteLoading
      description="Cargando patrocinios locales, vigencia y política de seguridad."
      eyebrow="ADMIN-005"
      title="Gestión de patrocinios locales"
    />
  );
}
