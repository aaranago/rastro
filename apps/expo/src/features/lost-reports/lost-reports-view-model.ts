import type { PetProfilePhotoSource } from "../pet-profiles/pet-profiles";
import type {
  LostPetReportContactOption,
  LostPetReportExactLocation,
  LostPetReportPetProfileSelection,
  LostReportsSessionState,
} from "./lost-reports";

export type ContactOptionValue = LostPetReportContactOption["kind"];

export interface LostPetReportDraft {
  contactOption: LostPetReportContactOption;
  exactLocation?: LostPetReportExactLocation;
  lastSeenAt: string;
  lastSeenDescription: string;
  petProfile?: LostPetReportPetProfileSelection;
  photos: readonly PetProfilePhotoSource[];
  showExactPublicLocation: boolean;
}

export interface LostPetReportPublishViewModel {
  blockers: string[];
  canPublish: boolean;
  contactOptions: {
    isSelected: boolean;
    label: string;
    value: ContactOptionValue;
  }[];
  kind: "member" | "visitor";
  locationPrivacyLabel: string;
  publishActionLabel: string;
  signInActionLabel?: string;
  title: string;
}

export function createLostPetReportDraft(
  overrides: Partial<LostPetReportDraft> = {},
): LostPetReportDraft {
  return {
    contactOption: {
      kind: "in-app-chat",
    },
    lastSeenAt: "",
    lastSeenDescription: "",
    photos: [],
    showExactPublicLocation: false,
    ...overrides,
  };
}

export function buildLostPetReportPublishViewModel({
  draft,
  session,
}: {
  draft: LostPetReportDraft;
  session: LostReportsSessionState;
}): LostPetReportPublishViewModel {
  if (session.kind === "visitor") {
    return {
      blockers: ["Inicia sesión para publicar."],
      canPublish: false,
      contactOptions: buildContactOptions(draft.contactOption),
      kind: "visitor",
      locationPrivacyLabel: formatLocationPrivacy(draft),
      publishActionLabel: "Publicar reporte",
      signInActionLabel: "Iniciar sesión",
      title: "Reportar pérdida",
    };
  }

  const blockers = buildPublishBlockers(draft);

  return {
    blockers,
    canPublish: blockers.length === 0,
    contactOptions: buildContactOptions(draft.contactOption),
    kind: "member",
    locationPrivacyLabel: formatLocationPrivacy(draft),
    publishActionLabel: "Publicar reporte",
    title: "Reportar pérdida",
  };
}

function buildPublishBlockers(draft: LostPetReportDraft) {
  const blockers: string[] = [];

  if (!draft.petProfile) {
    blockers.push("Elige o crea un perfil de mascota.");
  }

  if (draft.photos.length === 0) {
    blockers.push("Agrega al menos una foto.");
  }

  if (!draft.exactLocation) {
    blockers.push("Selecciona una ubicación en Bolivia.");
  }

  if (!draft.lastSeenAt.trim()) {
    blockers.push("Indica cuándo se perdió.");
  }

  if (!draft.lastSeenDescription.trim()) {
    blockers.push("Describe dónde o cómo se perdió.");
  }

  if (
    contactOptionNeedsPhone(draft.contactOption) &&
    !draft.contactOption.phoneNumber?.trim()
  ) {
    blockers.push("Ingresa un número de WhatsApp.");
  }

  return blockers;
}

function buildContactOptions(selected: LostPetReportContactOption) {
  return [
    {
      isSelected: selected.kind === "in-app-chat",
      label: "Chat en Rastro",
      value: "in-app-chat",
    },
    {
      isSelected: selected.kind === "whatsapp",
      label: "WhatsApp",
      value: "whatsapp",
    },
    {
      isSelected: selected.kind === "both",
      label: "Ambos",
      value: "both",
    },
  ] satisfies LostPetReportPublishViewModel["contactOptions"];
}

function formatLocationPrivacy(draft: LostPetReportDraft) {
  if (!draft.exactLocation) {
    return "Selecciona una ubicación en Bolivia";
  }

  if (draft.showExactPublicLocation) {
    return draft.exactLocation.addressLabel ?? "Pin exacto público";
  }

  return `${draft.exactLocation.locationCellLabel} · zona aproximada`;
}

function contactOptionNeedsPhone(contactOption: LostPetReportContactOption) {
  return contactOption.kind === "whatsapp" || contactOption.kind === "both";
}
