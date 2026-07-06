import { buildAuthHomeHref } from "~/auth/return-to";
import { reportPublicReportAbuse } from "./public-report-abuse-actions";

export type PublicReportAbuseStatus =
  | "already_reported"
  | "created"
  | "error"
  | "invalid";

export interface PublicReportAbuseCardProps {
  isOwner: boolean;
  isSignedIn: boolean;
  reportId: string;
  returnTo: string;
  status?: PublicReportAbuseStatus;
}

const reasonOptions = [
  { label: "Spam", value: "spam" },
  { label: "Estafa", value: "scam" },
  { label: "Ubicación incorrecta", value: "incorrect_location" },
  { label: "Contenido ofensivo", value: "offensive_content" },
  { label: "Crueldad animal", value: "animal_cruelty" },
  { label: "Sospecha de mascota robada", value: "stolen_pet_concern" },
  { label: "Suplantación de identidad", value: "impersonation" },
  { label: "Otro motivo", value: "other" },
] as const;

const statusCopy = {
  already_reported: {
    tone: "success",
    text: "Ya recibimos tu reporte sobre este motivo.",
  },
  created: {
    tone: "success",
    text: "Gracias. El equipo de Rastro revisará este reporte.",
  },
  error: {
    tone: "error",
    text: "No pudimos enviar el reporte. Intenta nuevamente.",
  },
  invalid: {
    tone: "error",
    text: "Elige un motivo y agrega un detalle de al menos 10 caracteres.",
  },
} satisfies Record<
  PublicReportAbuseStatus,
  { text: string; tone: "error" | "success" }
>;

export function parsePublicReportAbuseStatus(
  value: string | string[] | undefined,
): PublicReportAbuseStatus | undefined {
  const status = Array.isArray(value) ? value[0] : value;

  return status && Object.prototype.hasOwnProperty.call(statusCopy, status)
    ? (status as PublicReportAbuseStatus)
    : undefined;
}

export function PublicReportAbuseCard({
  isOwner,
  isSignedIn,
  reportId,
  returnTo,
  status,
}: PublicReportAbuseCardProps) {
  if (isOwner) {
    return null;
  }

  const message = status ? statusCopy[status] : null;

  return (
    <section
      className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
      id="reportar"
    >
      <h2 className="text-xl font-semibold">Reportar</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        Cuéntanos qué problema ves. El equipo de Rastro revisará el reporte
        antes de tomar acción.
      </p>

      {message ? (
        <p
          className={
            message.tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-md border px-3 py-2 text-sm"
              : "border-primary/30 bg-primary/10 text-primary mt-4 rounded-md border px-3 py-2 text-sm"
          }
        >
          {message.text}
        </p>
      ) : null}

      {isSignedIn ? (
        <form action={reportPublicReportAbuse} className="mt-4 grid gap-3">
          <input type="hidden" name="reportId" value={reportId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="grid gap-2 text-sm font-medium">
            Motivo
            <select
              className="border-input bg-background rounded-md border px-3 py-2"
              defaultValue="other"
              name="reason"
              required
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Detalle
            <textarea
              className="border-input bg-background min-h-28 rounded-md border px-3 py-2"
              maxLength={1000}
              minLength={10}
              name="detail"
              placeholder="Describe el problema con este reporte"
              required
            />
          </label>
          <button
            className="bg-primary text-primary-foreground rounded-md px-4 py-3 text-center text-sm font-semibold"
            type="submit"
          >
            Enviar reporte
          </button>
        </form>
      ) : (
        <a
          className="border-primary text-primary hover:bg-primary/10 mt-4 block rounded-md border px-4 py-3 text-center text-sm font-semibold"
          href={buildAuthHomeHref("signin-required", returnTo)}
        >
          Inicia sesión para reportar
        </a>
      )}
    </section>
  );
}
