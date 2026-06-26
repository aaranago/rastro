import type {
  AdminResourceMetricsViewModel,
  AdminResourceProviderVerificationStatus,
  AdminResourceProviderViewModel,
  LocalSponsorPlacementViewModel,
} from "./admin-resource-provider-admin-model";
import {
  localSponsorPlacementSurfaceOptions,
  resourceProviderCategoryOptions,
  resourceProviderContactKindOptions,
} from "./admin-resource-provider-admin-model";

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
  notice?: {
    body: string;
    title: string;
    tone: "error" | "success";
  };
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
} as const satisfies Record<AdminResourceProviderVerificationStatus, string>;

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
    <main className="bg-background min-h-screen [&_*]:box-border">
      <div className="mx-4 grid max-w-[1600px] gap-6 py-6 sm:mx-6 lg:mx-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:py-8 2xl:mx-auto">
        <section className="flex min-w-0 w-full max-w-full flex-col gap-6">
          <AdminResourcesHeader title={props.title} viewer={props.viewer} />
          {props.notice ? <AdminResourcesNotice notice={props.notice} /> : null}
          <AdminResourcesSummary stats={stats} />
          <ProviderQueue
            formAction={props.formAction}
            providers={props.providers}
          />
        </section>

        <aside className="flex min-w-0 w-full max-w-full flex-col gap-6">
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
          Administración de recursos
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">
          {props.title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Gestiona proveedores locales para Bolivia, revisa identidad y mantiene
          patrocinios claramente etiquetados sin cambiar la prioridad de
          recuperación.
        </p>
      </div>
      <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm font-medium">
        {props.viewer.displayName}
      </p>
    </header>
  );
}

function AdminResourcesNotice(props: {
  notice: NonNullable<AdminResourcesDashboardProps["notice"]>;
}) {
  return (
    <section
      aria-live="polite"
      className={
        props.notice.tone === "success"
          ? "border-primary/30 bg-primary/10 text-primary rounded-lg border p-4"
          : "border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4"
      }
    >
      <h2 className="text-sm font-semibold">{props.notice.title}</h2>
      <p className="mt-1 text-sm">{props.notice.body}</p>
    </section>
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
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 id="provider-management-heading" className="text-xl font-semibold">
          Proveedores registrados
        </h2>
        <p className="text-muted-foreground text-sm">
          Revisa datos operativos, identidad y patrocinios locales sin cambiar
          la prioridad de recuperación.
        </p>
      </div>
      {props.providers.length === 0 ? (
        <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
          <p className="font-semibold">
            Todavía no hay proveedores registrados.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Usa el formulario para publicar el primer proveedor en el
            directorio.
          </p>
        </div>
      ) : null}
      {props.providers.length > 0 ? (
        <ProviderCardList
          formAction={props.formAction}
          providers={props.providers}
        />
      ) : null}
      {props.providers.length > 0 ? (
        <div className="border-border bg-card text-card-foreground hidden overflow-hidden rounded-lg border shadow-xs xl:block">
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
                  Detalles
                </th>
                <th className="px-5 py-3" scope="col">
                  Identidad
                </th>
                <th className="px-5 py-3" scope="col">
                  Patrocinio local
                </th>
                <th className="px-5 py-3" scope="col">
                  Archivo
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
      ) : null}
    </section>
  );
}

function ProviderCardList(props: {
  formAction?: React.ComponentProps<"form">["action"];
  providers: readonly AdminResourceProviderViewModel[];
}) {
  return (
    <div className="grid gap-3 xl:hidden">
      {props.providers.map((provider) => (
        <ProviderManagementCard
          formAction={props.formAction}
          key={provider.providerId}
          provider={provider}
        />
      ))}
    </div>
  );
}

function ProviderManagementCard(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;

  return (
    <article className="border-border bg-card text-card-foreground rounded-lg border p-4 shadow-xs">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-primary text-xs font-semibold">
            {provider.categoryLabel}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{provider.name}</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {provider.city}, {provider.department} ·{" "}
            {provider.serviceAreaLabel}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {provider.hoursLabel} · {provider.contactLabel}
          </p>
        </div>
        <IdentityPill status={provider.verificationBadge.status} />
      </div>

      <div className="mt-4 grid gap-2">
        <AdminActionPanel title="Detalles">
          <DetailsControls formAction={props.formAction} provider={provider} />
        </AdminActionPanel>
        <AdminActionPanel title="Identidad">
          <VerificationControls
            formAction={props.formAction}
            provider={provider}
          />
        </AdminActionPanel>
        <AdminActionPanel title="Patrocinio local">
          <SponsorControls formAction={props.formAction} provider={provider} />
        </AdminActionPanel>
        <AdminActionPanel title="Archivo">
          <ArchiveControls formAction={props.formAction} provider={provider} />
        </AdminActionPanel>
      </div>
    </article>
  );
}

function AdminActionPanel(props: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <details className="border-border rounded-md border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
        {props.title}
      </summary>
      <div className="border-border border-t p-3">{props.children}</div>
    </details>
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
          <span className="text-muted-foreground text-xs">
            {provider.hoursLabel}
          </span>
          <span className="text-muted-foreground text-xs">
            Celda: {provider.locationCell}
          </span>
          <span className="text-muted-foreground text-xs">
            {provider.emergencyAvailable
              ? "Atiende urgencias"
              : "Sin urgencias"}
            {" · "}
            {provider.isOpenNow ? "Marcado abierto" : "Horario no confirmado"}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <DetailsControls formAction={props.formAction} provider={provider} />
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
      <td className="px-5 py-4">
        <ArchiveControls formAction={props.formAction} provider={provider} />
      </td>
    </tr>
  );
}

function DetailsControls(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  const primaryContact = props.provider.contactOptions[0];

  return (
    <form
      action={props.formAction}
      aria-label={`Editar detalles de ${props.provider.name}`}
      className="flex min-w-[300px] flex-col gap-2"
      method={props.formAction ? undefined : "post"}
    >
      <input
        name="providerId"
        type="hidden"
        value={props.provider.providerId}
      />
      <fieldset className="contents">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Nombre
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={props.provider.name}
            name="name"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Categoría
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={props.provider.category}
            name="category"
          >
            {resourceProviderCategoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Descripción
          <textarea
            className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={props.provider.description}
            name="description"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Resumen corto
          <textarea
            className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={props.provider.shortDescription}
            name="shortDescription"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Cobertura
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={props.provider.serviceAreaLabel}
            name="serviceAreaLabel"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Horarios
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={props.provider.hoursLabel}
            name="hoursLabel"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Tipo de contacto
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={primaryContact?.kind ?? "whatsapp"}
            name="contactKind"
          >
            {resourceProviderContactKindOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Etiqueta de contacto
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={primaryContact?.label ?? "WhatsApp institucional"}
            name="contactLabel"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Valor de contacto
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={primaryContact?.value ?? ""}
            name="contactValue"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Sitio web
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            defaultValue={props.provider.websiteUrl ?? ""}
            name="websiteUrl"
            type="url"
          />
        </label>
        <div className="grid gap-2 text-xs font-semibold">
          <label className="flex items-center gap-2">
            <input
              defaultChecked={props.provider.emergencyAvailable}
              name="emergencyAvailable"
              type="checkbox"
            />
            Atiende urgencias
          </label>
          <label className="flex items-center gap-2">
            <input
              defaultChecked={props.provider.isOpenNow}
              name="isOpenNow"
              type="checkbox"
            />
            Marcado abierto ahora
          </label>
        </div>
        <details className="border-border rounded-md border p-3">
          <summary className="cursor-pointer text-xs font-semibold">
            Reemplazar ubicación
          </summary>
          <div className="mt-3 grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Latitud exacta
                <input
                  className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
                  name="exactLatitude"
                  placeholder="-16.500000"
                  step="0.000001"
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Longitud exacta
                <input
                  className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
                  name="exactLongitude"
                  placeholder="-68.120000"
                  step="0.000001"
                  type="number"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Ubicación aproximada visible
              <input
                className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
                defaultValue={`${props.provider.city}, ${props.provider.department}`}
                name="approximateLocationLabel"
                type="text"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Celda de ubicación
              <input
                className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
                defaultValue={props.provider.locationCell}
                name="locationCell"
                type="text"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Dirección interna
              <input
                className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
                name="addressLabel"
                type="text"
              />
            </label>
          </div>
        </details>
      </fieldset>
      <button
        className="border-border text-muted-foreground rounded-md border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        name="resourceAction"
        type="submit"
        value="update_provider_details"
      >
        Guardar detalles
      </button>
    </form>
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
          <option value="unverified">Pendiente de revisión</option>
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
      <DetachSponsorByIdForm
        formAction={props.formAction}
        provider={props.provider}
      />
    </div>
  );
}

function SponsorPolicyNotice() {
  return (
    <div className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">
      <p className="font-semibold">Política de seguridad</p>
      <p>No cambia la prioridad de recuperación.</p>
      <p>No activa notificaciones push.</p>
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
        Sin patrocinio local listado para retiro automatico.
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
              {placement.startsOn ?? "Inicio no expuesto"} a{" "}
              {placement.endsOn ?? "fin no expuesto"}
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
              value={placement.placementId ?? ""}
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
      {props.provider.activeSponsorPlacement ? (
        <div className="border-border rounded-md border p-3 text-xs">
          <p className="text-primary font-semibold">
            {props.provider.activeSponsorPlacement.disclosureLabel}
          </p>
          <p className="font-medium">
            {props.provider.activeSponsorPlacement.sponsorLabel}
          </p>
          <p className="text-muted-foreground">
            {props.provider.activeSponsorPlacement.eligibleSurfaceLabels.join(
              ", ",
            )}
          </p>
          <p className="text-muted-foreground">
            {
              props.provider.activeSponsorPlacement.safetyPolicy
                .recoveryPriority.note
            }
          </p>
        </div>
      ) : null}
      <label className="flex flex-col gap-1 text-xs font-semibold">
        ID de patrocinio
        <input
          className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
          name="placementId"
          placeholder="UUID opcional al adjuntar"
          type="text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Etiqueta
        <input
          className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
          name="sponsorLabel"
          placeholder="Patrocinado"
          type="text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Divulgación pública
        <textarea
          className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm font-normal"
          name="sponsorDisclosure"
          placeholder="Patrocinado: apoyo local. No cambia la prioridad de reportes."
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
            required
            type="date"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Fin
        <input
          className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
          name="endsOn"
          required
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

function DetachSponsorByIdForm(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <form
      action={props.formAction}
      aria-label={`Retirar patrocinio local por ID de ${props.provider.name}`}
      className="grid gap-2"
      method={props.formAction ? undefined : "post"}
    >
      <input
        name="providerId"
        type="hidden"
        value={props.provider.providerId}
      />
      <label className="flex flex-col gap-1 text-xs font-semibold">
        ID para retirar
        <input
          className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
          name="placementId"
          placeholder="UUID del patrocinio"
          type="text"
        />
      </label>
      <button
        className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-2 text-sm font-semibold"
        name="resourceAction"
        type="submit"
        value="detach_sponsor"
      >
        Retirar por ID
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
        Registra el perfil completo que usa el directorio público de recursos.
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
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Categoría
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
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Descripción
          <textarea
            className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm font-normal"
            name="description"
            placeholder="Atencion veterinaria general, orientacion y apoyo para familias cuidadoras."
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Resumen corto
          <textarea
            className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm font-normal"
            name="shortDescription"
            placeholder="Clinica local con atencion general y urgencias."
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Departamento
            <input
              className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
              name="department"
              placeholder="La Paz"
              required
              type="text"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Ciudad
            <input
              className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
              name="city"
              placeholder="El Alto"
              required
              type="text"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Latitud exacta
            <input
              className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
              name="exactLatitude"
              placeholder="-16.500000"
              required
              step="0.000001"
              type="number"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Longitud exacta
            <input
              className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
              name="exactLongitude"
              placeholder="-68.120000"
              required
              step="0.000001"
              type="number"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Ubicación aproximada visible
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="approximateLocationLabel"
            placeholder="Sopocachi, La Paz"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Celda de ubicación
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="locationCell"
            placeholder="bo-lpb-sopocachi"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Dirección interna
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="addressLabel"
            placeholder="Zona Sopocachi, La Paz"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Cobertura
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="serviceAreaLabel"
            placeholder="El Alto y La Paz"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Horarios
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="hoursLabel"
            placeholder="Lun - Sab: 08:00 a 18:00"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Tipo de contacto
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="contactKind"
          >
            {resourceProviderContactKindOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Etiqueta de contacto
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="contactLabel"
            placeholder="WhatsApp institucional"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Valor de contacto
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="contactValue"
            placeholder="+591 70000001"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Sitio web
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm font-normal"
            name="websiteUrl"
            placeholder="https://proveedor.example"
            type="url"
          />
        </label>
        <div className="grid gap-2 text-xs font-semibold">
          <label className="flex items-center gap-2">
            <input name="emergencyAvailable" type="checkbox" />
            Atiende urgencias
          </label>
          <label className="flex items-center gap-2">
            <input name="isOpenNow" type="checkbox" />
            Marcado abierto ahora
          </label>
        </div>
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

function ArchiveControls(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <form
      action={props.formAction}
      aria-label={`Archivar proveedor ${props.provider.name}`}
      className="flex min-w-[220px] flex-col gap-2"
      method={props.formAction ? undefined : "post"}
    >
      <input
        name="providerId"
        type="hidden"
        value={props.provider.providerId}
      />
      <button
        className="border-border text-muted-foreground rounded-md border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        name="resourceAction"
        type="submit"
        value="archive_provider"
      >
        Archivar proveedor
      </button>
    </form>
  );
}

function ProviderMetrics(props: { metrics: AdminResourceMetricsViewModel }) {
  return (
    <section
      aria-labelledby="resource-metrics-heading"
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
    >
      <h2 id="resource-metrics-heading" className="text-xl font-semibold">
        Métricas de recursos
      </h2>
      <MetricTable
        caption="Métricas de proveedores agrupadas por departamento"
        heading="Métricas por departamento"
        metrics={props.metrics.byDepartment}
      />
      <MetricTable
        caption="Métricas de proveedores agrupadas por ciudad"
        heading="Métricas por ciudad"
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
            {props.metrics.length === 0 ? (
              <tr>
                <td className="text-muted-foreground py-3 text-sm" colSpan={4}>
                  Sin métricas disponibles hasta registrar proveedores.
                </td>
              </tr>
            ) : (
              props.metrics.map((metric) => (
                <tr key={metric.label}>
                  <th className="py-3 pr-3 font-medium" scope="row">
                    {metric.label}
                  </th>
                  <td className="px-3 py-3 text-right">
                    {metric.providerCount}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {metric.verifiedProviderCount}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    {metric.activeSponsorPlacementCount}
                  </td>
                </tr>
              ))
            )}
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
            Administración de recursos
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

function IdentityPill(props: {
  status: AdminResourceProviderVerificationStatus;
}) {
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
