import type {
  LostPetReportRepository,
  LostReportsSessionState,
} from "../lost-reports/lost-reports";
import type {
  LostPetReportSummary,
  NearbyLostReportsAdapter,
  PublicLocation,
} from "./nearby-types";

export interface NearbyLostReportRepositoryAdapterOptions {
  repository: LostPetReportRepository;
  session?: LostReportsSessionState;
}

const visitorSession: LostReportsSessionState = { kind: "visitor" };

export function createNearbyLostReportRepositoryAdapter({
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

      const result = await repository.searchActiveLostPetReports(session, {
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

      return {
        generatedAt: result.generatedAt,
        query,
        reports: result.reports.map((report) =>
          toNearbyLostPetReportSummary({
            generatedAt: result.generatedAt,
            report,
          }),
        ),
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
    shareTarget: report.shareTarget,
    species: report.species,
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
