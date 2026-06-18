const reportOutcomes = [
  "still-missing",
  "reunited",
  "transferred-to-shelter",
  "unable-to-locate",
  "inactive",
] as const;

export type ReportOutcome = (typeof reportOutcomes)[number];
export type ReportLifecycleStatus = "active" | "closed";
export type ReportLifecycleUrgency = "standard" | "reduced";

export interface ReportLifecycleFields {
  closedAt?: string;
  lifecycleConfirmedAt: string;
  outcome: ReportOutcome;
  status: ReportLifecycleStatus;
  updatedAt: string;
}

export interface UpdateReportLifecycleInput {
  outcome: ReportOutcome;
}

export interface PublicReportLifecycle {
  outcome: ReportOutcome;
  outcomeLabel: string;
  status: ReportLifecycleStatus;
  statusLabel: string;
  urgency: ReportLifecycleUrgency;
}

export interface StaleActiveReportPromptCandidate {
  id: string;
  lifecycleConfirmedAt: string;
  outcome: ReportOutcome;
  status: ReportLifecycleStatus;
  title: string;
  updatedAt: string;
}

export interface ReportOutcomeOption {
  label: string;
  outcome: ReportOutcome;
}

export interface StaleActiveReportPrompt {
  actionLabel: string;
  message: string;
  outcomeOptions: ReportOutcomeOption[];
  reportId: string;
  title: string;
}

const reportOutcomeLabels: Record<ReportOutcome, string> = {
  inactive: "Inactiva",
  reunited: "Reunida",
  "still-missing": "Sigue activa",
  "transferred-to-shelter": "Trasladada a refugio",
  "unable-to-locate": "No se pudo ubicar",
};

const reportStatusLabels: Record<ReportLifecycleStatus, string> = {
  active: "Reporte activo",
  closed: "Reporte cerrado",
};

export function applyReportLifecycleUpdate({
  input,
  updatedAt,
}: {
  input: UpdateReportLifecycleInput;
  updatedAt: string;
}): ReportLifecycleFields {
  const status = getLifecycleStatusForOutcome(input.outcome);

  return {
    closedAt: status === "closed" ? updatedAt : undefined,
    lifecycleConfirmedAt: updatedAt,
    outcome: input.outcome,
    status,
    updatedAt,
  };
}

export function toPublicReportLifecycle({
  outcome,
  status,
}: {
  outcome: ReportOutcome;
  status: ReportLifecycleStatus;
}): PublicReportLifecycle {
  return {
    outcome,
    outcomeLabel: getReportOutcomeLabel(outcome),
    status,
    statusLabel: getReportStatusLabel(status),
    urgency: status === "closed" ? "reduced" : "standard",
  };
}

export function getReportOutcomeLabel(outcome: ReportOutcome) {
  return reportOutcomeLabels[outcome];
}

function getReportStatusLabel(status: ReportLifecycleStatus) {
  return reportStatusLabels[status];
}

export function findStaleActiveReportPrompts({
  now,
  reports,
  staleAfterDays = 14,
}: {
  now: string;
  reports: readonly StaleActiveReportPromptCandidate[];
  staleAfterDays?: number;
}): StaleActiveReportPrompt[] {
  return reports
    .map((report) =>
      buildStaleActiveReportPrompt({
        now,
        report,
        staleAfterDays,
      }),
    )
    .filter((prompt): prompt is StaleActiveReportPrompt => prompt !== null);
}

function buildStaleActiveReportPrompt({
  now,
  report,
  staleAfterDays = 14,
}: {
  now: string;
  report: StaleActiveReportPromptCandidate;
  staleAfterDays?: number;
}): StaleActiveReportPrompt | null {
  if (report.status !== "active") {
    return null;
  }

  if (!isReportStale(report.lifecycleConfirmedAt, now, staleAfterDays)) {
    return null;
  }

  return {
    actionLabel: "Confirmar o actualizar",
    message: "Confirma si este reporte sigue activo o elige un resultado.",
    outcomeOptions: reportOutcomes.map((outcome) => ({
      label: getReportOutcomeLabel(outcome),
      outcome,
    })),
    reportId: report.id,
    title: report.title,
  };
}

function getLifecycleStatusForOutcome(
  outcome: ReportOutcome,
): ReportLifecycleStatus {
  return outcome === "still-missing" ? "active" : "closed";
}

function isReportStale(
  lifecycleConfirmedAt: string,
  now: string,
  staleAfterDays: number,
) {
  const lifecycleConfirmedAtMs = Date.parse(lifecycleConfirmedAt);
  const nowMs = Date.parse(now);

  if (!Number.isFinite(lifecycleConfirmedAtMs) || !Number.isFinite(nowMs)) {
    return false;
  }

  const staleAfterMs = staleAfterDays * 24 * 60 * 60 * 1000;

  return nowMs - lifecycleConfirmedAtMs >= staleAfterMs;
}
