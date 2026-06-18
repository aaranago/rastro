import type {
  TrustSafetyAdminReviewItem,
  TrustSafetyReportReason,
} from "../trust-safety";

export type ResourceCategoryId =
  | "veterinary"
  | "shelter"
  | "groomer"
  | "pet_food"
  | "trainer"
  | "pet_store"
  | "transport"
  | "other";

export type ResourceProviderBoliviaCountryCode = "BO";

export type ResourceProviderSearchStrategy = "postgis_radius";

export type ResourceProviderManualLocationKind = "map-pin" | "place";

export interface ResourceCoordinate {
  latitude: number;
  longitude: number;
}

export type ResourceSearchLocation =
  | {
      kind: "current";
      label?: string;
      coordinate?: ResourceCoordinate;
      countryCode?: ResourceProviderBoliviaCountryCode;
      locationCellLabel?: string;
    }
  | {
      kind: "last";
      label: string;
      coordinate?: ResourceCoordinate;
      countryCode?: ResourceProviderBoliviaCountryCode;
      locationCellLabel?: string;
    }
  | {
      kind: "manual";
      label: string;
      coordinate?: ResourceCoordinate;
      countryCode?: ResourceProviderBoliviaCountryCode;
      locationCellLabel?: string;
      manualLocationKind?: ResourceProviderManualLocationKind;
    }
  | {
      kind: "denied";
      label?: string;
    }
  | {
      kind: "none";
      label?: string;
    };

export type ResourceProviderSearchLocation =
  | {
      coordinate: ResourceCoordinate;
      countryCode: ResourceProviderBoliviaCountryCode;
      kind: "current";
      label: string;
      locationCellLabel: string;
    }
  | {
      coordinate: ResourceCoordinate;
      countryCode: ResourceProviderBoliviaCountryCode;
      kind: "last";
      label: string;
      locationCellLabel: string;
    }
  | {
      coordinate: ResourceCoordinate;
      countryCode: ResourceProviderBoliviaCountryCode;
      kind: "manual";
      label: string;
      locationCellLabel: string;
      manualLocationKind?: ResourceProviderManualLocationKind;
    };

export type ResourcesDirectoryMode = "list" | "map";

export type ResourcesDirectoryStatus = "idle" | "loading" | "ready" | "error";

export interface ResourceContactOption {
  kind: "phone" | "whatsapp" | "website" | "email" | "directions" | "social";
  label: string;
  value: string;
}

export interface ResourceProviderSummary {
  id: string;
  name: string;
  categoryId: ResourceCategoryId;
  description: string;
  approximateLocationLabel: string;
  serviceAreaLabel?: string;
  distanceMeters?: number;
  isVerified?: boolean;
  sponsorPlacement?: {
    label: string;
    disclosure: string;
  };
  isOpenNow?: boolean;
  emergencyAvailable?: boolean;
  logoUrl?: string;
  photoUrl?: string;
  contactOptions: ResourceContactOption[];
}

export interface ResourceProviderExactLocation {
  addressLabel?: string;
  countryCode: ResourceProviderBoliviaCountryCode;
  latitude: number;
  locationCellLabel: string;
  longitude: number;
}

export type ResourceProviderFixture = ResourceProviderSummary & {
  exactLocation: ResourceProviderExactLocation;
};

export type ResourceProviderProfile = Omit<
  ResourceProviderSummary,
  "serviceAreaLabel"
> & {
  serviceAreaLabel: string;
  hoursLabel: string;
  shortDescription: string;
  websiteUrl?: string;
  socialLinks?: {
    label: string;
    url: string;
  }[];
  externalLinks?: {
    label: string;
    url: string;
  }[];
};

export type ResourceReportReason = TrustSafetyReportReason;

export type ResourceProviderAdminReviewItem = TrustSafetyAdminReviewItem;
