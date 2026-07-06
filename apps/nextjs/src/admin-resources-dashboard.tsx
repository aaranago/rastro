"use client";

import type { Control, FieldPath, UseFormRegister } from "react-hook-form";
import * as React from "react";
import NextImage from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod/v4";

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
  AdminResourceProviderActionState,
  AdminResourceProviderFormAction,
  AdminResourceProviderMutationNotice,
  AdminResourceProviderWorkflow,
  AdminResourceProviderWorkflowFeedback,
} from "./admin-resource-provider-actions";
import type {
  AdminLocalSponsorPlacementSurface,
  AdminResourceMetricsViewModel,
  AdminResourceProviderCategory,
  AdminResourceProviderContactKind,
  AdminResourceProviderListStateViewModel,
  AdminResourceProviderVerificationStatus,
  AdminResourceProviderViewModel,
  LocalSponsorPlacementViewModel,
} from "./admin-resource-provider-admin-model";
import type { AdminDataListColumn } from "./admin-ui/admin-data-list";
import { AdminMediaUploadField } from "./admin-media-upload-field";
import {
  localSponsorPlacementSurfaceOptions,
  resourceProviderCategoryOptions,
  resourceProviderContactKindOptions,
} from "./admin-resource-provider-admin-model";
import {
  adminResourceProviderMaxContactOptions,
  adminResourceProviderMaxLinks,
} from "./admin-resource-provider-form-parser";
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
  formAction?: AdminResourceProviderFormAction;
  list: AdminResourceProviderListStateViewModel;
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

interface ProviderContactArrayFormValues {
  contactOptions: ProviderContactFormRow[];
}

interface ProviderContactFormRow {
  kind: AdminResourceProviderContactKind;
  label: string;
  value: string;
}

interface ProviderLinksArrayFormValues {
  externalLinks: ProviderLinkFormRow[];
  socialLinks: ProviderLinkFormRow[];
}

interface ProviderLinkFormRow {
  label: string;
  url: string;
}

type ProviderLinkArrayName = keyof ProviderLinksArrayFormValues;

const verificationStatusLabels = {
  unverified: "Sin insignia",
  verified: "Identidad verificada",
} as const satisfies Record<AdminResourceProviderVerificationStatus, string>;

const emptyAdminResourceProviderActionState: AdminResourceProviderActionState =
  {};
const providerWorkflowSheetClassName =
  "w-full overflow-x-hidden overflow-y-auto sm:max-w-3xl";
const providerWorkflowTriggerClassName =
  "h-auto min-h-8 w-full justify-start whitespace-normal text-left";

const providerContactArraySchema = z.object({
  contactOptions: z.array(
    z.object({
      kind: z.enum([
        "phone",
        "whatsapp",
        "website",
        "email",
        "directions",
        "social",
      ]),
      label: z.string(),
      value: z.string(),
    }),
  ),
});

const providerLinksArraySchema = z.object({
  externalLinks: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
    }),
  ),
  socialLinks: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
    }),
  ),
});

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
    <div className="min-w-0 [&_*]:box-border">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <AdminResourcesHeader title={props.title} viewer={props.viewer} />
        {props.notice ? <AdminResourcesNotice notice={props.notice} /> : null}
        <AdminResourcesSummary stats={stats} />

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex w-full max-w-full min-w-0 flex-col gap-6">
            <ProviderQueue
              createActionLabel={props.createActionLabel}
              formAction={props.formAction}
              list={props.list}
              providers={props.providers}
              workflowFeedback={props.workflowFeedback}
            />
          </section>

          <aside className="flex w-full max-w-full min-w-0 flex-col gap-6">
            <ProviderMetrics metrics={props.metrics} />
          </aside>
        </div>
      </div>
    </div>
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
  formAction?: AdminResourceProviderFormAction;
  list: AdminResourceProviderListStateViewModel;
  providers: readonly AdminResourceProviderViewModel[];
  workflowFeedback?: AdminResourceProviderWorkflowFeedback;
}) {
  const providerCountLabel =
    props.list.total === 1 ? "1 proveedor" : `${props.list.total} proveedores`;
  const createFeedback = getWorkflowFeedback(props.workflowFeedback, "create");
  const columns = getProviderColumns(props.list);

  return (
    <AdminDataList
      actions={
        <CreateProviderWorkflow
          actionLabel={props.createActionLabel}
          feedback={createFeedback}
          formAction={props.formAction}
        />
      }
      activeFilters={buildAdminListActiveFilters({
        availableFilters: props.list.availableFilters,
        basePath: "/admin/proveedores",
        listInput: props.list.input,
      })}
      columns={columns}
      description="Revisa proveedor, categoría, ciudad, verificación, patrocinio, operación y última actualización antes de abrir una acción."
      emptyState={{
        description:
          "La cola está lista para el primer proveedor. Abre Registrar proveedor cuando tengas datos reales para publicar en el directorio.",
        title: "Todavía no hay proveedores registrados.",
      }}
      filterBar={<ProviderFilterBar list={props.list} />}
      filteredEmptyState={{
        description:
          "Ajusta la búsqueda o retira filtros para ver otros proveedores de Bolivia.",
        title: "No hay proveedores para estos filtros.",
      }}
      getRowKey={(provider) => provider.providerId}
      id="provider-queue"
      pagination={{
        hrefForPage: (page) =>
          buildAdminListPageHref({
            basePath: "/admin/proveedores",
            listInput: props.list.input,
            page,
          }),
        page: props.list.page,
        pageSize: props.list.pageSize,
        totalItems: props.list.total,
      }}
      renderMobileCard={(provider) => (
        <ProviderQueueMobileCard
          formAction={props.formAction}
          provider={provider}
          workflowFeedback={props.workflowFeedback}
        />
      )}
      rowActions={{
        className: "w-[220px] min-w-[220px]",
        header: "Acciones",
        render: (provider) => (
          <ProviderActionWorkflowList
            formAction={props.formAction}
            provider={provider}
            workflowFeedback={props.workflowFeedback}
          />
        ),
      }}
      rows={props.providers}
      tableCaption="Cola administrativa de proveedores de recursos"
      title="Cola de proveedores"
      totalLabel={providerCountLabel}
    />
  );
}

function getProviderColumns(
  list: AdminResourceProviderListStateViewModel,
): readonly AdminDataListColumn<AdminResourceProviderViewModel>[] {
  return [
    {
      cell: (provider) => <ProviderIdentityCell provider={provider} />,
      header: "Proveedor",
      id: "provider",
      mobileLabel: "Proveedor",
      rowHeader: true,
      sort: getProviderSort(list, "name"),
    },
    {
      cell: (provider) => <ProviderLocationCell provider={provider} />,
      header: "Ciudad",
      id: "location",
      mobileLabel: "Ciudad",
      sort: getProviderSort(list, "city"),
    },
    {
      cell: (provider) => (
        <div className="flex flex-col gap-2">
          <IdentityPill status={provider.verificationBadge.status} />
          <span className="text-muted-foreground text-xs">
            {provider.verificationBadge.note}
          </span>
        </div>
      ),
      header: "Verificación",
      id: "verification",
      mobileLabel: "Verificación",
      sort: getProviderSort(list, "verification"),
    },
    {
      cell: (provider) => <ProviderOperationsCell provider={provider} />,
      header: "Operación",
      id: "operations",
      mobileLabel: "Operación",
      sort: getProviderSort(list, "sponsorState"),
    },
    {
      cell: (provider) => (
        <span className="text-sm font-medium">{provider.lastUpdatedLabel}</span>
      ),
      header: "Actualización",
      id: "updatedAt",
      mobileLabel: "Actualización",
      sort: getProviderSort(list, "updatedAt"),
    },
  ] satisfies readonly AdminDataListColumn<AdminResourceProviderViewModel>[];
}

function getProviderSort(
  list: AdminResourceProviderListStateViewModel,
  sortBy: NonNullable<
    AdminResourceProviderListStateViewModel["input"]["sortBy"]
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
      basePath: "/admin/proveedores",
      defaultDirection: sort?.defaultDirection ?? "asc",
      listInput: list.input,
      sortBy,
    }),
    label: sort?.label ?? sortBy,
  };
}

function ProviderFilterBar(props: {
  list: AdminResourceProviderListStateViewModel;
}) {
  const filters = props.list.input.filters ?? {};

  return (
    <form action="/admin/proveedores" className="grid min-w-0 gap-3">
      <input name="pageSize" type="hidden" value={props.list.pageSize} />
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(180px,1.4fr)_repeat(4,minmax(130px,1fr))]">
        <Field>
          <FieldLabel htmlFor="provider-search">Buscar proveedor</FieldLabel>
          <Input
            defaultValue={props.list.input.search ?? ""}
            id="provider-search"
            maxLength={160}
            name="search"
            placeholder="San Roque, La Paz"
            type="search"
          />
        </Field>
        <NativeSelectField
          id="provider-category"
          label="Categoría"
          name="category"
          options={resourceProviderCategoryOptions}
          value={getArrayFilterValue(filters.category)}
        />
        <TextField
          id="provider-city-filter"
          label="Ciudad"
          name="city"
          placeholder="La Paz"
          type="text"
          value={filters.city}
        />
        <TextField
          id="provider-department-filter"
          label="Departamento"
          name="department"
          placeholder="La Paz"
          type="text"
          value={filters.department}
        />
        <NativeSelectField
          id="provider-verification"
          label="Verificación"
          name="verification"
          options={[
            { id: "verified", label: "Identidad verificada" },
            { id: "unverified", label: "Sin insignia" },
          ]}
          value={getArrayFilterValue(filters.verification)}
        />
      </div>
      <div className="grid min-w-0 gap-3 xl:grid-cols-[repeat(5,minmax(130px,1fr))_auto]">
        <NativeSelectField
          id="provider-sponsor-state"
          label="Patrocinio"
          name="sponsorState"
          options={[
            { id: "active", label: "Activo" },
            { id: "inactive", label: "Inactivo" },
            { id: "none", label: "Sin patrocinio" },
          ]}
          value={
            filters.sponsorState === "any" ? undefined : filters.sponsorState
          }
        />
        <NativeSelectField
          id="provider-sponsor-surface"
          label="Superficie"
          name="sponsorSurface"
          options={localSponsorPlacementSurfaceOptions}
          value={getArrayFilterValue(filters.sponsorSurface)}
        />
        <TextField
          id="provider-active-on"
          label="Activo en fecha"
          name="activeOn"
          type="date"
          value={filters.activeOn}
        />
        <AdminListFilterSubmitControls
          mediaState={filters.mediaState}
          mediaStateId="provider-media-state"
          sortBy={props.list.input.sortBy}
          sortDirection={props.list.input.sortDirection}
        />
      </div>
    </form>
  );
}

function ProviderQueueMobileCard(props: {
  formAction?: AdminResourceProviderFormAction;
  provider: AdminResourceProviderViewModel;
  workflowFeedback?: AdminResourceProviderWorkflowFeedback;
}) {
  const provider = props.provider;
  const activeSponsorCount = provider.activeSponsorPlacement ? 1 : 0;

  return (
    <article
      className="border-border bg-background rounded-lg border p-4"
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
                label={provider.isOpenNow ? "Abierto" : "Horario no confirmado"}
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

function ProviderIdentityCell(props: {
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h3 className="text-base font-semibold break-words">{provider.name}</h3>
      <span className="text-primary text-xs font-semibold">
        {provider.categoryLabel}
      </span>
      <span className="text-muted-foreground text-xs break-words">
        {provider.contactLabel}
      </span>
      <span className="text-muted-foreground text-xs break-all">
        ID: {provider.providerId}
      </span>
    </div>
  );
}

function ProviderLocationCell(props: {
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;

  return (
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
  );
}

function ProviderOperationsCell(props: {
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;
  const activeSponsorCount = provider.activeSponsorPlacement ? 1 : 0;

  return (
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
        label={provider.isOpenNow ? "Abierto" : "Horario no confirmado"}
        tone={provider.isOpenNow ? "primary" : "muted"}
      />
      <StatusChip
        label={provider.emergencyAvailable ? "Urgencias" : "Sin urgencias"}
        tone={provider.emergencyAvailable ? "primary" : "muted"}
      />
    </div>
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
  formAction?: AdminResourceProviderFormAction;
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
    <div className="grid min-w-0 gap-2">
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
  formAction?: AdminResourceProviderFormAction;
}) {
  const [state, formAction] = useAdminResourceProviderAction(props.formAction);
  const feedback = state.feedback ?? props.feedback;

  return (
    <Sheet defaultOpen={Boolean(feedback)}>
      <SheetTrigger asChild>
        <Button data-workflow-trigger="create" type="button">
          {props.actionLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby="create-provider-description"
        className={providerWorkflowSheetClassName}
      >
        <SheetHeader>
          <SheetTitle>Registrar proveedor</SheetTitle>
          <SheetDescription id="create-provider-description">
            Completa el perfil que verá el directorio público de recursos.
          </SheetDescription>
        </SheetHeader>
        <form
          action={props.formAction ? formAction : undefined}
          className="flex flex-1 flex-col gap-6 px-4 pb-4"
          method={props.formAction ? undefined : "post"}
        >
          <WorkflowErrorAlert feedback={feedback} />
          <ProviderProfileFields
            feedback={feedback}
            idPrefix="create-provider"
            mode="create"
          />
          <ProviderLocationFields
            feedback={feedback}
            idPrefix="create-provider"
            mode="create"
          />
          <ProviderContactFields
            feedback={feedback}
            idPrefix="create-provider"
            mode="create"
          />
          <ProviderMediaFields feedback={feedback} idPrefix="create-provider" />
          <ProviderBooleanFields
            feedback={feedback}
            idPrefix="create-provider"
          />
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
  formAction?: AdminResourceProviderFormAction;
  provider: AdminResourceProviderViewModel;
}) {
  const [state, formAction] = useAdminResourceProviderAction(props.formAction);
  const feedback = state.feedback ?? props.feedback;

  return (
    <Sheet defaultOpen={Boolean(feedback)}>
      <SheetTrigger asChild>
        <Button
          className={providerWorkflowTriggerClassName}
          data-workflow-trigger="edit"
          type="button"
          variant="outline"
        >
          Editar detalles
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby={`edit-provider-description-${props.provider.providerId}`}
        className={providerWorkflowSheetClassName}
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
          action={props.formAction ? formAction : undefined}
          aria-label={`Editar detalles de ${props.provider.name}`}
          className="flex flex-1 flex-col gap-6 px-4 pb-4"
          method={props.formAction ? undefined : "post"}
        >
          <ProviderIdentityHiddenFields provider={props.provider} />
          <WorkflowErrorAlert feedback={feedback} />
          <ProviderProfileFields
            feedback={feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            mode="edit"
            provider={props.provider}
          />
          <ProviderLocationFields
            feedback={feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            mode="edit"
            provider={props.provider}
          />
          <ProviderContactFields
            feedback={feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            mode="edit"
            provider={props.provider}
          />
          <ProviderMediaFields
            feedback={feedback}
            idPrefix={`edit-provider-${props.provider.providerId}`}
            provider={props.provider}
          />
          <ProviderBooleanFields
            feedback={feedback}
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
          value={getSubmittedValue(
            props.feedback,
            "name",
            props.provider?.name,
          )}
        />
        <SelectField
          defaultValue={parseResourceProviderCategory(
            getSubmittedValue(props.feedback, "category"),
            props.provider?.category ?? "veterinary",
          )}
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
          value={getSubmittedValue(
            props.feedback,
            "description",
            props.provider?.description,
          )}
        />
        <TextAreaField
          error={getFieldError(props.feedback, "shortDescription")}
          id={`${props.idPrefix}-short-description`}
          label="Resumen corto"
          name="shortDescription"
          placeholder="Clínica local con atención general y urgencias."
          required
          value={getSubmittedValue(
            props.feedback,
            "shortDescription",
            props.provider?.shortDescription,
          )}
        />
        <TextField
          error={getFieldError(props.feedback, "serviceAreaLabel")}
          id={`${props.idPrefix}-service-area`}
          label="Cobertura"
          name="serviceAreaLabel"
          placeholder="El Alto y La Paz"
          required
          type="text"
          value={getSubmittedValue(
            props.feedback,
            "serviceAreaLabel",
            props.provider?.serviceAreaLabel,
          )}
        />
        <TextField
          error={getFieldError(props.feedback, "hoursLabel")}
          id={`${props.idPrefix}-hours`}
          label="Horarios"
          name="hoursLabel"
          placeholder="Lun - Sab: 08:00 a 18:00"
          required
          type="text"
          value={getSubmittedValue(
            props.feedback,
            "hoursLabel",
            props.provider?.hoursLabel,
          )}
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
            value={getSubmittedValue(
              props.feedback,
              "department",
              props.provider?.department,
            )}
          />
          <TextField
            error={getFieldError(props.feedback, "city")}
            id={`${props.idPrefix}-city`}
            label="Ciudad"
            name="city"
            placeholder="El Alto"
            required
            type="text"
            value={getSubmittedValue(
              props.feedback,
              "city",
              props.provider?.city,
            )}
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
            value={getSubmittedValue(props.feedback, "exactLatitude")}
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
            value={getSubmittedValue(props.feedback, "exactLongitude")}
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
          value={getSubmittedValue(
            props.feedback,
            "approximateLocationLabel",
            props.provider?.approximateLocationLabel,
          )}
        />
        <TextField
          error={getFieldError(props.feedback, "locationCell")}
          id={`${props.idPrefix}-location-cell`}
          label="Celda de ubicación"
          name="locationCell"
          placeholder="bo-lpb-sopocachi"
          required
          type="text"
          value={getSubmittedValue(
            props.feedback,
            "locationCell",
            props.provider?.locationCell,
          )}
        />
        <TextField
          error={getFieldError(props.feedback, "addressLabel")}
          id={`${props.idPrefix}-address`}
          label="Dirección interna"
          name="addressLabel"
          placeholder="Zona Sopocachi, La Paz"
          type="text"
          value={getSubmittedValue(
            props.feedback,
            "addressLabel",
            props.provider?.addressLabel,
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
}

export function ProviderContactFields(props: {
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

export function ProviderMediaFields(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  provider?: AdminResourceProviderViewModel;
}) {
  const [logoRemoved, setLogoRemoved] = React.useState(false);
  const [photoRemoved, setPhotoRemoved] = React.useState(false);

  return (
    <FieldSet className="gap-4">
      <FieldLegend>Medios opcionales</FieldLegend>
      <FieldDescription>
        Carga medios administrados por Rastro. Usa URL externa solo como
        fallback avanzado.
      </FieldDescription>
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminMediaUploadField
            assetFieldName="logoAssetId"
            currentUrl={props.provider?.logoUrl}
            description="Logo cuadrado o compacto del proveedor."
            id={`${props.idPrefix}-logo-upload`}
            initialAssetId={getSubmittedValue(props.feedback, "logoAssetId")}
            label="Logo administrado"
            onRemovedChange={setLogoRemoved}
            previewAlt={`Logo de ${props.provider?.name ?? "proveedor local"}`}
            purpose="provider_logo"
          />
          <AdminMediaUploadField
            assetFieldName="photoAssetId"
            currentUrl={props.provider?.photoUrl}
            description="Foto principal del local o equipo."
            id={`${props.idPrefix}-photo-upload`}
            initialAssetId={getSubmittedValue(props.feedback, "photoAssetId")}
            label="Foto administrada"
            onRemovedChange={setPhotoRemoved}
            previewAlt={`Foto de ${props.provider?.name ?? "proveedor local"}`}
            purpose="provider_photo"
          />
        </div>
        <TextField
          error={getFieldError(props.feedback, "websiteUrl")}
          id={`${props.idPrefix}-website`}
          label="Sitio web"
          name="websiteUrl"
          placeholder="https://proveedor.example"
          type="url"
          value={getSubmittedValue(
            props.feedback,
            "websiteUrl",
            props.provider?.websiteUrl,
          )}
        />
        <AdvancedExternalMediaUrlFallback
          fields={[
            {
              error: getFieldError(props.feedback, "logoUrl"),
              hasSubmittedValue: hasSubmittedValue(props.feedback, "logoUrl"),
              id: `${props.idPrefix}-logo`,
              label: "Logo URL externa",
              name: "logoUrl",
              placeholder: "https://proveedor.example/logo.png",
              value: getSubmittedValue(
                props.feedback,
                "logoUrl",
                props.provider?.logoUrl,
              ),
            },
            {
              error: getFieldError(props.feedback, "photoUrl"),
              hasSubmittedValue: hasSubmittedValue(props.feedback, "photoUrl"),
              id: `${props.idPrefix}-photo`,
              label: "Foto URL externa",
              name: "photoUrl",
              placeholder: "https://proveedor.example/foto.png",
              value: getSubmittedValue(
                props.feedback,
                "photoUrl",
                props.provider?.photoUrl,
              ),
            },
          ]}
          id={`${props.idPrefix}-external-url-fallback`}
          removedFieldNames={[
            ...(logoRemoved ? ["logoUrl"] : []),
            ...(photoRemoved ? ["photoUrl"] : []),
          ]}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function ProviderBooleanFields(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  provider?: AdminResourceProviderViewModel;
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend>Operación</FieldLegend>
      <FieldGroup className="gap-3">
        <CheckboxField
          defaultChecked={getSubmittedBooleanValue(
            props.feedback,
            "emergencyAvailable",
            props.provider?.emergencyAvailable,
          )}
          id={`${props.idPrefix}-emergency`}
          label="Atiende urgencias"
          name="emergencyAvailable"
        />
        <CheckboxField
          defaultChecked={getSubmittedBooleanValue(
            props.feedback,
            "isOpenNow",
            props.provider?.isOpenNow,
          )}
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
  const defaultValues = React.useMemo(
    () => ({
      contactOptions: getContactDefaultRows({
        contactOptions: props.contactOptions,
        feedback: props.feedback,
        firstRowRequired: props.firstRowRequired,
      }),
    }),
    [props.contactOptions, props.feedback, props.firstRowRequired],
  );
  const form = useForm<ProviderContactArrayFormValues>({
    defaultValues,
    resolver: zodResolver(providerContactArraySchema),
    values: defaultValues,
  });
  const { append, fields, move, remove } = useFieldArray({
    control: form.control,
    name: "contactOptions",
  });
  const groupError = getFieldError(props.feedback, "contactOptions");

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">Opciones de contacto</FieldLegend>
      <div className="grid gap-3" data-field-array="contactOptions">
        {fields.map((field, index) => {
          const rowNumber = index + 1;
          const rowIsRequired = props.firstRowRequired && index === 0;

          return (
            <div
              className="grid gap-3 rounded-md border border-dashed p-3 sm:grid-cols-[minmax(130px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              data-field-array-row="contactOptions"
              key={field.id}
            >
              <ContactKindField
                control={form.control}
                error={getContactRowError(props.feedback, index, "kind")}
                id={`${props.idPrefix}-contact-kind-${index}`}
                index={index}
              />
              <ArrayTextField
                error={getContactRowError(props.feedback, index, "label")}
                id={`${props.idPrefix}-contact-label-${index}`}
                label="Etiqueta"
                name={`contactOptions.${index}.label`}
                register={form.register}
                required={rowIsRequired}
                value={field.label}
              />
              <ArrayTextField
                error={getContactRowError(props.feedback, index, "value")}
                id={`${props.idPrefix}-contact-value-${index}`}
                label="Valor"
                name={`contactOptions.${index}.value`}
                register={form.register}
                required={rowIsRequired}
                value={field.value}
              />
              <FieldArrayRowControls
                canMoveDown={index < fields.length - 1}
                canMoveUp={index > 0}
                onMoveDown={() => move(index, index + 1)}
                onMoveUp={() => move(index, index - 1)}
                onRemove={() => remove(index)}
                rowLabel={`contacto ${rowNumber}`}
              />
            </div>
          );
        })}
      </div>
      <Button
        className="w-fit"
        data-field-array-add="contactOptions"
        disabled={fields.length >= adminResourceProviderMaxContactOptions}
        onClick={() =>
          append({
            kind: "whatsapp",
            label: fields.length === 0 ? "WhatsApp institucional" : "",
            value: "",
          })
        }
        type="button"
        variant="outline"
      >
        <PlusIcon className="size-4" />
        Añadir contacto
      </Button>
      <FieldError>{groupError}</FieldError>
    </FieldSet>
  );
}

export function LinkFields(props: {
  externalLinks?: AdminResourceProviderViewModel["externalLinks"];
  feedback?: AdminResourceProviderWorkflowFeedback;
  idPrefix: string;
  socialLinks?: AdminResourceProviderViewModel["socialLinks"];
}) {
  const defaultValues = React.useMemo(
    () => ({
      externalLinks: getLinkDefaultRows({
        feedback: props.feedback,
        fieldArrayName: "externalLinks",
        links: props.externalLinks,
      }),
      socialLinks: getLinkDefaultRows({
        feedback: props.feedback,
        fieldArrayName: "socialLinks",
        links: props.socialLinks,
      }),
    }),
    [props.externalLinks, props.feedback, props.socialLinks],
  );
  const form = useForm<ProviderLinksArrayFormValues>({
    defaultValues,
    resolver: zodResolver(providerLinksArraySchema),
    values: defaultValues,
  });

  return (
    <div className="grid gap-5">
      <LinkGroupFields
        control={form.control}
        feedback={props.feedback}
        fieldArrayName="socialLinks"
        legacyFieldPrefix="socialLink"
        idPrefix={props.idPrefix}
        register={form.register}
        title="Redes sociales"
      />
      <LinkGroupFields
        control={form.control}
        feedback={props.feedback}
        fieldArrayName="externalLinks"
        legacyFieldPrefix="externalLink"
        idPrefix={props.idPrefix}
        register={form.register}
        title="Enlaces externos"
      />
    </div>
  );
}

function LinkGroupFields(props: {
  control: Control<ProviderLinksArrayFormValues>;
  feedback?: AdminResourceProviderWorkflowFeedback;
  fieldArrayName: ProviderLinkArrayName;
  legacyFieldPrefix: "externalLink" | "socialLink";
  idPrefix: string;
  register: UseFormRegister<ProviderLinksArrayFormValues>;
  title: string;
}) {
  const { append, fields, move, remove } = useFieldArray({
    control: props.control,
    name: props.fieldArrayName,
  });
  const addLabel =
    props.fieldArrayName === "socialLinks"
      ? "Añadir red social"
      : "Añadir enlace externo";

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{props.title}</FieldLegend>
      <div className="grid gap-3" data-field-array={props.fieldArrayName}>
        {fields.map((field, index) => {
          const rowNumber = index + 1;

          return (
            <div
              className="grid gap-3 rounded-md border border-dashed p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              data-field-array-row={props.fieldArrayName}
              key={field.id}
            >
              <ArrayTextField
                error={getLinkRowError(
                  props.feedback,
                  props.fieldArrayName,
                  props.legacyFieldPrefix,
                  index,
                  "label",
                )}
                id={`${props.idPrefix}-${props.fieldArrayName}-label-${index}`}
                label="Etiqueta"
                name={`${props.fieldArrayName}.${index}.label`}
                register={props.register}
                value={field.label}
              />
              <ArrayTextField
                error={getLinkRowError(
                  props.feedback,
                  props.fieldArrayName,
                  props.legacyFieldPrefix,
                  index,
                  "url",
                )}
                id={`${props.idPrefix}-${props.fieldArrayName}-url-${index}`}
                label="URL"
                name={`${props.fieldArrayName}.${index}.url`}
                register={props.register}
                type="url"
                value={field.url}
              />
              <FieldArrayRowControls
                canMoveDown={index < fields.length - 1}
                canMoveUp={index > 0}
                onMoveDown={() => move(index, index + 1)}
                onMoveUp={() => move(index, index - 1)}
                onRemove={() => remove(index)}
                rowLabel={`${props.title.toLowerCase()} ${rowNumber}`}
              />
            </div>
          );
        })}
      </div>
      <Button
        className="w-fit"
        data-field-array-add={props.fieldArrayName}
        disabled={fields.length >= adminResourceProviderMaxLinks}
        onClick={() => append({ label: "", url: "" })}
        type="button"
        variant="outline"
      >
        <PlusIcon className="size-4" />
        {addLabel}
      </Button>
    </FieldSet>
  );
}

function ContactKindField(props: {
  control: Control<ProviderContactArrayFormValues>;
  error?: string;
  id: string;
  index: number;
}) {
  const errorId = `${props.id}-error`;

  return (
    <Field data-invalid={Boolean(props.error)}>
      <FieldLabel htmlFor={props.id}>Tipo</FieldLabel>
      <Controller
        control={props.control}
        name={`contactOptions.${props.index}.kind`}
        render={({ field }) => (
          <Select
            name={field.name}
            onValueChange={field.onChange}
            value={field.value}
          >
            <SelectTrigger
              aria-describedby={props.error ? errorId : undefined}
              aria-invalid={Boolean(props.error)}
              className="w-full"
              id={props.id}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resourceProviderContactKindOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
  );
}

function ArrayTextField<
  TValues extends ProviderContactArrayFormValues | ProviderLinksArrayFormValues,
>(props: {
  error?: string;
  id: string;
  label: string;
  name: FieldPath<TValues>;
  register: UseFormRegister<TValues>;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  value?: string;
}) {
  const errorId = `${props.id}-error`;

  return (
    <Field data-invalid={Boolean(props.error)}>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <Input
        {...props.register(props.name)}
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={Boolean(props.error)}
        defaultValue={props.value ?? ""}
        id={props.id}
        required={props.required}
        type={props.type ?? "text"}
      />
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
  );
}

function FieldArrayRowControls(props: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  rowLabel: string;
}) {
  return (
    <div className="flex items-end gap-2 sm:justify-end">
      <Button
        aria-label={`Subir ${props.rowLabel}`}
        data-field-array-move="up"
        disabled={!props.canMoveUp}
        onClick={props.onMoveUp}
        size="icon"
        title={`Subir ${props.rowLabel}`}
        type="button"
        variant="outline"
      >
        <ArrowUpIcon className="size-4" />
      </Button>
      <Button
        aria-label={`Bajar ${props.rowLabel}`}
        data-field-array-move="down"
        disabled={!props.canMoveDown}
        onClick={props.onMoveDown}
        size="icon"
        title={`Bajar ${props.rowLabel}`}
        type="button"
        variant="outline"
      >
        <ArrowDownIcon className="size-4" />
      </Button>
      <Button
        aria-label={`Quitar ${props.rowLabel}`}
        data-field-array-remove
        onClick={props.onRemove}
        size="icon"
        title={`Quitar ${props.rowLabel}`}
        type="button"
        variant="outline"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}

function VerificationProviderWorkflow(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: AdminResourceProviderFormAction;
  provider: AdminResourceProviderViewModel;
}) {
  const provider = props.provider;
  const [state, formAction] = useAdminResourceProviderAction(props.formAction);
  const feedback = state.feedback ?? props.feedback;

  return (
    <Dialog defaultOpen={Boolean(feedback)}>
      <DialogTrigger asChild>
        <Button
          className={providerWorkflowTriggerClassName}
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
          action={props.formAction ? formAction : undefined}
          aria-label={`Gestionar identidad de ${provider.name}`}
          className="grid gap-4"
          method={props.formAction ? undefined : "post"}
        >
          <ProviderIdentityHiddenFields provider={provider} />
          <WorkflowErrorAlert feedback={feedback} />
          <div className="flex items-center gap-2">
            <IdentityPill status={provider.verificationBadge.status} />
            <span className="text-muted-foreground text-xs">
              {provider.verificationBadge.label}
            </span>
          </div>
          <SelectField
            defaultValue={parseVerificationStatus(
              getSubmittedValue(feedback, "verificationStatus"),
              provider.verificationBadge.status,
            )}
            error={getFieldError(feedback, "verificationStatus")}
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
            error={getFieldError(feedback, "verificationNote")}
            id={`verification-note-${provider.providerId}`}
            label="Nota interna"
            name="verificationNote"
            value={getSubmittedValue(
              feedback,
              "verificationNote",
              provider.verificationBadge.note,
            )}
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
  formAction?: AdminResourceProviderFormAction;
  provider: AdminResourceProviderViewModel;
}) {
  return (
    <Sheet defaultOpen={Boolean(props.feedback)}>
      <SheetTrigger asChild>
        <Button
          className={providerWorkflowTriggerClassName}
          data-workflow-trigger="sponsor"
          type="button"
          variant="outline"
        >
          Patrocinio
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby={`sponsor-description-${props.provider.providerId}`}
        className="w-full overflow-x-hidden overflow-y-auto sm:max-w-2xl"
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
  formAction?: AdminResourceProviderFormAction;
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
          <SponsorPlacementListItem
            formAction={props.formAction}
            key={placement.placementId}
            placement={placement}
            provider={props.provider}
          />
        ))}
      </ul>
    </section>
  );
}

function SponsorPlacementListItem(props: {
  formAction?: AdminResourceProviderFormAction;
  placement: LocalSponsorPlacementViewModel;
  provider: AdminResourceProviderViewModel;
}) {
  const [state, formAction] = useAdminResourceProviderAction(props.formAction);

  return (
    <li className="border-border rounded-md border p-3">
      <div className="flex flex-col gap-1">
        <span className="text-primary text-xs font-semibold">
          {props.placement.disclosureLabel}
        </span>
        <span className="font-medium">{props.placement.surfaceLabel}</span>
        <SponsorMediaPreview
          imageUrl={props.placement.imageUrl}
          logoUrl={props.placement.logoUrl}
          providerName={props.provider.name}
        />
        <span className="text-muted-foreground text-xs">
          {props.placement.startsOn ?? "Inicio no expuesto"} a{" "}
          {props.placement.endsOn ?? "fin no expuesto"}
        </span>
        <span className="text-muted-foreground text-xs">
          {props.placement.safetyPolicy.recoveryPriority.note}
        </span>
        <span className="text-muted-foreground text-xs">
          {props.placement.safetyPolicy.pushNotifications.note}
        </span>
      </div>
      {props.placement.placementId ? (
        <form
          action={props.formAction ? formAction : undefined}
          aria-label={`Retirar patrocinio local de ${props.provider.name}`}
          className="mt-3 grid gap-3"
          method={props.formAction ? undefined : "post"}
        >
          <ProviderIdentityHiddenFields provider={props.provider} />
          <WorkflowErrorAlert feedback={state.feedback} />
          <input
            name="placementId"
            type="hidden"
            value={props.placement.placementId}
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
          Este patrocinio no expone un identificador para retiro desde el panel.
        </p>
      )}
    </li>
  );
}

function AttachSponsorForm(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: AdminResourceProviderFormAction;
  provider: AdminResourceProviderViewModel;
}) {
  const [state, formAction] = useAdminResourceProviderAction(props.formAction);
  const [imageRemoved, setImageRemoved] = React.useState(false);
  const [logoRemoved, setLogoRemoved] = React.useState(false);
  const feedback = state.feedback ?? props.feedback;

  return (
    <form
      action={props.formAction ? formAction : undefined}
      aria-label={`Adjuntar patrocinio local a ${props.provider.name}`}
      className="grid gap-4"
      method={props.formAction ? undefined : "post"}
    >
      <ProviderIdentityHiddenFields provider={props.provider} />
      <WorkflowErrorAlert feedback={feedback} />
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
          <SponsorMediaPreview
            imageUrl={props.provider.activeSponsorPlacement.imageUrl}
            logoUrl={props.provider.activeSponsorPlacement.logoUrl}
            providerName={props.provider.name}
          />
        </div>
      ) : null}
      <FieldSet className="gap-4">
        <FieldLegend>Adjuntar patrocinio local</FieldLegend>
        <SelectField
          defaultValue={parseLocalSponsorPlacementSurface(
            getSubmittedValue(feedback, "sponsorSurface"),
            "resources_directory",
          )}
          error={getFieldError(feedback, "sponsorSurface")}
          id={`sponsor-surface-${props.provider.providerId}`}
          label="Superficie"
          name="sponsorSurface"
          options={localSponsorPlacementSurfaceOptions}
        />
        <TextField
          error={getFieldError(feedback, "sponsorLabel")}
          id={`sponsor-label-${props.provider.providerId}`}
          label="Etiqueta"
          name="sponsorLabel"
          placeholder="Patrocinado"
          type="text"
          value={getSubmittedValue(feedback, "sponsorLabel")}
        />
        <TextAreaField
          error={getFieldError(feedback, "sponsorDisclosure")}
          id={`sponsor-disclosure-${props.provider.providerId}`}
          label="Divulgación pública"
          name="sponsorDisclosure"
          placeholder="Patrocinado: apoyo local. No cambia la prioridad de reportes."
          value={getSubmittedValue(feedback, "sponsorDisclosure")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={getFieldError(feedback, "startsOn")}
            id={`sponsor-starts-${props.provider.providerId}`}
            label="Inicio"
            name="startsOn"
            required
            type="date"
            value={getSubmittedValue(feedback, "startsOn")}
          />
          <TextField
            error={getFieldError(feedback, "endsOn")}
            id={`sponsor-ends-${props.provider.providerId}`}
            label="Fin"
            name="endsOn"
            required
            type="date"
            value={getSubmittedValue(feedback, "endsOn")}
          />
        </div>
        <FieldSet className="gap-3">
          <FieldLegend>Medios del patrocinio</FieldLegend>
          <FieldDescription>
            Carga medios administrados por Rastro. Usa URL externa solo como
            fallback avanzado.
          </FieldDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminMediaUploadField
              assetFieldName="logoAssetId"
              description="Logo del patrocinio local."
              id={`sponsor-logo-upload-${props.provider.providerId}`}
              initialAssetId={getSubmittedValue(feedback, "logoAssetId")}
              label="Logo administrado"
              onRemovedChange={setLogoRemoved}
              previewAlt={`Logo de patrocinio de ${props.provider.name}`}
              purpose="sponsor_logo"
            />
            <AdminMediaUploadField
              assetFieldName="imageAssetId"
              description="Imagen o banner del patrocinio local."
              id={`sponsor-image-upload-${props.provider.providerId}`}
              initialAssetId={getSubmittedValue(feedback, "imageAssetId")}
              label="Imagen administrada"
              onRemovedChange={setImageRemoved}
              previewAlt={`Imagen de patrocinio de ${props.provider.name}`}
              purpose="sponsor_image"
            />
          </div>
          <AdvancedExternalMediaUrlFallback
            fields={[
              {
                error: getFieldError(feedback, "logoUrl"),
                hasSubmittedValue: hasSubmittedValue(feedback, "logoUrl"),
                id: `sponsor-logo-${props.provider.providerId}`,
                label: "Logo URL externa",
                name: "logoUrl",
                placeholder: "https://proveedor.example/logo-patrocinio.png",
                value: getSubmittedValue(feedback, "logoUrl"),
              },
              {
                error: getFieldError(feedback, "imageUrl"),
                hasSubmittedValue: hasSubmittedValue(feedback, "imageUrl"),
                id: `sponsor-image-${props.provider.providerId}`,
                label: "Imagen URL externa",
                name: "imageUrl",
                placeholder: "https://proveedor.example/banner-patrocinio.png",
                value: getSubmittedValue(feedback, "imageUrl"),
              },
            ]}
            id={`sponsor-external-url-fallback-${props.provider.providerId}`}
            removedFieldNames={[
              ...(logoRemoved ? ["logoUrl"] : []),
              ...(imageRemoved ? ["imageUrl"] : []),
            ]}
          />
        </FieldSet>
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

function SponsorMediaPreview(props: {
  imageUrl?: string;
  logoUrl?: string;
  providerName: string;
}) {
  if (!props.logoUrl && !props.imageUrl) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-[64px_minmax(0,1fr)] sm:items-center">
      {props.logoUrl ? (
        <NextImage
          alt={`Logo de patrocinio de ${props.providerName}`}
          className="border-border bg-muted h-14 w-14 rounded-md border object-cover"
          height={56}
          loading="eager"
          src={props.logoUrl}
          unoptimized
          width={56}
        />
      ) : null}
      {props.imageUrl ? (
        <NextImage
          alt={`Imagen de patrocinio de ${props.providerName}`}
          className={`border-border bg-muted h-20 w-full rounded-md border object-cover ${props.logoUrl ? "" : "sm:col-span-2"}`}
          height={80}
          loading="eager"
          src={props.imageUrl}
          unoptimized
          width={640}
        />
      ) : null}
    </div>
  );
}

function ArchiveProviderWorkflow(props: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  formAction?: AdminResourceProviderFormAction;
  provider: AdminResourceProviderViewModel;
}) {
  const [state, formAction] = useAdminResourceProviderAction(props.formAction);
  const feedback = state.feedback ?? props.feedback;
  const confirmationError = getFieldError(feedback, "archiveConfirmation");

  return (
    <Dialog defaultOpen={Boolean(feedback)}>
      <DialogTrigger asChild>
        <Button
          className={providerWorkflowTriggerClassName}
          data-workflow-trigger="archive"
          type="button"
          variant="outline"
        >
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
          action={props.formAction ? formAction : undefined}
          aria-label={`Archivar proveedor ${props.provider.name}`}
          className="grid gap-4"
          method={props.formAction ? undefined : "post"}
        >
          <ProviderIdentityHiddenFields provider={props.provider} />
          <WorkflowErrorAlert feedback={feedback} />
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
      <AlertDescription className="max-w-full [overflow-wrap:anywhere] break-words">
        {props.feedback.formError}
      </AlertDescription>
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

function useAdminResourceProviderAction(
  formAction: AdminResourceProviderFormAction | undefined,
) {
  const fallbackAction = React.useCallback<AdminResourceProviderFormAction>(
    () => Promise.resolve(emptyAdminResourceProviderActionState),
    [],
  );

  return React.useActionState(
    formAction ?? fallbackAction,
    emptyAdminResourceProviderActionState,
  );
}

function getSubmittedValue(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
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
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
  key: string,
) {
  return Boolean(
    feedback?.submittedValues && Object.hasOwn(feedback.submittedValues, key),
  );
}

function getSubmittedBooleanValue(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
  key: string,
  fallback?: boolean,
) {
  if (!feedback?.submittedValues) {
    return fallback;
  }

  return feedback.submittedValues[key] === "on";
}

function getContactDefaultRows(input: {
  contactOptions?: AdminResourceProviderViewModel["contactOptions"];
  feedback?: AdminResourceProviderWorkflowFeedback;
  firstRowRequired: boolean;
}): ProviderContactFormRow[] {
  const submittedRows = getSubmittedContactRows(input.feedback);

  if (submittedRows) {
    return submittedRows;
  }

  if (input.contactOptions && input.contactOptions.length > 0) {
    return input.contactOptions.map((contact) => ({
      kind: contact.kind,
      label: contact.label,
      value: contact.value,
    }));
  }

  return input.firstRowRequired
    ? [{ kind: "whatsapp", label: "WhatsApp institucional", value: "" }]
    : [];
}

function getSubmittedContactRows(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
) {
  const values = feedback?.submittedValues;

  if (!values) {
    return undefined;
  }

  return getSubmittedFieldArrayIndices(values, "contactOptions").map(
    (index) => ({
      kind: parseContactKind(values[`contactOptions.${index}.kind`]),
      label: values[`contactOptions.${index}.label`] ?? "",
      value: values[`contactOptions.${index}.value`] ?? "",
    }),
  );
}

function getLinkDefaultRows(input: {
  feedback?: AdminResourceProviderWorkflowFeedback;
  fieldArrayName: ProviderLinkArrayName;
  links?: AdminResourceProviderViewModel["externalLinks"];
}): ProviderLinkFormRow[] {
  const submittedRows = getSubmittedLinkRows(
    input.feedback,
    input.fieldArrayName,
  );

  if (submittedRows) {
    return submittedRows;
  }

  return (input.links ?? []).map((link) => ({
    label: link.label,
    url: link.url,
  }));
}

function getSubmittedLinkRows(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
  fieldArrayName: ProviderLinkArrayName,
) {
  const values = feedback?.submittedValues;

  if (!values) {
    return undefined;
  }

  return getSubmittedFieldArrayIndices(values, fieldArrayName).map((index) => ({
    label: values[`${fieldArrayName}.${index}.label`] ?? "",
    url: values[`${fieldArrayName}.${index}.url`] ?? "",
  }));
}

function getSubmittedFieldArrayIndices(
  values: AdminResourceProviderWorkflowFeedback["submittedValues"],
  fieldArrayName: string,
) {
  if (!values) {
    return [];
  }

  const indices = new Set<number>();
  const prefix = `${fieldArrayName}.`;

  for (const key of Object.keys(values)) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    const [rawIndex] = key.slice(prefix.length).split(".");
    const index = Number(rawIndex);

    if (Number.isInteger(index) && index >= 0) {
      indices.add(index);
    }
  }

  return [...indices].sort((left, right) => left - right);
}

function parseContactKind(
  value: string | undefined,
): AdminResourceProviderContactKind {
  return resourceProviderContactKindOptions.some(
    (option) => option.id === value,
  )
    ? (value as AdminResourceProviderContactKind)
    : "whatsapp";
}

function parseResourceProviderCategory(
  value: string | undefined,
  fallback: AdminResourceProviderCategory,
): AdminResourceProviderCategory {
  return resourceProviderCategoryOptions.some((option) => option.id === value)
    ? (value as AdminResourceProviderCategory)
    : fallback;
}

function parseVerificationStatus(
  value: string | undefined,
  fallback: AdminResourceProviderVerificationStatus,
): AdminResourceProviderVerificationStatus {
  return value === "verified" || value === "unverified" ? value : fallback;
}

function parseLocalSponsorPlacementSurface(
  value: string | undefined,
  fallback: AdminLocalSponsorPlacementSurface,
): AdminLocalSponsorPlacementSurface {
  return localSponsorPlacementSurfaceOptions.some(
    (option) => option.id === value,
  )
    ? (value as AdminLocalSponsorPlacementSurface)
    : fallback;
}

function getContactRowError(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
  index: number,
  field: keyof ProviderContactFormRow,
) {
  const legacyField =
    field === "kind"
      ? `contactKind${index}`
      : field === "label"
        ? `contactLabel${index}`
        : `contactValue${index}`;

  return (
    getFieldError(feedback, `contactOptions.${index}.${field}`) ??
    getFieldError(feedback, legacyField)
  );
}

function getLinkRowError(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
  fieldArrayName: ProviderLinkArrayName,
  legacyFieldPrefix: "externalLink" | "socialLink",
  index: number,
  field: keyof ProviderLinkFormRow,
) {
  const legacyField =
    field === "label"
      ? `${legacyFieldPrefix}Label${index}`
      : `${legacyFieldPrefix}Url${index}`;

  return (
    getFieldError(feedback, `${fieldArrayName}.${index}.${field}`) ??
    getFieldError(feedback, legacyField)
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
      <div className="mt-2 min-w-0">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{props.caption}</caption>
          <thead className="text-muted-foreground text-xs font-semibold uppercase">
            <tr>
              <th className="w-[46%] py-2 pr-2" scope="col">
                Lugar
              </th>
              <th className="w-[18%] px-1 py-2 text-right" scope="col">
                Total
              </th>
              <th className="w-[18%] px-1 py-2 text-right" scope="col">
                Verif.
              </th>
              <th className="w-[18%] py-2 pl-1 text-right" scope="col">
                Patroc.
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
                  <th className="py-3 pr-2 font-medium break-words" scope="row">
                    {metric.label}
                  </th>
                  <td className="px-1 py-3 text-right">
                    {metric.providerCount}
                  </td>
                  <td className="px-1 py-3 text-right">
                    {metric.verifiedProviderCount}
                  </td>
                  <td className="py-3 pl-1 text-right">
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
    <div className="min-w-0">
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
