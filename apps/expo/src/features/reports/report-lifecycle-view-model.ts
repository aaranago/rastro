import type { ReportLifecycleStatus, ReportOutcome } from "./report-lifecycle";
import { getReportOutcomeLabel } from "./report-lifecycle";

export type ReportLifecycleTone = "active" | "closed";

export type ReportUrgency = "normal" | "reduced";

export interface ReportLifecycleInput {
  outcome?: ReportOutcome;
  status?: ReportLifecycleStatus;
}

export interface ReportLifecycleSummaryViewModel {
  outcome: ReportOutcome;
  outcomeLabel: string;
  status: ReportLifecycleStatus;
  statusLabel: string;
  tone: ReportLifecycleTone;
}

export type ReportLifecycleViewer =
  | { kind: "member"; memberId: string }
  | { kind: "visitor" };

export type ReportLifecycleActionId =
  | "close-report"
  | "confirm-still-active"
  | "update-report";

export interface ReportLifecycleActionViewModel {
  id: ReportLifecycleActionId;
  label: string;
  role: "primary" | "secondary";
}

export interface PublicReportLifecycleViewModelInput
  extends ReportLifecycleInput {
  caretakerMemberId?: string;
  now?: string;
  reportTitle: string;
  staleAfterDays?: number;
  updatedAt?: string;
  viewer?: ReportLifecycleViewer;
}

export interface PublicReportLifecycleViewModel
  extends ReportLifecycleSummaryViewModel {
  actions: ReportLifecycleActionViewModel[];
  banner: {
    body: string;
    title: string;
    tone: ReportLifecycleTone;
  };
  canManage: boolean;
  stalePrompt?: {
    body: string;
    primaryAction: ReportLifecycleActionViewModel;
    secondaryAction: ReportLifecycleActionViewModel;
    title: string;
  };
  urgency: ReportUrgency;
}

export function buildReportLifecycleSummary(
  input: ReportLifecycleInput = {},
): ReportLifecycleSummaryViewModel {
  const status = input.status ?? "active";
  const outcome = input.outcome ?? "still-missing";

  return {
    outcome,
    outcomeLabel: formatReportOutcome(outcome),
    status,
    statusLabel: status === "closed" ? "Cerrado" : "Activo",
    tone: status === "closed" ? "closed" : "active",
  };
}

export function buildPublicReportLifecycleViewModel(
  input: PublicReportLifecycleViewModelInput,
): PublicReportLifecycleViewModel {
  const lifecycle = buildReportLifecycleSummary(input);
  const canManage = canManageReportLifecycle(input);
  const actions = buildLifecycleActions({ canManage, lifecycle });
  const staleAgeDays = getStaleAgeDays(input);
  const stalePrompt =
    canManage && lifecycle.status === "active" && staleAgeDays !== undefined
      ? buildStalePrompt({
          reportTitle: input.reportTitle,
          staleAgeDays,
        })
      : undefined;

  return {
    ...lifecycle,
    actions,
    banner: buildLifecycleBanner({
      lifecycle,
      reportTitle: input.reportTitle,
    }),
    canManage,
    stalePrompt,
    urgency: getReportUrgency(input),
  };
}

export function getReportUrgency(input: ReportLifecycleInput): ReportUrgency {
  return input.status === "closed" ? "reduced" : "normal";
}

export function isClosedReportLifecycle(input: ReportLifecycleInput) {
  return input.status === "closed";
}

export function formatReportOutcome(outcome: ReportOutcome) {
  return getReportOutcomeLabel(outcome);
}

function canManageReportLifecycle(input: PublicReportLifecycleViewModelInput) {
  return (
    input.viewer?.kind === "member" &&
    input.caretakerMemberId !== undefined &&
    input.viewer.memberId === input.caretakerMemberId
  );
}

function buildLifecycleActions({
  canManage,
  lifecycle,
}: {
  canManage: boolean;
  lifecycle: ReportLifecycleSummaryViewModel;
}): ReportLifecycleActionViewModel[] {
  if (!canManage) {
    return [];
  }

  if (lifecycle.status === "closed") {
    return [
      {
        id: "update-report",
        label: "Actualizar resultado",
        role: "secondary",
      },
    ];
  }

  return [
    {
      id: "update-report",
      label: "Actualizar reporte",
      role: "secondary",
    },
    {
      id: "close-report",
      label: "Cerrar reporte",
      role: "primary",
    },
  ];
}

function buildLifecycleBanner({
  lifecycle,
  reportTitle,
}: {
  lifecycle: ReportLifecycleSummaryViewModel;
  reportTitle: string;
}) {
  if (lifecycle.status === "closed") {
    return {
      body: `${normalizeReportTitle(reportTitle)} tiene resultado: ${lifecycle.outcomeLabel}. Ya no activa alertas cercanas.`,
      title: "Reporte cerrado",
      tone: "closed" as const,
    };
  }

  return {
    body: `${normalizeReportTitle(reportTitle)} sigue visible para búsqueda, contacto y alertas cercanas.`,
    title: "Reporte activo",
    tone: "active" as const,
  };
}

function buildStalePrompt({
  reportTitle,
  staleAgeDays,
}: {
  reportTitle: string;
  staleAgeDays: number;
}) {
  return {
    body: `${normalizeReportTitle(reportTitle)} no se actualiza desde hace ${staleAgeDays} días. Confirma que sigue vigente o cierra el reporte con un resultado.`,
    primaryAction: {
      id: "confirm-still-active",
      label: "Sigue activa",
      role: "primary",
    } satisfies ReportLifecycleActionViewModel,
    secondaryAction: {
      id: "close-report",
      label: "Cerrar reporte",
      role: "secondary",
    } satisfies ReportLifecycleActionViewModel,
    title: "Confirma si sigue activa",
  };
}

function getStaleAgeDays(input: PublicReportLifecycleViewModelInput) {
  const thresholdDays = input.staleAfterDays ?? 14;

  if (!input.updatedAt || !input.now) {
    return undefined;
  }

  const updatedAtMs = Date.parse(input.updatedAt);
  const nowMs = Date.parse(input.now);

  if (!Number.isFinite(updatedAtMs) || !Number.isFinite(nowMs)) {
    return undefined;
  }

  const days = Math.floor((nowMs - updatedAtMs) / (24 * 60 * 60 * 1000));

  return days >= thresholdDays ? days : undefined;
}

function normalizeReportTitle(reportTitle: string) {
  const trimmed = reportTitle.trim();

  return trimmed.length > 0 ? trimmed : "Este reporte";
}
