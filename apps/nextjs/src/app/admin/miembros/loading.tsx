import { AdminRouteLoading } from "~/admin-ui/admin-route-state";

export default function AdminMembersLoading() {
  return (
    <AdminRouteLoading
      description="Cargando búsqueda, perfil de seguridad e historial de suspensión."
      eyebrow="ADMIN-009"
      title="Gestión de miembros"
    />
  );
}
