import type * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@acme/ui/sheet";
import { Textarea } from "@acme/ui/textarea";

import type {
  AdminResourceProviderMutationNotice,
  AdminResourceProviderWorkflow,
  AdminResourceProviderWorkflowFeedback,
} from "./admin-resource-provider-actions";
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
import {
  adminResourceProviderMaxContactOptions,
  adminResourceProviderMaxLinks,
} from "./admin-resource-provider-form-parser";
import { AdminSubmitButton } from "./admin-ui/admin-submit-button";

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
  notice?: AdminResourceProviderMutationNotice;
  providers: readonly AdminResourceProviderViewModel[];
  title: string;
  viewer: AdminResourcesViewer;
  workflowFeedback?: AdminResourceProviderWorkflowFeedback;
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
    <main className="bg-background min-h-screen overflow-x-hidden [&_*]:box-border">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <AdminResourcesHeader title={props.title} viewer={props.viewer} />
        {props.notice ? <AdminResourcesNotice notice={props.notice} /> : null}
        <AdminResourcesSummary stats={stats} />

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex w-full max-w-full min-w-0 flex-col gap-6">
            <ProviderQueue
              createActionLabel={props.createActionLabel}
              formAction={props.formAction}
              providers={props.providers}
              workflowFeedback={props.workflowFeedback}
            />
          </section>

          <aside className="flex w-full max-w-full min-w-0 flex-col gap-6">
            <ProviderMetrics metrics={props.metrics} />
          </aside>
        </div>
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
  notice: AdminResourceProviderMutationNotice;
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
  createActionLabel: string;
  formAction?: React.ComponentProps<"form">["action"];
  providers: readonly AdminResourceProviderViewModel[];
  workflowFeedback?: AdminResourceProviderWorkflowFeedback;
}) {
  const providerCountLabel =
    props.providers.length === 1
      ? "1 proveedor en cola"
      : `${props.providers.length} proveedores en cola`;
  const createFeedback = getWorkflowFeedback(props.workflowFeedback, "create");

  return (
    <section
      aria-labelledby="provider-management-heading"
      className="flex min-w-0 flex-col gap-4"
      data-provider-queue
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2
            id="provider-management-heading"
            className="text-xl font-semibold"
          >
            Cola de proveedores
          </h2>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Revisa proveedor, categoría, ciudad, verificación, patrocinio,
            operación y última actualización antes de abrir una acción.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateProviderWorkflow
            actionLabel={props.createActionLabel}
            feedback={createFeedback}
            formAction={props.formAction}
          />
          <span className="bg-muted text-muted-foreground w-fit rounded-md px-3 py-2 text-sm font-semibold">
            {providerCountLabel}
          </span>
        </div>
      </div>
      {props.providers.length === 0 ? (
        <ProviderQueueEmptyState />
      ) : (
        <div className="grid min-w-0 gap-3">
          {props.providers.map((provider) => (
            <ProviderQueueItem
              formAction={props.formAction}
              key={provider.providerId}
              provider={provider}
              workflowFeedback={props.workflowFeedback}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ProviderQueueEmptyState() {
  return (
    <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">
            Todavía no hay proveedores registrados.
          </p>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            La cola está lista para el primer proveedor. Abre Registrar
            proveedor cuando tengas datos reales para publicar en el directorio.
          </p>
        </div>
        <span className="bg-muted text-muted-foreground w-fit rounded-md px-2 py-1 text-xs font-semibold">
          Cola vacía
        </span>
      </div>
    </div>
  );
}

function ProviderQueueItem(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
  workflowFeedback?: AdminResourceProviderWorkflowFeedback;
}) {
  const provider = props.provider;
  const activeSponsorCount = provider.activeSponsorPlacement ? 1 : 0;

  return (
    <article
      className="border-border bg-card text-card-foreground rounded-lg border p-4 shadow-xs"
      data-provider-queue-item={provider.providerId}
    >
      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_176px] 2xl:items-start">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(0,1.25fr)_minmax(130px,0.75fr)_minmax(140px,0.85fr)_minmax(160px,1fr)_minmax(124px,0.7fr)]">
          <ProviderQueueField label="Proveedor">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="truncate text-base font-semibold">
                {provider.name}
              </h3>
              <span className="text-primary text-xs font-semibold">
                {provider.categoryLabel}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {provider.contactLabel}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                ID: {provider.providerId}
              </span>
            </div>
          </ProviderQueueField>

          <ProviderQueueField label="Ciudad">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{provider.city}</span>
              <span className="text-muted-foreground text-xs">
                {provider.department}
              </span>
              <span className="text-muted-foreground text-xs">
                {provider.approximateLocationLabel}
              </span>
              <span className="text-muted-foreground text-xs">
                {provider.serviceAreaLabel}
              </span>
            </div>
          </ProviderQueueField>

          <ProviderQueueField label="Verificación">
            <div className="flex flex-col gap-2">
              <IdentityPill status={provider.verificationBadge.status} />
              <span className="text-muted-foreground text-xs">
                {provider.verificationBadge.note}
              </span>
            </div>
          </ProviderQueueField>

          <ProviderQueueField label="Operación">
            <div className="flex flex-wrap gap-2">
              <StatusChip
                label={
                  activeSponsorCount === 1
                    ? "1 patrocinio activo"
                    : `${activeSponsorCount} patrocinios activos`
                }
                tone={activeSponsorCount > 0 ? "primary" : "muted"}
              />
              <StatusChip
                label={
                  provider.isOpenNow ? "Abierto" : "Horario no confirmado"
                }
                tone={provider.isOpenNow ? "primary" : "muted"}
              />
              <StatusChip
                label={
                  provider.emergencyAvailable ? "Urgencias" : "Sin urgencias"
                }
                tone={provider.emergencyAvailable ? "primary" : "muted"}
              />
            </div>
          </ProviderQueueField>

          <ProviderQueueField label="Actualización">
            <span className="text-sm font-medium">
              {provider.lastUpdatedLabel}
            </span>
          </ProviderQueueField>
        </div>
        <ProviderQueueField label="Acciones">
          <ProviderActionWorkflowList
            formAction={props.formAction}
            provider={provider}
            workflowFeedback={props.workflowFeedback}
          />
        </ProviderQueueField>
      </div>
    </article>
  );
}

function ProviderQueueField(props: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
        {props.label}
      </p>
      {props.children}
    </div>
  );
}

function ProviderActionWorkflowList(props: {
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
  workflowFeedback?: AdminResourceProviderWorkflowFeedback;
}) {
  const editFeedback = getWorkflowFeedback(
    props.workflowFeedback,
    "edit",
    props.provider.providerId,
  );
  const verificationFeedback = getWorkflowFeedback(
    props.workflowFeedback,
    "verification",
    props.provider.providerId,
  );
  const sponsorFeedback = getWorkflowFeedback(
    props.workflowFeedback,
    "sponsor",
    props.provider.providerId,
  );
  const archiveFeedback = getWorkflowFeedback(
    props.workflowFeedback,
    "archive",
    props.provider.providerId,
  );

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-1">
      <EditProviderWorkflow
        feedback={editFeedback}
        formAction={props.formAction}
        provider={props.provider}
      />
      <VerificationProviderWorkflow
        feedback={verificationFeedback}
        formAction={props.formAction}
        provider={props.provider}
      />
      <SponsorProviderWorkflow
        feedback={sponsorFeedback}
        formAction={props.formAction}
        provider={props.provider}
      />
      <ArchiveProviderWorkflow
        feedback={archiveFeedback}
        formAction={props.formAction}
        provider={props.provider}
      />
    </div>
  );
}

function StatusChip(props: { label: string; tone: "muted" | "primary" }) {
  const className =
    props.tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  return (
    <span
      className={`${className} w-fit rounded-md px-2 py-1 text-xs font-semibold`}
    >
      {props.label}
    </span>
  );
}

function CreateProviderWorkflow(props: {
  actionLabel: string;
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
}) {
  return (
    <Sheet defaultOpen={Boolean(props.feedback)}>
      <SheetTrigger asChild>
        <Button data-workflow-trigger="create" type="button">
          {props.actionLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby="create-provider-description"
        className="w-full overflow-y-auto sm:max-w-3xl"
      >
        <SheetHeader>
          <SheetTitle>Registrar proveedor</SheetTitle>
          <SheetDescription id="create-provider-description">
            Completa el perfil que verá el directorio público de recursos.
          </SheetDescription>
        </SheetHeader>
        <form
          action={props.formAction}
          className="flex flex-1 flex-col gap-6 px-4 pb-4"
          method={props.formAction ? undefined : "post"}
        >
          <WorkflowErrorAlert feedback={props.feedback} />
          <ProviderProfileFields
            feedback={props.feedback}
            idPrefix="create-provider"
            mode="create"
          />
          <ProviderLocationFields
            feedback={props.feedback}
            idPrefix="create-provider"
            mode="create"
          />
          <ProviderContactFields
            feedback={props.feedback}
            idPrefix="create-provider"
            mode="create"
          />
          <ProviderMediaFields
            feedback={props.feedback}
            idPrefix="create-provider"
          />
          <ProviderBooleanFields idPrefix="create-provider" />
          <SheetFooter className="px-0 pb-0">
            <AdminSubmitButton
              data-submit-action="create_provider"
              name="resourceAction"
              pendingLabel="Creando proveedor"
              value="create_provider"
            >
              {props.actionLabel}
            </AdminSubmitButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function EditProviderWorkflow(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <Sheet defaultOpen={Boolean(props.feedback)}>
      <SheetTrigger asChild>
        <Button data-workflow-trigger="edit" type="button" variant="outline">
          Editar detalles
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby={`edit-provider-description-${props.provider.providerId}`}
        className="w-full overflow-y-auto sm:max-w-3xl"
      >
        <SheetHeader>
          <SheetTitle>Editar {props.provider.name}</SheetTitle>
          <SheetDescription
            id={`edit-provider-description-${props.provider.providerId}`}
          >
            Actualiza solo lo necesario. Los campos que dejes con sus valores
            actuales se conservan.
          </SheetDescription>
        </SheetHeader>
        <form
          action={props.formAction}
          aria-label={`Editar detalles de ${props.provider.name}`}
          className="flex flex-1 flex-col gap-6 px-4 pb-4"
          method={props.formAction ? undefined : "post"}
        >
          <ProviderIdentityHiddenFields provider={props.provider} />
          <WorkflowErrorAlert feedback={props.feedback} />
          <ProviderProfileFields
            feedback={props.feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            mode="edit"
            provider={props.provider}
          />
          <ProviderLocationFields
            feedback={props.feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            mode="edit"
            provider={props.provider}
          />
          <ProviderContactFields
            feedback={props.feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            mode="edit"
            provider={props.provider}
          />
          <ProviderMediaFields
            feedback={props.feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            provider={props.provider}
          />
          <ProviderBooleanFields
            idPrefix={`edit-provider-${props.provider.providerId}`}
            provider={props.provider}
          />
          <SheetFooter className="px-0 pb-0">
            <AdminSubmitButton
              data-submit-action="update_provider_details"
              name="resourceAction"
              pendingLabel="Guardando detalles"
              value="update_provider_details"
            >
              Guardar detalles
            </AdminSubmitButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ProviderProfileFields(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  mode: "create" | "edit";
  provider?: AdminResourceProviderViewModel;
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend>Perfil público</FieldLegend>
      <FieldGroup className="gap-4">
        <TextField
          autoFocus={props.mode === "create"}
          error={getFieldError(props.feedback, "name")}
          id={`${props.idPrefix}-name`}
          label="Nombre"
          name="name"
          placeholder="Veterinaria Alto Norte"
          required
          type="text"
          value={props.provider?.name}
        />
        <SelectField
          defaultValue={props.provider?.category ?? "veterinary"}
          error={getFieldError(props.feedback, "category")}
          id={`${props.idPrefix}-category`}
          label="Categoría"
          name="category"
          options={resourceProviderCategoryOptions}
        />
        <TextAreaField
          error={getFieldError(props.feedback, "description")}
          id={`${props.idPrefix}-description`}
          label="Descripción"
          name="description"
          placeholder="Atención veterinaria general, orientación y apoyo para familias cuidadoras."
          required
          value={props.provider?.description}
        />
        <TextAreaField
          error={getFieldError(props.feedback, "shortDescription")}
          id={`${props.idPrefix}-short-description`}
          label="Resumen corto"
          name="shortDescription"
          placeholder="Clínica local con atención general y urgencias."
          required
          value={props.provider?.shortDescription}
        />
        <TextField
          error={getFieldError(props.feedback, "serviceAreaLabel")}
          id={`${props.idPrefix}-service-area`}
          label="Cobertura"
          name="serviceAreaLabel"
          placeholder="El Alto y La Paz"
          required
          type="text"
          value={props.provider?.serviceAreaLabel}
        />
        <TextField
          error={getFieldError(props.feedback, "hoursLabel")}
          id={`${props.idPrefix}-hours`}
          label="Horarios"
          name="hoursLabel"
          placeholder="Lun - Sab: 08:00 a 18:00"
          required
          type="text"
          value={props.provider?.hoursLabel}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function ProviderLocationFields(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  mode: "create" | "edit";
  provider?: AdminResourceProviderViewModel;
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend>Ubicación y privacidad</FieldLegend>
      <FieldDescription>
        La latitud y longitud exactas se guardan para búsqueda interna. El
        directorio público usa la zona aproximada y la celda de ubicación.
      </FieldDescription>
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={getFieldError(props.feedback, "department")}
            id={`${props.idPrefix}-department`}
            label="Departamento"
            name="department"
            placeholder="La Paz"
            required
            type="text"
            value={props.provider?.department}
          />
          <TextField
            error={getFieldError(props.feedback, "city")}
            id={`${props.idPrefix}-city`}
            label="Ciudad"
            name="city"
            placeholder="El Alto"
            required
            type="text"
            value={props.provider?.city}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={getFieldError(props.feedback, "exactLatitude")}
            id={`${props.idPrefix}-exact-latitude`}
            label="Latitud exacta"
            name="exactLatitude"
            placeholder="-16.500000"
            required={props.mode === "create"}
            step="0.000001"
            type="number"
          />
          <TextField
            error={getFieldError(props.feedback, "exactLongitude")}
            id={`${props.idPrefix}-exact-longitude`}
            label="Longitud exacta"
            name="exactLongitude"
            placeholder="-68.120000"
            required={props.mode === "create"}
            step="0.000001"
            type="number"
          />
        </div>
        <TextField
          error={getFieldError(props.feedback, "approximateLocationLabel")}
          id={`${props.idPrefix}-approximate-location`}
          label="Ubicación aproximada visible"
          name="approximateLocationLabel"
          placeholder="Sopocachi, La Paz"
          required
          type="text"
          value={props.provider?.approximateLocationLabel}
        />
        <TextField
          error={getFieldError(props.feedback, "locationCell")}
          id={`${props.idPrefix}-location-cell`}
          label="Celda de ubicación"
          name="locationCell"
          placeholder="bo-lpb-sopocachi"
          required
          type="text"
          value={props.provider?.locationCell}
        />
        <TextField
          error={getFieldError(props.feedback, "addressLabel")}
          id={`${props.idPrefix}-address`}
          label="Dirección interna"
          name="addressLabel"
          placeholder="Zona Sopocachi, La Paz"
          type="text"
          value={props.provider?.addressLabel}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function ProviderContactFields(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  mode: "create" | "edit";
  provider?: AdminResourceProviderViewModel;
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend>Contacto y enlaces</FieldLegend>
      <FieldGroup className="gap-4">
        <ContactOptionsFields
          contactOptions={props.provider?.contactOptions}
          feedback={props.feedback}
          firstRowRequired
          idPrefix={props.idPrefix}
        />
        <LinkFields
          externalLinks={props.provider?.externalLinks}
          feedback={props.feedback}
          idPrefix={props.idPrefix}
          socialLinks={props.provider?.socialLinks}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function ProviderMediaFields(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  provider?: AdminResourceProviderViewModel;
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend>Medios opcionales</FieldLegend>
      <FieldGroup className="gap-4">
        <TextField
          error={getFieldError(props.feedback, "websiteUrl")}
          id={`${props.idPrefix}-website`}
          label="Sitio web"
          name="websiteUrl"
          placeholder="https://proveedor.example"
          type="url"
          value={props.provider?.websiteUrl}
        />
        <TextField
          error={getFieldError(props.feedback, "logoUrl")}
          id={`${props.idPrefix}-logo`}
          label="Logo URL"
          name="logoUrl"
          placeholder="https://proveedor.example/logo.png"
          type="url"
          value={props.provider?.logoUrl}
        />
        <TextField
          error={getFieldError(props.feedback, "photoUrl")}
          id={`${props.idPrefix}-photo`}
          label="Foto URL"
          name="photoUrl"
          placeholder="https://proveedor.example/foto.png"
          type="url"
          value={props.provider?.photoUrl}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function ProviderBooleanFields(props: {
  idPrefix: string;
  provider?: AdminResourceProviderViewModel;
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend>Operación</FieldLegend>
      <FieldGroup className="gap-3">
        <CheckboxField
          defaultChecked={props.provider?.emergencyAvailable}
          id={`${props.idPrefix}-emergency`}
          label="Atiende urgencias"
          name="emergencyAvailable"
        />
        <CheckboxField
          defaultChecked={props.provider?.isOpenNow}
          id={`${props.idPrefix}-open-now`}
          label="Marcado abierto ahora"
          name="isOpenNow"
        />
      </FieldGroup>
    </FieldSet>
  );
}

function ContactOptionsFields(props: {
  contactOptions?: AdminResourceProviderViewModel["contactOptions"];
  feedback?: AdminResourceProviderWorkflowFeedback;
  firstRowRequired: boolean;
  idPrefix: string;
}) {
  const contactOptions = props.contactOptions ?? [];
  const groupError = getFieldError(props.feedback, "contactOptions");

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">Opciones de contacto</FieldLegend>
      {Array.from({ length: adminResourceProviderMaxContactOptions }).map(
        (_, index) => {
          const contact = contactOptions[index];
          const rowIsRequired = props.firstRowRequired && index === 0;

          return (
            <div
              className="grid gap-3 rounded-md border border-dashed p-3 sm:grid-cols-[minmax(130px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]"
              key={index}
            >
              <SelectField
                defaultValue={contact?.kind ?? "whatsapp"}
                error={getFieldError(props.feedback, `contactKind${index}`)}
                id={`${props.idPrefix}-contact-kind-${index}`}
                label="Tipo"
                name={`contactKind${index}`}
                options={resourceProviderContactKindOptions}
              />
              <TextField
                error={getFieldError(props.feedback, `contactLabel${index}`)}
                id={`${props.idPrefix}-contact-label-${index}`}
                label="Etiqueta"
                name={`contactLabel${index}`}
                required={rowIsRequired}
                type="text"
                value={
                  contact?.label ??
                  (rowIsRequired ? "WhatsApp institucional" : "")
                }
              />
              <TextField
                error={getFieldError(props.feedback, `contactValue${index}`)}
                id={`${props.idPrefix}-contact-value-${index}`}
                label="Valor"
                name={`contactValue${index}`}
                required={rowIsRequired}
                type="text"
                value={contact?.value}
              />
            </div>
          );
        },
      )}
      <FieldError>{groupError}</FieldError>
    </FieldSet>
  );
}

function LinkFields(props: {
  externalLinks?: AdminResourceProviderViewModel["externalLinks"];
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  socialLinks?: AdminResourceProviderViewModel["socialLinks"];
}) {
  return (
    <div className="grid gap-5">
      <LinkGroupFields
        fieldPrefix="socialLink"
        feedback={props.feedback}
        idPrefix={props.idPrefix}
        links={props.socialLinks ?? []}
        title="Redes sociales"
      />
      <LinkGroupFields
        fieldPrefix="externalLink"
        feedback={props.feedback}
        idPrefix={props.idPrefix}
        links={props.externalLinks ?? []}
        title="Enlaces externos"
      />
    </div>
  );
}

function LinkGroupFields(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  fieldPrefix: "externalLink" | "socialLink";
  idPrefix: string;
  links: AdminResourceProviderViewModel["externalLinks"];
  title: string;
}) {
  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{props.title}</FieldLegend>
      {Array.from({ length: adminResourceProviderMaxLinks }).map((_, index) => {
        const link = props.links[index];

        return (
          <div className="grid gap-3 sm:grid-cols-2" key={index}>
            <TextField
              error={getFieldError(
                props.feedback,
                `${props.fieldPrefix}Label${index}`,
              )}
              id={`${props.idPrefix}-${props.fieldPrefix}-label-${index}`}
              label="Etiqueta"
              name={`${props.fieldPrefix}Label${index}`}
              type="text"
              value={link?.label}
            />
            <TextField
              error={getFieldError(
                props.feedback,
                `${props.fieldPrefix}Url${index}`,
              )}
              id={`${props.idPrefix}-${props.fieldPrefix}-url-${index}`}
              label="URL"
              name={`${props.fieldPrefix}Url${index}`}
              type="url"
              value={link?.url}
            />
          </div>
        );
      })}
    </FieldSet>
  );
}

function VerificationProviderWorkflow(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;

  return (
    <Dialog defaultOpen={Boolean(props.feedback)}>
      <DialogTrigger asChild>
        <Button
          data-workflow-trigger="verification"
          type="button"
          variant="outline"
        >
          Verificación
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={`verification-description-${provider.providerId}`}
      >
        <DialogHeader>
          <DialogTitle>Verificación de identidad</DialogTitle>
          <DialogDescription
            id={`verification-description-${provider.providerId}`}
          >
            Cambia la insignia de {provider.name} con una nota interna propia.
          </DialogDescription>
        </DialogHeader>
        <form
          action={props.formAction}
          aria-label={`Gestionar identidad de ${provider.name}`}
          className="grid gap-4"
          method={props.formAction ? undefined : "post"}
        >
          <ProviderIdentityHiddenFields provider={provider} />
          <WorkflowErrorAlert feedback={props.feedback} />
          <div className="flex items-center gap-2">
            <IdentityPill status={provider.verificationBadge.status} />
            <span className="text-muted-foreground text-xs">
              {provider.verificationBadge.label}
            </span>
          </div>
          <SelectField
            defaultValue={provider.verificationBadge.status}
            error={getFieldError(props.feedback, "verificationStatus")}
            id={`verification-status-${provider.providerId}`}
            label="Estado"
            name="verificationStatus"
            options={[
              { id: "verified", label: "Identidad verificada" },
              { id: "unverified", label: "Pendiente de revisión" },
            ]}
          />
          <TextAreaField
            autoFocus
            error={getFieldError(props.feedback, "verificationNote")}
            id={`verification-note-${provider.providerId}`}
            label="Nota interna"
            name="verificationNote"
            value={provider.verificationBadge.note}
          />
          <DialogFooter>
            <AdminSubmitButton
              data-submit-action="update_verification"
              name="resourceAction"
              pendingLabel="Guardando verificación"
              value="update_verification"
            >
              Guardar verificación
            </AdminSubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SponsorProviderWorkflow(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <Sheet defaultOpen={Boolean(props.feedback)}>
      <SheetTrigger asChild>
        <Button data-workflow-trigger="sponsor" type="button" variant="outline">
          Patrocinio
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby={`sponsor-description-${props.provider.providerId}`}
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Patrocinio de {props.provider.name}</SheetTitle>
          <SheetDescription
            id={`sponsor-description-${props.provider.providerId}`}
          >
            Adjunta o retira patrocinios locales. Nunca cambian prioridad de
            recuperación ni alertas push.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-4">
          <WorkflowErrorAlert feedback={props.feedback} />
          <SponsorPolicyNotice />
          <SponsorPlacementList
            formAction={props.formAction}
            placements={props.provider.sponsorPlacements}
            provider={props.provider}
          />
          <AttachSponsorForm
            feedback={props.feedback}
            formAction={props.formAction}
            provider={props.provider}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SponsorPolicyNotice() {
  return (
    <Alert>
      <AlertTitle>Política de seguridad</AlertTitle>
      <AlertDescription>
        <p>No cambia la prioridad de recuperación.</p>
        <p>No activa notificaciones push.</p>
      </AlertDescription>
    </Alert>
  );
}

function SponsorPlacementList(props: {
  formAction?: React.ComponentProps<"form">["action"];
  placements: readonly LocalSponsorPlacementViewModel[];
  provider: AdminResourceProviderViewModel;
}) {
  if (props.placements.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Sin patrocinio local listado para retirar.
      </p>
    );
  }

  return (
    <section aria-labelledby={`sponsor-list-${props.provider.providerId}`}>
      <h3
        className="mb-3 text-sm font-semibold"
        id={`sponsor-list-${props.provider.providerId}`}
      >
        Patrocinios listados
      </h3>
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
            {placement.placementId ? (
              <form
                action={props.formAction}
                aria-label={`Retirar patrocinio local de ${props.provider.name}`}
                className="mt-3"
                method={props.formAction ? undefined : "post"}
              >
                <ProviderIdentityHiddenFields provider={props.provider} />
                <input
                  name="placementId"
                  type="hidden"
                  value={placement.placementId}
                />
                <AdminSubmitButton
                  data-submit-action="detach_sponsor"
                  name="resourceAction"
                  pendingLabel="Retirando patrocinio"
                  value="detach_sponsor"
                  variant="outline"
                >
                  Retirar este patrocinio
                </AdminSubmitButton>
              </form>
            ) : (
              <p className="text-muted-foreground mt-3 text-xs">
                Este patrocinio no expone un identificador para retiro desde el
                panel.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AttachSponsorForm(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <form
      action={props.formAction}
      aria-label={`Adjuntar patrocinio local a ${props.provider.name}`}
      className="grid gap-4"
      method={props.formAction ? undefined : "post"}
    >
      <ProviderIdentityHiddenFields provider={props.provider} />
      {props.provider.activeSponsorPlacement ? (
        <div className="border-border rounded-md border p-3 text-sm">
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
      <FieldSet className="gap-4">
        <FieldLegend>Adjuntar patrocinio local</FieldLegend>
        <SelectField
          defaultValue="resources_directory"
          error={getFieldError(props.feedback, "sponsorSurface")}
          id={`sponsor-surface-${props.provider.providerId}`}
          label="Superficie"
          name="sponsorSurface"
          options={localSponsorPlacementSurfaceOptions}
        />
        <TextField
          error={getFieldError(props.feedback, "sponsorLabel")}
          id={`sponsor-label-${props.provider.providerId}`}
          label="Etiqueta"
          name="sponsorLabel"
          placeholder="Patrocinado"
          type="text"
        />
        <TextAreaField
          error={getFieldError(props.feedback, "sponsorDisclosure")}
          id={`sponsor-disclosure-${props.provider.providerId}`}
          label="Divulgación pública"
          name="sponsorDisclosure"
          placeholder="Patrocinado: apoyo local. No cambia la prioridad de reportes."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={getFieldError(props.feedback, "startsOn")}
            id={`sponsor-starts-${props.provider.providerId}`}
            label="Inicio"
            name="startsOn"
            required
            type="date"
          />
          <TextField
            error={getFieldError(props.feedback, "endsOn")}
            id={`sponsor-ends-${props.provider.providerId}`}
            label="Fin"
            name="endsOn"
            required
            type="date"
          />
        </div>
      </FieldSet>
      <SheetFooter className="px-0 pb-0">
        <AdminSubmitButton
          data-submit-action="attach_sponsor"
          name="resourceAction"
          pendingLabel="Adjuntando patrocinio"
          value="attach_sponsor"
        >
          Adjuntar patrocinio local
        </AdminSubmitButton>
      </SheetFooter>
    </form>
  );
}

function ArchiveProviderWorkflow(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  provider: AdminResourceProviderViewModel;
}) {
  const confirmationError = getFieldError(
    props.feedback,
    "archiveConfirmation",
  );

  return (
    <Dialog defaultOpen={Boolean(props.feedback)}>
      <DialogTrigger asChild>
        <Button data-workflow-trigger="archive" type="button" variant="outline">
          Archivar
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={`archive-description-${props.provider.providerId}`}
      >
        <DialogHeader>
          <DialogTitle>Archivar proveedor</DialogTitle>
          <DialogDescription
            id={`archive-description-${props.provider.providerId}`}
          >
            Esta acción retira {props.provider.name} del directorio activo. Debe
            confirmarse explícitamente.
          </DialogDescription>
        </DialogHeader>
        <form
          action={props.formAction}
          aria-label={`Archivar proveedor ${props.provider.name}`}
          className="grid gap-4"
          method={props.formAction ? undefined : "post"}
        >
          <ProviderIdentityHiddenFields provider={props.provider} />
          <WorkflowErrorAlert feedback={props.feedback} />
          <Field
            data-invalid={Boolean(confirmationError)}
            orientation="horizontal"
          >
            <Checkbox
              aria-describedby={
                confirmationError
                  ? `archive-confirmation-error-${props.provider.providerId}`
                  : undefined
              }
              aria-invalid={Boolean(confirmationError)}
              id={`archive-confirmation-${props.provider.providerId}`}
              name="archiveConfirmation"
              required
              value="confirmed"
            />
            <div className="grid gap-2">
              <FieldLabel
                htmlFor={`archive-confirmation-${props.provider.providerId}`}
              >
                Confirmo que quiero archivar este proveedor.
              </FieldLabel>
              <FieldError
                id={`archive-confirmation-error-${props.provider.providerId}`}
              >
                {confirmationError}
              </FieldError>
            </div>
          </Field>
          <DialogFooter>
            <AdminSubmitButton
              data-submit-action="archive_provider"
              name="resourceAction"
              pendingLabel="Archivando proveedor"
              value="archive_provider"
              variant="destructive"
            >
              Archivar proveedor
            </AdminSubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TextField(props: {
  autoFocus?: boolean;
  error?: string;
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type: React.HTMLInputTypeAttribute;
  value?: string;
}) {
  const errorId = `${props.id}-error`;

  return (
    <Field data-invalid={Boolean(props.error)}>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <Input
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={Boolean(props.error)}
        autoFocus={props.autoFocus}
        defaultValue={props.value ?? ""}
        id={props.id}
        name={props.name}
        placeholder={props.placeholder}
        required={props.required}
        step={props.step}
        type={props.type}
      />
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
  );
}

function TextAreaField(props: {
  autoFocus?: boolean;
  error?: string;
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}) {
  const errorId = `${props.id}-error`;

  return (
    <Field data-invalid={Boolean(props.error)}>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <Textarea
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={Boolean(props.error)}
        autoFocus={props.autoFocus}
        defaultValue={props.value ?? ""}
        id={props.id}
        name={props.name}
        placeholder={props.placeholder}
        required={props.required}
      />
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
  );
}

function SelectField<TOption extends { id: string; label: string }>(props: {
  defaultValue: TOption["id"];
  error?: string;
  id: string;
  label: string;
  name: string;
  options: readonly TOption[];
}) {
  const errorId = `${props.id}-error`;

  return (
    <Field data-invalid={Boolean(props.error)}>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <Select defaultValue={props.defaultValue} name={props.name}>
        <SelectTrigger
          aria-describedby={props.error ? errorId : undefined}
          aria-invalid={Boolean(props.error)}
          className="w-full"
          id={props.id}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
  );
}

function CheckboxField(props: {
  defaultChecked?: boolean;
  id: string;
  label: string;
  name: string;
}) {
  return (
    <Field orientation="horizontal">
      <Checkbox
        defaultChecked={props.defaultChecked}
        id={props.id}
        name={props.name}
      />
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
    </Field>
  );
}

function WorkflowErrorAlert(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
}) {
  if (!props.feedback?.formError) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>No se guardó la acción</AlertTitle>
      <AlertDescription>{props.feedback.formError}</AlertDescription>
    </Alert>
  );
}

function ProviderIdentityHiddenFields(props: {
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <>
      <input
        name="providerId"
        type="hidden"
        value={props.provider.providerId}
      />
      <input name="providerName" type="hidden" value={props.provider.name} />
    </>
  );
}

function getWorkflowFeedback(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
  workflow: AdminResourceProviderWorkflow,
  providerId?: string,
) {
  if (!feedback || feedback.ok || feedback.workflow !== workflow) {
    return undefined;
  }

  if (providerId && feedback.providerId !== providerId) {
    return undefined;
  }

  return feedback;
}

function getFieldError(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
  field: string,
) {
  return feedback?.fieldErrors.find((error) => error.field === field)?.message;
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
      activeSponsorPlacementCount:
        stats.activeSponsorPlacementCount +
        (provider.activeSponsorPlacement ? 1 : 0),
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

  const metricSponsorCount = metrics.byDepartment.reduce(
    (total, metric) => total + metric.activeSponsorPlacementCount,
    0,
  );

  return {
    ...providerStats,
    activeSponsorPlacementCount: Math.max(
      providerStats.activeSponsorPlacementCount,
      metricSponsorCount,
    ),
  };
}
