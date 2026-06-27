import type * as React from "react";

import type { RouterOutputs } from "@acme/api";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";
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
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@acme/ui/table";
import { Textarea } from "@acme/ui/textarea";

import type { AdminMemberWorkflowFeedback } from "./admin-member-actions";
import { AdminSubmitButton } from "./admin-ui/admin-submit-button";

export type AdminMemberSearchResults =
  RouterOutputs["admin"]["members"]["search"];
export type AdminMemberProfile =
  | RouterOutputs["admin"]["members"]["profile"]
  | null;

export interface AdminMemberViewer {
  displayName: string;
  role: "admin" | "member" | "visitor";
}

export interface AdminMemberDashboardProps {
  formAction?: React.ComponentProps<"form">["action"];
  profile: AdminMemberProfile;
  query: string;
  results: AdminMemberSearchResults;
  viewer: AdminMemberViewer;
  workflowFeedback?: AdminMemberWorkflowFeedback;
}

const reportTypeLabels = {
  adoption: "Publicación de adopción",
  found_pet: "Reporte encontrado",
  lost_pet: "Reporte perdido",
  sighting: "Avistamiento",
} as const;

const reportStatusLabels = {
  active: "Activo",
  closed: "Cerrado",
  pending_review: "En revisión",
} as const;

const moderationActionLabels = {
  hide: "Ocultado",
  restore: "Restaurado",
} as const;

export function AdminMemberDashboard(props: AdminMemberDashboardProps) {
  return (
    <main className="bg-background min-h-screen overflow-x-hidden [&_*]:box-border">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <AdminMemberHeader viewer={props.viewer} />
        <AdminMemberNotice feedback={props.workflowFeedback} />

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
          <section className="flex min-w-0 flex-col gap-4">
            <MemberSearchPanel query={props.query} results={props.results} />
          </section>
          <section className="min-w-0">
            {props.profile ? (
              <MemberProfilePanel
                formAction={props.formAction}
                profile={props.profile}
                query={props.query}
                workflowFeedback={props.workflowFeedback}
              />
            ) : (
              <MemberProfileEmptyState hasQuery={props.query.length > 0} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function AdminMemberHeader(props: { viewer: AdminMemberViewer }) {
  return (
    <header className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-5 shadow-xs md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-primary text-sm font-semibold">
          Seguridad de miembros
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">
          Gestión de miembros
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Busca miembros, revisa actividad reciente y registra suspensiones
          persistidas para proteger las superficies de publicación.
        </p>
      </div>
      <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm font-medium">
        {props.viewer.displayName}
      </p>
    </header>
  );
}

function AdminMemberNotice(props: {
  feedback: AdminMemberWorkflowFeedback | undefined;
}) {
  if (!props.feedback) {
    return null;
  }

  if (props.feedback.status === "success") {
    return (
      <section
        aria-live="polite"
        className="border-primary/30 bg-primary/10 text-primary rounded-lg border p-4"
      >
        <h2 className="text-sm font-semibold">
          {props.feedback.workflow === "unsuspend"
            ? "Suspensión revocada"
            : "Miembro suspendido"}
        </h2>
        <p className="mt-1 text-sm">
          El historial del miembro quedo actualizado.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4"
    >
      <h2 className="text-sm font-semibold">No se guardó el cambio</h2>
      <p className="mt-1 text-sm">
        {props.feedback.formError ??
          "Revisa los campos marcados y vuelve a intentar."}
      </p>
    </section>
  );
}

function MemberSearchPanel(props: {
  query: string;
  results: AdminMemberSearchResults;
}) {
  return (
    <>
      <form
        action="/admin/miembros"
        className="border-border bg-card text-card-foreground rounded-lg border p-4 shadow-xs"
      >
        <Field>
          <FieldLabel htmlFor="admin-member-query">
            Buscar por correo, nombre o ID
          </FieldLabel>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <Input
              defaultValue={props.query}
              id="admin-member-query"
              maxLength={120}
              name="q"
              placeholder="camila@example.com"
              type="search"
            />
            <Button className="sm:w-fit" type="submit">
              Buscar
            </Button>
          </div>
        </Field>
      </form>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Resultados</h2>
        <Badge variant="secondary">
          {props.results.length === 1
            ? "1 miembro"
            : `${props.results.length} miembros`}
        </Badge>
      </div>

      {props.results.length > 0 ? (
        <div className="grid gap-3">
          {props.results.map((member) => (
            <MemberSearchResultCard
              key={member.id}
              member={member}
              query={props.query}
            />
          ))}
        </div>
      ) : (
        <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
          <p className="text-sm font-medium">
            {props.query
              ? "Sin resultados para la búsqueda."
              : "Ingresa una búsqueda para cargar miembros."}
          </p>
        </div>
      )}
    </>
  );
}

function MemberSearchResultCard(props: {
  member: AdminMemberSearchResults[number];
  query: string;
}) {
  return (
    <a
      className="border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-primary/5 block rounded-lg border p-4 shadow-xs transition-colors"
      href={buildMemberHref(props.member.id, props.query)}
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {props.member.name}
          </span>
          <span className="text-muted-foreground block truncate text-sm">
            {props.member.email}
          </span>
          <span className="text-muted-foreground mt-1 block truncate text-xs">
            {props.member.id}
          </span>
        </span>
        <MemberStateBadge
          activeSuspension={Boolean(props.member.currentSuspension)}
        />
      </span>
    </a>
  );
}

function MemberProfilePanel(props: {
  formAction?: React.ComponentProps<"form">["action"];
  profile: NonNullable<AdminMemberProfile>;
  query: string;
  workflowFeedback?: AdminMemberWorkflowFeedback;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <MemberAccountCard
        formAction={props.formAction}
        profile={props.profile}
        query={props.query}
        workflowFeedback={props.workflowFeedback}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          label="Reportes"
          value={props.profile.summary.reportCount}
        />
        <SummaryCard
          label="Adopciones"
          value={props.profile.summary.adoptionListingCount}
        />
        <SummaryCard
          label="Moderación"
          value={props.profile.summary.moderationReportCount}
        />
      </div>

      <RecentReportsTable reports={props.profile.recentReports} />
      <ModerationReportsTable reports={props.profile.moderationReports} />
      <SuspensionHistoryTable history={props.profile.suspensionHistory} />
    </div>
  );
}

function MemberAccountCard(props: {
  formAction?: React.ComponentProps<"form">["action"];
  profile: NonNullable<AdminMemberProfile>;
  query: string;
  workflowFeedback?: AdminMemberWorkflowFeedback;
}) {
  const member = props.profile.member;
  const activeSuspension = props.profile.currentSuspension;

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <CardTitle className="truncate text-2xl">{member.name}</CardTitle>
            <CardDescription className="mt-2">
              {member.email} · {member.id}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <MemberStateBadge activeSuspension={Boolean(activeSuspension)} />
            <Badge variant={member.emailVerified ? "default" : "secondary"}>
              {member.emailVerified ? "Correo verificado" : "Correo pendiente"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        {activeSuspension ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4">
            <p className="text-sm font-semibold">Suspensión activa</p>
            <p className="mt-1 text-sm">{activeSuspension.reason}</p>
            <p className="mt-2 text-xs">
              Desde {formatDate(activeSuspension.suspendedAt)} · Admin{" "}
              {activeSuspension.suspendedByAdminId ?? "no disponible"}
            </p>
          </div>
        ) : (
          <div className="border-border bg-muted/40 rounded-lg border p-4">
            <p className="text-sm font-semibold">Miembro activo</p>
            <p className="text-muted-foreground mt-1 text-sm">
              No tiene suspensión activa.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {activeSuspension ? (
            <UnsuspendMemberDialog
              feedback={props.workflowFeedback}
              formAction={props.formAction}
              memberId={member.id}
              memberName={member.name}
              query={props.query}
            />
          ) : (
            <SuspendMemberDialog
              feedback={props.workflowFeedback}
              formAction={props.formAction}
              memberId={member.id}
              memberName={member.name}
              query={props.query}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SuspendMemberDialog(props: {
  feedback?: AdminMemberWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  memberId: string;
  memberName: string;
  query: string;
}) {
  const feedback = getWorkflowFeedback(
    props.feedback,
    props.memberId,
    "suspend",
  );

  return (
    <Dialog defaultOpen={Boolean(feedback)}>
      <DialogTrigger asChild>
        <Button variant="destructive">Suspender miembro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspender a {props.memberName}</DialogTitle>
          <DialogDescription>
            La suspensión bloquea nuevos reportes, publicaciones de adopción y
            reportes sobre proveedores de recursos.
          </DialogDescription>
        </DialogHeader>
        <MemberSuspensionForm
          actionLabel="Confirmar suspensión"
          destructive
          feedback={feedback}
          formAction={props.formAction}
          memberId={props.memberId}
          query={props.query}
          workflow="suspend"
        />
      </DialogContent>
    </Dialog>
  );
}

function UnsuspendMemberDialog(props: {
  feedback?: AdminMemberWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  memberId: string;
  memberName: string;
  query: string;
}) {
  const feedback = getWorkflowFeedback(
    props.feedback,
    props.memberId,
    "unsuspend",
  );

  return (
    <Dialog defaultOpen={Boolean(feedback)}>
      <DialogTrigger asChild>
        <Button variant="outline">Revocar suspensión</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revocar suspensión de {props.memberName}</DialogTitle>
          <DialogDescription>
            Registra el motivo antes de devolver el acceso de publicación.
          </DialogDescription>
        </DialogHeader>
        <MemberSuspensionForm
          actionLabel="Revocar suspensión"
          feedback={feedback}
          formAction={props.formAction}
          memberId={props.memberId}
          query={props.query}
          workflow="unsuspend"
        />
      </DialogContent>
    </Dialog>
  );
}

function MemberSuspensionForm(props: {
  actionLabel: string;
  destructive?: boolean;
  feedback?: AdminMemberWorkflowFeedback;
  formAction?: React.ComponentProps<"form">["action"];
  memberId: string;
  query: string;
  workflow: "suspend" | "unsuspend";
}) {
  const reasonError = props.feedback?.fieldErrors.reason;
  const confirmationError = props.feedback?.fieldErrors.confirmation;
  const confirmationErrorId = `${props.workflow}-confirmation-error`;

  return (
    <form
      action={props.formAction}
      className="grid gap-4"
      method={props.formAction ? undefined : "post"}
    >
      <input name="memberAction" type="hidden" value={props.workflow} />
      <input name="memberId" type="hidden" value={props.memberId} />
      <input name="q" type="hidden" value={props.query} />
      <Field data-invalid={Boolean(reasonError)}>
        <FieldLabel htmlFor={`${props.workflow}-reason`}>
          Motivo requerido
        </FieldLabel>
        <Textarea
          aria-invalid={Boolean(reasonError)}
          aria-describedby={
            reasonError ? `${props.workflow}-reason-error` : undefined
          }
          id={`${props.workflow}-reason`}
          maxLength={1000}
          name="memberSuspensionReason"
          placeholder="Describe la evidencia revisada"
          required
        />
        {reasonError ? (
          <FieldError id={`${props.workflow}-reason-error`}>
            {reasonError}
          </FieldError>
        ) : null}
      </Field>

      {props.destructive ? (
        <Field
          data-invalid={Boolean(confirmationError)}
          orientation="horizontal"
        >
          <Checkbox
            aria-describedby={
              confirmationError ? confirmationErrorId : undefined
            }
            aria-invalid={Boolean(confirmationError)}
            id="confirm-member-suspension"
            name="confirmMemberSuspension"
          />
          <div>
            <FieldLabel htmlFor="confirm-member-suspension">
              Confirmo la suspensión
            </FieldLabel>
            <FieldDescription>
              El miembro no podrá publicar ni reportar proveedores de recursos
              hasta que un admin revoque la suspensión.
            </FieldDescription>
            {confirmationError ? (
              <FieldError id={confirmationErrorId}>
                {confirmationError}
              </FieldError>
            ) : null}
          </div>
        </Field>
      ) : null}

      <DialogFooter>
        <AdminSubmitButton
          pendingLabel={
            props.workflow === "suspend"
              ? "Suspendiendo miembro"
              : "Restaurando acceso"
          }
          variant={props.destructive ? "destructive" : "default"}
        >
          {props.actionLabel}
        </AdminSubmitButton>
      </DialogFooter>
    </form>
  );
}

function SummaryCard(props: { label: string; value: number }) {
  return (
    <div className="border-border bg-card text-card-foreground rounded-lg border p-4 shadow-xs">
      <p className="text-muted-foreground text-sm font-medium">{props.label}</p>
      <p className="mt-2 text-3xl font-bold">{props.value}</p>
    </div>
  );
}

function RecentReportsTable(props: {
  reports: NonNullable<AdminMemberProfile>["recentReports"];
}) {
  return (
    <MemberTableCard
      emptyLabel="Sin reportes recientes."
      headers={["Contenido", "Tipo", "Estado", "Ubicación"]}
      isEmpty={props.reports.length === 0}
      title="Reportes y publicaciones recientes"
    >
      {props.reports.map((report) => (
        <TableRow key={report.id}>
          <TableCell>
            <span className="font-medium">{report.title}</span>
            <span className="text-muted-foreground block text-xs">
              {formatDate(report.createdAt)}
            </span>
          </TableCell>
          <TableCell>{reportTypeLabels[report.type]}</TableCell>
          <TableCell>
            {report.hiddenAt ? "Oculto" : reportStatusLabels[report.status]}
          </TableCell>
          <TableCell>{report.locationLabel ?? "Sin ubicación"}</TableCell>
        </TableRow>
      ))}
    </MemberTableCard>
  );
}

function ModerationReportsTable(props: {
  reports: NonNullable<AdminMemberProfile>["moderationReports"];
}) {
  return (
    <MemberTableCard
      emptyLabel="Sin acciones de moderación."
      headers={["Contenido", "Acción", "Motivo", "Admin"]}
      isEmpty={props.reports.length === 0}
      title="Moderación asociada"
    >
      {props.reports.map((report) => (
        <TableRow key={report.id}>
          <TableCell>
            <span className="font-medium">{report.reportTitle}</span>
            <span className="text-muted-foreground block text-xs">
              {formatDate(report.createdAt)}
            </span>
          </TableCell>
          <TableCell>{moderationActionLabels[report.action]}</TableCell>
          <TableCell>{report.reason}</TableCell>
          <TableCell>{report.adminId ?? "No disponible"}</TableCell>
        </TableRow>
      ))}
    </MemberTableCard>
  );
}

function MemberTableCard(props: {
  children: React.ReactNode;
  emptyLabel: string;
  headers: readonly string[];
  isEmpty: boolean;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {props.headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.children}
            {props.isEmpty ? (
              <TableRow>
                <TableCell colSpan={props.headers.length}>
                  {props.emptyLabel}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SuspensionHistoryTable(props: {
  history: NonNullable<AdminMemberProfile>["suspensionHistory"];
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Historial de suspensión</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Suspensión</TableHead>
              <TableHead>Revocación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.history.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <MemberStateBadge
                    activeSuspension={item.status === "active"}
                  />
                </TableCell>
                <TableCell>{item.reason}</TableCell>
                <TableCell>
                  {formatDate(item.suspendedAt)}
                  <span className="text-muted-foreground block text-xs">
                    {item.suspendedByAdminId ?? "Admin no disponible"}
                  </span>
                </TableCell>
                <TableCell>
                  {item.revokedAt ? formatDate(item.revokedAt) : "Activa"}
                  {item.revokedReason ? (
                    <span className="text-muted-foreground block text-xs">
                      {item.revokedReason}
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {props.history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>Sin suspensiones registradas.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MemberProfileEmptyState(props: { hasQuery: boolean }) {
  return (
    <div className="border-border bg-card text-card-foreground rounded-lg border p-6 shadow-xs">
      <h2 className="text-xl font-semibold">Perfil de seguridad</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {props.hasQuery
          ? "Selecciona un resultado para revisar estado, reportes y acciones."
          : "Busca un miembro para abrir su perfil de seguridad."}
      </p>
    </div>
  );
}

function MemberStateBadge(props: { activeSuspension: boolean }) {
  return (
    <Badge variant={props.activeSuspension ? "destructive" : "secondary"}>
      {props.activeSuspension ? "Suspendido" : "Activo"}
    </Badge>
  );
}

function getWorkflowFeedback(
  feedback: AdminMemberWorkflowFeedback | undefined,
  memberId: string,
  workflow: "suspend" | "unsuspend",
) {
  if (feedback?.memberId !== memberId || feedback.workflow !== workflow) {
    return undefined;
  }

  return feedback;
}

function buildMemberHref(memberId: string, query: string) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  params.set("memberId", memberId);

  return `/admin/miembros?${params.toString()}`;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}
