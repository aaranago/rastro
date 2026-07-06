import type { ReportOutcome } from "@acme/validators";
import { closeReportOutcomesByType } from "@acme/validators";

import type { RouterOutputs } from "../../utils/api";

export type MyReportSummary = RouterOutputs["report"]["mine"][number];
export type MyReportsFilter = "active" | "closed" | "retired" | "review";

export interface MyReportsRepository {
  confirmActive(input: { id: string }): Promise<unknown>;
  deleteReport(input: { id: string }): Promise<{ deleted: true; id: string }>;
  listReports(): Promise<MyReportSummary[]>;
  resolveReport(input: {
    id: string;
    outcome: ReportOutcome;
  }): Promise<unknown>;
}

export interface MyReportsApiClient {
  report: {
    delete: {
      mutate: (input: { id: string }) => Promise<{ deleted: true; id: string }>;
    };
    confirmActive: {
      mutate: (input: { id: string }) => Promise<unknown>;
    };
    mine: {
      query: (input: Record<string, never>) => Promise<MyReportSummary[]>;
    };
    resolve: {
      mutate: (input: {
        id: string;
        outcome: ReportOutcome;
      }) => Promise<unknown>;
    };
  };
}

export interface MyReportsViewModel {
  counts: Record<MyReportsFilter, number>;
  emptyState: {
    body: string;
    title: string;
  };
  filter: MyReportsFilter;
  filters: readonly MyReportsFilterOption[];
  reports: MyReportCardViewModel[];
  totalCount: number;
}

export interface MyReportsFilterOption {
  count: number;
  label: string;
  value: MyReportsFilter;
}

export interface MyReportCardViewModel {
  availabilityLabel: string;
  availabilityState: MyReportSummary["availability"]["state"];
  canConfirmActive: boolean;
  canDelete: boolean;
  canOpenPublicDetail: boolean;
  canResolve: boolean;
  eventLabel: string;
  href: string;
  id: string;
  locationLabel: string;
  outcomeLabel: string | null;
  petLabel: string;
  primaryActionLabel: string;
  statusTone: "active" | "closed" | "danger" | "review";
  thumbnailUrl: string | null;
  title: string;
  type: MyReportSummary["type"];
  typeLabel: string;
}

export const myReportsDefaultFilter: MyReportsFilter = "active";

const filterOrder = [
  "active",
  "closed",
  "review",
  "retired",
] as const satisfies readonly MyReportsFilter[];

const filterLabels = {
  active: "Activos",
  closed: "Cerrados",
  review: "Revisión",
  retired: "Retirados",
} satisfies Record<MyReportsFilter, string>;

const filterEmptyCopy = {
  active: {
    body: "Cuando publiques reportes activos aparecerán aquí para compartirlos o cerrarlos.",
    title: "No tienes reportes activos",
  },
  closed: {
    body: "Los reportes cerrados aparecerán aquí con su resultado.",
    title: "No tienes reportes cerrados",
  },
  retired: {
    body: "Los reportes retirados u ocultos por moderación aparecerán aquí.",
    title: "No hay reportes retirados",
  },
  review: {
    body: "Las publicaciones pendientes de revisión aparecerán aquí antes de mostrarse públicamente.",
    title: "Nada en revisión",
  },
} satisfies Record<MyReportsFilter, { body: string; title: string }>;

const typeLabels = {
  adoption: "Adopción",
  found_pet: "Encontrada",
  lost_pet: "Perdida",
  sighting: "Avistamiento",
} satisfies Record<MyReportSummary["type"], string>;

export const myReportResolveOptions = [
  {
    body: "La mascota volvió con su familia.",
    label: "Reunida",
    value: "reunited",
  },
  {
    body: "Fue derivada a un refugio o rescatista.",
    label: "Trasladada a refugio",
    value: "transferred_to_shelter",
  },
  {
    body: "No se pudo ubicar o confirmar.",
    label: "No se pudo ubicar",
    value: "unable_to_locate",
  },
  {
    body: "La publicación ya no debe estar activa.",
    label: "Inactiva",
    value: "inactive",
  },
  {
    body: "La mascota encontró hogar.",
    label: "Adoptada",
    value: "adopted",
  },
] as const satisfies readonly {
  body: string;
  label: string;
  value: ReportOutcome;
}[];

const outcomeLabels = {
  adopted: "Adoptada",
  inactive: "Inactiva",
  reunited: "Reunida",
  still_missing: "Sigue activa",
  transferred_to_shelter: "Trasladada a refugio",
  unable_to_locate: "No se pudo ubicar",
} satisfies Record<ReportOutcome, string>;

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

export function createApiMyReportsRepository({
  client,
}: {
  client: MyReportsApiClient;
}): MyReportsRepository {
  return {
    confirmActive(input) {
      return client.report.confirmActive.mutate(input);
    },
    deleteReport(input) {
      return client.report.delete.mutate(input);
    },
    listReports() {
      return client.report.mine.query({});
    },
    resolveReport(input) {
      return client.report.resolve.mutate(input);
    },
  };
}

export function buildMyReportsViewModel({
  filter,
  reports,
}: {
  filter: MyReportsFilter;
  reports: readonly MyReportSummary[];
}): MyReportsViewModel {
  const cards = reports.map(buildMyReportCardViewModel);
  const counts = cards.reduce<Record<MyReportsFilter, number>>(
    (accumulator, report) => {
      accumulator[classifyMyReportFilter(report)] += 1;

      return accumulator;
    },
    {
      active: 0,
      closed: 0,
      retired: 0,
      review: 0,
    },
  );

  return {
    counts,
    emptyState: filterEmptyCopy[filter],
    filter,
    filters: filterOrder.map((value) => ({
      count: counts[value],
      label: filterLabels[value],
      value,
    })),
    reports: cards.filter((report) => classifyMyReportFilter(report) === filter),
    totalCount: reports.length,
  };
}

export function buildMyReportCardViewModel(
  report: MyReportSummary,
): MyReportCardViewModel {
  const firstMedia = report.media[0];

  return {
    availabilityLabel:
      report.outcome && report.status === "closed"
        ? outcomeLabels[report.outcome]
        : report.availability.label,
    availabilityState: report.availability.state,
    canConfirmActive: report.availability.state === "active",
    canDelete: report.availability.state !== "deleted",
    canOpenPublicDetail: canOpenMyReportPublicDetail(report),
    canResolve: report.availability.state === "active",
    eventLabel: formatDate(report.updatedAt),
    href: buildMyReportHref(report),
    id: report.id,
    locationLabel: report.location.label,
    outcomeLabel: report.outcome ? outcomeLabels[report.outcome] : null,
    petLabel: buildPetLabel(report),
    primaryActionLabel:
      report.availability.state === "active"
        ? "Cerrar"
        : report.availability.state === "deleted"
          ? "Ver estado"
          : "Gestionar",
    statusTone: getStatusTone(report),
    thumbnailUrl: firstMedia?.canonicalUrl ?? null,
    title: report.title.trim(),
    type: report.type,
    typeLabel: typeLabels[report.type],
  };
}

export function getMyReportResolveOptions(type: MyReportSummary["type"]) {
  const validOutcomes = new Set<ReportOutcome>([
    ...closeReportOutcomesByType[type],
  ]);

  return myReportResolveOptions.filter((option) =>
    validOutcomes.has(option.value),
  );
}

export function classifyMyReportFilter(report: {
  availabilityState: MyReportSummary["availability"]["state"];
}) {
  if (report.availabilityState === "active") {
    return "active";
  }

  if (report.availabilityState === "pending_review") {
    return "review";
  }

  if (report.availabilityState === "closed") {
    return "closed";
  }

  return "retired";
}

function getStatusTone(
  report: MyReportSummary,
): MyReportCardViewModel["statusTone"] {
  if (report.availability.state === "active") {
    return "active";
  }

  if (report.availability.state === "closed") {
    return "closed";
  }

  if (report.availability.state === "pending_review") {
    return "review";
  }

  return "danger";
}

function canOpenMyReportPublicDetail(report: MyReportSummary) {
  return !["deleted", "false_report", "hidden"].includes(
    report.availability.state,
  );
}

function buildPetLabel(report: MyReportSummary) {
  const petName = report.pet.name?.trim();
  const breed = report.pet.breed?.trim();

  return [petName, breed].filter(Boolean).join(" · ") || report.pet.color;
}

function buildMyReportHref(report: MyReportSummary) {
  const encodedId = encodeURIComponent(report.id);

  switch (report.type) {
    case "adoption":
      return `/(tabs)/(nearby)/adopciones/${encodedId}`;
    case "found_pet":
      return `/(tabs)/(nearby)/reportes/encontrados/${encodedId}`;
    case "lost_pet":
      return `/(tabs)/(nearby)/reportes/perdidos/${encodedId}`;
    case "sighting":
      return `/(tabs)/(nearby)/reportes/avistamientos/${encodedId}`;
  }
}

function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}
