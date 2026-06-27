import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Button } from "@acme/ui/button";

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
  reasonLabel: string;
  reportCount: number;
  reporterLabel: string;
  target: {
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

export interface AdminModerationDashboardProps {
  filters?: AdminModerationFilters;
  flaggedItems: readonly AdminModerationFlaggedItem[];
  formAction?: React.ComponentProps<"form">["action"];
  metrics: readonly AdminModerationMetric[];
  notice?: AdminModerationNotice;
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

const emptyModerationFilters = {
  city: "all",
  department: "all",
  reason: "all",
  risk: "all",
  targetType: "all",
} as const satisfies AdminModerationFilters;

export function AdminModerationDashboard(props: AdminModerationDashboardProps) {
  if (props.viewer.role !== "admin") {
    return <AdminAccessDenied viewer={props.viewer} />;
  }

  const filters = props.filters ?? emptyModerationFilters;
  const filteredItems = filterAdminModerationItems(props.flaggedItems, filters);
  const summaryStats = getSummaryStats(filteredItems);

  return (
    <main className="bg-background min-h-screen overflow-x-hidden">
      <div className="mx-auto grid w-full max-w-[1500px] min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-w-0 flex-col gap-6">
          <AdminDashboardHeader viewer={props.viewer} />
          {props.notice ? (
            <AdminModerationNoticeBanner notice={props.notice} />
          ) : null}
          <ModerationSummary stats={summaryStats} />
          <ModerationFilters filters={filters} items={props.flaggedItems} />
          <FlaggedContentQueue
            formAction={props.formAction}
            items={filteredItems}
            totalItemCount={props.flaggedItems.length}
            returnTo={props.returnTo ?? "/admin/moderacion"}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <ModerationSettings settings={props.settings} />
          <AbuseMetrics metrics={props.metrics} />
        </aside>
      </div>
    </main>
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
    <main className="bg-background min-h-screen overflow-x-hidden">
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
                {contentAction ? (
                  <FlaggedItemActionForm
                    contentAction={contentAction}
                    formAction={props.formAction}
                    idPrefix="detail"
                    item={props.item}
                    returnTo={props.returnTo ?? `/admin/moderacion/${props.item.id}`}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Este objetivo se revisa desde su flujo especializado. La
                    cola mantiene la evidencia y el conteo de reportes.
                  </p>
                )}
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
                    <MemberStatusPill status={props.item.accusedMember.status} />
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
              <h2 className="text-xl font-semibold">Reglas activas</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <DetailValue
                  label="Adopciones en revisión"
                  value={props.settings.reviewModeEnabled ? "Activado" : "Desactivado"}
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
    </main>
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
}) {
  const options = buildModerationFilterOptions(props.items);

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
        className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
        method="get"
      >
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
  formAction?: React.ComponentProps<"form">["action"];
  items: readonly AdminModerationFlaggedItem[];
  returnTo: string;
  totalItemCount: number;
}) {
  return (
    <section
      aria-labelledby="flagged-content-heading"
      className="border-border bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs"
    >
      <div className="border-border flex flex-col gap-1 border-b p-5">
        <h2 id="flagged-content-heading" className="text-xl font-semibold">
          Cola de revisión
        </h2>
        <p className="text-muted-foreground text-sm">
          Prioriza reportes con más avisos o riesgo de fraude, ubicación falsa o
          daño a la comunidad.
        </p>
        <p className="text-muted-foreground text-xs">
          Mostrando {props.items.length} de {props.totalItemCount} revisiones.
        </p>
      </div>
      <div className="grid gap-3 p-4 md:hidden">
        {props.items.length === 0 ? (
          <ModerationQueueEmptyState hasFilters={props.totalItemCount > 0} />
        ) : (
          props.items.map((item) => (
            <FlaggedItemCard
              formAction={props.formAction}
              item={item}
              key={item.id}
              returnTo={props.returnTo}
            />
          ))
        )}
      </div>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">
            Contenido reportado para moderación
          </caption>
          <thead className="bg-muted text-muted-foreground text-xs font-semibold uppercase">
            <tr>
              <th className="px-5 py-3" scope="col">
                Superficie
              </th>
              <th className="px-5 py-3" scope="col">
                Motivo
              </th>
              <th className="px-5 py-3" scope="col">
                Responsable
              </th>
              <th className="px-5 py-3" scope="col">
                Estado
              </th>
              <th className="px-5 py-3 text-right" scope="col">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {props.items.length === 0 ? (
              <tr>
                <td className="px-5 py-6" colSpan={5}>
                  <ModerationQueueEmptyState
                    hasFilters={props.totalItemCount > 0}
                  />
                </td>
              </tr>
            ) : (
              props.items.map((item) => (
                <FlaggedItemRow
                  formAction={props.formAction}
                  item={item}
                  key={item.id}
                  returnTo={props.returnTo}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ModerationQueueEmptyState(props: { hasFilters?: boolean }) {
  return (
    <div className="border-border bg-background rounded-lg border p-5">
      <p className="font-semibold">
        {props.hasFilters
          ? "No hay resultados con estos filtros."
          : "No hay contenido pendiente de revisión."}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {props.hasFilters
          ? "Ajusta tipo, motivo, departamento o riesgo para ampliar la cola."
          : "Cuando lleguen reportes de abuso o riesgo, aparecerán en esta cola."}
      </p>
    </div>
  );
}

function AdminAccessDenied(props: { viewer: AdminModerationViewer }) {
  return (
    <main className="bg-background min-h-screen">
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
    </main>
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

function FlaggedItemRow(props: {
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  const item = props.item;
  const contentAction = getContentAction(item);

  return (
    <tr className="align-top">
      <FlaggedItemTargetCell item={item} />
      <FlaggedItemReasonCell item={item} />
      <FlaggedItemReporterCell item={item} />
      <FlaggedItemStatusCell item={item} />
      <FlaggedItemActions
        contentAction={contentAction}
        formAction={props.formAction}
        item={item}
        returnTo={props.returnTo}
      />
    </tr>
  );
}

function FlaggedItemCard(props: {
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  const item = props.item;
  const targetLabel = targetTypeLabels[item.target.type];
  const contentAction = getContentAction(item);

  return (
    <article className="border-border bg-background rounded-lg border p-4">
      <div className="min-w-0">
        <a
          className="text-foreground hover:text-primary focus-visible:border-ring focus-visible:ring-ring/50 break-words font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
          href={`/admin/moderacion/${item.id}`}
        >
          {item.target.title}
        </a>
        <p className="text-primary mt-1 text-xs font-semibold">
          {targetLabel}
        </p>
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
          <dd className="mt-1 font-medium">
            {item.accusedMember.displayName}
          </dd>
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
      <div className="mt-4">
        <FlaggedItemActionForm
          contentAction={contentAction}
          formAction={props.formAction}
          idPrefix="mobile"
          item={item}
          returnTo={props.returnTo}
        />
      </div>
    </article>
  );
}

function FlaggedItemTargetCell(props: { item: AdminModerationFlaggedItem }) {
  const item = props.item;
  const targetLabel = targetTypeLabels[item.target.type];

  return (
    <th className="px-5 py-4 font-normal" scope="row">
      <div className="flex flex-col gap-1">
        <a
          className="text-foreground hover:text-primary focus-visible:border-ring focus-visible:ring-ring/50 font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
          href={`/admin/moderacion/${item.id}`}
        >
          {item.target.title}
        </a>
        <span className="text-primary text-xs font-semibold">
          {targetLabel}
        </span>
        <span className="text-muted-foreground text-xs">
          {item.target.locationLabel} - {item.department}
        </span>
      </div>
    </th>
  );
}

function FlaggedItemReasonCell(props: { item: AdminModerationFlaggedItem }) {
  const item = props.item;

  return (
    <td className="px-5 py-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{item.reasonLabel}</span>
        <span className="text-muted-foreground text-xs">
          {item.reportCount} reportes - {item.newestReportLabel}
        </span>
        <span className="text-muted-foreground max-w-xs text-xs">
          {item.detail}
        </span>
      </div>
    </td>
  );
}

function FlaggedItemReporterCell(props: { item: AdminModerationFlaggedItem }) {
  const item = props.item;

  return (
    <td className="px-5 py-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{item.accusedMember.displayName}</span>
        <span className="text-muted-foreground text-xs">
          Reportado por {item.reporterLabel}
        </span>
      </div>
    </td>
  );
}

function FlaggedItemStatusCell(props: { item: AdminModerationFlaggedItem }) {
  return (
    <td className="px-5 py-4">
      <div className="flex flex-col gap-2">
        <StatusPill status={props.item.target.status} />
        <MemberStatusPill status={props.item.accusedMember.status} />
      </div>
    </td>
  );
}

function FlaggedItemActions(props: {
  contentAction: ContentModerationAction | null;
  formAction?: React.ComponentProps<"form">["action"];
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  return (
    <td className="px-5 py-4">
      <FlaggedItemActionForm
        contentAction={props.contentAction}
        formAction={props.formAction}
        idPrefix="desktop"
        item={props.item}
        returnTo={props.returnTo}
      />
    </td>
  );
}

function FlaggedItemActionForm(props: {
  contentAction: ContentModerationAction | null;
  formAction?: React.ComponentProps<"form">["action"];
  idPrefix: "desktop" | "detail" | "mobile";
  item: AdminModerationFlaggedItem;
  returnTo: string;
}) {
  const noteId = `note-${props.idPrefix}-${props.item.id}`;
  const confirmationId = `confirm-${props.idPrefix}-${props.item.id}`;
  const confirmationLabel = props.contentAction
    ? `Confirmo ${props.contentAction.label.toLowerCase()}`
    : "Confirmo aplicar esta decisión";

  return (
    <form
      aria-label={`Acciones para ${props.item.target.title}`}
      action={props.formAction}
      className="flex flex-col items-stretch gap-2"
      method={props.formAction ? undefined : "post"}
    >
      <input name="reviewItemId" type="hidden" value={props.item.id} />
      <input name="moderationReason" type="hidden" value="admin_review" />
      <input name="returnTo" type="hidden" value={props.returnTo} />
      <input name="targetId" type="hidden" value={props.item.target.id} />
      <input name="targetTitle" type="hidden" value={props.item.target.title} />
      <input name="targetType" type="hidden" value={props.item.target.type} />
      <input
        name="memberId"
        type="hidden"
        value={props.item.accusedMember.id}
      />
      {props.contentAction ? (
        <>
          <label className="sr-only" htmlFor={noteId}>
            Nota de moderación
          </label>
          <textarea
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
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
              <span className="block font-medium">{confirmationLabel}</span>
              <span className="text-muted-foreground mt-1 block">
                Esta acción queda registrada y afecta la visibilidad pública.
              </span>
            </span>
          </label>
          <ModerationButton action={props.contentAction} />
        </>
      ) : null}
      {props.item.target.type !== "resource_provider_profile" ? (
        <a
          className="border-border text-foreground hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-[3px]"
          href={`/admin/miembros?memberId=${encodeURIComponent(props.item.accusedMember.id)}`}
        >
          Gestionar miembro
        </a>
      ) : null}
    </form>
  );
}

function ModerationButton(props: { action: ContentModerationAction }) {
  return (
    <AdminSubmitButton
      className="min-h-11"
      name="moderationAction"
      pendingLabel="Aplicando decisión"
      value={props.action.value}
      variant="outline"
    >
      {props.action.label}
    </AdminSubmitButton>
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
) {
  return {
    cities: [
      { label: "Todas las ciudades", value: "all" },
      ...uniqueSorted(items.map((item) => item.target.locationLabel)).map(
        (value) => ({
          label: value,
          value,
        }),
      ),
    ],
    departments: [
      { label: "Todos los departamentos", value: "all" },
      ...uniqueSorted(items.map((item) => item.department)).map((value) => ({
        label: value,
        value,
      })),
    ],
    reasons: [
      { label: "Todos los motivos", value: "all" },
      ...uniqueSorted(items.map((item) => item.reasonLabel)).map((value) => ({
        label: value,
        value,
      })),
    ],
    risks: [
      { label: "Todos los riesgos", value: "all" },
      { label: "Alto riesgo", value: "high" },
      { label: "Riesgo estándar", value: "normal" },
    ],
    targetTypes: [
      { label: "Todos los tipos", value: "all" },
      ...uniqueSorted(items.map((item) => item.target.type)).map((value) => ({
        label: targetTypeLabels[value],
        value,
      })),
    ],
  };
}

function filterAdminModerationItems(
  items: readonly AdminModerationFlaggedItem[],
  filters: AdminModerationFilters,
) {
  return items.filter((item) => {
    if (filters.targetType !== "all" && item.target.type !== filters.targetType) {
      return false;
    }

    if (filters.reason !== "all" && item.reasonLabel !== filters.reason) {
      return false;
    }

    if (filters.department !== "all" && item.department !== filters.department) {
      return false;
    }

    if (filters.city !== "all" && item.target.locationLabel !== filters.city) {
      return false;
    }

    if (filters.risk !== "all" && getModerationRisk(item) !== filters.risk) {
      return false;
    }

    return true;
  });
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

function canHideOrRestore(type: AdminModerationTargetType) {
  return (
    type === "adoption_listing" ||
    type === "found_pet_report" ||
    type === "lost_pet_report" ||
    type === "sighting_report"
  );
}
