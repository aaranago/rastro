import { describe, expect, it } from "vitest";

import type { AdoptionListingDraft } from "../adoption-listing-creation/adoption-listing-creation-types";
import type { FoundReportDraft } from "../found-report-creation/found-report-creation-types";
import type { LostReportDraft } from "../lost-report-creation/lost-report-creation-types";
import type { PetProfileDraft } from "../pet-profiles/pet-profile-types";
import type { SightingReportDraft } from "../sighting-report-creation/sighting-report-creation-types";
import type { AsyncKeyValueStorage } from "./storage";
import { createCreationDraftStore } from "./creation-drafts";

describe("durable creation drafts", () => {
  it("persists a typed Pet Profile draft through a fresh store instance", async () => {
    const storage = createMemoryStorage();
    const draft: PetProfileDraft = {
      breed: "Mestizo",
      description: "Collar rojo y pecho blanco.",
      name: "Toby",
      photos: [{ id: "photo-1", uri: "file:///toby.jpg" }],
      type: "Perro",
    };

    await createCreationDraftStore({ storage }).saveDraft({
      draft,
      kind: "pet-profile",
      recovery: {
        currentStep: "details",
        idempotencyKey: "draft-idempotency-1",
      },
      savedAt: "2026-06-18T14:30:00.000Z",
      scopeId: "member-camila",
    });

    const loaded = await createCreationDraftStore({ storage }).loadDraft(
      "pet-profile",
      { scopeId: "member-camila" },
    );

    expect(loaded).toEqual({
      draft,
      kind: "pet-profile",
      recovery: {
        currentStep: "details",
        idempotencyKey: "draft-idempotency-1",
      },
      savedAt: "2026-06-18T14:30:00.000Z",
      schemaVersion: 2,
    });
  });

  it("keeps every supported creation draft kind isolated when clearing one draft", async () => {
    const storage = createMemoryStorage();
    const store = createCreationDraftStore({ storage });
    const scopeId = "member-camila";

    await store.saveDraft({
      draft: petProfileDraft,
      kind: "pet-profile",
      scopeId,
    });
    await store.saveDraft({
      draft: lostReportDraft,
      kind: "lost-report",
      scopeId,
    });
    await store.saveDraft({
      draft: foundReportDraft,
      kind: "found-report",
      scopeId,
    });
    await store.saveDraft({
      draft: sightingReportDraft,
      kind: "sighting-report",
      scopeId,
    });
    await store.saveDraft({
      draft: adoptionListingDraft,
      kind: "adoption-listing",
      scopeId,
    });

    await store.clearDraft("lost-report", { scopeId });

    await expect(
      store.loadDraft("lost-report", { scopeId }),
    ).resolves.toBeUndefined();
    await expect(
      store.loadDraft("pet-profile", { scopeId }),
    ).resolves.toMatchObject({
      draft: petProfileDraft,
      kind: "pet-profile",
    });
    await expect(
      store.loadDraft("found-report", { scopeId }),
    ).resolves.toMatchObject({
      draft: foundReportDraft,
      kind: "found-report",
    });
    await expect(
      store.loadDraft("sighting-report", { scopeId }),
    ).resolves.toMatchObject({
      draft: sightingReportDraft,
      kind: "sighting-report",
    });
    await expect(
      store.loadDraft("adoption-listing", { scopeId }),
    ).resolves.toMatchObject({
      draft: adoptionListingDraft,
      kind: "adoption-listing",
    });
  });

  it("loads a saved draft as a recovery-aware found result", async () => {
    const storage = createMemoryStorage();
    const store = createCreationDraftStore({ storage });

    await store.saveDraft({
      draft: petProfileDraft,
      kind: "pet-profile",
      savedAt: "2026-06-18T14:30:00.000Z",
      scopeId: "member-camila",
    });

    await expect(
      store.loadDraftForRecovery("pet-profile", {
        scopeId: "member-camila",
      }),
    ).resolves.toEqual({
      draft: {
        draft: petProfileDraft,
        kind: "pet-profile",
        savedAt: "2026-06-18T14:30:00.000Z",
        schemaVersion: 2,
      },
      status: "found",
    });
  });

  it("reports incompatible stored data without exposing it through the simple load API", async () => {
    const storage = createMemoryStorage();
    const store = createCreationDraftStore({ storage });

    await storage.setItem(
      "rastro:creation-draft:v2:member-camila:pet-profile",
      JSON.stringify({
        draft: petProfileDraft,
        kind: "pet-profile",
        savedAt: "2026-06-18T14:30:00.000Z",
        schemaVersion: 99,
      }),
    );

    await expect(
      store.loadDraftForRecovery("pet-profile", {
        scopeId: "member-camila",
      }),
    ).resolves.toEqual({
      reason:
        "El borrador guardado usa una versión anterior de Rastro. Puedes descartarlo y crear uno nuevo.",
      status: "incompatible",
    });
    await expect(
      store.loadDraft("pet-profile", { scopeId: "member-camila" }),
    ).resolves.toBeUndefined();
  });

  it("reports malformed stored data as incompatible instead of throwing", async () => {
    const storage = createMemoryStorage();
    const store = createCreationDraftStore({ storage });

    await storage.setItem(
      "rastro:creation-draft:v2:member-camila:pet-profile",
      "{not valid json",
    );

    await expect(
      store.loadDraftForRecovery("pet-profile", {
        scopeId: "member-camila",
      }),
    ).resolves.toEqual({
      reason:
        "El borrador guardado usa una versión anterior de Rastro. Puedes descartarlo y crear uno nuevo.",
      status: "incompatible",
    });
  });

  it("loads a legacy v1 draft as a migrated recovery result", async () => {
    const storage = createMemoryStorage();
    const store = createCreationDraftStore({ storage });

    await storage.setItem(
      "rastro:creation-draft:v1:member-camila:pet-profile",
      JSON.stringify({
        draft: petProfileDraft,
        kind: "pet-profile",
        savedAt: "2026-06-18T14:30:00.000Z",
        schemaVersion: 1,
      }),
    );

    await expect(
      store.loadDraftForRecovery("pet-profile", {
        scopeId: "member-camila",
      }),
    ).resolves.toEqual({
      draft: {
        draft: petProfileDraft,
        kind: "pet-profile",
        savedAt: "2026-06-18T14:30:00.000Z",
        schemaVersion: 2,
      },
      status: "migrated",
    });
  });

  it("clears migrated legacy drafts so discard does not offer them again", async () => {
    const storage = createMemoryStorage();
    const store = createCreationDraftStore({ storage });
    const scopeId = "member-camila";

    await storage.setItem(
      "rastro:creation-draft:v1:member-camila:pet-profile",
      JSON.stringify({
        draft: petProfileDraft,
        kind: "pet-profile",
        savedAt: "2026-06-18T14:30:00.000Z",
        schemaVersion: 1,
      }),
    );

    await expect(
      store.loadDraftForRecovery("pet-profile", { scopeId }),
    ).resolves.toMatchObject({
      status: "migrated",
    });

    await store.clearDraft("pet-profile", { scopeId });

    await expect(
      store.loadDraftForRecovery("pet-profile", { scopeId }),
    ).resolves.toEqual({
      status: "missing",
    });
  });
});

function createMemoryStorage(): AsyncKeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => Promise.resolve(values.get(key) ?? null),
    removeItem: (key) => {
      values.delete(key);

      return Promise.resolve();
    },
    setItem: (key, value) => {
      values.set(key, value);

      return Promise.resolve();
    },
  };
}

const petProfileDraft: PetProfileDraft = {
  breed: "Mestizo",
  description: "Collar rojo.",
  name: "Toby",
  photos: [],
  type: "Perro",
};

const lostReportDraft: LostReportDraft = {
  contact: {
    inAppChatEnabled: true,
    whatsappEnabled: false,
    whatsappPhone: "",
  },
  inlinePet: {
    breed: "",
    description: "",
    name: "",
    type: "",
  },
  lostDetails: {
    circumstances: "Salió por la puerta.",
    lastSeenAtLabel: "2026-06-18T10:00:00.000Z",
    markings: "Pecho blanco.",
  },
  id: "lost-report-draft-1",
  petSelectionMode: "inline-create",
  photos: [],
  showExactPinPublicly: false,
};

const foundReportDraft: FoundReportDraft = {
  contact: {
    inAppChatEnabled: true,
    whatsappEnabled: true,
    whatsappPhone: "+591 70123456",
  },
  foundDetails: {
    condition: "Asustado",
    description: "Encontrado cerca del mercado.",
    foundAtLabel: "2026-06-18T11:00:00.000Z",
  },
  idempotencyKey: "found-report-draft-1",
  pet: {
    breed: "Mestizo",
    description: "Collar azul.",
    type: "Perro",
  },
  photos: [],
  showExactPinPublicly: false,
};

const sightingReportDraft: SightingReportDraft = {
  contact: {
    inAppChatEnabled: true,
    whatsappEnabled: false,
    whatsappPhone: "",
  },
  pet: {
    breed: "Siamés",
    description: "Gato con mancha blanca.",
    type: "Gato",
  },
  photos: [],
  showExactPinPublicly: false,
  sightingDetails: {
    description: "Lo vi cruzar la avenida.",
    direction: "Hacia Sopocachi",
    observedAtLabel: "2026-06-18T12:00:00.000Z",
    observedCondition: "Caminando",
  },
};

const adoptionListingDraft: AdoptionListingDraft = {
  adoptionDetails: {
    adoptionSummary: "Busca una familia tranquila.",
    healthNotes: "Vacunada.",
    idealHome: "Departamento seguro.",
  },
  contact: {
    inAppChatEnabled: true,
    whatsappEnabled: true,
    whatsappPhone: "+591 70123456",
  },
  inlinePet: {
    breed: "Mestizo",
    description: "Sociable.",
    name: "Nala",
    type: "Gato",
  },
  id: "adoption-listing-draft-1",
  petSelectionMode: "inline-create",
  photos: [],
  showExactPinPublicly: false,
};
