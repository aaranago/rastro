import type {
  PublishFoundPetReportInput,
  FoundPetReportContactOption as PublishFoundReportContactOption,
} from "../found-reports/found-reports";
import type { PetProfileType } from "../pet-profiles/pet-profile-types";

export { type PublishFoundPetReportInput };
export const foundReportPetTypeOptions = [
  "Perro",
  "Gato",
  "Ave",
  "Conejo",
  "Otro",
] as const satisfies readonly PetProfileType[];

export interface FoundReportPhoto {
  alt?: string;
  id: string;
  status?: "draft" | "ready" | "uploading" | "error";
  thumbUri?: string;
  uri?: string;
}

export interface FoundReportCoordinates {
  latitude: number;
  longitude: number;
}

export interface FoundReportExactFoundLocation {
  addressLabel: string;
  coordinates: FoundReportCoordinates;
  department: string;
  locationCellLabel: string;
  municipality: string;
  neighborhood?: string;
}

export interface FoundReportDetailsDraft {
  condition: string;
  description: string;
  foundAtLabel: string;
}

export interface FoundReportPetDraft {
  breed: string;
  description: string;
  type: PetProfileType;
}

export interface FoundReportContactDraft {
  inAppChatEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
}

export type FoundReportContactOption = "chat" | "whatsapp" | "both";

export interface FoundReportDraft {
  contact: FoundReportContactDraft;
  exactFoundLocation?: FoundReportExactFoundLocation;
  foundDetails: FoundReportDetailsDraft;
  pet: FoundReportPetDraft;
  photos: FoundReportPhoto[];
  showExactPinPublicly: boolean;
}

export type FoundReportCreationSession =
  | {
      kind: "visitor";
    }
  | {
      displayName?: string;
      kind: "member";
      memberId: string;
    };

export interface FoundReportCreationVisitorAction {
  intent: "found-report";
  label: string;
}

export type { PublishFoundReportContactOption };
