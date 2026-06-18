export const nearbyRadiusOptionsKm = [5, 10, 20] as const;

export type NearbyRadiusKm = (typeof nearbyRadiusOptionsKm)[number];

export type NearbyBrowseMode = "list" | "map";

export type NearbyBrowseAudience = "visitor" | "member";
export type NearbyPublicReportKind =
  | "found-pet-report"
  | "lost-pet-report"
  | "sighting-report";

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
  manualLocationKind?: NearbyManualLocationKind;
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
  shareTarget: PublicReportShareTarget;
}

export interface FoundPetReportSummary {
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
  shareTarget: PublicReportShareTarget;
}

export interface SightingReportSummary {
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
  shareTarget: PublicReportShareTarget;
}

export type NearbyPublicReportSummary =
  | FoundPetReportSummary
  | LostPetReportSummary
  | SightingReportSummary;

export interface NearbyLostReportsQuery {
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

export interface NearbyLostReportsAdapter {
  searchLostPetReports: (
    query: NearbyLostReportsQuery,
  ) => Promise<NearbyLostReportsResult>;
}
