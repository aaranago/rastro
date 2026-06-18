export const petProfileTypeOptions = [
  "Perro",
  "Gato",
  "Ave",
  "Conejo",
  "Otro",
] as const;

export type PetProfileType = (typeof petProfileTypeOptions)[number];

export const petProfilePhotoLimit = 5;

export interface PetProfilePhotoCompressionMetadata {
  applied: boolean;
  maxDimensionPx: number;
  originalSizeBytes?: number;
  outputMimeType: "image/jpeg";
  quality: number;
}

export interface PetProfilePhotoExifMetadata {
  locationStripped: boolean;
  stripped: boolean;
}

export interface PetProfilePhotoThumbnailMetadata {
  generated: boolean;
  height: number;
  uri: string;
  width: number;
}

export type PetProfileRelatedRecordKind =
  | "lost-report"
  | "found-report"
  | "sighting-report"
  | "adoption-listing";

export interface PetProfilePhoto {
  compression?: PetProfilePhotoCompressionMetadata;
  exif?: PetProfilePhotoExifMetadata;
  height?: number;
  id: string;
  mimeType?: string;
  position?: number;
  sourceUri?: string;
  thumbnail?: PetProfilePhotoThumbnailMetadata;
  uri?: string;
  thumbUri?: string;
  width?: number;
  alt?: string;
  status?: "draft" | "ready" | "uploading" | "error";
  errorMessage?: string;
}

export interface PetProfileRelatedRecord {
  id: string;
  kind: PetProfileRelatedRecordKind;
  status: "active" | "closed";
  title: string;
  outcomeLabel?: string;
  updatedAtLabel?: string;
}

export interface PetProfileSummary {
  id: string;
  caretakerMemberId: string;
  name: string;
  type: PetProfileType;
  breed: string;
  description: string;
  photos: PetProfilePhoto[];
  relatedRecords: PetProfileRelatedRecord[];
  updatedAtLabel?: string;
}

export interface PetProfileDraft {
  id?: string;
  name: string;
  type: PetProfileType | "";
  breed: string;
  description: string;
  photos: PetProfilePhoto[];
}

export type PetProfilesSessionState =
  | {
      kind: "visitor";
    }
  | {
      displayName?: string;
      kind: "member";
      memberId: string;
    };
