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
  flaggedItems: readonly AdminModerationFlaggedItem[];
  formAction?: React.ComponentProps<"form">["action"];
  metrics: readonly AdminModerationMetric[];
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
      label: "Ocultar publicacion" | "Ocultar reporte";
      value: "hide_target";
    }
  | {
      label: "Restaurar publicacion" | "Restaurar reporte";
      value: "restore_target";
    };

type MemberModerationAction =
  | {
      label: "Reactivar miembro";
      value: "unban_member";
    }
  | {
      label: "Suspender miembro";
      value: "ban_member";
    };

const targetTypeLabels: Record<AdminModerationTargetType, string> = {
  adoption_listing: "Publicacion de adopcion",
  found_pet_report: "Reporte de mascota encontrada",
  in_app_chat: "Chat en Rastro",
  lost_pet_report: "Reporte de mascota perdida",
  resource_provider_profile: "Perfil de Resource Provider",
  sighting_report: "Reporte de avistamiento",
};

const settingsCopy = {
  reviewMode:
    "Las nuevas publicaciones de adopcion quedan retenidas para revision antes de mostrarse publicamente.",
  verifiedEmail:
    "Los miembros deben verificar su correo antes de crear reportes o publicaciones visibles.",
} as const;

export function AdminModerationDashboard(props: AdminModerationDashboardProps) {
  if (props.viewer.role !== "admin") {
    return <AdminAccessDenied viewer={props.viewer} />;
  }

  const summaryStats = getSummaryStats(props.flaggedItems);

  return (
    <main className="bg-background min-h-screen">
      <div className="container grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-8">
        <section className="flex min-w-0 flex-col gap-6">
          <AdminDashboardHeader viewer={props.viewer} />
          <ModerationSummary stats={summaryStats} />
          <FlaggedContentQueue
            formAction={props.formAction}
            items={props.flaggedItems}
          />
        </section>

        <aside className="flex flex-col gap-6">
          <ModerationSettings settings={props.settings} />
          <AbuseMetrics metrics={props.metrics} />
        </aside>
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

function AdminDashboardHeader(props: { viewer: AdminModerationViewer }) {
  return (
    <header className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-5 shadow-xs md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-primary text-sm font-semibold">Moderacion Rastro</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">
          Contenido reportado
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Cola operativa para revisar reportes, publicaciones de adopcion, chats
          y perfiles de Resource Provider en Bolivia.
        </p>
      </div>
      <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm font-medium">
        {props.viewer.displayName}
      </p>
    </header>
  );
}

function ModerationSummary(props: { stats: AdminModerationSummaryStats }) {
  return (
    <section
      aria-label="Resumen de moderacion"
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
}) {
  return (
    <section
      aria-labelledby="flagged-content-heading"
      className="border-border bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs"
    >
      <div className="border-border flex flex-col gap-1 border-b p-5">
        <h2 id="flagged-content-heading" className="text-xl font-semibold">
          Cola de revision
        </h2>
        <p className="text-muted-foreground text-sm">
          Prioriza reportes con mas avisos o riesgo de fraude, ubicacion falsa o
          dano a la comunidad.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">
            Contenido reportado para moderacion
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
            {props.items.map((item) => (
              <FlaggedItemRow
                formAction={props.formAction}
                item={item}
                key={item.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
            Moderacion Rastro
          </p>
          <h1
            className="mt-2 text-3xl font-bold tracking-normal"
            id="admin-access-denied-heading"
          >
            Acceso restringido
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Solo administradores de Rastro pueden revisar colas de abuso,
            cambiar Review Mode o modificar reglas de publicacion.
          </p>
          <p className="bg-muted text-muted-foreground mt-5 rounded-md px-3 py-2 text-sm font-medium">
            Sesion actual: {props.viewer.displayName}
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
}) {
  const item = props.item;
  const contentAction = getContentAction(item);
  const memberAction = getMemberAction(item);

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
        memberAction={memberAction}
      />
    </tr>
  );
}

function FlaggedItemTargetCell(props: { item: AdminModerationFlaggedItem }) {
  const item = props.item;
  const targetLabel = targetTypeLabels[item.target.type];

  return (
    <th className="px-5 py-4 font-normal" scope="row">
      <div className="flex flex-col gap-1">
        <a
          className="text-foreground hover:text-primary font-semibold underline-offset-4 hover:underline"
          href={item.target.href}
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
  memberAction: MemberModerationAction;
}) {
  return (
    <td className="px-5 py-4">
      <form
        aria-label={`Acciones para ${props.item.target.title}`}
        action={props.formAction}
        className="flex flex-col items-stretch gap-2"
        method={props.formAction ? undefined : "post"}
      >
        <input name="reviewItemId" type="hidden" value={props.item.id} />
        <input name="targetId" type="hidden" value={props.item.target.id} />
        <input name="targetType" type="hidden" value={props.item.target.type} />
        <input
          name="memberId"
          type="hidden"
          value={props.item.accusedMember.id}
        />
        {props.contentAction ? (
          <ModerationButton action={props.contentAction} />
        ) : null}
        <ModerationButton action={props.memberAction} />
      </form>
    </td>
  );
}

function ModerationButton(props: {
  action: ContentModerationAction | MemberModerationAction;
}) {
  return (
    <button
      className={
        props.action.value === "ban_member"
          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-3 py-2 text-sm font-semibold"
          : "border-border text-foreground hover:bg-muted rounded-md border px-3 py-2 text-sm font-semibold"
      }
      name="moderationAction"
      type="submit"
      value={props.action.value}
    >
      {props.action.label}
    </button>
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
          label="Review Mode para adopciones"
        />
        <SettingState
          checked={props.settings.verifiedEmailRequiredToPublish}
          description={settingsCopy.verifiedEmail}
          label="Correo verificado requerido para publicar"
        />
        <a
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-center text-sm font-semibold"
          href="/admin/ajustes"
        >
          Abrir ajustes
        </a>
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
        Metricas de abuso por ciudad
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

function getContentAction(
  item: AdminModerationFlaggedItem,
): ContentModerationAction | null {
  if (!canHideOrRestore(item.target.type)) {
    return null;
  }

  const noun =
    item.target.type === "adoption_listing" ? "publicacion" : "reporte";

  if (item.target.status === "hidden") {
    return {
      label:
        noun === "publicacion" ? "Restaurar publicacion" : "Restaurar reporte",
      value: "restore_target",
    };
  }

  return {
    label: noun === "publicacion" ? "Ocultar publicacion" : "Ocultar reporte",
    value: "hide_target",
  };
}

function getMemberAction(
  item: AdminModerationFlaggedItem,
): MemberModerationAction {
  if (item.accusedMember.status === "banned") {
    return {
      label: "Reactivar miembro",
      value: "unban_member",
    };
  }

  return {
    label: "Suspender miembro",
    value: "ban_member",
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
