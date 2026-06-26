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
import { Input } from "@acme/ui/input";
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
  AdminAuditEvent,
  AdminAuditFilterOption,
  AdminAuditListInput,
  AdminAuditLogState,
} from "./admin-audit-api-adapter";
import {
  getAuditActionLabel,
  getAuditTargetTypeLabel,
} from "./admin-audit-labels";

export type AdminAuditLogDashboardState =
  | AdminAuditLogState
  | {
      status: "loading";
    };

const auditNumberFormatter = new Intl.NumberFormat("es-BO");
const auditTimestampFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "America/La_Paz",
  year: "numeric",
});
const loadingRows = ["row-1", "row-2", "row-3", "row-4", "row-5"] as const;

export function AdminAuditLogDashboard(props: {
  query: AdminAuditListInput;
  state: AdminAuditLogDashboardState;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <AdminAuditHeader />
      {props.state.status === "loading" ? (
        <AdminAuditLoadingState />
      ) : props.state.status === "error" ? (
        <AdminAuditErrorState message={props.state.message} />
      ) : (
        <AdminAuditReadyState query={props.query} state={props.state} />
      )}
    </div>
  );
}

function AdminAuditHeader() {
  return (
    <section className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <Badge className="w-fit" variant="secondary">
          ADMIN-010
        </Badge>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
          Auditoría administrativa
        </h2>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 sm:text-base">
          Historial durable de acciones internas con actor, acción, destino,
          fecha y resumen operativo.
        </p>
      </div>
    </section>
  );
}

function AdminAuditReadyState(props: {
  query: AdminAuditListInput;
  state: Extract<AdminAuditLogState, { status: "ready" }>;
}) {
  return (
    <>
      <AuditFilterForm filters={props.state.data.filters} query={props.query} />
      <AuditSummary
        actorCount={props.state.data.filters.actors.length}
        eventCount={props.state.data.events.length}
        targetTypeCount={props.state.data.filters.targetTypes.length}
        total={props.state.data.total}
      />
      <AuditEventTable
        events={props.state.data.events}
        total={props.state.data.total}
      />
    </>
  );
}

function AuditFilterForm(props: {
  filters: Extract<AdminAuditLogState, { status: "ready" }>["data"]["filters"];
  query: AdminAuditListInput;
}) {
  const actorOptions = withSelectedFilterOption(
    props.filters.actors,
    props.query.actor,
    (value) => value,
  );
  const actionOptions = withSelectedFilterOption(
    props.filters.actions,
    props.query.action,
    (value) => getAuditActionLabel(value),
  );
  const targetTypeOptions = withSelectedFilterOption(
    props.filters.targetTypes,
    props.query.targetType,
    (value) => getAuditTargetTypeLabel(value),
  );

  return (
    <section
      aria-labelledby="admin-audit-filters-heading"
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3
          className="text-xl font-semibold tracking-normal"
          id="admin-audit-filters-heading"
        >
          Filtros
        </h3>
        <p className="text-muted-foreground text-sm leading-6">
          Filtra por actor, tipo de destino y acción. Los valores disponibles
          vienen del backend de auditoría.
        </p>
      </div>
      <form
        action="/admin/auditoria"
        className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px_auto]"
        method="get"
      >
        <AuditSelect
          label="Actor"
          name="actor"
          options={actorOptions}
          placeholder="Todos los actores"
          value={props.query.actor}
        />
        <AuditSelect
          label="Tipo de destino"
          name="targetType"
          options={targetTypeOptions}
          placeholder="Todos los destinos"
          value={props.query.targetType}
        />
        <AuditSelect
          label="Acción"
          name="action"
          options={actionOptions}
          placeholder="Todas las acciones"
          value={props.query.action}
        />
        <label className="grid gap-2 text-sm font-medium">
          Límite
          <Input
            defaultValue={props.query.limit ?? 50}
            max={200}
            min={1}
            name="limit"
            type="number"
          />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Aplicar</Button>
          <Button asChild type="button" variant="outline">
            <Link href="/admin/auditoria">Limpiar</Link>
          </Button>
        </div>
      </form>
      <ActiveAuditFilters query={props.query} />
    </section>
  );
}

function AuditSelect(props: {
  label: string;
  name: "action" | "actor" | "targetType";
  options: readonly AdminAuditFilterOption[];
  placeholder: string;
  value?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium">
      {props.label}
      <select
        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        defaultValue={props.value ?? ""}
        name={props.name}
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActiveAuditFilters(props: { query: AdminAuditListInput }) {
  const filters = [
    props.query.actor ? `Actor: ${props.query.actor}` : null,
    props.query.targetType
      ? `Destino: ${getAuditTargetTypeLabel(props.query.targetType)}`
      : null,
    props.query.action
      ? `Acción: ${getAuditActionLabel(props.query.action)}`
      : null,
  ].filter((filter): filter is string => Boolean(filter));

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtros activos">
      {filters.map((filter) => (
        <Badge key={filter} variant="outline">
          {filter}
        </Badge>
      ))}
    </div>
  );
}

function AuditSummary(props: {
  actorCount: number;
  eventCount: number;
  targetTypeCount: number;
  total: number;
}) {
  const cards = [
    {
      description: "Eventos visibles con los filtros actuales.",
      label: "En esta vista",
      value: props.eventCount,
    },
    {
      description: "Total devuelto por el backend para la consulta.",
      label: "Total filtrado",
      value: props.total,
    },
    {
      description: "Actores disponibles para filtrar.",
      label: "Actores",
      value: props.actorCount,
    },
    {
      description: "Tipos de destino registrados.",
      label: "Destinos",
      value: props.targetTypeCount,
    },
  ] as const;

  return (
    <section
      aria-label="Resumen de auditoría"
      className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <Card className="rounded-lg" key={card.label}>
          <CardHeader className="gap-1 pb-2">
            <CardDescription className="text-xs">{card.label}</CardDescription>
            <CardTitle className="text-3xl tracking-normal">
              {auditNumberFormatter.format(card.value)}
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

function AuditEventTable(props: {
  events: readonly AdminAuditEvent[];
  total: number;
}) {
  const isLongList = props.events.length > 12;

  return (
    <section
      aria-labelledby="admin-audit-events-heading"
      className="border-border bg-card text-card-foreground flex min-w-0 flex-col rounded-lg border shadow-xs"
    >
      <div className="border-border flex min-w-0 flex-col gap-3 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3
            className="text-xl font-semibold tracking-normal"
            id="admin-audit-events-heading"
          >
            Eventos
          </h3>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            Cada fila debe venir de un evento persistido por acciones de
            ajustes, moderación, proveedores, patrocinios o suspensión de
            miembros.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant="secondary">
            {auditNumberFormatter.format(props.total)} total
          </Badge>
          {isLongList ? <Badge variant="outline">Vista larga</Badge> : null}
        </div>
      </div>

      {props.events.length === 0 ? (
        <AuditEmptyState />
      ) : (
        <>
          <div className="grid gap-3 p-4 md:hidden">
            {props.events.map((event) => (
              <AuditEventCard event={event} key={event.id} />
            ))}
          </div>
          <div className="hidden min-w-0 md:block">
            <Table className="table-fixed">
              <TableCaption className="sr-only">
                Eventos de auditoría administrativa
              </TableCaption>
              <TableHeader className="bg-muted/70 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[13%] px-3 py-3">Fecha</TableHead>
                  <TableHead className="w-[21%] px-3 py-3">Actor</TableHead>
                  <TableHead className="w-[14%] px-3 py-3">Acción</TableHead>
                  <TableHead className="w-[18%] px-3 py-3">Destino</TableHead>
                  <TableHead className="w-[14%] px-3 py-3">
                    Ubicación
                  </TableHead>
                  <TableHead className="w-[20%] px-3 py-3">Resumen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.events.map((event) => (
                  <AuditEventRow event={event} key={event.id} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}

function AuditEventCard(props: { event: AdminAuditEvent }) {
  const event = props.event;

  return (
    <article className="border-border bg-background rounded-lg border p-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <time className="text-muted-foreground text-xs font-medium">
            {formatAuditTimestamp(event.occurredAt)}
          </time>
          <Badge className="shrink-0" variant="outline">
            {getAuditActionLabel(event.action, event.actionLabel)}
          </Badge>
        </div>
        <h4 className="break-words text-base font-semibold">
          {event.target.label}
        </h4>
        <p className="text-muted-foreground text-sm">
          {getAuditTargetTypeLabel(event.target.type, event.target.typeLabel)}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs font-medium">Actor</dt>
          <dd className="mt-1 break-words font-medium">
            {event.actor.label}
          </dd>
          <dd className="text-muted-foreground break-words text-xs">
            {event.actor.email ?? event.actor.id}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs font-medium">
            Ubicación
          </dt>
          <dd className="mt-1 break-words">{getAuditLocationLabel(event)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs font-medium">
            Resumen
          </dt>
          <dd className="mt-1 break-words">{event.summary}</dd>
        </div>
      </dl>
    </article>
  );
}

function AuditEventRow(props: { event: AdminAuditEvent }) {
  const event = props.event;

  return (
    <TableRow>
      <TableCell className="px-3 py-3 align-top whitespace-normal">
        {formatAuditTimestamp(event.occurredAt)}
      </TableCell>
      <TableCell className="px-3 py-3 align-top whitespace-normal">
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">{event.actor.label}</span>
          <span className="text-muted-foreground break-words text-xs">
            {event.actor.email ?? event.actor.id}
          </span>
        </span>
      </TableCell>
      <TableCell className="px-3 py-3 align-top whitespace-normal">
        {getAuditActionLabel(event.action, event.actionLabel)}
      </TableCell>
      <TableCell className="px-3 py-3 align-top whitespace-normal">
        <span className="flex min-w-0 flex-col">
          <span className="break-words font-medium">{event.target.label}</span>
          <span className="text-muted-foreground text-xs">
            {getAuditTargetTypeLabel(event.target.type, event.target.typeLabel)}
          </span>
        </span>
      </TableCell>
      <TableCell className="px-3 py-3 align-top whitespace-normal break-words">
        {getAuditLocationLabel(event)}
      </TableCell>
      <TableCell className="px-3 py-3 align-top whitespace-normal break-words">
        {event.summary}
      </TableCell>
    </TableRow>
  );
}

function AuditEmptyState() {
  return (
    <div className="p-5">
      <div className="border-border bg-background rounded-lg border p-5">
        <p className="font-semibold">
          No hay eventos de auditoría para estos filtros.
        </p>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
          Ajusta los filtros o espera a que el backend registre acciones reales.
          Esta página no muestra datos simulados.
        </p>
      </div>
    </div>
  );
}

function AdminAuditLoadingState() {
  return (
    <>
      <section className="border-border bg-card rounded-lg border p-5 shadow-xs">
        <Skeleton className="h-6 w-24" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </section>
      <section
        aria-label="Cargando resumen de auditoría"
        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {["summary-1", "summary-2", "summary-3", "summary-4"].map((card) => (
          <Card className="rounded-lg" key={card}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="border-border bg-card rounded-lg border p-5 shadow-xs">
        <Skeleton className="h-6 w-24" />
        <div className="mt-5 grid gap-3">
          {loadingRows.map((row) => (
            <Skeleton className="h-9 w-full" key={row} />
          ))}
        </div>
      </section>
    </>
  );
}

function AdminAuditErrorState(props: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>No se pudo cargar la auditoría</AlertTitle>
      <AlertDescription>
        <p>{props.message}</p>
      </AlertDescription>
    </Alert>
  );
}

function withSelectedFilterOption(
  options: readonly AdminAuditFilterOption[],
  selectedValue: string | undefined,
  getFallbackLabel: (value: string) => string,
) {
  if (!selectedValue) {
    return options;
  }

  if (options.some((option) => option.value === selectedValue)) {
    return options;
  }

  return [
    {
      label: getFallbackLabel(selectedValue),
      value: selectedValue,
    },
    ...options,
  ];
}

function getAuditLocationLabel(event: AdminAuditEvent) {
  if (event.city && event.department) {
    return `${event.city}, ${event.department}`;
  }

  return event.department ?? "Sin ubicación";
}

function formatAuditTimestamp(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return auditTimestampFormatter.format(date).replace(".", "");
}
