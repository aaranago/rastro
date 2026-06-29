import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Badge } from "@acme/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";

import type { AdminSettingsState } from "./admin-settings-api-adapter";
import type { AdminShellViewer } from "./admin-ui/admin-shell";
import { AdminSubmitButton } from "./admin-ui/admin-submit-button";

export interface AdminSettingsDashboardProps {
  formAction?: React.ComponentProps<"form">["action"];
  notice?: AdminSettingsNotice;
  settings: AdminSettingsState;
  viewer: AdminShellViewer;
}

export interface AdminSettingsNotice {
  body: string;
  tone: "error" | "success";
  title: string;
}

const settingCopy = {
  reviewMode: {
    description:
      "Retiene nuevas publicaciones de adopción para revisión antes de mostrarlas públicamente.",
    off: "Las publicaciones de adopción se publican inmediatamente.",
    on: "Las nuevas publicaciones de adopción quedan pendientes de revisión.",
    title: "Modo de revisión para adopciones",
  },
  verifiedEmail: {
    description:
      "Exige correo verificado antes de crear reportes o publicaciones visibles.",
    off: "Los miembros pueden publicar mientras terminan la verificación de correo.",
    on: "Solo miembros con correo verificado pueden publicar.",
    title: "Correo verificado requerido",
  },
} as const;

export function AdminSettingsDashboard(props: AdminSettingsDashboardProps) {
  const hasConfirmationError = props.notice?.tone === "error";
  const confirmationErrorId = "confirm-settings-change-error";

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Badge className="w-fit" variant="secondary">
            Reglas operativas
          </Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            Ajustes de publicación
          </h2>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 sm:text-base">
            Controla el modo de revisión y el requisito de correo verificado
            para las rutas de publicación de Rastro.
          </p>
        </div>
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm font-medium">
          {props.viewer.displayName}
        </p>
      </section>

      {props.notice ? (
        <AdminSettingsNoticeBanner notice={props.notice} />
      ) : null}

      <section
        aria-labelledby="admin-settings-form-heading"
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle
              className="text-2xl tracking-normal"
              id="admin-settings-form-heading"
            >
              Reglas activas
            </CardTitle>
            <CardDescription>
              Los cambios se guardan en base de datos y se aplican en las rutas
              de publicación backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={props.formAction}
              className="flex flex-col gap-5"
              method={props.formAction ? undefined : "post"}
            >
              <AdminSettingSwitch
                checked={props.settings.adoptionReviewModeEnabled}
                description={settingCopy.reviewMode.description}
                enabledSummary={settingCopy.reviewMode.on}
                id="adoption-review-mode"
                name="adoptionReviewModeEnabled"
                title={settingCopy.reviewMode.title}
              />
              <AdminSettingSwitch
                checked={props.settings.verifiedEmailRequiredToPublish}
                description={settingCopy.verifiedEmail.description}
                enabledSummary={settingCopy.verifiedEmail.on}
                id="verified-email-required"
                name="verifiedEmailRequiredToPublish"
                title={settingCopy.verifiedEmail.title}
              />

              <label
                className="border-border flex items-start gap-3 rounded-lg border p-4"
                htmlFor="confirm-settings-change"
              >
                <input
                  aria-describedby={
                    hasConfirmationError ? confirmationErrorId : undefined
                  }
                  aria-invalid={hasConfirmationError}
                  className="border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 mt-0.5 size-4 shrink-0 rounded border shadow-xs focus-visible:ring-[3px]"
                  id="confirm-settings-change"
                  name="confirmSettingsChange"
                  type="checkbox"
                  value="on"
                />
                <span className="text-sm">
                  <span className="block font-medium">
                    Confirmo aplicar estos ajustes
                  </span>
                  <span className="text-muted-foreground mt-1 block">
                    Estas reglas afectan publicación de reportes y adopciones
                    para miembros de Rastro.
                  </span>
                  {hasConfirmationError ? (
                    <span
                      className="text-destructive mt-2 block"
                      id={confirmationErrorId}
                    >
                      Marca esta confirmación antes de guardar cambios.
                    </span>
                  ) : null}
                </span>
              </label>

              <AdminSubmitButton
                className="w-fit"
                pendingLabel="Guardando ajustes"
              >
                Guardar ajustes
              </AdminSubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">
              Estado persistido
            </CardTitle>
            <CardDescription>
              Los cambios quedan registrados para trazabilidad operativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <AdminSettingStateRow
              enabled={props.settings.adoptionReviewModeEnabled}
              label={settingCopy.reviewMode.title}
              offSummary={settingCopy.reviewMode.off}
              onSummary={settingCopy.reviewMode.on}
            />
            <AdminSettingStateRow
              enabled={props.settings.verifiedEmailRequiredToPublish}
              label={settingCopy.verifiedEmail.title}
              offSummary={settingCopy.verifiedEmail.off}
              onSummary={settingCopy.verifiedEmail.on}
            />
            <div className="border-border border-t pt-4">
              <p className="font-medium">{formatUpdatedAt(props.settings)}</p>
              <p className="text-muted-foreground mt-1">
                Último admin:{" "}
                {props.settings.updatedByAdminId ?? "sin cambios guardados"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function buildAdminSettingsNotice(
  status: string | null,
): AdminSettingsNotice | undefined {
  if (status === "ok") {
    return {
      body: "Los ajustes quedaron persistidos y las rutas de publicación usarán la nueva configuración.",
      title: "Ajustes guardados",
      tone: "success",
    };
  }

  if (status === "error") {
    return {
      body: "No se guardaron cambios. Revisa la confirmación e inténtalo de nuevo.",
      title: "No se pudieron guardar los ajustes",
      tone: "error",
    };
  }

  return undefined;
}

function AdminSettingsNoticeBanner(props: { notice: AdminSettingsNotice }) {
  return (
    <Alert variant={props.notice.tone === "error" ? "destructive" : "default"}>
      <AlertTitle>{props.notice.title}</AlertTitle>
      <AlertDescription>
        <p>{props.notice.body}</p>
      </AlertDescription>
    </Alert>
  );
}

function AdminSettingSwitch(props: {
  checked: boolean;
  description: string;
  enabledSummary: string;
  id: string;
  name: string;
  title: string;
}) {
  const descriptionId = `${props.id}-description`;

  return (
    <div className="border-border flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0">
        <label className="text-sm font-semibold" htmlFor={props.id}>
          {props.title}
        </label>
        <p className="text-muted-foreground mt-1 text-sm" id={descriptionId}>
          {props.description}
        </p>
        <Badge className="mt-3" variant={props.checked ? "default" : "outline"}>
          {props.checked ? "Activado" : "Desactivado"}
        </Badge>
        <p className="text-muted-foreground mt-2 text-sm">
          {props.checked ? props.enabledSummary : "Actualmente desactivado."}
        </p>
      </div>
      <input
        aria-describedby={descriptionId}
        className="border-input bg-muted checked:bg-primary focus-visible:border-ring focus-visible:ring-ring/50 relative mt-1 h-5 w-10 shrink-0 appearance-none rounded-full border shadow-xs transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:shadow-xs before:transition-transform checked:before:translate-x-5 focus-visible:ring-[3px]"
        defaultChecked={props.checked}
        id={props.id}
        name={props.name}
        role="switch"
        type="checkbox"
        value="on"
      />
    </div>
  );
}

function AdminSettingStateRow(props: {
  enabled: boolean;
  label: string;
  offSummary: string;
  onSummary: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{props.label}</p>
        <Badge variant={props.enabled ? "default" : "outline"}>
          {props.enabled ? "Activado" : "Desactivado"}
        </Badge>
      </div>
      <p className="text-muted-foreground mt-1">
        {props.enabled ? props.onSummary : props.offSummary}
      </p>
    </div>
  );
}

const updatedAtFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "America/La_Paz",
  year: "numeric",
});

function formatUpdatedAt(settings: AdminSettingsState) {
  if (!settings.updatedAt) {
    return "Sin cambios guardados todavía";
  }

  return `Actualizado ${updatedAtFormatter.format(settings.updatedAt)}`;
}
