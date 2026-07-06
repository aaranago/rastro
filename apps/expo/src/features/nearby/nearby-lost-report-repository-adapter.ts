import type {
  AdoptionListingRepository,
  AdoptionListingsSessionState,
} from "../adoption-listings/adoption-listings";
import type {
  FoundPetReportRepository,
  FoundReportsSessionState,
} from "../found-reports/found-reports";
import type {
  LostPetReportRepository,
  LostReportsSessionState,
} from "../lost-reports/lost-reports";
import type {
  SightingReportRepository,
  SightingReportsSessionState,
} from "../sighting-reports/sighting-reports";
import type {
  AdoptionListingSummary,
  FoundPetReportSummary,
  LostPetReportSummary,
  NearbyLostReportsAdapter,
  NearbyPublicReportKind,
  NearbyPublicReportSummary,
  PublicLocation,
  SightingReportSummary,
} from "./nearby-types";
import { compareNearbyPublicReports } from "./nearby-ranking";

export interface NearbyLostReportRepositoryAdapterOptions {
  adoptionListings?: AdoptionListingRepository;
  adoptionSession?: AdoptionListingsSessionState;
  foundReports?: FoundPetReportRepository;
  foundSession?: FoundReportsSessionState;
  repository: LostPetReportRepository;
  session?: LostReportsSessionState;
  sightingReports?: SightingReportRepository;
  sightingSession?: SightingReportsSessionState;
}

const visitorSession: LostReportsSessionState = { kind: "visitor" };
const adoptionVisitorSession: AdoptionListingsSessionState = {
  kind: "visitor",
};
const foundVisitorSession: FoundReportsSessionState = { kind: "visitor" };
const sightingVisitorSession: SightingReportsSessionState = {
  kind: "visitor",
};

export function createNearbyLostReportRepositoryAdapter({
  adoptionListings,
  adoptionSession = adoptionVisitorSession,
  foundReports,
  foundSession = foundVisitorSession,
  repository,
  session = visitorSession,
  sightingReports,
  sightingSession = sightingVisitorSession,
}: NearbyLostReportRepositoryAdapterOptions): NearbyLostReportsAdapter {
  return {
    async searchLostPetReports(query) {
      const coordinates = query.location.coordinates;

      if (!coordinates) {
        throw new Error(
          "La búsqueda necesita una ciudad, zona o pin resuelto en Bolivia.",
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
      const sightingResult = sightingReports
        ? await sightingReports.searchActiveSightingReports(sightingSession, {
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
      const adoptionResult = adoptionListings
        ? await adoptionListings.searchActiveAdoptionListings(adoptionSession, {
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
      const reports = filterReportsByCategory(query.categories, [
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
        ...(sightingResult?.reports.map((report) =>
          toNearbySightingReportSummary({
            generatedAt: sightingResult.generatedAt,
            report,
          }),
        ) ?? []),
        ...(adoptionResult?.listings.map((listing) =>
          toNearbyAdoptionListingSummary({
            generatedAt: adoptionResult.generatedAt,
            listing,
          }),
        ) ?? []),
      ]).sort(compareNearbyPublicReports);

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

function filterReportsByCategory(
  categories: readonly NearbyPublicReportKind[] | undefined,
  reports: NearbyPublicReportSummary[],
) {
  if (!categories || categories.length === 0) {
    return reports;
  }

  const selectedCategories = new Set(categories);

  return reports.filter((report) =>
    selectedCategories.has(getReportKind(report)),
  );
}

function getReportKind(
  report: NearbyPublicReportSummary,
): NearbyPublicReportKind {
  return report.reportKind ?? "lost-pet-report";
}

function toNearbyAdoptionListingSummary({
  generatedAt,
  listing,
}: {
  generatedAt: string;
  listing: Awaited<
    ReturnType<AdoptionListingRepository["searchActiveAdoptionListings"]>
  >["listings"][number];
}): AdoptionListingSummary {
  return {
    adoptionSummary: listing.adoptionSummary,
    breed: listing.breed,
    coordinates: listing.coordinates,
    distanceMeters: listing.distanceMeters,
    healthNotes: listing.healthNotes,
    id: listing.id,
    idealHome: listing.idealHome,
    locationCellLabel: listing.locationCellLabel,
    petName: listing.petName,
    photoUrl: listing.photoUrl,
    publicLocation: toNearbyPublicLocation(listing.publicLocation),
    publishedAtLabel: formatLastSeenAt(listing.publishedAt, generatedAt),
    reportKind: "adoption-listing",
    shareTarget: listing.shareTarget,
    species: listing.species,
    verificationBadge: listing.verificationBadge
      ? {
          label: listing.verificationBadge.label,
          visible: true,
        }
      : undefined,
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
    coordinates: report.coordinates,
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
    coordinates: report.coordinates,
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

function toNearbySightingReportSummary({
  generatedAt,
  report,
}: {
  generatedAt: string;
  report: Awaited<
    ReturnType<SightingReportRepository["searchActiveSightingReports"]>
  >["reports"][number];
}): SightingReportSummary {
  return {
    breed: report.breed,
    coordinates: report.coordinates,
    direction: report.direction,
    distanceMeters: report.distanceMeters,
    id: report.id,
    locationCellLabel: report.locationCellLabel,
    observedAtLabel: formatLastSeenAt(report.observedAt, generatedAt),
    observedCondition: report.observedCondition,
    photoUrl: report.photoUrl,
    publicLocation: toNearbyPublicLocation(report.publicLocation),
    reportKind: "sighting-report",
    shareTarget: report.shareTarget,
    sightingSummary: report.sightingDescription,
    species: report.species,
    title: report.title,
  };
}

function toNearbyPublicLocation(
  publicLocation:
    | Awaited<
        ReturnType<LostPetReportRepository["searchActiveLostPetReports"]>
      >["reports"][number]["publicLocation"]
    | Awaited<
        ReturnType<FoundPetReportRepository["searchActiveFoundPetReports"]>
      >["reports"][number]["publicLocation"]
    | Awaited<
        ReturnType<SightingReportRepository["searchActiveSightingReports"]>
      >["reports"][number]["publicLocation"]
    | Awaited<
        ReturnType<AdoptionListingRepository["searchActiveAdoptionListings"]>
      >["listings"][number]["publicLocation"],
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

  return `Hace ${days} días`;
}
