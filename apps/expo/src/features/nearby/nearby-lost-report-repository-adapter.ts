import type {
  FoundPetReportRepository,
  FoundReportsSessionState,
} from "../found-reports/found-reports";
import type {
  LostPetReportRepository,
  LostReportsSessionState,
} from "../lost-reports/lost-reports";
import type {
  FoundPetReportSummary,
  LostPetReportSummary,
  NearbyLostReportsAdapter,
  NearbyPublicReportSummary,
  PublicLocation,
} from "./nearby-types";

export interface NearbyLostReportRepositoryAdapterOptions {
  foundReports?: FoundPetReportRepository;
  foundSession?: FoundReportsSessionState;
  repository: LostPetReportRepository;
  session?: LostReportsSessionState;
}

const visitorSession: LostReportsSessionState = { kind: "visitor" };
const foundVisitorSession: FoundReportsSessionState = { kind: "visitor" };

export function createNearbyLostReportRepositoryAdapter({
  foundReports,
  foundSession = foundVisitorSession,
  repository,
  session = visitorSession,
}: NearbyLostReportRepositoryAdapterOptions): NearbyLostReportsAdapter {
  return {
    async searchLostPetReports(query) {
      const coordinates = query.location.coordinates;

      if (!coordinates) {
        throw new Error(
          "La busqueda necesita una ciudad, zona o pin resuelto en Bolivia.",
        );
      }

      const lostResult = await repository.searchActiveLostPetReports(session, {
        location: {
          coordinates,
          countryCode: query.location.countryCode,
          label: query.location.label,
          locationCellLabel: query.location.locationCellLabel,
          source: query.location.source,
        },
        radiusKm: query.radiusKm,
        strategy: "postgis_radius",
      });
      const foundResult = foundReports
        ? await foundReports.searchActiveFoundPetReports(foundSession, {
            location: {
              coordinates,
              countryCode: query.location.countryCode,
              label: query.location.label,
              locationCellLabel: query.location.locationCellLabel,
              source: query.location.source,
            },
            radiusKm: query.radiusKm,
            strategy: "postgis_radius",
          })
        : undefined;
      const reports = [
        ...lostResult.reports.map((report) =>
          toNearbyLostPetReportSummary({
            generatedAt: lostResult.generatedAt,
            report,
          }),
        ),
        ...(foundResult?.reports.map((report) =>
          toNearbyFoundPetReportSummary({
            generatedAt: foundResult.generatedAt,
            report,
          }),
        ) ?? []),
      ].sort(compareNearbyReports);

      return {
        generatedAt: lostResult.generatedAt,
        query,
        reports,
        searchBoundary: {
          center: query.location,
          engine: "rastro-postgis-radius",
          owner: "rastro",
          publicLocationPrecision: "location-cell",
          radiusKm: query.radiusKm,
        },
      };
    },
  };
}

function toNearbyLostPetReportSummary({
  generatedAt,
  report,
}: {
  generatedAt: string;
  report: Awaited<
    ReturnType<LostPetReportRepository["searchActiveLostPetReports"]>
  >["reports"][number];
}): LostPetReportSummary {
  return {
    alertPriority: report.alertPriority,
    breed: report.breed,
    distanceMeters: report.distanceMeters,
    id: report.id,
    lastSeenAtLabel: formatLastSeenAt(report.lastSeenAt, generatedAt),
    lastSeenSummary: report.lastSeenDescription,
    locationCellLabel: report.locationCellLabel,
    petName: report.petName,
    photoUrl: report.photoUrl,
    publicLocation: toNearbyPublicLocation(report.publicLocation),
    reportKind: "lost-pet-report",
    shareTarget: report.shareTarget,
    species: report.species,
  };
}

function toNearbyFoundPetReportSummary({
  generatedAt,
  report,
}: {
  generatedAt: string;
  report: Awaited<
    ReturnType<FoundPetReportRepository["searchActiveFoundPetReports"]>
  >["reports"][number];
}): FoundPetReportSummary {
  return {
    breed: report.breed,
    condition: report.condition,
    distanceMeters: report.distanceMeters,
    foundAtLabel: formatLastSeenAt(report.foundAt, generatedAt),
    foundSummary: report.foundDescription,
    id: report.id,
    locationCellLabel: report.locationCellLabel,
    photoUrl: report.photoUrl,
    publicLocation: toNearbyPublicLocation(report.publicLocation),
    reportKind: "found-pet-report",
    shareTarget: report.shareTarget,
    species: report.species,
    title: report.title,
  };
}

function toNearbyPublicLocation(
  publicLocation: Awaited<
    ReturnType<LostPetReportRepository["searchActiveLostPetReports"]>
  >["reports"][number]["publicLocation"],
): PublicLocation {
  if (publicLocation.kind === "exact") {
    return {
      kind: "exact",
      label: publicLocation.label,
    };
  }

  return { kind: "approximate" };
}

function formatLastSeenAt(lastSeenAt: string, generatedAt: string) {
  const lastSeenAtMs = Date.parse(lastSeenAt);
  const generatedAtMs = Date.parse(generatedAt);

  if (!Number.isFinite(lastSeenAtMs) || !Number.isFinite(generatedAtMs)) {
    return "Fecha por confirmar";
  }

  const minutes = Math.max(
    0,
    Math.round((generatedAtMs - lastSeenAtMs) / 60_000),
  );

  if (minutes < 60) {
    return minutes <= 1 ? "Hace 1 min" : `Hace ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? "Hace 1 h" : `Hace ${hours} h`;
  }

  const days = Math.round(hours / 24);

  if (days === 1) {
    return "Ayer";
  }

  return `Hace ${days} dias`;
}

const farAwayDistance = Number.POSITIVE_INFINITY;

function compareNearbyReports(
  left: NearbyPublicReportSummary,
  right: NearbyPublicReportSummary,
) {
  const priority = priorityScore(right) - priorityScore(left);

  if (priority !== 0) {
    return priority;
  }

  return (
    (left.distanceMeters ?? farAwayDistance) -
    (right.distanceMeters ?? farAwayDistance)
  );
}

function priorityScore(report: NearbyPublicReportSummary) {
  if (report.reportKind === "found-pet-report") {
    return 1;
  }

  return report.alertPriority === "urgent" ? 2 : 1;
}
