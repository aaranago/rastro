import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";

import type { AdminMetricsOverviewState } from "~/admin-metrics-api-adapter";
import { getAdminMetricsOverview } from "~/admin-metrics-api-adapter";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { adminNavigationItems } from "~/admin-ui/admin-navigation";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Panel de administración | Rastro",
};

const availableSections = adminNavigationItems.filter(
  (item) => item.status === "available" && item.href !== "/admin",
);
const plannedSections = adminNavigationItems.filter(
  (item) => item.status === "planned",
);

const adminOverviewSectionCopy: Record<
  string,
  {
    actionAriaLabel: string;
    actionLabel: string;
    description: string;
    label: string;
    note: string;
  }
> = {
  "/admin/ajustes": {
    actionAriaLabel: "Abrir la sección de ajustes del panel",
    actionLabel: "Ir a ajustes",
    description:
      "Configura reglas operativas para publicación, revisión y requisitos de seguridad.",
    label: "Ajustes",
    note: "Seguimiento de cambios operativos en ADMIN-006.",
  },
  "/admin/auditoria": {
    actionAriaLabel: "Abrir la sección de auditoría del panel",
    actionLabel: "Ir a auditoría",
    description: "Consulta el historial inmutable de acciones administrativas.",
    label: "Auditoría",
    note: "Seguimiento de mejoras de trazabilidad en ADMIN-010.",
  },
  "/admin/metricas": {
    actionAriaLabel: "Abrir la sección de métricas del panel",
    actionLabel: "Ir a métricas",
    description:
      "Revisa señales de abuso, contenido, recursos y actividad por ubicación.",
    label: "Métricas",
    note: "Seguimiento de mejoras de indicadores en ADMIN-010.",
  },
  "/admin/miembros": {
    actionAriaLabel: "Abrir la sección de miembros del panel",
    actionLabel: "Ir a miembros",
    description:
      "Busca miembros, revisa señales de seguridad y aplica suspensiones cuando corresponda.",
    label: "Miembros",
    note: "Seguimiento de flujos de seguridad en ADMIN-009.",
  },
  "/admin/moderacion": {
    actionAriaLabel: "Abrir la sección de moderación del panel",
    actionLabel: "Ir a moderación",
    description:
      "Revisa reportes, publicaciones, chats y proveedores que requieren decisión.",
    label: "Moderación",
    note: "Seguimiento de colas y decisiones en ADMIN-007.",
  },
  "/admin/patrocinios": {
    actionAriaLabel: "Abrir la sección de patrocinios del panel",
    actionLabel: "Ir a patrocinios",
    description:
      "Gestiona patrocinios locales sin cambiar la prioridad de recuperación.",
    label: "Patrocinios",
    note: "Seguimiento de ubicaciones patrocinadas en ADMIN-005.",
  },
  "/admin/proveedores": {
    actionAriaLabel: "Abrir la sección de proveedores del panel",
    actionLabel: "Ir a proveedores",
    description:
      "Gestiona proveedores de recursos, verificación de identidad y cobertura local.",
    label: "Proveedores",
    note: "Seguimiento de perfiles y verificación en ADMIN-002.",
  },
};

const overviewMetricFormatter = new Intl.NumberFormat("es-BO");

export default async function AdminOverviewPage() {
  const metricsState = await getAdminOverviewMetricsState();

  return (
    <div className="mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-6">
      <section className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Badge className="w-fit" variant="secondary">
            Administración Rastro
          </Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            Panel de administración
          </h2>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 sm:text-base">
            Punto de entrada para moderación, proveedores de recursos,
            patrocinios, miembros y métricas operativas de Rastro en Bolivia.
          </p>
        </div>
      </section>

      {metricsState ? (
        <AdminOverviewMetricsSnapshot state={metricsState} />
      ) : null}

      <section
        aria-labelledby="admin-available-sections"
        className="grid gap-4"
      >
        <div>
          <h3
            className="text-xl font-semibold tracking-normal"
            id="admin-available-sections"
          >
            Secciones disponibles
          </h3>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            Módulos activos del panel con datos y acciones disponibles para el
            equipo operativo.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {availableSections.map((section) => {
            const copy = getAdminOverviewSectionCopy(section);

            return (
              <Card className="min-w-0 rounded-lg" key={section.href}>
                <CardHeader>
                  <Badge className="w-fit">{section.statusLabel}</Badge>
                  <CardTitle className="text-2xl tracking-normal">
                    {copy.label}
                  </CardTitle>
                  <CardDescription className="text-sm leading-6">
                    {copy.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-muted-foreground text-sm leading-6">
                    {copy.note}
                  </p>
                  <Button
                    asChild
                    className="min-h-11 w-full justify-center sm:w-fit"
                  >
                    <Link aria-label={copy.actionAriaLabel} href={section.href}>
                      {copy.actionLabel}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {plannedSections.length > 0 ? (
        <section
          aria-labelledby="admin-planned-sections"
          className="grid gap-4"
        >
          <div>
            <h3
              className="text-xl font-semibold tracking-normal"
              id="admin-planned-sections"
            >
              Secciones planificadas
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Visibles en navegación para orientar el mapa del panel, pero sin
              acciones productivas todavía.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {plannedSections.map((section) => {
              const copy = getAdminOverviewSectionCopy(section);

              return (
                <Card className="min-w-0 rounded-lg" key={section.href}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{section.statusLabel}</Badge>
                      <Badge variant="outline">{section.issueId}</Badge>
                    </div>
                    <CardTitle className="text-xl tracking-normal">
                      {copy.label}
                    </CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {copy.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-6">
                      Todavía no disponible. Esta tarjeta no crea, edita ni
                      elimina datos.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getAdminOverviewSectionCopy(
  section: (typeof adminNavigationItems)[number],
) {
  return (
    adminOverviewSectionCopy[section.href] ?? {
      actionAriaLabel: `Abrir la sección ${section.label} del panel`,
      actionLabel: `Ir a ${section.label.toLocaleLowerCase("es-BO")}`,
      description: section.description,
      label: section.label,
      note: section.issueId
        ? `Seguimiento de mejoras en ${section.issueId}.`
        : "Seguimiento operativo pendiente.",
    }
  );
}

async function getAdminOverviewMetricsState() {
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return null;
  }

  return getAdminMetricsOverview();
}

function AdminOverviewMetricsSnapshot(props: {
  state: AdminMetricsOverviewState;
}) {
  if (props.state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Resumen operativo no disponible</AlertTitle>
        <AlertDescription>
          <p>
            No pudimos cargar estos indicadores. Las secciones del panel siguen
            disponibles para continuar la operación.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  const summary = props.state.metrics.summary;
  const cards = [
    {
      label: "Eventos de auditoría",
      value: summary.auditEventCount,
    },
    {
      label: "Reportes de abuso",
      value: summary.abuseReportCount,
    },
    {
      label: "Pendientes de moderación",
      value: summary.pendingModerationCount,
    },
    {
      label: "Proveedores verificados",
      value: summary.verifiedResourceProviderCount,
    },
  ] as const;

  return (
    <section aria-labelledby="admin-overview-metrics" className="grid gap-4">
      <div>
        <h3
          className="text-xl font-semibold tracking-normal"
          id="admin-overview-metrics"
        >
          Resumen operativo
        </h3>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
          Indicadores principales con la misma fuente de datos de la vista de
          métricas.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card className="min-w-0 rounded-lg" key={card.label}>
            <CardHeader className="gap-1 pb-2">
              <CardDescription className="text-xs">
                {card.label}
              </CardDescription>
              <CardTitle className="text-3xl tracking-normal">
                {overviewMetricFormatter.format(card.value)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
