import type {
  AdminResourceMetricsViewModel,
  AdminResourceProviderViewModel,
  LocalSponsorPlacementViewModel,
  VerificationBadgeStatus,
} from "./admin-resources";
import {
  localSponsorPlacementSurfaceOptions,
  resourceProviderCategoryOptions,
} from "./admin-resources";

export type AdminResourcesViewerRole = "admin" | "member" | "visitor";

export interface AdminResourcesViewer {
  displayName: string;
  role: AdminResourcesViewerRole;
}

export interface AdminResourcesDashboardProps {
  accessDenied: {
    body: string;
    title: string;
  };
  createActionLabel: string;
  formAction?: React.ComponentProps<"form">["action"];
  metrics: AdminResourceMetricsViewModel;
  providers: readonly AdminResourceProviderViewModel[];
  title: string;
  viewer: AdminResourcesViewer;
}

interface AdminResourcesSummaryStats {
  activeSponsorPlacementCount: number;
  providerCount: number;
  verifiedProviderCount: number;
}

const verificationStatusLabels = {
  unverified: "Sin insignia",
  verified: "Identidad verificada",
} as const satisfies Record<VerificationBadgeStatus, string>;

export function AdminResourcesDashboard(props: AdminResourcesDashboardProps) {
  if (props.viewer.role !== "admin") {
    return (
      <AdminResourcesAccessDenied
        accessDenied={props.accessDenied}
        viewer={props.viewer}
      />
    );
  }

  const stats = getSummaryStats(props.providers, props.metrics);

  return (
    <main className="bg-background min-h-screen">
      <div className="container grid gap-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:py-8">
        <section className="flex min-w-0 flex-col gap-6">
          <AdminResourcesHeader title={props.title} viewer={props.viewer} />
          <AdminResourcesSummary stats={stats} />
          <ProviderQueue
            formAction={props.formAction}
            providers={props.providers}
          />
        </section>

        <aside className="flex flex-col gap-6">
          <CreateProviderForm
            actionLabel={props.createActionLabel}
            formAction={props.formAction}
          />
          <ProviderMetrics metrics={props.metrics} />
        </aside>
      </div>
    </main>
  );
}

function AdminResourcesHeader(props: {
  title: string;
  viewer: AdminResourcesViewer;
}) {
  return (
    <header className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-5 shadow-xs md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-primary text-sm font-semibold">
          Administracion de recursos
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">
          {props.title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Gestiona proveedores locales para Bolivia, revisa identidad y mantiene
          patrocinios claramente etiquetados. Esta vista usa el modelo
          administrativo temporal y no confirma publicacion en base de datos.
        </p>
      </div>
      <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm font-medium">
        {props.viewer.displayName}
      </p>
    </header>
  );
}

function AdminResourcesSummary(props: { stats: AdminResourcesSummaryStats }) {
  return (
    <section
      aria-label="Resumen de proveedores"
      className="grid gap-3 sm:grid-cols-3"
    >
      <SummaryStat label="Proveedores" value={props.stats.providerCount} />
      <SummaryStat
        label="Identidad verificada"
        value={props.stats.verifiedProviderCount}
      />
      <SummaryStat
        label="Patrocinios activos"
        value={props.stats.activeSponsorPlacementCount}
      />
    </section>
  );
}

function ProviderQueue(props: {
  formAction?: React.ComponentProps<"form">["action"];
  providers: readonly AdminResourceProviderViewModel[];
}) {
  return (
    <section
      aria-labelledby="provider-management-heading"
      className="border-border bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs"
    >
      <div className="border-border flex flex-col gap-1 border-b p-5">
        <h2 id="provider-management-heading" className="text-xl font-semibold">
          Proveedores registrados
        </h2>
        <p className="text-muted-foreground text-sm">
          Revisa datos operativos, identidad y patrocinios locales sin cambiar
          la prioridad de recuperacion.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <caption className="sr-only">
            Proveedores locales administrados por Rastro
          </caption>
          <thead className="bg-muted text-muted-foreground text-xs font-semibold uppercase">
            <tr>
              <th className="px-5 py-3" scope="col">
                Proveedor
              </th>
              <th className="px-5 py-3" scope="col">
                Cobertura
              </th>
              <th className="px-5 py-3" scope="col">
                Identidad
              </th>
              <th className="px-5 py-3" scope="col">
                Patrocinio local
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {props.providers.map((provider) => (
              <ProviderRow
                formAction={props.formAction}
                key={provider.providerId}
                provider={provider}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProviderRow(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;

  return (
    <tr className="align-top">
      <th className="px-5 py-4 font-normal" scope="row">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{provider.name}</span>
          <span className="text-primary text-xs font-semibold">
            {provider.categoryLabel}
          </span>
          <span className="text-muted-foreground text-xs">
            {provider.contactLabel}
          </span>
          <span className="text-muted-foreground text-xs">
            ID: {provider.providerId}
          </span>
        </div>
      </th>
      <td className="px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{provider.city}</span>
          <span className="text-muted-foreground text-xs">
            {provider.department}
          </span>
          <span className="text-muted-foreground text-xs">
            {provider.serviceAreaLabel}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <VerificationControls
          formAction={props.formAction}
          provider={provider}
        />
      </td>
      <td className="px-5 py-4">
        <SponsorControls formAction={props.formAction} provider={provider} />
      </td>
    </tr>
  );
}

function VerificationControls(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;
  const noteId = `verification-note-${provider.providerId}`;

  return (
    <form
      action={props.formAction}
      aria-label={`Gestionar identidad de ${provider.name}`}
      className="flex min-w-[260px] flex-col gap-2"
      method={props.formAction ? undefined : "post"}
    >
      <input name="providerId" type="hidden" value={provider.providerId} />
      <div className="flex items-center gap-2">
        <IdentityPill status={provider.verificationBadge.status} />
        <span className="text-muted-foreground text-xs">
          {provider.verificationBadge.label}
        </span>
      </div>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Estado
        <select
          className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
          defaultValue={provider.verificationBadge.status}
          name="verificationStatus"
        >
          <option value="verified">Identidad verificada</option>
          <option value="unverified">Pendiente de revision</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Nota interna
        <textarea
          className="border-input bg-background min-h-16 rounded-md border px-3 py-2 text-sm font-normal"
          defaultValue={provider.verificationBadge.note}
          id={noteId}
          name="verificationNote"
        />
      </label>
      <button
        className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-2 text-sm font-semibold"
        name="resourceAction"
        type="submit"
        value="update_verification"
      >
        Guardar identidad
      </button>
    </form>
  );
}

function SponsorControls(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <div className="flex min-w-[340px] flex-col gap-3">
      <SponsorPolicyNotice />
      <SponsorPlacementList
        formAction={props.formAction}
        placements={props.provider.sponsorPlacements}
        provider={props.provider}
      />
      <AttachSponsorForm
        formAction={props.formAction}
        provider={props.provider}
      />
    </div>
  );
}

function SponsorPolicyNotice() {
  return (
    <div className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">
      <p className="font-semibold">Politica de seguridad</p>
      <p>No cambia la prioridad de recuperacion.</p>
      <p>No activa alertas push.</p>
    </div>
  );
}

function SponsorPlacementList(props: {
  formAction?: React.ComponentProps<"form">["action"];
  placements: readonly LocalSponsorPlacementViewModel[];
  provider: AdminResourceProviderViewModel;
}) {
  if (props.placements.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Sin patrocinio local activo en el modelo temporal.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {props.placements.map((placement) => (
        <li
          className="border-border rounded-md border p-3"
          key={placement.placementId}
        >
          <div className="flex flex-col gap-1">
            <span className="text-primary text-xs font-semibold">
              {placement.disclosureLabel}
            </span>
            <span className="font-medium">{placement.surfaceLabel}</span>
            <span className="text-muted-foreground text-xs">
              {placement.startsOn} a {placement.endsOn}
            </span>
            <span className="text-muted-foreground text-xs">
              {placement.safetyPolicy.recoveryPriority.note}
            </span>
            <span className="text-muted-foreground text-xs">
              {placement.safetyPolicy.pushNotifications.note}
            </span>
          </div>
          <form
            action={props.formAction}
            aria-label={`Retirar patrocinio local de ${props.provider.name}`}
            className="mt-3"
            method={props.formAction ? undefined : "post"}
          >
            <input
              name="providerId"
              type="hidden"
              value={props.provider.providerId}
            />
            <input
              name="placementId"
              type="hidden"
              value={placement.placementId}
            />
            <button
              className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-2 text-sm font-semibold"
              name="resourceAction"
              type="submit"
              value="detach_sponsor"
            >
              Retirar patrocinio local
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

function AttachSponsorForm(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <form
      action={props.formAction}
      aria-label={`Adjuntar patrocinio local a ${props.provider.name}`}
      className="grid gap-2"
      method={props.formAction ? undefined : "post"}
    >
      <input
        name="providerId"
        type="hidden"
        value={props.provider.providerId}
      />
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Codigo interno
        <input
          className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
          name="placementId"
          placeholder="patrocinio-local-2026"
          type="text"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Superficie
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="sponsorSurface"
          >
            {localSponsorPlacementSurfaceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Inicio
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="startsOn"
            type="date"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Fin
        <input
          className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
          name="endsOn"
          type="date"
        />
      </label>
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm font-semibold"
        name="resourceAction"
        type="submit"
        value="attach_sponsor"
      >
        Adjuntar patrocinio local
      </button>
    </form>
  );
}

function CreateProviderForm(props: {
  actionLabel: string;
  formAction?: React.ComponentProps<"form">["action"];
}) {
  return (
    <section
      aria-labelledby="create-provider-heading"
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
    >
      <h2 id="create-provider-heading" className="text-xl font-semibold">
        Nuevo proveedor
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Registra datos minimos para revision administrativa; la publicacion
        final queda fuera de este modelo temporal.
      </p>
      <form
        action={props.formAction}
        className="mt-4 flex flex-col gap-3"
        method={props.formAction ? undefined : "post"}
      >
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Nombre
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="name"
            placeholder="Veterinaria Alto Norte"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Categoria
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="category"
          >
            {resourceProviderCategoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Departamento
            <input
              className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
              name="department"
              placeholder="La Paz"
              type="text"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Ciudad
            <input
              className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
              name="city"
              placeholder="El Alto"
              type="text"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Cobertura
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="serviceAreaLabel"
            placeholder="El Alto y La Paz"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Contacto visible
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="contactLabel"
            placeholder="WhatsApp institucional"
            type="text"
          />
        </label>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-semibold"
          name="resourceAction"
          type="submit"
          value="create_provider"
        >
          {props.actionLabel}
        </button>
      </form>
    </section>
  );
}

function ProviderMetrics(props: { metrics: AdminResourceMetricsViewModel }) {
  return (
    <section
      aria-labelledby="resource-metrics-heading"
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
    >
      <h2 id="resource-metrics-heading" className="text-xl font-semibold">
        Metricas de recursos
      </h2>
      <MetricTable
        caption="Metricas de proveedores agrupadas por departamento"
        heading="Metricas por departamento"
        metrics={props.metrics.byDepartment}
      />
      <MetricTable
        caption="Metricas de proveedores agrupadas por ciudad"
        heading="Metricas por ciudad"
        metrics={props.metrics.byCity}
      />
    </section>
  );
}

function MetricTable(props: {
  caption: string;
  heading: string;
  metrics: AdminResourceMetricsViewModel["byCity"];
}) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{props.heading}</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{props.caption}</caption>
          <thead className="text-muted-foreground text-xs font-semibold uppercase">
            <tr>
              <th className="py-2 pr-3" scope="col">
                Lugar
              </th>
              <th className="px-3 py-2 text-right" scope="col">
                Total
              </th>
              <th className="px-3 py-2 text-right" scope="col">
                Verificados
              </th>
              <th className="py-2 pl-3 text-right" scope="col">
                Patrocinios
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {props.metrics.map((metric) => (
              <tr key={metric.label}>
                <th className="py-3 pr-3 font-medium" scope="row">
                  {metric.label}
                </th>
                <td className="px-3 py-3 text-right">{metric.providerCount}</td>
                <td className="px-3 py-3 text-right">
                  {metric.verifiedProviderCount}
                </td>
                <td className="py-3 pl-3 text-right">
                  {metric.activeSponsorPlacementCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminResourcesAccessDenied(props: {
  accessDenied: AdminResourcesDashboardProps["accessDenied"];
  viewer: AdminResourcesViewer;
}) {
  return (
    <main className="bg-background min-h-screen">
      <section
        aria-labelledby="admin-resources-access-denied-heading"
        className="container flex min-h-screen items-center justify-center py-8"
      >
        <div className="border-border bg-card text-card-foreground w-full max-w-xl rounded-lg border p-6 shadow-xs">
          <p className="text-primary text-sm font-semibold">
            Administracion de recursos
          </p>
          <h1
            className="mt-2 text-3xl font-bold tracking-normal"
            id="admin-resources-access-denied-heading"
          >
            {props.accessDenied.title}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            {props.accessDenied.body}
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

function IdentityPill(props: { status: VerificationBadgeStatus }) {
  if (props.status === "verified") {
    return (
      <span className="bg-primary/10 text-primary w-fit rounded-md px-2 py-1 text-xs font-semibold">
        {verificationStatusLabels.verified}
      </span>
    );
  }

  return (
    <span className="bg-muted text-muted-foreground w-fit rounded-md px-2 py-1 text-xs font-semibold">
      {verificationStatusLabels.unverified}
    </span>
  );
}

function getSummaryStats(
  providers: readonly AdminResourceProviderViewModel[],
  metrics: AdminResourceMetricsViewModel,
): AdminResourcesSummaryStats {
  const providerStats = providers.reduce(
    (stats, provider) => ({
      activeSponsorPlacementCount: stats.activeSponsorPlacementCount,
      providerCount: stats.providerCount + 1,
      verifiedProviderCount:
        stats.verifiedProviderCount +
        (provider.verificationBadge.status === "verified" ? 1 : 0),
    }),
    {
      activeSponsorPlacementCount: 0,
      providerCount: 0,
      verifiedProviderCount: 0,
    },
  );

  return {
    ...providerStats,
    activeSponsorPlacementCount: metrics.byDepartment.reduce(
      (total, metric) => total + metric.activeSponsorPlacementCount,
      0,
    ),
  };
}
