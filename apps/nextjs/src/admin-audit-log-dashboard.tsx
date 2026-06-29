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

import type {
  AdminAuditEvent,
  AdminAuditFilterOption,
  AdminAuditListInput,
  AdminAuditLogState,
} from "./admin-audit-api-adapter";
import type { AdminDataListColumn } from "./admin-ui/admin-data-list";
import {
  getAuditActionLabel,
  getAuditTargetTypeLabel,
} from "./admin-audit-labels";
import { AdminDataList } from "./admin-ui/admin-data-list";

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
const auditEventColumns: readonly AdminDataListColumn<AdminAuditEvent>[] = [
  {
    cell: (event) => formatAuditTimestamp(event.occurredAt),
    header: "Fecha",
    headerClassName: "w-[13%]",
    id: "occurredAt",
    mobileLabel: "Fecha",
  },
  {
    cell: (event) => (
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{event.actor.label}</span>
        <span className="text-muted-foreground text-xs break-words">
          {event.actor.email ?? event.actor.id}
        </span>
      </span>
    ),
    header: "Actor",
    headerClassName: "w-[21%]",
    id: "actor",
    mobileLabel: "Actor",
  },
  {
    cell: (event) => getAuditActionLabel(event.action, event.actionLabel),
    header: "Acción",
    headerClassName: "w-[14%]",
    id: "action",
    mobileLabel: "Acción",
  },
  {
    cell: (event) => (
      <span className="flex min-w-0 flex-col">
        <span className="font-medium break-words">{event.target.label}</span>
        <span className="text-muted-foreground text-xs">
          {getAuditTargetTypeLabel(event.target.type, event.target.typeLabel)}
        </span>
      </span>
    ),
    header: "Destino",
    headerClassName: "w-[18%]",
    id: "target",
    mobileLabel: "Destino",
    rowHeader: true,
  },
  {
    cell: getAuditLocationLabel,
    className: "break-words",
    header: "Ubicación",
    headerClassName: "w-[14%]",
    id: "location",
    mobileLabel: "Ubicación",
  },
  {
    cell: (event) => event.summary,
    className: "break-words",
    header: "Resumen",
    headerClassName: "w-[20%]",
    id: "summary",
    mobileLabel: "Resumen",
  },
];

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
        <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">
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
        activeFilters={getActiveAuditFilters(props.query)}
        availableSorts={props.state.data.availableSorts}
        events={props.state.data.events}
        query={props.query}
        page={props.state.data.page}
        pageSize={props.state.data.pageSize}
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
        className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_120px_auto]"
        method="get"
      >
        <label className="grid gap-2 text-sm font-medium">
          Búsqueda
          <Input
            defaultValue={props.query.search ?? ""}
            maxLength={160}
            name="search"
            placeholder="actor, destino o resumen"
            type="search"
          />
        </label>
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
          Tamaño
          <Input
            defaultValue={props.query.pageSize ?? props.query.limit ?? 10}
            max={100}
            min={1}
            name="pageSize"
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

function getActiveAuditFilters(query: AdminAuditListInput) {
  return [
    query.actor ? { label: "Actor", value: query.actor } : null,
    query.search ? { label: "Búsqueda", value: query.search } : null,
    query.targetType
      ? {
          label: "Destino",
          value: getAuditTargetTypeLabel(query.targetType),
        }
      : null,
    query.action
      ? {
          label: "Acción",
          value: getAuditActionLabel(query.action),
        }
      : null,
  ].filter((filter): filter is { label: string; value: string } =>
    Boolean(filter),
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
  activeFilters: ReturnType<typeof getActiveAuditFilters>;
  availableSorts: Extract<
    AdminAuditLogState,
    { status: "ready" }
  >["data"]["availableSorts"];
  events: readonly AdminAuditEvent[];
  page: number;
  pageSize: number;
  query: AdminAuditListInput;
  total: number;
}) {
  const isLongList = props.events.length > 12;

  return (
    <AdminDataList
      activeFilters={props.activeFilters}
      actions={
        <AuditListActions
          availableSorts={props.availableSorts}
          isLongList={isLongList}
          query={props.query}
        />
      }
      columns={auditEventColumns}
      description="Cada fila debe venir de un evento persistido por acciones de ajustes, moderación, proveedores, patrocinios o suspensión de miembros."
      emptyState={{
        description:
          "Ajusta los filtros o espera a que el backend registre acciones reales. Esta página no muestra datos simulados.",
        title: "No hay eventos de auditoría.",
      }}
      filteredEmptyState={{
        description:
          "Ajusta actor, destino o acción para ampliar el historial visible.",
        title: "No hay eventos de auditoría para estos filtros.",
      }}
      getRowKey={(event) => event.id}
      id="admin-audit-events"
      pagination={{
        hrefForPage: (page) => buildAuditListHref(props.query, { page }),
        page: props.page,
        pageSize: props.pageSize,
        totalItems: props.total,
      }}
      renderMobileCard={(event) => <AuditEventCard event={event} />}
      rows={props.events}
      tableCaption="Eventos de auditoría administrativa"
      title="Eventos"
      totalLabel={`${auditNumberFormatter.format(props.total)} total`}
    />
  );
}

function AuditListActions(props: {
  availableSorts: Extract<
    AdminAuditLogState,
    { status: "ready" }
  >["data"]["availableSorts"];
  isLongList: boolean;
  query: AdminAuditListInput;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.isLongList ? <Badge variant="outline">Vista larga</Badge> : null}
      {props.availableSorts.slice(0, 3).map((sort) => (
        <Button
          asChild
          className="h-7 rounded-md px-2 text-xs"
          key={sort.value}
          size="sm"
          variant={props.query.sortBy === sort.value ? "default" : "outline"}
        >
          <Link
            href={buildAuditListHref(props.query, {
              page: 1,
              sortBy: sort.value,
              sortDirection: getNextAuditSortDirection(props.query, sort),
            })}
          >
            {sort.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}

function getNextAuditSortDirection(
  query: AdminAuditListInput,
  sort: Extract<
    AdminAuditLogState,
    { status: "ready" }
  >["data"]["availableSorts"][number],
) {
  if (query.sortBy !== sort.value) {
    return sort.defaultDirection;
  }

  return query.sortDirection === "asc" ? "desc" : "asc";
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
        <h4 className="text-base font-semibold break-words">
          {event.target.label}
        </h4>
        <p className="text-muted-foreground text-sm">
          {getAuditTargetTypeLabel(event.target.type, event.target.typeLabel)}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs font-medium">Actor</dt>
          <dd className="mt-1 font-medium break-words">{event.actor.label}</dd>
          <dd className="text-muted-foreground text-xs break-words">
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
          <dt className="text-muted-foreground text-xs font-medium">Resumen</dt>
          <dd className="mt-1 break-words">{event.summary}</dd>
        </div>
      </dl>
    </article>
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

function buildAuditListHref(
  query: AdminAuditListInput,
  overrides: Partial<
    Pick<AdminAuditListInput, "page" | "sortBy" | "sortDirection">
  >,
) {
  const nextQuery = {
    ...query,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (nextQuery.search) {
    params.set("search", nextQuery.search);
  }

  if (nextQuery.actor) {
    params.set("actor", nextQuery.actor);
  }

  if (nextQuery.targetType) {
    params.set("targetType", nextQuery.targetType);
  }

  if (nextQuery.action) {
    params.set("action", nextQuery.action);
  }

  if (nextQuery.page && nextQuery.page > 1) {
    params.set("page", String(nextQuery.page));
  }

  if (nextQuery.pageSize) {
    params.set("pageSize", String(nextQuery.pageSize));
  } else if (nextQuery.limit) {
    params.set("pageSize", String(nextQuery.limit));
  }

  if (nextQuery.sortBy) {
    params.set("sortBy", nextQuery.sortBy);
  }

  if (nextQuery.sortDirection) {
    params.set("sortDirection", nextQuery.sortDirection);
  }

  const search = params.toString();

  return search ? `/admin/auditoria?${search}` : "/admin/auditoria";
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
