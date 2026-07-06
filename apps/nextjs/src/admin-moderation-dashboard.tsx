import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Button } from "@acme/ui/button";

import type { AdminDataListColumn } from "./admin-ui/admin-data-list";
import { AdminDataList } from "./admin-ui/admin-data-list";
import { AdminSubmitButton } from "./admin-ui/admin-submit-button";

export type AdminModerationViewerRole = "admin" | "member" | "visitor";

export type AdminModerationTargetType =
  | "adoption_listing"
  | "found_pet_report"
  | "in_app_chat"
  | "lost_pet_report"
  | "resource_provider_profile"
  | "sighting_report";

export type AdminModerationContentStatus = "hidden" | "visible";

export type AdminModerationMemberStatus = "active" | "banned";

export type AdminModerationRiskFilter = "all" | "high" | "normal";

export interface AdminModerationFilters {
  city: string;
  department: string;
  reason: string;
  risk: AdminModerationRiskFilter;
  targetType: AdminModerationTargetType | "all";
}

export interface AdminModerationNotice {
  body: string;
  title: string;
  tone: "error" | "success";
}

export interface AdminModerationViewer {
  displayName: string;
  role: AdminModerationViewerRole;
}

export interface AdminModerationFlaggedItem {
  accusedMember: {
    displayName: string;
    id: string;
    status: AdminModerationMemberStatus;
  };
  department: string;
  detail: string;
  id: string;
  newestReportLabel: string;
  providerReviewStatus?:
    | "dismissed_false_report"
    | "pending"
    | "resolved_action_taken"
    | "resolved_no_action";
  reasonLabel: string;
  reportCount: number;
  reporterLabel: string;
  reviewKind: "report" | "resource_provider";
  target: {
    falseReportState?: "marked_false" | "not_false";
    href: string;
    id: string;
    locationLabel: string;
    status: AdminModerationContentStatus;
    title: string;
    type: AdminModerationTargetType;
  };
}

export interface AdminModerationSettings {
  reviewModeEnabled: boolean;
  verifiedEmailRequiredToPublish: boolean;
}

export interface AdminModerationMetric {
  city: string;
  department: string;
  hiddenCount: number;
  pendingCount: number;
  reportCount: number;
}

export type AdminModerationQueueId = "reports" | "resource-providers";

export interface AdminModerationQueueSortOption {
  defaultDirection: "asc" | "desc";
  label: string;
  value: string;
}

export interface AdminModerationListQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface AdminModerationQueueSection {
  availableSorts: readonly AdminModerationQueueSortOption[];
  description: string;
  emptyDescription: string;
  filteredEmptyDescription: string;
  id: AdminModerationQueueId;
  items: readonly AdminModerationFlaggedItem[];
  page: number;
  pageSize: number;
  tableCaption: string;
  title: string;
  total: number;
}

export interface AdminModerationDashboardProps {
  filters?: AdminModerationFilters;
  formAction?: React.ComponentProps<"form">["action"];
  listHrefForPage?: (
    queue: AdminModerationQueueSection,
    page: number,
  ) => string;
  listHrefForSort?: (
    queue: AdminModerationQueueSection,
    sort: AdminModerationQueueSortOption,
    direction: "asc" | "desc",
  ) => string;
  listQuery?: AdminModerationListQuery;
  metrics: readonly AdminModerationMetric[];
  notice?: AdminModerationNotice;
  queues: readonly AdminModerationQueueSection[];
  returnTo?: string;
  settings: AdminModerationSettings;
  viewer: AdminModerationViewer;
}

interface AdminModerationSummaryStats {
  bannedMemberCount: number;
  flaggedCount: number;
  hiddenCount: number;
}

type ContentModerationAction =
  | {
      label: "Ocultar publicación" | "Ocultar reporte";
      value: "hide_target";
    }
  | {
      label: "Restaurar publicación" | "Restaurar reporte";
      value: "restore_target";
    };

type FalseReportDecisionAction =
  | {
      confirmationLabel: "Confirmo marcar este reporte como falso";
      description: string;
      label: "Marcar reporte falso";
      reason: "false_report";
      value: "mark_false_report";
    }
  | {
      confirmationLabel: "Confirmo quitar la marca de reporte falso";
      description: string;
      label: "Quitar marca falsa";
      reason: "reviewed";
      value: "unmark_false_report";
    };

const targetTypeLabels: Record<AdminModerationTargetType, string> = {
  adoption_listing: "Publicación de adopción",
  found_pet_report: "Reporte de mascota encontrada",
  in_app_chat: "Chat en Rastro",
  lost_pet_report: "Reporte de mascota perdida",
  resource_provider_profile: "Perfil de proveedor de recursos",
  sighting_report: "Reporte de avistamiento",
};

const settingsCopy = {
  reviewMode:
    "Las nuevas publicaciones de adopción quedan retenidas para revisión antes de mostrarse públicamente.",
  verifiedEmail:
    "Los miembros deben verificar su correo antes de crear reportes o publicaciones visibles.",
} as const;

const providerReviewStatusLabels = {
  dismissed_false_report: "Reporte falso descartado",
  pending: "Pendiente",
  resolved_action_taken: "Resuelto con acción",
  resolved_no_action: "Resuelto sin acción",
} as const;

const emptyModerationFilters = {
  city: "all",
  department: "all",
  reason: "all",
  risk: "all",
  targetType: "all",
} as const satisfies AdminModerationFilters;

const emptyModerationListQuery = {
  page: 1,
  pageSize: 10,
} as const satisfies AdminModerationListQuery;

function getModerationQueueColumns(): readonly AdminDataListColumn<AdminModerationFlaggedItem>[] {
  return [
    {
      cell: (item) => <FlaggedItemTargetSummary item={item} />,
      header: "Superficie",
      headerClassName: "w-[30%]",
      id: "target",
      rowHeader: true,
    },
    {
      cell: (item) => <FlaggedItemReasonSummary item={item} />,
      header: "Motivo",
      headerClassName: "w-[24%]",
      id: "reason",
    },
    {
      cell: (item) => <FlaggedItemReporterSummary item={item} />,
      header: "Responsable",
      headerClassName: "w-[18%]",
      id: "reporter",
    },
    {
      cell: (item) => <FlaggedItemStatusSummary item={item} />,
      header: "Estado",
      headerClassName: "w-[14%]",
      id: "status",
    },
    {
      cell: (item) => <FlaggedItemActions item={item} />,
      header: "Acciones",
      headerClassName: "w-[14%] text-right",
      id: "actions",
    },
  ];
}

export function AdminModerationDashboard(props: AdminModerationDashboardProps) {
  if (props.viewer.role !== "admin") {
    return <AdminAccessDenied viewer={props.viewer} />;
  }

  const filters = props.filters ?? emptyModerationFilters;
  const listQuery = props.listQuery ?? emptyModerationListQuery;
  const flaggedItems = props.queues.flatMap((queue) => [...queue.items]);
  const summaryStats = getSummaryStats(flaggedItems);

  return (
    <div className="min-w-0">
      <div className="mx-auto grid w-full max-w-[1500px] min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-w-0 flex-col gap-6">
          <AdminDashboardHeader viewer={props.viewer} />
          {props.notice ? (
            <AdminModerationNoticeBanner notice={props.notice} />
          ) : null}
          <ModerationSummary stats={summaryStats} />
          <ModerationFilters
            filters={filters}
            items={flaggedItems}
            query={listQuery}
          />
          <ModerationQueues
            filters={filters}
            hrefForPage={props.listHrefForPage}
            hrefForSort={props.listHrefForSort}
            query={listQuery}
            queues={props.queues}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <ModerationSettings settings={props.settings} />
          <AbuseMetrics metrics={props.metrics} />
        </aside>
      </div>
    </div>
  );
}

export function AdminModerationReviewDetail(props: {
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  notice?: AdminModerationNotice;
  returnTo?: string;
  settings: AdminModerationSettings;
  viewer: AdminModerationViewer;
}) {
  if (props.viewer.role !== "admin") {
    return <AdminAccessDenied viewer={props.viewer} />;
  }

  const contentAction = getContentAction(props.item);
  const risk = getModerationRisk(props.item);

  return (
    <div className="min-w-0">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
        <header className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
          <Button asChild className="w-fit" size="sm" variant="outline">
            <Link href="/admin/moderacion">Volver a la cola</Link>
          </Button>
          <p className="text-primary mt-5 text-sm font-semibold">
            Revisión de moderación
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-normal">
            {props.item.target.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
            Evidencia, estado, notas y acciones para una revisión reportada por
            la comunidad.
          </p>
        </header>

        {props.notice ? (
          <AdminModerationNoticeBanner notice={props.notice} />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">Evidencia</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <DetailValue
                label="Tipo"
                value={targetTypeLabels[props.item.target.type]}
              />
              <DetailValue label="Motivo" value={props.item.reasonLabel} />
              <DetailValue
                label="Reportes acumulados"
                value={`${props.item.reportCount}`}
              />
              <DetailValue
                label="Riesgo"
                value={risk === "high" ? "Alto riesgo" : "Riesgo estándar"}
              />
              <DetailValue
                label="Ubicación"
                value={`${props.item.target.locationLabel} - ${props.item.department}`}
              />
              <DetailValue
                label="Última señal"
                value={props.item.newestReportLabel}
              />
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs font-semibold uppercase">
                  Detalle
                </dt>
                <dd className="mt-1 leading-6">{props.item.detail}</dd>
              </div>
            </dl>
          </article>

          <aside className="flex flex-col gap-6">
            <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
              <h2 className="text-xl font-semibold">Acciones</h2>
              <div className="mt-4 flex flex-col gap-3">
                <ModerationDecisionPanel
                  contentAction={contentAction}
                  formAction={props.formAction}
                  item={props.item}
                  returnTo={
                    props.returnTo ?? `/admin/moderacion/${props.item.id}`
                  }
                />
              </div>
            </section>

            <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
              <h2 className="text-xl font-semibold">Historial</h2>
              <dl className="mt-4 grid gap-4 text-sm">
                <DetailValue
                  label="Responsable"
                  value={props.item.accusedMember.displayName}
                />
                <DetailValue
                  label="Reportado por"
                  value={props.item.reporterLabel}
                />
                <div>
                  <dt className="text-muted-foreground text-xs font-semibold uppercase">
                    Estado actual
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    <StatusPill status={props.item.target.status} />
                    <MemberStatusPill
                      status={props.item.accusedMember.status}
                    />
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
              <h2 className="text-xl font-semibold">Reglas activas</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <DetailValue
                  label="Adopciones en revisión"
                  value={
                    props.settings.reviewModeEnabled
                      ? "Activado"
                      : "Desactivado"
                  }
                />
                <DetailValue
                  label="Correo verificado requerido"
                  value={
                    props.settings.verifiedEmailRequiredToPublish
                      ? "Activado"
                      : "Desactivado"
                  }
                />
              </dl>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}

function getSummaryStats(
  flaggedItems: readonly AdminModerationFlaggedItem[],
): AdminModerationSummaryStats {
  return flaggedItems.reduce(
    (stats, item) => ({
      bannedMemberCount:
        stats.bannedMemberCount +
        (item.accusedMember.status === "banned" ? 1 : 0),
      flaggedCount: stats.flaggedCount + 1,
      hiddenCount:
        stats.hiddenCount + (item.target.status === "hidden" ? 1 : 0),
    }),
    {
      bannedMemberCount: 0,
      flaggedCount: 0,
      hiddenCount: 0,
    },
  );
}

function AdminModerationNoticeBanner(props: { notice: AdminModerationNotice }) {
  return (
    <Alert
      aria-live="polite"
      variant={props.notice.tone === "error" ? "destructive" : "default"}
    >
      <AlertTitle>{props.notice.title}</AlertTitle>
      <AlertDescription>
        <p>{props.notice.body}</p>
      </AlertDescription>
    </Alert>
  );
}

function AdminDashboardHeader(props: { viewer: AdminModerationViewer }) {
  return (
    <header className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-5 shadow-xs md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-primary text-sm font-semibold">Moderación Rastro</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">
          Contenido reportado
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Cola operativa para revisar reportes, publicaciones de adopción, chats
          y perfiles de proveedores de recursos en Bolivia.
        </p>
      </div>
      <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm font-medium">
        {props.viewer.displayName}
      </p>
    </header>
  );
}

function ModerationFilters(props: {
  filters: AdminModerationFilters;
  items: readonly AdminModerationFlaggedItem[];
  query: AdminModerationListQuery;
}) {
  const options = buildModerationFilterOptions(props.items, props.filters);

  return (
    <section
      aria-labelledby="moderation-filters-heading"
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
    >
      <div className="flex flex-col gap-1">
        <h2 id="moderation-filters-heading" className="text-xl font-semibold">
          Filtros de revisión
        </h2>
        <p className="text-muted-foreground text-sm">
          Acota la cola por tipo, motivo, ciudad, departamento y nivel de
          riesgo.
        </p>
      </div>
      <form
        action="/admin/moderacion"
        className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))_96px_auto]"
        method="get"
      >
        {props.query.sortBy ? (
          <input name="sortBy" type="hidden" value={props.query.sortBy} />
        ) : null}
        {props.query.sortDirection ? (
          <input
            name="sortDirection"
            type="hidden"
            value={props.query.sortDirection}
          />
        ) : null}
        <label className="grid gap-1.5 text-sm font-medium">
          Búsqueda
          <input
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
            defaultValue={props.query.search ?? ""}
            maxLength={160}
            name="search"
            placeholder="Título, ciudad o responsable"
            type="search"
          />
        </label>
        <NativeFilterSelect
          label="Tipo"
          name="targetType"
          options={options.targetTypes}
          value={props.filters.targetType}
        />
        <NativeFilterSelect
          label="Motivo"
          name="reason"
          options={options.reasons}
          value={props.filters.reason}
        />
        <NativeFilterSelect
          label="Departamento"
          name="department"
          options={options.departments}
          value={props.filters.department}
        />
        <NativeFilterSelect
          label="Ciudad"
          name="city"
          options={options.cities}
          value={props.filters.city}
        />
        <NativeFilterSelect
          label="Riesgo"
          name="risk"
          options={options.risks}
          value={props.filters.risk}
        />
        <label className="grid gap-1.5 text-sm font-medium">
          Tamaño
          <input
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
            defaultValue={props.query.pageSize}
            max={100}
            min={1}
            name="pageSize"
            type="number"
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
          <Button className="min-h-10 flex-1" type="submit">
            Aplicar
          </Button>
          <Button asChild className="min-h-10 flex-1" variant="outline">
            <Link href="/admin/moderacion">Limpiar</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}

function NativeFilterSelect(props: {
  label: string;
  name: keyof AdminModerationFilters;
  options: readonly { label: string; value: string }[];
  value: string;
}) {
  const id = `moderation-filter-${props.name}`;

  return (
    <label className="grid gap-1.5 text-sm font-medium" htmlFor={id}>
      {props.label}
      <select
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
        defaultValue={props.value}
        id={id}
        name={props.name}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModerationQueues(props: {
  filters: AdminModerationFilters;
  hrefForPage?: (queue: AdminModerationQueueSection, page: number) => string;
  hrefForSort?: (
    queue: AdminModerationQueueSection,
    sort: AdminModerationQueueSortOption,
    direction: "asc" | "desc",
  ) => string;
  query: AdminModerationListQuery;
  queues: readonly AdminModerationQueueSection[];
}) {
  if (props.queues.length === 0) {
    return (
      <AdminDataList
        activeFilters={getActiveModerationFilters(props.filters, props.query)}
        columns={getModerationQueueColumns()}
        description="No hay una cola persistida para el tipo seleccionado."
        emptyState={{
          description:
            "Ajusta tipo, motivo, departamento o riesgo para ampliar la cola.",
          title: "No hay resultados con estos filtros.",
        }}
        filteredEmptyState={{
          description:
            "Ajusta tipo, motivo, departamento o riesgo para ampliar la cola.",
          title: "No hay resultados con estos filtros.",
        }}
        getRowKey={(item) => item.id}
        id="flagged-content-empty"
        rows={[]}
        tableCaption="Contenido reportado para moderación"
        title="Cola de revisión"
      />
    );
  }

  return (
    <div className="grid gap-6">
      {props.queues.map((queue) => (
        <FlaggedContentQueue
          filters={props.filters}
          hrefForPage={props.hrefForPage}
          hrefForSort={props.hrefForSort}
          key={queue.id}
          query={props.query}
          queue={queue}
        />
      ))}
    </div>
  );
}

function ModerationSummary(props: { stats: AdminModerationSummaryStats }) {
  return (
    <section
      aria-label="Resumen de moderación"
      className="grid gap-3 sm:grid-cols-3"
    >
      <SummaryStat label="Pendientes" value={props.stats.flaggedCount} />
      <SummaryStat label="Ocultos" value={props.stats.hiddenCount} />
      <SummaryStat
        label="Miembros suspendidos"
        value={props.stats.bannedMemberCount}
      />
    </section>
  );
}

function FlaggedContentQueue(props: {
  filters: AdminModerationFilters;
  hrefForPage?: (queue: AdminModerationQueueSection, page: number) => string;
  hrefForSort?: (
    queue: AdminModerationQueueSection,
    sort: AdminModerationQueueSortOption,
    direction: "asc" | "desc",
  ) => string;
  query: AdminModerationListQuery;
  queue: AdminModerationQueueSection;
}) {
  const columns = getModerationQueueColumns();
  const queue = props.queue;

  return (
    <AdminDataList
      activeFilters={getActiveModerationFilters(props.filters, props.query)}
      actions={
        <ModerationQueueActions
          hrefForSort={props.hrefForSort}
          query={props.query}
          queue={queue}
        />
      }
      columns={columns}
      description={queue.description}
      emptyState={{
        description: queue.emptyDescription,
        title: "No hay contenido pendiente de revisión.",
      }}
      filteredEmptyState={{
        description: queue.filteredEmptyDescription,
        title: "No hay resultados con estos filtros.",
      }}
      getRowKey={(item) => item.id}
      id={`flagged-content-${queue.id}`}
      pagination={{
        hrefForPage: (page) => props.hrefForPage?.(queue, page),
        page: queue.page,
        pageSize: queue.pageSize,
        totalItems: queue.total,
      }}
      renderMobileCard={(item) => <FlaggedItemCard item={item} />}
      rows={queue.items}
      tableCaption={queue.tableCaption}
      title={queue.title}
      totalLabel={`${queue.items.length} de ${queue.total} revisiones`}
    />
  );
}

function ModerationQueueActions(props: {
  hrefForSort?: (
    queue: AdminModerationQueueSection,
    sort: AdminModerationQueueSortOption,
    direction: "asc" | "desc",
  ) => string;
  query: AdminModerationListQuery;
  queue: AdminModerationQueueSection;
}) {
  if (props.queue.availableSorts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.queue.availableSorts.map((sort) => {
        const direction = getNextModerationSortDirection(props.query, sort);

        return (
          <Button
            asChild={Boolean(props.hrefForSort)}
            className="h-7 rounded-md px-2 text-xs"
            disabled={!props.hrefForSort}
            key={sort.value}
            size="sm"
            type="button"
            variant={props.query.sortBy === sort.value ? "default" : "outline"}
          >
            {props.hrefForSort ? (
              <Link href={props.hrefForSort(props.queue, sort, direction)}>
                {sort.label}
              </Link>
            ) : (
              sort.label
            )}
          </Button>
        );
      })}
    </div>
  );
}

function getNextModerationSortDirection(
  query: AdminModerationListQuery,
  sort: AdminModerationQueueSortOption,
) {
  if (query.sortBy !== sort.value) {
    return sort.defaultDirection;
  }

  return query.sortDirection === "asc" ? "desc" : "asc";
}

function AdminAccessDenied(props: { viewer: AdminModerationViewer }) {
  return (
    <div className="min-w-0">
      <section
        aria-labelledby="admin-access-denied-heading"
        className="container flex min-h-screen items-center justify-center py-8"
      >
        <div className="border-border bg-card text-card-foreground w-full max-w-xl rounded-lg border p-6 shadow-xs">
          <p className="text-primary text-sm font-semibold">
            Moderación Rastro
          </p>
          <h1
            className="mt-2 text-3xl font-bold tracking-normal"
            id="admin-access-denied-heading"
          >
            Acceso restringido
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Solo administradores de Rastro pueden revisar colas de abuso,
            cambiar el modo de revisión o modificar reglas de publicación.
          </p>
          <p className="bg-muted text-muted-foreground mt-5 rounded-md px-3 py-2 text-sm font-medium">
            Sesión actual: {props.viewer.displayName}
          </p>
        </div>
      </section>
    </div>
  );
}

function SummaryStat(props: { label: string; value: number }) {
  return (
    <div className="border-border bg-card rounded-lg border p-4 shadow-xs">
      <p className="text-muted-foreground text-sm font-medium">{props.label}</p>
      <p className="mt-2 text-3xl font-bold">{props.value}</p>
    </div>
  );
}

function FlaggedItemCard(props: { item: AdminModerationFlaggedItem }) {
  const item = props.item;
  const targetLabel = targetTypeLabels[item.target.type];

  return (
    <article className="border-border bg-background rounded-lg border p-4">
      <div className="min-w-0">
        <a
          className="text-foreground hover:text-primary focus-visible:border-ring focus-visible:ring-ring/50 font-semibold break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
          href={`/admin/moderacion/${item.id}`}
        >
          {item.target.title}
        </a>
        <p className="text-primary mt-1 text-xs font-semibold">{targetLabel}</p>
        <p className="text-muted-foreground text-xs">
          {item.target.locationLabel} - {item.department}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs font-semibold">
            Motivo
          </dt>
          <dd className="mt-1 font-medium">{item.reasonLabel}</dd>
          <dd className="text-muted-foreground text-xs">
            {item.reportCount} reportes - {item.newestReportLabel}
          </dd>
          <dd className="text-muted-foreground mt-1 text-xs">{item.detail}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs font-semibold">
            Responsable
          </dt>
          <dd className="mt-1 font-medium">{item.accusedMember.displayName}</dd>
          <dd className="text-muted-foreground text-xs">
            Reportado por {item.reporterLabel}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs font-semibold">
            Estado
          </dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={item.target.status} />
            <MemberStatusPill status={item.accusedMember.status} />
          </dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-2">
        <a
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 rounded-md px-3 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-[3px]"
          href={`/admin/moderacion/${item.id}`}
        >
          Abrir revisión
        </a>
        {item.target.type !== "resource_provider_profile" ? (
          <a
            className="border-border text-foreground hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-[3px]"
            href={`/admin/miembros?memberId=${encodeURIComponent(item.accusedMember.id)}`}
          >
            Gestionar miembro
          </a>
        ) : null}
      </div>
    </article>
  );
}

function FlaggedItemTargetSummary(props: { item: AdminModerationFlaggedItem }) {
  const item = props.item;
  const targetLabel = targetTypeLabels[item.target.type];

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <a
        className="text-foreground hover:text-primary focus-visible:border-ring focus-visible:ring-ring/50 font-semibold break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
        href={`/admin/moderacion/${item.id}`}
      >
        {item.target.title}
      </a>
      <span className="text-primary text-xs font-semibold">{targetLabel}</span>
      <span className="text-muted-foreground text-xs break-words">
        {item.target.locationLabel} - {item.department}
      </span>
    </div>
  );
}

function FlaggedItemReasonSummary(props: { item: AdminModerationFlaggedItem }) {
  const item = props.item;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium break-words">{item.reasonLabel}</span>
      <span className="text-muted-foreground text-xs">
        {item.reportCount} reportes - {item.newestReportLabel}
      </span>
      <span className="text-muted-foreground max-w-xs text-xs break-words">
        {item.detail}
      </span>
    </div>
  );
}

function FlaggedItemReporterSummary(props: {
  item: AdminModerationFlaggedItem;
}) {
  const item = props.item;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium break-words">
        {item.accusedMember.displayName}
      </span>
      <span className="text-muted-foreground text-xs break-words">
        Reportado por {item.reporterLabel}
      </span>
    </div>
  );
}

function FlaggedItemStatusSummary(props: { item: AdminModerationFlaggedItem }) {
  return (
    <div className="flex flex-col gap-2">
      <StatusPill status={props.item.target.status} />
      <MemberStatusPill status={props.item.accusedMember.status} />
    </div>
  );
}

function FlaggedItemActions(props: { item: AdminModerationFlaggedItem }) {
  return (
    <div className="flex flex-col items-stretch gap-2">
      <a
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 rounded-md px-3 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-[3px]"
        href={`/admin/moderacion/${props.item.id}`}
      >
        Abrir revisión
      </a>
      {props.item.target.type !== "resource_provider_profile" ? (
        <a
          className="border-border text-foreground hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-[3px]"
          href={`/admin/miembros?memberId=${encodeURIComponent(props.item.accusedMember.id)}`}
        >
          Gestionar miembro
        </a>
      ) : null}
    </div>
  );
}

function ModerationDecisionPanel(props: {
  contentAction: ContentModerationAction | null;
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  const falseReportAction = getFalseReportAction(props.item);

  return (
    <>
      {props.contentAction ? (
        <ReportVisibilityDecisionForm
          contentAction={props.contentAction}
          formAction={props.formAction}
          item={props.item}
          returnTo={props.returnTo}
        />
      ) : null}

      {falseReportAction ? (
        <FalseReportDecisionForm
          action={falseReportAction}
          formAction={props.formAction}
          item={props.item}
          returnTo={props.returnTo}
        />
      ) : null}

      {props.item.target.type === "resource_provider_profile" ? (
        <ProviderResolutionDecisionForm
          formAction={props.formAction}
          item={props.item}
          returnTo={props.returnTo}
        />
      ) : null}

      {props.item.target.type !== "resource_provider_profile" ? (
        <a
          className="border-border text-foreground hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-[3px]"
          href={`/admin/miembros?memberId=${encodeURIComponent(props.item.accusedMember.id)}`}
        >
          Gestionar miembro
        </a>
      ) : null}

      {!props.contentAction &&
      !falseReportAction &&
      props.item.target.type !== "resource_provider_profile" ? (
        <p className="text-muted-foreground text-sm">
          Este objetivo se revisa desde su flujo especializado. La cola mantiene
          la evidencia y el conteo de reportes.
        </p>
      ) : null}
    </>
  );
}

function ReportVisibilityDecisionForm(props: {
  contentAction: ContentModerationAction;
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  return (
    <ReportDecisionFormShell
      actionValue={props.contentAction.value}
      confirmationLabel={`Confirmo ${props.contentAction.label.toLowerCase()}`}
      formAction={props.formAction}
      item={props.item}
      pendingLabel="Aplicando decisión"
      reason="admin_review"
      returnTo={props.returnTo}
      submitLabel={props.contentAction.label}
    />
  );
}

function FalseReportDecisionForm(props: {
  action: FalseReportDecisionAction;
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  return (
    <ReportDecisionFormShell
      actionValue={props.action.value}
      confirmationLabel={props.action.confirmationLabel}
      description={props.action.description}
      formAction={props.formAction}
      item={props.item}
      pendingLabel="Registrando decisión"
      reason={props.action.reason}
      returnTo={props.returnTo}
      submitLabel={props.action.label}
    />
  );
}

function ReportDecisionFormShell(props: {
  actionValue: string;
  confirmationLabel: string;
  description?: string;
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  pendingLabel: string;
  reason: string;
  returnTo: string;
  submitLabel: string;
}) {
  const noteId = `note-detail-${props.actionValue}-${props.item.id}`;
  const confirmationId = `confirm-detail-${props.actionValue}-${props.item.id}`;

  return (
    <form
      aria-label={`${props.submitLabel} para ${props.item.target.title}`}
      action={props.formAction}
      className="border-border grid gap-3 rounded-lg border p-3"
      method={props.formAction ? undefined : "post"}
    >
      <input name="reviewItemId" type="hidden" value={props.item.id} />
      <input name="moderationReason" type="hidden" value={props.reason} />
      <input name="returnTo" type="hidden" value={props.returnTo} />
      <input name="targetId" type="hidden" value={props.item.target.id} />
      <input name="targetTitle" type="hidden" value={props.item.target.title} />
      <input name="targetType" type="hidden" value={props.item.target.type} />
      <label className="sr-only" htmlFor={noteId}>
        Nota de moderación
      </label>
      <textarea
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
        id={noteId}
        maxLength={1000}
        name="moderationNote"
        placeholder="Nota breve"
      />
      <label
        className="border-border flex items-start gap-2 rounded-md border p-3 text-sm"
        htmlFor={confirmationId}
      >
        <input
          className="border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 mt-0.5 size-4 shrink-0 rounded border shadow-xs focus-visible:ring-[3px]"
          id={confirmationId}
          name="confirmModerationAction"
          required
          type="checkbox"
          value="on"
        />
        <span>
          <span className="block font-medium">{props.confirmationLabel}</span>
          <span className="text-muted-foreground mt-1 block">
            {props.description ??
              "Esta acción queda registrada y afecta la visibilidad pública."}
          </span>
        </span>
      </label>
      <AdminSubmitButton
        className="min-h-11"
        name="moderationAction"
        pendingLabel={props.pendingLabel}
        value={props.actionValue}
        variant="outline"
      >
        {props.submitLabel}
      </AdminSubmitButton>
    </form>
  );
}

function ProviderResolutionDecisionForm(props: {
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  const status = props.item.providerReviewStatus ?? "pending";
  const noteId = `provider-resolution-note-${props.item.id}`;
  const reasonId = `provider-resolution-reason-${props.item.id}`;
  const confirmationId = `provider-resolution-confirm-${props.item.id}`;

  return (
    <form
      aria-label={`Resolver reporte de proveedor para ${props.item.target.title}`}
      action={props.formAction}
      className="border-border grid gap-3 rounded-lg border p-3"
      method={props.formAction ? undefined : "post"}
    >
      <input
        name="moderationAction"
        type="hidden"
        value="resolve_provider_review"
      />
      <input name="reviewItemId" type="hidden" value={props.item.id} />
      <input name="returnTo" type="hidden" value={props.returnTo} />
      <input name="targetId" type="hidden" value={props.item.target.id} />
      <input name="targetTitle" type="hidden" value={props.item.target.title} />
      <p className="text-muted-foreground text-sm">
        Estado actual: {providerReviewStatusLabels[status]}.
      </p>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor={reasonId}>
        Motivo de resolución
        <input
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-10 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
          defaultValue="admin_review"
          id={reasonId}
          maxLength={120}
          name="providerResolutionReason"
          required
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor={noteId}>
        Nota
        <textarea
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
          id={noteId}
          maxLength={1000}
          name="providerResolutionNote"
          placeholder="Qué evidencia se revisó o qué acción se tomó"
        />
      </label>
      <label
        className="border-border flex items-start gap-2 rounded-md border p-3 text-sm"
        htmlFor={confirmationId}
      >
        <input
          className="border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 mt-0.5 size-4 shrink-0 rounded border shadow-xs focus-visible:ring-[3px]"
          id={confirmationId}
          name="confirmModerationAction"
          required
          type="checkbox"
          value="on"
        />
        <span>
          <span className="block font-medium">
            Confirmo resolver este reporte de proveedor
          </span>
          <span className="text-muted-foreground mt-1 block">
            La resolución queda auditada y actualiza la cola de proveedores.
          </span>
        </span>
      </label>
      <div className="grid gap-2">
        <AdminSubmitButton
          className="min-h-11"
          name="providerResolutionStatus"
          pendingLabel="Resolviendo reporte"
          value="dismissed_false_report"
          variant="outline"
        >
          Descartar reporte falso
        </AdminSubmitButton>
        <AdminSubmitButton
          className="min-h-11"
          name="providerResolutionStatus"
          pendingLabel="Resolviendo reporte"
          value="resolved_action_taken"
          variant="outline"
        >
          Resolver con acción
        </AdminSubmitButton>
        <AdminSubmitButton
          className="min-h-11"
          name="providerResolutionStatus"
          pendingLabel="Resolviendo reporte"
          value="resolved_no_action"
          variant="outline"
        >
          Resolver sin acción
        </AdminSubmitButton>
      </div>
    </form>
  );
}

function ModerationSettings(props: { settings: AdminModerationSettings }) {
  return (
    <section
      aria-labelledby="moderation-settings-heading"
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
    >
      <h2 id="moderation-settings-heading" className="text-xl font-semibold">
        Ajustes de seguridad
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        <SettingState
          checked={props.settings.reviewModeEnabled}
          description={settingsCopy.reviewMode}
          label="Modo de revisión para adopciones"
        />
        <SettingState
          checked={props.settings.verifiedEmailRequiredToPublish}
          description={settingsCopy.verifiedEmail}
          label="Correo verificado requerido para publicar"
        />
        <Link
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-center text-sm font-semibold"
          href="/admin/ajustes"
        >
          Abrir ajustes
        </Link>
      </div>
    </section>
  );
}

function SettingState(props: {
  checked: boolean;
  description: string;
  label: string;
}) {
  return (
    <div className="border-border flex items-start justify-between gap-4 rounded-lg border p-3">
      <span>
        <span className="block text-sm font-semibold">{props.label}</span>
        <span className="text-muted-foreground mt-1 block text-sm">
          {props.description}
        </span>
      </span>
      <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-semibold">
        {props.checked ? "Activado" : "Desactivado"}
      </span>
    </div>
  );
}

function AbuseMetrics(props: { metrics: readonly AdminModerationMetric[] }) {
  return (
    <section
      aria-labelledby="abuse-metrics-heading"
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
    >
      <h2 id="abuse-metrics-heading" className="text-xl font-semibold">
        Métricas de abuso por ciudad
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Reportes de abuso agrupados por ciudad y departamento
          </caption>
          <thead className="text-muted-foreground text-xs font-semibold uppercase">
            <tr>
              <th className="py-2 pr-3" scope="col">
                Ciudad
              </th>
              <th className="px-3 py-2 text-right" scope="col">
                Reportes
              </th>
              <th className="px-3 py-2 text-right" scope="col">
                Pendientes
              </th>
              <th className="py-2 pl-3 text-right" scope="col">
                Ocultos
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {props.metrics.map((metric) => (
              <tr key={`${metric.department}:${metric.city}`}>
                <th className="py-3 pr-3 font-medium" scope="row">
                  {metric.city}
                  <span className="text-muted-foreground block text-xs font-normal">
                    {metric.department}
                  </span>
                </th>
                <td className="px-3 py-3 text-right">{metric.reportCount}</td>
                <td className="px-3 py-3 text-right">{metric.pendingCount}</td>
                <td className="py-3 pl-3 text-right">{metric.hiddenCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill(props: { status: AdminModerationContentStatus }) {
  if (props.status === "hidden") {
    return (
      <span className="bg-muted text-muted-foreground w-fit rounded-md px-2 py-1 text-xs font-semibold">
        Oculto
      </span>
    );
  }

  return (
    <span className="bg-primary/10 text-primary w-fit rounded-md px-2 py-1 text-xs font-semibold">
      Visible
    </span>
  );
}

function MemberStatusPill(props: { status: AdminModerationMemberStatus }) {
  if (props.status === "banned") {
    return (
      <span className="bg-destructive/10 text-destructive w-fit rounded-md px-2 py-1 text-xs font-semibold">
        Miembro suspendido
      </span>
    );
  }

  return (
    <span className="bg-muted text-muted-foreground w-fit rounded-md px-2 py-1 text-xs font-semibold">
      Miembro activo
    </span>
  );
}

function DetailValue(props: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-semibold uppercase">
        {props.label}
      </dt>
      <dd className="mt-1 font-medium">{props.value}</dd>
    </div>
  );
}

function buildModerationFilterOptions(
  items: readonly AdminModerationFlaggedItem[],
  filters: AdminModerationFilters,
) {
  return {
    cities: [
      { label: "Todas las ciudades", value: "all" },
      ...withSelectedOption(
        uniqueSorted(items.map((item) => item.target.locationLabel)).map(
          (value) => ({
            label: value,
            value,
          }),
        ),
        filters.city,
        (value) => ({
          label: value,
          value,
        }),
      ),
    ],
    departments: [
      { label: "Todos los departamentos", value: "all" },
      ...withSelectedOption(
        uniqueSorted(items.map((item) => item.department)).map((value) => ({
          label: value,
          value,
        })),
        filters.department,
        (value) => ({
          label: value,
          value,
        }),
      ),
    ],
    reasons: [
      { label: "Todos los motivos", value: "all" },
      ...withSelectedOption(
        uniqueSorted(items.map((item) => item.reasonLabel)).map((value) => ({
          label: value,
          value,
        })),
        filters.reason,
        (value) => ({
          label: value,
          value,
        }),
      ),
    ],
    risks: [
      { label: "Todos los riesgos", value: "all" },
      { label: "Alto riesgo", value: "high" },
      { label: "Riesgo estándar", value: "normal" },
    ],
    targetTypes: [
      { label: "Todos los tipos", value: "all" },
      ...Object.entries(targetTypeLabels).map(([value, label]) => ({
        label,
        value,
      })),
    ],
  };
}

function withSelectedOption(
  options: readonly { label: string; value: string }[],
  selectedValue: string,
  buildOption: (value: string) => { label: string; value: string },
) {
  if (
    selectedValue === "all" ||
    options.some((option) => option.value === selectedValue)
  ) {
    return options;
  }

  return [buildOption(selectedValue), ...options];
}

function getActiveModerationFilters(
  filters: AdminModerationFilters,
  query: AdminModerationListQuery,
) {
  return [
    query.search
      ? {
          label: "Búsqueda",
          value: query.search,
        }
      : null,
    filters.targetType !== "all"
      ? {
          label: "Tipo",
          value: targetTypeLabels[filters.targetType],
        }
      : null,
    filters.reason !== "all"
      ? {
          label: "Motivo",
          value: filters.reason,
        }
      : null,
    filters.department !== "all"
      ? {
          label: "Departamento",
          value: filters.department,
        }
      : null,
    filters.city !== "all"
      ? {
          label: "Ciudad",
          value: filters.city,
        }
      : null,
    filters.risk !== "all"
      ? {
          label: "Riesgo",
          value: filters.risk === "high" ? "Alto riesgo" : "Riesgo estándar",
        }
      : null,
  ].filter((filter): filter is { label: string; value: string } =>
    Boolean(filter),
  );
}

function getModerationRisk(
  item: AdminModerationFlaggedItem,
): Exclude<AdminModerationRiskFilter, "all"> {
  const riskText = `${item.reasonLabel} ${item.detail}`.toLowerCase();

  if (
    item.reportCount >= 3 ||
    item.accusedMember.status === "banned" ||
    riskText.includes("crueldad") ||
    riskText.includes("estafa") ||
    riskText.includes("robada") ||
    riskText.includes("suplant")
  ) {
    return "high";
  }

  return "normal";
}

function uniqueSorted<T extends string>(values: readonly T[]) {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right, "es-BO"),
  );
}

function getContentAction(
  item: AdminModerationFlaggedItem,
): ContentModerationAction | null {
  if (!canHideOrRestore(item.target.type)) {
    return null;
  }

  const noun =
    item.target.type === "adoption_listing" ? "publicación" : "reporte";

  if (item.target.status === "hidden") {
    return {
      label:
        noun === "publicación" ? "Restaurar publicación" : "Restaurar reporte",
      value: "restore_target",
    };
  }

  return {
    label: noun === "publicación" ? "Ocultar publicación" : "Ocultar reporte",
    value: "hide_target",
  };
}

function getFalseReportAction(
  item: AdminModerationFlaggedItem,
): FalseReportDecisionAction | null {
  if (!isFalseReportDecisionTarget(item.target.type)) {
    return null;
  }

  if (item.target.falseReportState === "marked_false") {
    return {
      confirmationLabel: "Confirmo quitar la marca de reporte falso",
      description:
        "El reporte vuelve a revisión normal y queda trazado en auditoría.",
      label: "Quitar marca falsa",
      reason: "reviewed",
      value: "unmark_false_report",
    };
  }

  return {
    confirmationLabel: "Confirmo marcar este reporte como falso",
    description:
      "El reporte se oculta de superficies públicas y la decisión queda auditada.",
    label: "Marcar reporte falso",
    reason: "false_report",
    value: "mark_false_report",
  };
}

function canHideOrRestore(type: AdminModerationTargetType) {
  return (
    type === "adoption_listing" ||
    type === "found_pet_report" ||
    type === "lost_pet_report" ||
    type === "sighting_report"
  );
}

function isFalseReportDecisionTarget(type: AdminModerationTargetType) {
  return (
    type === "found_pet_report" ||
    type === "lost_pet_report" ||
    type === "sighting_report"
  );
}
