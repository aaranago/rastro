import { AdminRouteLoading } from "~/admin-ui/admin-route-state";

export default function AdminModerationLoading() {
  return (
    <AdminRouteLoading
      description="Cargando colas de abuso, reportes y perfiles reportados."
      eyebrow="ADMIN-007"
      title="Contenido reportado"
    />
  );
}
