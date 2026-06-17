export type ResourceCategoryId =
  | "veterinary"
  | "shelter"
  | "groomer"
  | "pet_food"
  | "trainer"
  | "pet_store"
  | "transport"
  | "other";

export interface ResourceCoordinate {
  latitude: number;
  longitude: number;
}

export type ResourceSearchLocation =
  | {
      kind: "current";
      label?: string;
      coordinate?: ResourceCoordinate;
    }
  | {
      kind: "last";
      label: string;
      coordinate?: ResourceCoordinate;
    }
  | {
      kind: "manual";
      label: string;
      coordinate?: ResourceCoordinate;
    }
  | {
      kind: "denied";
      label?: string;
    }
  | {
      kind: "none";
      label?: string;
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

export type ResourceProviderProfile = ResourceProviderSummary & {
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

export type ResourceReportReason =
  | "spam"
  | "scam"
  | "incorrect_location"
  | "offensive_content"
  | "animal_cruelty"
  | "impersonation"
  | "other";
