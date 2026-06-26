import Link from "next/link";

import { cn } from "@acme/ui";
import { Badge } from "@acme/ui/badge";

export type AdminRouteStatus = "available" | "planned";

export interface AdminNavigationItem {
  description: string;
  href: string;
  issueId?: string;
  label: string;
  status: AdminRouteStatus;
  statusLabel: "Disponible" | "Planificado";
}

export const adminNavigationItems: readonly AdminNavigationItem[] = [
  {
    description: "Resumen operativo y accesos rápidos del área admin.",
    href: "/admin",
    label: "Overview",
    status: "available",
    statusLabel: "Disponible",
  },
  {
    description:
      "Cola actual para reportes, publicaciones, chats y Resource Provider.",
    href: "/admin/moderacion",
    issueId: "ADMIN-007",
    label: "Moderación",
    status: "available",
    statusLabel: "Disponible",
  },
  {
    description:
      "Gestión actual de perfiles de Resource Provider y verificación.",
    href: "/admin/proveedores",
    issueId: "ADMIN-002",
    label: "Proveedores",
    status: "available",
    statusLabel: "Disponible",
  },
  {
    description:
      "Gestión independiente de Local Sponsor Placements, sin afectar recuperación.",
    href: "/admin/patrocinios",
    issueId: "ADMIN-005",
    label: "Patrocinios",
    status: "available",
    statusLabel: "Disponible",
  },
  {
    description:
      "Búsqueda de miembros, perfil de seguridad y suspensión persistida.",
    href: "/admin/miembros",
    issueId: "ADMIN-009",
    label: "Miembros",
    status: "available",
    statusLabel: "Disponible",
  },
  {
    description:
      "Review Mode, correo verificado requerido y reglas operativas.",
    href: "/admin/ajustes",
    issueId: "ADMIN-006",
    label: "Ajustes",
    status: "available",
    statusLabel: "Disponible",
  },
  {
    description:
      "Métricas de abuso, contenido y recursos por ciudad y departamento.",
    href: "/admin/metricas",
    issueId: "ADMIN-010",
    label: "Métricas",
    status: "available",
    statusLabel: "Disponible",
  },
  {
    description: "Historial inmutable de acciones administrativas.",
    href: "/admin/auditoria",
    issueId: "ADMIN-010",
    label: "Auditoría",
    status: "available",
    statusLabel: "Disponible",
  },
];

function isAdminNavigationItemActive(
  pathname: string,
  item: AdminNavigationItem,
) {
  if (item.href === "/admin") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminNavigation(props: { currentPathname: string }) {
  return (
    <nav aria-label="Navegación de administración" className="min-w-0">
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {adminNavigationItems.map((item) => (
          <li className="min-w-fit lg:min-w-0" key={item.href}>
            <AdminNavigationEntry
              currentPathname={props.currentPathname}
              item={item}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AdminNavigationEntry(props: {
  currentPathname: string;
  item: AdminNavigationItem;
}) {
  const isActive = isAdminNavigationItemActive(
    props.currentPathname,
    props.item,
  );
  const className = cn(
    "border-border/70 bg-card/60 text-card-foreground flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
    isActive && "border-primary bg-primary/10 text-primary",
    props.item.status === "available" &&
      "hover:border-primary/50 hover:bg-primary/5",
    props.item.status === "planned" &&
      "text-muted-foreground bg-muted/40 border-dashed",
  );

  const content = (
    <>
      <span className="truncate font-medium">{props.item.label}</span>
      <Badge
        className="shrink-0"
        variant={props.item.status === "available" ? "default" : "secondary"}
      >
        {props.item.statusLabel}
      </Badge>
    </>
  );

  if (props.item.status === "planned") {
    return (
      <span
        aria-disabled="true"
        className={className}
        title={`${props.item.label}: ${props.item.statusLabel}`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={className}
      href={props.item.href}
    >
      {content}
    </Link>
  );
}
