export const lostReportPetTypeOptions = [
  "Perro",
  "Gato",
  "Ave",
  "Conejo",
  "Otro",
] as const;

export type LostReportPetType = (typeof lostReportPetTypeOptions)[number];

export interface LostReportPhoto {
  alt?: string;
  id: string;
  status?: "draft" | "ready" | "uploading" | "error";
  thumbUri?: string;
  uri?: string;
}

export interface LostReportPetProfileOption {
  breed: string;
  description: string;
  id: string;
  name: string;
  photos: LostReportPhoto[];
  type: LostReportPetType;
}

export interface LostReportInlinePetProfileDraft {
  breed: string;
  description: string;
  name: string;
  type: LostReportPetType | "";
}

export type LostReportPetSelectionMode = "existing" | "inline-create";

export interface LostReportCoordinates {
  latitude: number;
  longitude: number;
}

export interface LostReportExactLocation {
  addressLabel: string;
  coordinates: LostReportCoordinates;
  department: string;
  locationCellLabel: string;
  municipality: string;
  neighborhood?: string;
}

export interface LostReportDetailsDraft {
  circumstances: string;
  lastSeenAtLabel: string;
  markings: string;
}

export interface LostReportContactDraft {
  inAppChatEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
}

export type LostReportContactOption = "chat" | "whatsapp" | "both";

export interface LostReportDraft {
  contact: LostReportContactDraft;
  exactLocation?: LostReportExactLocation;
  id?: string;
  inlinePet: LostReportInlinePetProfileDraft;
  lostDetails: LostReportDetailsDraft;
  petProfileId?: string;
  petSelectionMode: LostReportPetSelectionMode;
  photos: LostReportPhoto[];
  showExactPinPublicly: boolean;
}

export interface LostReportPublishPayload {
  contactOption: LostReportContactOption;
  exactLocation: LostReportExactLocation;
  photos: LostReportPhoto[];
  publicLocation: {
    kind: "approximate" | "exact";
    label: string;
  };
  reportType: "lost-pet-report";
  selectedPet:
    | {
        kind: "existing";
        petProfileId: string;
      }
    | {
        breed: string;
        description: string;
        kind: "inline-create";
        name: string;
        type: LostReportPetType;
      };
  whatsappPhone?: string;
}
