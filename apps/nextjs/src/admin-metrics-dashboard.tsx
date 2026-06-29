import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Badge } from "@acme/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";
import { Skeleton } from "@acme/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@acme/ui/table";

import type {
  AdminMetricsLocationRow,
  AdminMetricsOverview,
  AdminMetricsOverviewState,
  AdminMetricsSummary,
} from "./admin-metrics-api-adapter";

export type AdminMetricsDashboardState =
  | AdminMetricsOverviewState
  | {
      status: "loading";
    };

const metricFormatter = new Intl.NumberFormat("es-BO");
const loadingSummaryCards = [
  "audit-events",
  "abuse-reports",
  "hidden-content",
  "verified-providers",
] as const;
const loadingRows = ["row-1", "row-2", "row-3", "row-4", "row-5"] as const;

export function AdminMetricsDashboard(props: {
  state: AdminMetricsDashboardState;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <AdminMetricsHeader />
      {props.state.status === "loading" ? (
        <AdminMetricsLoadingState />
      ) : props.state.status === "error" ? (
        <AdminMetricsErrorState message={props.state.message} />
      ) : (
        <AdminMetricsReadyState metrics={props.state.metrics} />
      )}
    </div>
  );
}

function AdminMetricsHeader() {
  return (
    <section className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">
          Métricas operativas
        </h2>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 sm:text-base">
          Seguimiento interno de abuso, contenido, proveedores, patrocinios y
          suspensiones por ciudad y departamento en Bolivia.
        </p>
      </div>
    </section>
  );
}

function AdminMetricsReadyState(props: { metrics: AdminMetricsOverview }) {
  return (
    <>
      <MetricsSummary summary={props.metrics.summary} />
      <div className="grid min-w-0 gap-6">
        <MetricsLocationTable
          description="Usa ciudad y departamento estructurados del backend, sin leer etiquetas de pantalla."
          mode="city"
          rows={props.metrics.byCity}
          title="Por ciudad"
        />
        <MetricsLocationTable
          description="Agrupación departamental para ver presión operativa regional."
          mode="department"
          rows={props.metrics.byDepartment}
          title="Por departamento"
        />
      </div>
    </>
  );
}

function MetricsSummary(props: { summary: AdminMetricsSummary }) {
  const cards = [
    {
      description: "Eventos durables registrados por el panel admin.",
      label: "Eventos de auditoría",
      value: props.summary.auditEventCount,
    },
    {
      description: "Señales de abuso o riesgo reportadas por la comunidad.",
      label: "Reportes de abuso",
      value: props.summary.abuseReportCount,
    },
    {
      description: "Reportes o publicaciones ocultadas por revisión.",
      label: "Contenido oculto",
      value: props.summary.hiddenContentCount,
    },
    {
      description: "Proveedores de recursos con identidad verificada.",
      label: "Proveedores verificados",
      value: props.summary.verifiedResourceProviderCount,
    },
    {
      description: "Patrocinios locales activos, sin afectar recuperación.",
      label: "Patrocinios activos",
      value: props.summary.activeSponsorPlacementCount,
    },
    {
      description: "Miembros suspendidos por seguridad o abuso.",
      label: "Miembros suspendidos",
      value: props.summary.suspendedMemberCount,
    },
  ] as const;

  return (
    <section
      aria-label="Resumen de métricas operativas"
      className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
    >
      {cards.map((card) => (
        <Card className="min-w-0 rounded-lg" key={card.label}>
          <CardHeader className="gap-1 pb-2">
            <CardDescription className="text-xs">{card.label}</CardDescription>
            <CardTitle className="text-3xl tracking-normal">
              {formatMetricNumber(card.value)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs leading-5">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function MetricsLocationTable(props: {
  description: string;
  mode: "city" | "department";
  rows: readonly AdminMetricsLocationRow[];
  title: string;
}) {
  const isLongList = props.rows.length > 12;
  const countLabel =
    props.rows.length === 1 ? "1 fila" : `${props.rows.length} filas`;

  return (
    <section
      aria-labelledby={`${props.mode}-metrics-heading`}
      className="border-border bg-card text-card-foreground flex min-w-0 flex-col rounded-lg border shadow-xs"
    >
      <div className="border-border flex min-w-0 flex-col gap-3 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3
            className="text-xl font-semibold tracking-normal"
            id={`${props.mode}-metrics-heading`}
          >
            {props.title}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            {props.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant="secondary">{countLabel}</Badge>
          {isLongList ? <Badge variant="outline">Vista larga</Badge> : null}
        </div>
      </div>

      {props.rows.length === 0 ? (
        <MetricsEmptyState mode={props.mode} />
      ) : (
        <>
          <div className="grid gap-3 p-4 md:hidden">
            {props.rows.map((row) => (
              <MetricsLocationCard
                key={getMetricsRowKey(row, props.mode)}
                mode={props.mode}
                row={row}
              />
            ))}
          </div>
          <div className="hidden min-w-0 md:block">
            <Table className="table-fixed">
              <TableCaption className="sr-only">
                Métricas operativas agrupadas {props.title.toLowerCase()}
              </TableCaption>
              <TableHeader className="bg-muted/70 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[24%] px-3 py-3 whitespace-normal">
                    {props.mode === "city" ? "Ciudad" : "Departamento"}
                  </TableHead>
                  <TableHead className="w-[9%] px-3 py-3 text-right whitespace-normal">
                    Abuso
                  </TableHead>
                  <TableHead className="w-[12%] px-3 py-3 text-right whitespace-normal">
                    Pendiente
                  </TableHead>
                  <TableHead className="w-[9%] px-3 py-3 text-right whitespace-normal">
                    Oculto
                  </TableHead>
                  <TableHead className="w-[13%] px-3 py-3 text-right whitespace-normal">
                    Proveedores
                  </TableHead>
                  <TableHead className="w-[13%] px-3 py-3 text-right whitespace-normal">
                    Verificados
                  </TableHead>
                  <TableHead className="w-[10%] px-3 py-3 text-right whitespace-normal">
                    Patrocinios
                  </TableHead>
                  <TableHead className="w-[10%] px-3 py-3 text-right whitespace-normal">
                    Suspendidos
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.rows.map((row) => (
                  <TableRow key={getMetricsRowKey(row, props.mode)}>
                    <TableCell className="px-3 py-3 whitespace-normal">
                      <LocationLabel mode={props.mode} row={row} />
                    </TableCell>
                    <MetricNumberCell value={row.abuseReportCount} />
                    <MetricNumberCell value={row.pendingModerationCount} />
                    <MetricNumberCell value={row.hiddenContentCount} />
                    <MetricNumberCell value={row.resourceProviderCount} />
                    <MetricNumberCell
                      value={row.verifiedResourceProviderCount}
                    />
                    <MetricNumberCell value={row.activeSponsorPlacementCount} />
                    <MetricNumberCell value={row.suspendedMemberCount} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}

function MetricsLocationCard(props: {
  mode: "city" | "department";
  row: AdminMetricsLocationRow;
}) {
  const metrics = [
    ["Abuso", props.row.abuseReportCount],
    ["Pendiente", props.row.pendingModerationCount],
    ["Oculto", props.row.hiddenContentCount],
    ["Proveedores", props.row.resourceProviderCount],
    ["Verificados", props.row.verifiedResourceProviderCount],
    ["Patrocinios", props.row.activeSponsorPlacementCount],
    ["Suspendidos", props.row.suspendedMemberCount],
  ] as const;

  return (
    <article className="border-border bg-background rounded-lg border p-4">
      <div className="min-w-0">
        <h4 className="text-base font-semibold break-words">
          {props.mode === "city"
            ? (props.row.city ?? "Sin ciudad")
            : props.row.department}
        </h4>
        {props.mode === "city" ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {props.row.department}
          </p>
        ) : null}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {metrics.map(([label, value]) => (
          <div
            className="border-border rounded-md border px-3 py-2"
            key={label}
          >
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatMetricNumber(value)}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function LocationLabel(props: {
  mode: "city" | "department";
  row: AdminMetricsLocationRow;
}) {
  if (props.mode === "department") {
    return (
      <span className="font-medium break-words">{props.row.department}</span>
    );
  }

  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-medium break-words">
        {props.row.city ?? "Sin ciudad"}
      </span>
      <span className="text-muted-foreground text-xs">
        {props.row.department}
      </span>
    </span>
  );
}

function MetricNumberCell(props: { value: number }) {
  return (
    <TableCell className="px-3 py-3 text-right whitespace-normal tabular-nums">
      {formatMetricNumber(props.value)}
    </TableCell>
  );
}

function MetricsEmptyState(props: { mode: "city" | "department" }) {
  return (
    <div className="p-5">
      <div className="border-border bg-background rounded-lg border p-5">
        <p className="font-semibold">
          {props.mode === "city"
            ? "Todavía no hay métricas por ciudad."
            : "Todavía no hay métricas por departamento."}
        </p>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
          Cuando el backend registre eventos y agregados operativos, esta tabla
          mostrará datos reales sin usar valores de demostración.
        </p>
      </div>
    </div>
  );
}

function AdminMetricsLoadingState() {
  return (
    <>
      <section
        aria-label="Cargando resumen de métricas"
        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {loadingSummaryCards.map((card) => (
          <Card className="rounded-lg" key={card}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="grid min-w-0 gap-6">
        <MetricsTableSkeleton title="Por ciudad" />
        <MetricsTableSkeleton title="Por departamento" />
      </div>
    </>
  );
}

function MetricsTableSkeleton(props: { title: string }) {
  return (
    <section className="border-border bg-card rounded-lg border p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-normal">
            {props.title}
          </h3>
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="mt-5 grid gap-3">
        {loadingRows.map((row) => (
          <Skeleton className="h-9 w-full" key={row} />
        ))}
      </div>
    </section>
  );
}

function AdminMetricsErrorState(props: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>No se pudieron cargar las métricas</AlertTitle>
      <AlertDescription>
        <p>{props.message}</p>
      </AlertDescription>
    </Alert>
  );
}

function getMetricsRowKey(
  row: AdminMetricsLocationRow,
  mode: "city" | "department",
) {
  return mode === "city"
    ? `${row.department}:${row.city ?? "sin-ciudad"}`
    : row.department;
}

function formatMetricNumber(value: number) {
  return metricFormatter.format(value);
}
