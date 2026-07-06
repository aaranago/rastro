"use client";

import * as React from "react";

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
import { Textarea } from "@acme/ui/textarea";

import type {
  AdminSponsorPlacementActionState,
  AdminSponsorPlacementFeedback,
  AdminSponsorPlacementFormAction,
  AdminSponsorPlacementNotice,
} from "./admin-sponsor-placement-actions";
import type {
  AdminSponsorPlacementDashboardViewModel,
  AdminSponsorPlacementListStateViewModel,
  AdminSponsorPlacementSurfaceOption,
  AdminSponsorPlacementViewModel,
  AdminSponsorProviderOption,
} from "./admin-sponsor-placement-model";
import type { AdminDataListColumn } from "./admin-ui/admin-data-list";
import { AdminMediaUploadField } from "./admin-media-upload-field";
import { AdminDataList } from "./admin-ui/admin-data-list";
import {
  AdminListFilterSubmitControls,
  AdminExternalMediaUrlFallback as AdvancedExternalMediaUrlFallback,
  getArrayFilterValue,
  AdminNativeSelectField as NativeSelectField,
  AdminTextField as TextField,
} from "./admin-ui/admin-form-fields";
import { AdminSubmitButton } from "./admin-ui/admin-submit-button";
import {
  buildAdminListActiveFilters,
  buildAdminListPageHref,
  buildAdminListSortHref,
} from "./admin-url-form-parser";

export type AdminSponsorPlacementViewerRole = "admin" | "member" | "visitor";

export interface AdminSponsorPlacementViewer {
  displayName: string;
  role: AdminSponsorPlacementViewerRole;
}

export interface AdminSponsorPlacementDashboardProps {
  accessDenied: {
    body: string;
    title: string;
  };
  formAction?: AdminSponsorPlacementFormAction;
  notice?: AdminSponsorPlacementNotice;
  viewModel: AdminSponsorPlacementDashboardViewModel;
  viewer: AdminSponsorPlacementViewer;
  workflowFeedback?: AdminSponsorPlacementFeedback;
}

const emptyAdminSponsorPlacementActionState: AdminSponsorPlacementActionState =
  {};

const sponsorMetricNumberFormatter = new Intl.NumberFormat("es-BO");

export function AdminSponsorPlacementDashboard(
  props: AdminSponsorPlacementDashboardProps,
) {
  if (props.viewer.role !== "admin") {
    return (
      <AdminSponsorAccessDenied
        accessDenied={props.accessDenied}
        viewer={props.viewer}
      />
    );
  }

  return (
    <main className="bg-background min-h-screen overflow-x-hidden [&_*]:box-border">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <SponsorHeader
          formAction={props.formAction}
          viewModel={props.viewModel}
          workflowFeedback={props.workflowFeedback}
        />
        {props.notice ? <SponsorNotice notice={props.notice} /> : null}
        <SponsorStats viewModel={props.viewModel} />
        <SponsorSafetyPolicy viewModel={props.viewModel} />
        <SponsorPlacementTable
          formAction={props.formAction}
          viewModel={props.viewModel}
          workflowFeedback={props.workflowFeedback}
        />
      </div>
    </main>
  );
}

function SponsorHeader(props: {
  formAction?: AdminSponsorPlacementFormAction;
  viewModel: AdminSponsorPlacementDashboardViewModel;
  workflowFeedback?: AdminSponsorPlacementFeedback;
}) {
  return (
    <header className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-5 shadow-xs md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-primary text-sm font-semibold">
          Administración de patrocinios
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">
          {props.viewModel.title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Gestiona patrocinios locales de proveedores de recursos sin mezclar
          pagos, recuperación ni notificaciones.
        </p>
      </div>
      <CreateSponsorPlacementWorkflow
        feedback={
          props.workflowFeedback?.action === "create_sponsor_placement"
            ? props.workflowFeedback
            : undefined
        }
        formAction={props.formAction}
        providerOptions={props.viewModel.providerOptions}
        surfaceOptions={props.viewModel.surfaceOptions}
      />
    </header>
  );
}

function SponsorNotice(props: { notice: AdminSponsorPlacementNotice }) {
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

function SponsorStats(props: {
  viewModel: AdminSponsorPlacementDashboardViewModel;
}) {
  const stats = props.viewModel.stats;

  return (
    <section
      aria-label="Resumen de patrocinios"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
    >
      <SummaryStat label="Patrocinios" value={stats.placementCount} />
      <SummaryStat label="Activos" value={stats.activeCount} />
      <SummaryStat label="Programados" value={stats.scheduledCount} />
      <SummaryStat label="Expirados" value={stats.expiredCount} />
      <SummaryStat label="Proveedores" value={stats.providerCount} />
      <SummaryStat label="Impresiones" value={stats.impressionCount} />
      <SummaryStat label="Aperturas" value={stats.openCount} />
    </section>
  );
}

function SummaryStat(props: { label: string; value: number }) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-1 pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl tracking-normal">
          {formatSponsorMetricNumber(props.value)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function SponsorDeliveryMetrics(props: {
  metrics: AdminSponsorPlacementViewModel["deliveryMetrics"];
}) {
  return (
    <div className="grid min-w-0 gap-1 text-sm">
      <MetricLine
        label="Impresiones"
        value={formatSponsorMetricNumber(props.metrics.impressionCount)}
      />
      <MetricLine
        label="Aperturas"
        value={formatSponsorMetricNumber(props.metrics.openCount)}
      />
      <p className="text-muted-foreground text-xs">
        Tasa de apertura: {props.metrics.openRateLabel}
      </p>
    </div>
  );
}

function MetricLine(props: { label: string; value: string }) {
  return (
    <p className="flex min-w-0 items-baseline justify-between gap-3">
      <span className="text-muted-foreground truncate">{props.label}</span>
      <span className="text-foreground font-semibold tabular-nums">
        {props.value}
      </span>
    </p>
  );
}

function formatSponsorMetricNumber(value: number) {
  return sponsorMetricNumberFormatter.format(value);
}

function SponsorSafetyPolicy(props: {
  viewModel: AdminSponsorPlacementDashboardViewModel;
}) {
  const policy = props.viewModel.safetyPolicy;

  return (
    <Alert>
      <AlertTitle>Política de seguridad respaldada por datos</AlertTitle>
      <AlertDescription>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <PolicyValue
            label="Prioridad de recuperación"
            value={policy.recoveryPriority.label}
          />
          <PolicyValue
            label="Notificaciones push"
            value={policy.pushNotifications.label}
          />
          <PolicyValue
            label="Superficies soportadas"
            value={policy.eligibleSurfaceLabels.join(", ")}
          />
        </div>
      </AlertDescription>
    </Alert>
  );
}

function PolicyValue(props: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs font-semibold uppercase">
        {props.label}
      </p>
      <p className="mt-1 text-sm font-medium">{props.value}</p>
    </div>
  );
}

function SponsorPlacementTable(props: {
  formAction?: AdminSponsorPlacementFormAction;
  viewModel: AdminSponsorPlacementDashboardViewModel;
  workflowFeedback?: AdminSponsorPlacementFeedback;
}) {
  const columns = getSponsorPlacementColumns(props.viewModel.list);
  const totalLabel =
    props.viewModel.list.total === 1
      ? "1 patrocinio"
      : `${props.viewModel.list.total} patrocinios`;

  return (
    <AdminDataList
      activeFilters={buildAdminListActiveFilters({
        availableFilters: props.viewModel.list.availableFilters,
        basePath: "/admin/patrocinios",
        listInput: props.viewModel.list.input,
      })}
      columns={columns}
      description="Lista operacional con proveedor, superficie, vigencia, estado, medios y acciones."
      emptyState={{
        description:
          "Crea el primer patrocinio cuando exista un proveedor de recursos elegible y una ventana de fechas confirmada.",
        title: "Todavía no hay patrocinios locales.",
      }}
      filterBar={<SponsorPlacementFilterBar list={props.viewModel.list} />}
      filteredEmptyState={{
        description:
          "Ajusta la búsqueda o retira filtros para ver otros patrocinios locales.",
        title: "No hay patrocinios para estos filtros.",
      }}
      getRowKey={(placement) => placement.placementId}
      id="sponsor-placement-list"
      pagination={{
        hrefForPage: (page) =>
          buildAdminListPageHref({
            basePath: "/admin/patrocinios",
            listInput: props.viewModel.list.input,
            page,
          }),
        page: props.viewModel.list.page,
        pageSize: props.viewModel.list.pageSize,
        totalItems: props.viewModel.list.total,
      }}
      renderMobileCard={(placement) => (
        <SponsorPlacementCard
          formAction={props.formAction}
          placement={placement}
          providerOptions={props.viewModel.providerOptions}
          surfaceOptions={props.viewModel.surfaceOptions}
          workflowFeedback={props.workflowFeedback}
        />
      )}
      rowActions={{
        className: "w-[160px]",
        render: (placement) => (
          <SponsorPlacementActions
            formAction={props.formAction}
            placement={placement}
            providerOptions={props.viewModel.providerOptions}
            surfaceOptions={props.viewModel.surfaceOptions}
            workflowFeedback={props.workflowFeedback}
          />
        ),
      }}
      rows={props.viewModel.placements}
      tableCaption="Patrocinios locales por proveedor"
      title="Patrocinios por proveedor"
      totalLabel={totalLabel}
    />
  );
}

function SponsorPlacementCard(props: {
  formAction?: AdminSponsorPlacementFormAction;
  placement: AdminSponsorPlacementViewModel;
  providerOptions: readonly AdminSponsorProviderOption[];
  surfaceOptions: readonly AdminSponsorPlacementSurfaceOption[];
  workflowFeedback?: AdminSponsorPlacementFeedback;
}) {
  return (
    <article
      className="border-border bg-background rounded-lg border p-4"
      data-sponsor-placement-card={props.placement.placementId}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <SponsorMediaPreview
            imageUrl={props.placement.imageUrl}
            logoUrl={props.placement.logoUrl}
            providerName={props.placement.providerName}
          />
          <p className="font-medium break-words">
            {props.placement.providerName}
          </p>
          <p className="text-muted-foreground text-xs">
            {props.placement.providerCity}, {props.placement.providerDepartment}
          </p>
          <p className="text-muted-foreground text-xs break-all">
            ID: {props.placement.placementId}
          </p>
        </div>

        <div className="grid min-w-0 gap-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase">
            Superficie y vigencia
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{props.placement.surfaceLabel}</Badge>
            <PlacementStateBadge state={props.placement.state}>
              {props.placement.stateLabel}
            </PlacementStateBadge>
          </div>
          <p className="text-sm">{props.placement.dateWindowLabel}</p>
          <SponsorDeliveryMetrics metrics={props.placement.deliveryMetrics} />
        </div>

        <div className="grid min-w-0 gap-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase">
            Política
          </p>
          <p className="text-sm">
            {props.placement.safetyPolicy.recoveryPriority.label}
          </p>
          <p className="text-muted-foreground text-xs">
            {props.placement.safetyPolicy.pushNotifications.label}
          </p>
        </div>

        <SponsorPlacementActions
          formAction={props.formAction}
          placement={props.placement}
          providerOptions={props.providerOptions}
          surfaceOptions={props.surfaceOptions}
          workflowFeedback={props.workflowFeedback}
        />
      </div>
    </article>
  );
}

function getSponsorPlacementColumns(
  list: AdminSponsorPlacementListStateViewModel,
): readonly AdminDataListColumn<AdminSponsorPlacementViewModel>[] {
  return [
    {
      cell: (placement) => <SponsorProviderCell placement={placement} />,
      header: "Proveedor",
      id: "provider",
      rowHeader: true,
      sort: getSponsorSort(list, "providerName"),
    },
    {
      cell: (placement) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{placement.surfaceLabel}</Badge>
          <PlacementStateBadge state={placement.state}>
            {placement.stateLabel}
          </PlacementStateBadge>
        </div>
      ),
      header: "Superficie",
      id: "surface",
      sort: getSponsorSort(list, "surface"),
    },
    {
      cell: (placement) => (
        <SponsorDeliveryMetrics metrics={placement.deliveryMetrics} />
      ),
      header: "Entrega",
      id: "delivery",
    },
    {
      cell: (placement) => (
        <span className="text-sm">{placement.dateWindowLabel}</span>
      ),
      header: "Vigencia",
      id: "window",
      sort: getSponsorSort(list, "startsOn"),
    },
    {
      cell: (placement) => (
        <div className="grid min-w-0 gap-1">
          <p className="text-sm">
            {placement.safetyPolicy.recoveryPriority.label}
          </p>
          <p className="text-muted-foreground text-xs">
            {placement.safetyPolicy.pushNotifications.label}
          </p>
        </div>
      ),
      header: "Política",
      id: "policy",
    },
    {
      cell: (placement) => (
        <SponsorMediaPreview
          imageUrl={placement.imageUrl}
          logoUrl={placement.logoUrl}
          providerName={placement.providerName}
        />
      ),
      header: "Medios",
      id: "media",
      sort: getSponsorSort(list, "mediaState"),
    },
  ] satisfies readonly AdminDataListColumn<AdminSponsorPlacementViewModel>[];
}

function getSponsorSort(
  list: AdminSponsorPlacementListStateViewModel,
  sortBy: NonNullable<
    AdminSponsorPlacementListStateViewModel["input"]["sortBy"]
  >,
) {
  const sort = list.availableSorts.find((option) => option.value === sortBy);

  return {
    current:
      list.input.sortBy === sortBy
        ? list.input.sortDirection === "asc"
          ? ("ascending" as const)
          : ("descending" as const)
        : undefined,
    href: buildAdminListSortHref({
      basePath: "/admin/patrocinios",
      defaultDirection: sort?.defaultDirection ?? "asc",
      listInput: list.input,
      sortBy,
    }),
    label: sort?.label ?? sortBy,
  };
}

function SponsorProviderCell(props: {
  placement: AdminSponsorPlacementViewModel;
}) {
  return (
    <div className="min-w-0">
      <SponsorMediaPreview
        imageUrl={props.placement.imageUrl}
        logoUrl={props.placement.logoUrl}
        providerName={props.placement.providerName}
      />
      <p className="font-medium break-words">{props.placement.providerName}</p>
      <p className="text-muted-foreground text-xs">
        {props.placement.providerCity}, {props.placement.providerDepartment}
      </p>
      <p className="text-muted-foreground text-xs break-all">
        ID: {props.placement.placementId}
      </p>
    </div>
  );
}

function SponsorPlacementFilterBar(props: {
  list: AdminSponsorPlacementListStateViewModel;
}) {
  const filters = props.list.input.filters ?? {};

  return (
    <form action="/admin/patrocinios" className="grid min-w-0 gap-3">
      <input name="pageSize" type="hidden" value={props.list.pageSize} />
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(180px,1.4fr)_repeat(4,minmax(130px,1fr))]">
        <Field>
          <FieldLabel htmlFor="sponsor-search">Buscar patrocinio</FieldLabel>
          <Input
            defaultValue={props.list.input.search ?? ""}
            id="sponsor-search"
            maxLength={160}
            name="search"
            placeholder="San Roque, Sopocachi"
            type="search"
          />
        </Field>
        <NativeSelectField
          id="sponsor-category"
          label="Categoría"
          name="category"
          options={[
            { id: "veterinary", label: "Clínica veterinaria" },
            { id: "shelter", label: "Refugio o rescate" },
            { id: "groomer", label: "Peluquería para mascotas" },
            { id: "pet_food", label: "Alimento para mascotas" },
            { id: "trainer", label: "Entrenamiento" },
            { id: "pet_store", label: "Tienda de mascotas" },
            { id: "transport", label: "Transporte de mascotas" },
            { id: "other", label: "Otro recurso local" },
          ]}
          value={getArrayFilterValue(filters.category)}
        />
        <TextField
          id="sponsor-city-filter"
          label="Ciudad"
          name="city"
          placeholder="La Paz"
          type="text"
          value={filters.city}
        />
        <TextField
          id="sponsor-department-filter"
          label="Departamento"
          name="department"
          placeholder="La Paz"
          type="text"
          value={filters.department}
        />
        <NativeSelectField
          id="sponsor-verification"
          label="Verificación"
          name="verification"
          options={[
            { id: "verified", label: "Identidad verificada" },
            { id: "unverified", label: "Sin insignia" },
          ]}
          value={getArrayFilterValue(filters.verification)}
        />
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-[repeat(6,minmax(120px,1fr))_auto]">
        <NativeSelectField
          id="sponsor-state"
          label="Estado"
          name="state"
          options={[
            { id: "active", label: "Activo" },
            { id: "scheduled", label: "Programado" },
            { id: "expired", label: "Expirado" },
          ]}
          value={filters.state === "any" ? undefined : filters.state}
        />
        <NativeSelectField
          id="sponsor-surface"
          label="Superficie"
          name="surface"
          options={
            props.list.availableFilters
              .find((filter) => filter.key === "surface")
              ?.options?.map((option) => ({
                id: option.value,
                label: option.label,
              })) ?? []
          }
          value={getArrayFilterValue(filters.surface)}
        />
        <TextField
          id="sponsor-active-on"
          label="Activo en fecha"
          name="activeOn"
          type="date"
          value={filters.activeOn}
        />
        <TextField
          id="sponsor-starts-from"
          label="Inicia desde"
          name="startsFrom"
          type="date"
          value={filters.startsFrom}
        />
        <TextField
          id="sponsor-ends-to"
          label="Termina hasta"
          name="endsTo"
          type="date"
          value={filters.endsTo}
        />
        <AdminListFilterSubmitControls
          mediaState={filters.mediaState}
          mediaStateId="sponsor-media-state"
          sortBy={props.list.input.sortBy}
          sortDirection={props.list.input.sortDirection}
        />
      </div>
    </form>
  );
}

function SponsorPlacementActions(props: {
  formAction?: AdminSponsorPlacementFormAction;
  placement: AdminSponsorPlacementViewModel;
  providerOptions: readonly AdminSponsorProviderOption[];
  surfaceOptions: readonly AdminSponsorPlacementSurfaceOption[];
  workflowFeedback?: AdminSponsorPlacementFeedback;
}) {
  const feedback =
    props.workflowFeedback?.placementId === props.placement.placementId
      ? props.workflowFeedback
      : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row md:flex-col">
      <EditSponsorPlacementWorkflow
        feedback={
          feedback?.action === "update_sponsor_placement" ? feedback : undefined
        }
        formAction={props.formAction}
        placement={props.placement}
        providerOptions={props.providerOptions}
        surfaceOptions={props.surfaceOptions}
      />
      <DetachSponsorPlacementWorkflow
        feedback={
          feedback?.action === "detach_sponsor_placement" ? feedback : undefined
        }
        formAction={props.formAction}
        placement={props.placement}
      />
    </div>
  );
}

function PlacementStateBadge(props: {
  children: React.ReactNode;
  state: AdminSponsorPlacementViewModel["state"];
}) {
  const variant = props.state === "active" ? "default" : "secondary";

  return <Badge variant={variant}>{props.children}</Badge>;
}

function CreateSponsorPlacementWorkflow(props: {
  feedback?: AdminSponsorPlacementFeedback;
  formAction?: AdminSponsorPlacementFormAction;
  providerOptions: readonly AdminSponsorProviderOption[];
  surfaceOptions: readonly AdminSponsorPlacementSurfaceOption[];
}) {
  return (
    <Dialog defaultOpen={Boolean(props.feedback)}>
      <DialogTrigger asChild>
        <Button data-workflow-trigger="create-sponsor" type="button">
          Crear patrocinio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear patrocinio local</DialogTitle>
          <DialogDescription>
            Selecciona proveedor, superficie y fechas de vigencia.
          </DialogDescription>
        </DialogHeader>
        <SponsorPlacementForm
          action="create_sponsor_placement"
          feedback={props.feedback}
          formAction={props.formAction}
          idPrefix="create-sponsor-placement"
          providerOptions={props.providerOptions}
          surfaceOptions={props.surfaceOptions}
          submitLabel="Crear patrocinio"
        />
      </DialogContent>
    </Dialog>
  );
}

function EditSponsorPlacementWorkflow(props: {
  feedback?: AdminSponsorPlacementFeedback;
  formAction?: AdminSponsorPlacementFormAction;
  placement: AdminSponsorPlacementViewModel;
  providerOptions: readonly AdminSponsorProviderOption[];
  surfaceOptions: readonly AdminSponsorPlacementSurfaceOption[];
}) {
  return (
    <Dialog defaultOpen={Boolean(props.feedback)}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Editar patrocinio de ${props.placement.providerName}`}
          className="min-h-11"
          data-workflow-trigger="edit-sponsor"
          type="button"
          variant="outline"
        >
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar patrocinio</DialogTitle>
          <DialogDescription>
            Actualiza superficie, fechas, etiqueta y texto de patrocinio.
          </DialogDescription>
        </DialogHeader>
        <SponsorPlacementForm
          action="update_sponsor_placement"
          feedback={props.feedback}
          formAction={props.formAction}
          idPrefix={`edit-sponsor-placement-${props.placement.placementId}`}
          placement={props.placement}
          providerOptions={props.providerOptions}
          surfaceOptions={props.surfaceOptions}
          submitLabel="Guardar cambios"
        />
      </DialogContent>
    </Dialog>
  );
}

function DetachSponsorPlacementWorkflow(props: {
  feedback?: AdminSponsorPlacementFeedback;
  formAction?: AdminSponsorPlacementFormAction;
  placement: AdminSponsorPlacementViewModel;
}) {
  const [state, formAction] = useAdminSponsorPlacementAction(props.formAction);
  const feedback = state.feedback ?? props.feedback;

  return (
    <Dialog defaultOpen={Boolean(feedback)}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Retirar patrocinio de ${props.placement.providerName}`}
          className="min-h-11"
          data-workflow-trigger="detach-sponsor"
          type="button"
          variant="outline"
        >
          Retirar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirar patrocinio</DialogTitle>
          <DialogDescription>
            Esta acción separa el patrocinio del proveedor de recursos.
          </DialogDescription>
        </DialogHeader>
        <form
          action={props.formAction ? formAction : undefined}
          className="grid gap-4"
          method={props.formAction ? undefined : "post"}
        >
          <HiddenSponsorIdentityFields placement={props.placement} />
          <WorkflowErrorAlert feedback={feedback} />
          <Alert>
            <AlertTitle>Confirmación</AlertTitle>
            <AlertDescription>
              {props.placement.providerName}: {props.placement.surfaceLabel} no
              aparecerá en superficies de recursos.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <AdminSubmitButton
              data-submit-action="detach_sponsor_placement"
              name="sponsorAction"
              pendingLabel="Retirando patrocinio"
              value="detach_sponsor_placement"
              variant="destructive"
            >
              Retirar patrocinio
            </AdminSubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SponsorPlacementForm(props: {
  action: "create_sponsor_placement" | "update_sponsor_placement";
  feedback?: AdminSponsorPlacementFeedback;
  formAction?: AdminSponsorPlacementFormAction;
  idPrefix: string;
  placement?: AdminSponsorPlacementViewModel;
  providerOptions: readonly AdminSponsorProviderOption[];
  submitLabel: string;
  surfaceOptions: readonly AdminSponsorPlacementSurfaceOption[];
}) {
  const [state, formAction] = useAdminSponsorPlacementAction(props.formAction);
  const feedback = state.feedback ?? props.feedback;

  return (
    <form
      action={props.formAction ? formAction : undefined}
      className="grid gap-5"
      method={props.formAction ? undefined : "post"}
    >
      {props.placement ? (
        <HiddenSponsorIdentityFields placement={props.placement} />
      ) : null}
      <WorkflowErrorAlert feedback={feedback} />
      <SponsorPlacementFormFields
        feedback={feedback}
        idPrefix={props.idPrefix}
        placement={props.placement}
        providerOptions={props.providerOptions}
        surfaceOptions={props.surfaceOptions}
      />
      <DialogFooter>
        <AdminSubmitButton
          data-submit-action={props.action}
          name="sponsorAction"
          pendingLabel={
            props.action === "create_sponsor_placement"
              ? "Creando patrocinio"
              : "Guardando patrocinio"
          }
          value={props.action}
        >
          {props.submitLabel}
        </AdminSubmitButton>
      </DialogFooter>
    </form>
  );
}

function SponsorPlacementFormFields(props: {
  feedback?: AdminSponsorPlacementFeedback;
  idPrefix: string;
  placement?: AdminSponsorPlacementViewModel;
  providerOptions: readonly AdminSponsorProviderOption[];
  surfaceOptions: readonly AdminSponsorPlacementSurfaceOption[];
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend>Placement</FieldLegend>
      <FieldGroup className="gap-4">
        <SponsorProviderField
          error={getFieldError(props.feedback, "providerId")}
          feedback={props.feedback}
          id={`${props.idPrefix}-provider`}
          placement={props.placement}
          providerOptions={props.providerOptions}
        />
        <SelectField
          defaultValue={getSubmittedValue(
            props.feedback,
            "surface",
            props.placement?.surface ?? props.surfaceOptions[0]?.id,
          )}
          error={getFieldError(props.feedback, "surface")}
          id={`${props.idPrefix}-surface`}
          label="Superficie"
          name="surface"
          options={props.surfaceOptions}
        />
        <SponsorDateWindowFields
          feedback={props.feedback}
          idPrefix={props.idPrefix}
          placement={props.placement}
        />
        <TextField
          error={getFieldError(props.feedback, "label")}
          id={`${props.idPrefix}-label`}
          label="Etiqueta"
          name="label"
          required
          type="text"
          value={getSubmittedValue(
            props.feedback,
            "label",
            props.placement?.label ?? "Patrocinado",
          )}
        />
        <SponsorDisclosureField
          error={getFieldError(props.feedback, "disclosure")}
          feedback={props.feedback}
          id={`${props.idPrefix}-disclosure`}
          placement={props.placement}
        />
        <AdminSponsorPlacementMediaFields
          feedback={props.feedback}
          idPrefix={props.idPrefix}
          placement={props.placement}
        />
      </FieldGroup>
    </FieldSet>
  );
}

export function AdminSponsorPlacementMediaFields(props: {
  feedback?: AdminSponsorPlacementFeedback;
  idPrefix: string;
  placement?: AdminSponsorPlacementViewModel;
}) {
  const [imageRemoved, setImageRemoved] = React.useState(false);
  const [logoRemoved, setLogoRemoved] = React.useState(false);

  return (
    <FieldSet className="gap-3">
      <FieldLegend>Medios del patrocinio</FieldLegend>
      <FieldDescription>
        Carga medios administrados por Rastro. Usa URL externa solo como
        fallback avanzado.
      </FieldDescription>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminMediaUploadField
          assetFieldName="logoAssetId"
          currentUrl={props.placement?.logoUrl}
          description="Logo del patrocinio local."
          id={`${props.idPrefix}-logo-upload`}
          initialAssetId={getSubmittedValue(props.feedback, "logoAssetId")}
          label="Logo administrado"
          onRemovedChange={setLogoRemoved}
          previewAlt={`Logo de patrocinio de ${
            props.placement?.providerName ?? "patrocinio local"
          }`}
          purpose="sponsor_logo"
        />
        <AdminMediaUploadField
          assetFieldName="imageAssetId"
          currentUrl={props.placement?.imageUrl}
          description="Imagen o banner del patrocinio local."
          id={`${props.idPrefix}-image-upload`}
          initialAssetId={getSubmittedValue(props.feedback, "imageAssetId")}
          label="Imagen administrada"
          onRemovedChange={setImageRemoved}
          previewAlt={`Imagen de patrocinio de ${
            props.placement?.providerName ?? "patrocinio local"
          }`}
          purpose="sponsor_image"
        />
      </div>
      <AdvancedExternalMediaUrlFallback
        fields={[
          {
            error: getFieldError(props.feedback, "logoUrl"),
            hasSubmittedValue: hasSubmittedValue(props.feedback, "logoUrl"),
            id: `${props.idPrefix}-logo-url`,
            label: "Logo URL externa",
            name: "logoUrl",
            placeholder: "https://proveedor.example/logo-patrocinio.png",
            value: getSubmittedValue(
              props.feedback,
              "logoUrl",
              props.placement?.logoUrl,
            ),
          },
          {
            error: getFieldError(props.feedback, "imageUrl"),
            hasSubmittedValue: hasSubmittedValue(props.feedback, "imageUrl"),
            id: `${props.idPrefix}-image-url`,
            label: "Imagen URL externa",
            name: "imageUrl",
            placeholder: "https://proveedor.example/banner-patrocinio.png",
            value: getSubmittedValue(
              props.feedback,
              "imageUrl",
              props.placement?.imageUrl,
            ),
          },
        ]}
        id={`${props.idPrefix}-external-url-fallback`}
        removedFieldNames={[
          ...(logoRemoved ? ["logoUrl"] : []),
          ...(imageRemoved ? ["imageUrl"] : []),
        ]}
      />
      <SponsorMediaPreview
        imageUrl={getSubmittedValue(
          props.feedback,
          "imageUrl",
          props.placement?.imageUrl,
        )}
        logoUrl={getSubmittedValue(
          props.feedback,
          "logoUrl",
          props.placement?.logoUrl,
        )}
        providerName={props.placement?.providerName ?? "Patrocinio local"}
      />
    </FieldSet>
  );
}

function SponsorMediaPreview(props: {
  imageUrl?: string;
  logoUrl?: string;
  providerName: string;
}) {
  if (!props.logoUrl && !props.imageUrl) {
    return null;
  }

  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
      {props.logoUrl ? (
        <img
          alt={`Logo de patrocinio de ${props.providerName}`}
          className="border-border bg-muted h-16 w-16 rounded-md border object-cover"
          src={props.logoUrl}
        />
      ) : null}
      {props.imageUrl ? (
        <img
          alt={`Imagen de patrocinio de ${props.providerName}`}
          className={`border-border bg-muted h-24 w-full rounded-md border object-cover ${props.logoUrl ? "" : "sm:col-span-2"}`}
          src={props.imageUrl}
        />
      ) : null}
    </div>
  );
}

function SponsorProviderField(props: {
  error?: string;
  feedback?: AdminSponsorPlacementFeedback;
  id: string;
  placement?: AdminSponsorPlacementViewModel;
  providerOptions: readonly AdminSponsorProviderOption[];
}) {
  const errorId = `${props.id}-error`;

  return (
    <>
      <Field data-invalid={Boolean(props.error)}>
        <FieldLabel htmlFor={props.id}>Proveedor</FieldLabel>
        <Select
          defaultValue={getSubmittedValue(
            props.feedback,
            "providerId",
            props.placement?.providerId ?? props.providerOptions[0]?.id,
          )}
          name="providerId"
        >
          <SelectTrigger
            aria-describedby={props.error ? errorId : undefined}
            aria-invalid={Boolean(props.error)}
            className="w-full"
            id={props.id}
          >
            <SelectValue placeholder="Selecciona proveedor" />
          </SelectTrigger>
          <SelectContent>
            {props.providerOptions.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name} - {provider.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id={errorId}>{props.error}</FieldError>
      </Field>
      <input
        name="providerName"
        type="hidden"
        value={getSubmittedValue(
          props.feedback,
          "providerName",
          props.placement?.providerName ?? "",
        )}
      />
    </>
  );
}

function SponsorDateWindowFields(props: {
  feedback?: AdminSponsorPlacementFeedback;
  idPrefix: string;
  placement?: AdminSponsorPlacementViewModel;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        error={getFieldError(props.feedback, "startsOn")}
        id={`${props.idPrefix}-starts-on`}
        label="Fecha inicial"
        name="startsOn"
        required
        type="date"
        value={getSubmittedValue(
          props.feedback,
          "startsOn",
          props.placement?.startsOn,
        )}
      />
      <TextField
        error={getFieldError(props.feedback, "endsOn")}
        id={`${props.idPrefix}-ends-on`}
        label="Fecha final"
        name="endsOn"
        required
        type="date"
        value={getSubmittedValue(
          props.feedback,
          "endsOn",
          props.placement?.endsOn,
        )}
      />
    </div>
  );
}

function SponsorDisclosureField(props: {
  error?: string;
  feedback?: AdminSponsorPlacementFeedback;
  id: string;
  placement?: AdminSponsorPlacementViewModel;
}) {
  const errorId = `${props.id}-error`;

  return (
    <Field data-invalid={Boolean(props.error)}>
      <FieldLabel htmlFor={props.id}>Texto de patrocinio</FieldLabel>
      <Textarea
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={Boolean(props.error)}
        defaultValue={
          getSubmittedValue(
            props.feedback,
            "disclosure",
            props.placement?.disclosure ??
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
          ) ?? ""
        }
        id={props.id}
        name="disclosure"
        required
      />
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
  );
}

function HiddenSponsorIdentityFields(props: {
  placement: AdminSponsorPlacementViewModel;
}) {
  return (
    <>
      <input
        name="placementId"
        type="hidden"
        value={props.placement.placementId}
      />
      <input
        name="providerId"
        type="hidden"
        value={props.placement.providerId}
      />
      <input
        name="providerName"
        type="hidden"
        value={props.placement.providerName}
      />
    </>
  );
}

function SelectField(props: {
  defaultValue?: string;
  error?: string;
  id: string;
  label: string;
  name: string;
  options: readonly AdminSponsorPlacementSurfaceOption[];
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
          <SelectValue placeholder={props.label} />
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

function WorkflowErrorAlert(props: {
  feedback?: AdminSponsorPlacementFeedback;
}) {
  if (!props.feedback || props.feedback.ok) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>No se guardaron los cambios</AlertTitle>
      <AlertDescription>
        {props.feedback.formError ??
          "Corrige los campos marcados antes de guardar."}
      </AlertDescription>
    </Alert>
  );
}

function getFieldError(
  feedback: AdminSponsorPlacementFeedback | undefined,
  field: string,
) {
  return feedback?.fieldErrors.find((error) => error.field === field)?.message;
}

function useAdminSponsorPlacementAction(
  formAction: AdminSponsorPlacementFormAction | undefined,
) {
  const fallbackAction = React.useCallback<AdminSponsorPlacementFormAction>(
    () => Promise.resolve(emptyAdminSponsorPlacementActionState),
    [],
  );

  return React.useActionState(
    formAction ?? fallbackAction,
    emptyAdminSponsorPlacementActionState,
  );
}

function getSubmittedValue(
  feedback: AdminSponsorPlacementFeedback | undefined,
  key: string,
  fallback?: string,
) {
  if (!feedback?.submittedValues) {
    return fallback;
  }

  return Object.hasOwn(feedback.submittedValues, key)
    ? feedback.submittedValues[key]
    : fallback;
}

function hasSubmittedValue(
  feedback: AdminSponsorPlacementFeedback | undefined,
  key: string,
) {
  return Boolean(
    feedback?.submittedValues && Object.hasOwn(feedback.submittedValues, key),
  );
}

function AdminSponsorAccessDenied(props: {
  accessDenied: {
    body: string;
    title: string;
  };
  viewer: AdminSponsorPlacementViewer;
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <Card className="rounded-lg">
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            Acceso restringido
          </Badge>
          <CardTitle className="text-2xl tracking-normal">
            {props.accessDenied.title}
          </CardTitle>
          <CardDescription>{props.accessDenied.body}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Sesión actual</AlertTitle>
            <AlertDescription>{props.viewer.displayName}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}
