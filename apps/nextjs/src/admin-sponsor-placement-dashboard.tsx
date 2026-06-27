import type * as React from "react";

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
  AdminSponsorPlacementFeedback,
  AdminSponsorPlacementNotice,
} from "./admin-sponsor-placement-actions";
import type {
  AdminSponsorPlacementDashboardViewModel,
  AdminSponsorPlacementSurfaceOption,
  AdminSponsorPlacementViewModel,
  AdminSponsorProviderOption,
} from "./admin-sponsor-placement-model";
import { AdminSubmitButton } from "./admin-ui/admin-submit-button";

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
  formAction?: React.ComponentProps<"form">["action"];
  notice?: AdminSponsorPlacementNotice;
  viewModel: AdminSponsorPlacementDashboardViewModel;
  viewer: AdminSponsorPlacementViewer;
  workflowFeedback?: AdminSponsorPlacementFeedback;
}

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
  formAction?: React.ComponentProps<"form">["action"];
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
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      <SummaryStat label="Patrocinios" value={stats.placementCount} />
      <SummaryStat label="Activos" value={stats.activeCount} />
      <SummaryStat label="Programados" value={stats.scheduledCount} />
      <SummaryStat label="Expirados" value={stats.expiredCount} />
      <SummaryStat label="Proveedores" value={stats.providerCount} />
    </section>
  );
}

function SummaryStat(props: { label: string; value: number }) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-1 pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl tracking-normal">
          {props.value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
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
  formAction?: React.ComponentProps<"form">["action"];
  viewModel: AdminSponsorPlacementDashboardViewModel;
  workflowFeedback?: AdminSponsorPlacementFeedback;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="tracking-normal">
          Patrocinios por proveedor
        </CardTitle>
        <CardDescription>
          Lista operacional con superficie, vigencia, estado y acciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {props.viewModel.placements.length === 0 ? (
          <SponsorEmptyState />
        ) : (
          <div className="grid gap-3">
            {props.viewModel.placements.map((placement) => (
              <SponsorPlacementCard
                formAction={props.formAction}
                key={placement.placementId}
                placement={placement}
                providerOptions={props.viewModel.providerOptions}
                surfaceOptions={props.viewModel.surfaceOptions}
                workflowFeedback={props.workflowFeedback}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SponsorEmptyState() {
  return (
    <div className="border-border bg-muted/30 rounded-lg border p-5">
      <p className="font-semibold">Todavía no hay patrocinios locales.</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Crea el primer patrocinio cuando exista un proveedor de recursos
        elegible y una ventana de fechas confirmada.
      </p>
    </div>
  );
}

function SponsorPlacementCard(props: {
  formAction?: React.ComponentProps<"form">["action"];
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
    <article
      className="border-border bg-background rounded-lg border p-4"
      data-sponsor-placement-card={props.placement.placementId}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="break-words font-medium">
            {props.placement.providerName}
          </p>
          <p className="text-muted-foreground text-xs">
            {props.placement.providerCity}, {props.placement.providerDepartment}
          </p>
          <p className="text-muted-foreground break-all text-xs">
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

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:justify-end">
          <EditSponsorPlacementWorkflow
            feedback={
              feedback?.action === "update_sponsor_placement"
                ? feedback
                : undefined
            }
            formAction={props.formAction}
            placement={props.placement}
            providerOptions={props.providerOptions}
            surfaceOptions={props.surfaceOptions}
          />
          <DetachSponsorPlacementWorkflow
            feedback={
              feedback?.action === "detach_sponsor_placement"
                ? feedback
                : undefined
            }
            formAction={props.formAction}
            placement={props.placement}
          />
        </div>
      </div>
    </article>
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
  formAction?: React.ComponentProps<"form">["action"];
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
  formAction?: React.ComponentProps<"form">["action"];
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
  formAction?: React.ComponentProps<"form">["action"];
  placement: AdminSponsorPlacementViewModel;
}) {
  return (
    <Dialog defaultOpen={Boolean(props.feedback)}>
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
          action={props.formAction}
          className="grid gap-4"
          method={props.formAction ? undefined : "post"}
        >
          <HiddenSponsorIdentityFields placement={props.placement} />
          <WorkflowErrorAlert feedback={props.feedback} />
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
  formAction?: React.ComponentProps<"form">["action"];
  idPrefix: string;
  placement?: AdminSponsorPlacementViewModel;
  providerOptions: readonly AdminSponsorProviderOption[];
  submitLabel: string;
  surfaceOptions: readonly AdminSponsorPlacementSurfaceOption[];
}) {
  return (
    <form
      action={props.formAction}
      className="grid gap-5"
      method={props.formAction ? undefined : "post"}
    >
      {props.placement ? (
        <HiddenSponsorIdentityFields placement={props.placement} />
      ) : null}
      <WorkflowErrorAlert feedback={props.feedback} />
      <SponsorPlacementFormFields
        feedback={props.feedback}
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
          id={`${props.idPrefix}-provider`}
          placement={props.placement}
          providerOptions={props.providerOptions}
        />
        <SelectField
          defaultValue={props.placement?.surface ?? props.surfaceOptions[0]?.id}
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
          value={props.placement?.label ?? "Patrocinado"}
        />
        <SponsorDisclosureField
          error={getFieldError(props.feedback, "disclosure")}
          id={`${props.idPrefix}-disclosure`}
          placement={props.placement}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function SponsorProviderField(props: {
  error?: string;
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
          defaultValue={props.placement?.providerId ?? props.providerOptions[0]?.id}
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
        value={props.placement?.providerName ?? ""}
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
        value={props.placement?.startsOn}
      />
      <TextField
        error={getFieldError(props.feedback, "endsOn")}
        id={`${props.idPrefix}-ends-on`}
        label="Fecha final"
        name="endsOn"
        required
        type="date"
        value={props.placement?.endsOn}
      />
    </div>
  );
}

function SponsorDisclosureField(props: {
  error?: string;
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
          props.placement?.disclosure ??
          "Patrocinado: apoyo local. No cambia la prioridad de reportes."
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

function TextField(props: {
  error?: string;
  id: string;
  label: string;
  name: string;
  required?: boolean;
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
        defaultValue={props.value}
        id={props.id}
        name={props.name}
        required={props.required}
        type={props.type}
      />
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
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
