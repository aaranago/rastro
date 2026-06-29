import Link from "next/link";

import { cn } from "@acme/ui";

export interface AdminNavigationItem {
  description: string;
  href: string;
  label: string;
  shortLabel: string;
}

export const adminNavigationItems: readonly AdminNavigationItem[] = [
  {
    description: "Resumen operativo y accesos rápidos del área admin.",
    href: "/admin",
    label: "Resumen",
    shortLabel: "RS",
  },
  {
    description:
      "Cola actual para reportes, publicaciones, chats y proveedores.",
    href: "/admin/moderacion",
    label: "Moderación",
    shortLabel: "MO",
  },
  {
    description: "Gestión actual de perfiles de proveedores y verificación.",
    href: "/admin/proveedores",
    label: "Proveedores",
    shortLabel: "PR",
  },
  {
    description:
      "Gestión independiente de patrocinios locales, sin afectar la recuperación.",
    href: "/admin/patrocinios",
    label: "Patrocinios",
    shortLabel: "PA",
  },
  {
    description:
      "Búsqueda de miembros, perfil de seguridad y suspensión persistida.",
    href: "/admin/miembros",
    label: "Miembros",
    shortLabel: "MI",
  },
  {
    description:
      "Modo de revisión, correo verificado requerido y reglas operativas.",
    href: "/admin/ajustes",
    label: "Ajustes",
    shortLabel: "AJ",
  },
  {
    description:
      "Métricas de abuso, contenido y recursos por ciudad y departamento.",
    href: "/admin/metricas",
    label: "Métricas",
    shortLabel: "ME",
  },
  {
    description: "Historial inmutable de acciones administrativas.",
    href: "/admin/auditoria",
    label: "Auditoría",
    shortLabel: "AU",
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

export function getAdminNavigationItemForPathname(pathname: string) {
  return (
    adminNavigationItems
      .filter((item) => isAdminNavigationItemActive(pathname, item))
      .sort((left, right) => right.href.length - left.href.length)[0] ??
    adminNavigationItems[0]
  );
}

export function AdminNavigation(props: {
  collapsed?: boolean;
  currentPathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="Navegación de administración"
      className="max-w-full min-w-0"
    >
      <ul
        className={cn(
          "grid w-full min-w-0 grid-cols-1 gap-2",
          props.collapsed
            ? "lg:flex lg:flex-col"
            : "sm:grid-cols-2 lg:flex lg:flex-col",
        )}
      >
        {adminNavigationItems.map((item) => (
          <li className="min-w-0" key={item.href}>
            <AdminNavigationEntry
              collapsed={props.collapsed}
              currentPathname={props.currentPathname}
              item={item}
              onNavigate={props.onNavigate}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AdminNavigationEntry(props: {
  collapsed?: boolean;
  currentPathname: string;
  item: AdminNavigationItem;
  onNavigate?: () => void;
}) {
  const isActive = isAdminNavigationItemActive(
    props.currentPathname,
    props.item,
  );
  const className = cn(
    "border-border/70 bg-card/60 text-card-foreground hover:border-primary/50 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-[3px]",
    isActive && "border-primary bg-primary/10 text-primary",
    props.collapsed && "lg:justify-center lg:px-2",
  );

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      aria-label={props.item.label}
      className={className}
      href={props.item.href}
      onClick={props.onNavigate}
      title={props.item.description}
    >
      <span
        aria-hidden="true"
        className={cn(
          "bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-[0.7rem] font-semibold",
          isActive && "bg-primary text-primary-foreground",
        )}
      >
        {props.item.shortLabel}
      </span>
      <span
        className={cn(
          "min-w-0 truncate font-medium",
          props.collapsed && "lg:sr-only",
        )}
      >
        {props.item.label}
      </span>
    </Link>
  );
}
