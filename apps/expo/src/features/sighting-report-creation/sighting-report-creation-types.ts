import type { PetProfileType } from "../pet-profiles/pet-profile-types";
import type { ReportLocationDraft } from "../report-creation/report-location-draft";
import type { PublishSightingReportInput } from "../sighting-reports/sighting-reports";

export { type PublishSightingReportInput };

export const sightingReportPetTypeOptions = [
  "Perro",
  "Gato",
  "Ave",
  "Conejo",
  "Otro",
] as const satisfies readonly PetProfileType[];

export interface SightingReportPhoto {
  alt?: string;
  id: string;
  localId?: string;
  mediaId?: string;
  originalUri?: string;
  progress?: number;
  status?: "draft" | "ready" | "uploading" | "error";
  thumbUri?: string;
  uploadUri?: string;
  uri?: string;
}

export type SightingReportExactSightingLocation = ReportLocationDraft;

export interface SightingReportDetailsDraft {
  description: string;
  direction: string;
  observedAtLabel: string;
  observedCondition: string;
}

export interface SightingReportPetDraft {
  breed: string;
  description: string;
  type: PetProfileType;
}

export interface SightingReportContactDraft {
  inAppChatEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
}

export type SightingReportContactOption = "chat" | "whatsapp" | "both";

export interface SightingReportDraft {
  contact: SightingReportContactDraft;
  exactSightingLocation?: SightingReportExactSightingLocation;
  idempotencyKey?: string;
  pet: SightingReportPetDraft;
  photos: SightingReportPhoto[];
  showExactPinPublicly: boolean;
  sightingDetails: SightingReportDetailsDraft;
}

export type SightingReportCreationSession =
  | {
      kind: "visitor";
    }
  | {
      displayName?: string;
      kind: "member";
      memberId: string;
    };

export interface SightingReportCreationVisitorAction {
  intent: "sighting-report";
  label: string;
}
