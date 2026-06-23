import type {
  ReportLifecycleStatus,
  ReportOutcome,
} from "../reports/report-lifecycle";

export const nearbyRadiusOptionsKm = [5, 10, 20] as const;

export type NearbyRadiusKm = (typeof nearbyRadiusOptionsKm)[number];

export type NearbyBrowseMode = "list" | "map";

export type NearbyBrowseAudience = "visitor" | "member";
export type NearbyPublicReportKind =
  | "adoption-listing"
  | "found-pet-report"
  | "lost-pet-report"
  | "sighting-report";

export const nearbyCategoryFilters = [
  "lost-pet-report",
  "found-pet-report",
  "sighting-report",
  "adoption-listing",
] as const satisfies readonly NearbyPublicReportKind[];

export type NearbyLocationSource = "current" | "last" | "manual";

export type NearbyManualLocationKind = "place" | "map-pin";

export type BoliviaCountryCode = "BO";

export interface NearbyCoordinates {
  latitude: number;
  longitude: number;
}

export interface NearbySearchLocation {
  source: NearbyLocationSource;
  label: string;
  locationCellLabel: string;
  countryCode: BoliviaCountryCode;
  coordinates?: NearbyCoordinates;
  department?: string;
  manualLocationKind?: NearbyManualLocationKind;
  municipality?: string;
}

export type NearbyLocationState =
  | { kind: "ready"; location: NearbySearchLocation }
  | { kind: "not-requested" }
  | { kind: "denied"; manualLocation?: NearbySearchLocation }
  | { kind: "unavailable"; manualLocation?: NearbySearchLocation };

export type PublicLocation =
  | { kind: "approximate" }
  | { kind: "exact"; label: string };

export interface PublicReportShareTarget {
  appDeepLink: string;
  message: string;
  path: string;
  title: string;
  webUrl: string;
}

export interface LostPetReportSummary {
  coordinates?: NearbyCoordinates;
  reportKind?: "lost-pet-report";
  id: string;
  petName: string;
  species: string;
  breed?: string;
  sex?: string;
  photoUrl?: string;
  distanceMeters?: number;
  locationCellLabel: string;
  publicLocation: PublicLocation;
  lastSeenAtLabel: string;
  lastSeenSummary: string;
  alertPriority: "urgent" | "standard";
  outcome?: ReportOutcome;
  shareTarget: PublicReportShareTarget;
  status?: ReportLifecycleStatus;
}

export interface FoundPetReportSummary {
  coordinates?: NearbyCoordinates;
  reportKind: "found-pet-report";
  id: string;
  title: string;
  species: string;
  breed?: string;
  photoUrl?: string;
  distanceMeters?: number;
  locationCellLabel: string;
  publicLocation: PublicLocation;
  foundAtLabel: string;
  foundSummary: string;
  condition: string;
  outcome?: ReportOutcome;
  shareTarget: PublicReportShareTarget;
  status?: ReportLifecycleStatus;
}

export interface SightingReportSummary {
  coordinates?: NearbyCoordinates;
  reportKind: "sighting-report";
  id: string;
  title: string;
  species: string;
  breed?: string;
  photoUrl?: string;
  distanceMeters?: number;
  locationCellLabel: string;
  publicLocation: PublicLocation;
  observedAtLabel: string;
  sightingSummary: string;
  observedCondition: string;
  direction: string;
  outcome?: ReportOutcome;
  shareTarget: PublicReportShareTarget;
  status?: ReportLifecycleStatus;
}

export interface AdoptionListingSummary {
  adoptionSummary: string;
  breed?: string;
  coordinates?: NearbyCoordinates;
  distanceMeters?: number;
  healthNotes?: string;
  id: string;
  idealHome?: string;
  locationCellLabel: string;
  petName: string;
  photoUrl?: string;
  publicLocation: PublicLocation;
  publishedAtLabel: string;
  reportKind: "adoption-listing";
  shareTarget: PublicReportShareTarget;
  species: string;
  verificationBadge?: {
    label: string;
    visible: boolean;
  };
}

export type NearbyPublicReportSummary =
  | AdoptionListingSummary
  | FoundPetReportSummary
  | LostPetReportSummary
  | SightingReportSummary;

export interface NearbyLostReportsQuery {
  categories?: readonly NearbyPublicReportKind[];
  location: NearbySearchLocation;
  radiusKm: NearbyRadiusKm;
  limit?: number;
  cursor?: string;
}

export interface NearbySearchBoundary {
  engine: "rastro-postgis-radius";
  owner: "rastro";
  center: NearbySearchLocation;
  radiusKm: NearbyRadiusKm;
  publicLocationPrecision: "location-cell";
}

export interface NearbyLostReportsResult {
  query: NearbyLostReportsQuery;
  searchBoundary: NearbySearchBoundary;
  reports: NearbyPublicReportSummary[];
  generatedAt: string;
  isOffline?: boolean;
  isStale?: boolean;
}

export interface NearbyLostReportsRequestOptions {
  signal?: AbortSignal;
}

export interface NearbyLostReportsAdapter {
  searchLostPetReports: (
    query: NearbyLostReportsQuery,
    options?: NearbyLostReportsRequestOptions,
  ) => Promise<NearbyLostReportsResult>;
}
