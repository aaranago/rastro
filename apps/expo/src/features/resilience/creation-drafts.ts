import type { AdoptionListingDraft } from "../adoption-listing-creation/adoption-listing-creation-types";
import type { FoundReportDraft } from "../found-report-creation/found-report-creation-types";
import type { LostReportDraft } from "../lost-report-creation/lost-report-creation-types";
import type { PetProfileDraft } from "../pet-profiles/pet-profile-types";
import type { SightingReportDraft } from "../sighting-report-creation/sighting-report-creation-types";
import type { AsyncKeyValueStorage } from "./storage";

export interface CreationDraftsByKind {
  "adoption-listing": AdoptionListingDraft;
  "found-report": FoundReportDraft;
  "lost-report": LostReportDraft;
  "pet-profile": PetProfileDraft;
  "sighting-report": SightingReportDraft;
}

export type CreationDraftKind = keyof CreationDraftsByKind;

export interface DurableCreationDraft<K extends CreationDraftKind> {
  draft: CreationDraftsByKind[K];
  kind: K;
  savedAt: string;
  schemaVersion: 1;
}

export interface CreationDraftStore {
  clearDraft<K extends CreationDraftKind>(
    kind: K,
    options?: CreationDraftScope,
  ): Promise<void>;
  loadDraft<K extends CreationDraftKind>(
    kind: K,
    options?: CreationDraftScope,
  ): Promise<DurableCreationDraft<K> | undefined>;
  saveDraft<K extends CreationDraftKind>(
    input: SaveCreationDraftInput<K>,
  ): Promise<DurableCreationDraft<K>>;
}

export interface CreationDraftScope {
  scopeId?: string;
}

export interface CreateCreationDraftStoreInput {
  namespace?: string;
  storage: AsyncKeyValueStorage;
}

interface StoredCreationDraft<K extends CreationDraftKind> {
  draft: CreationDraftsByKind[K];
  kind: K;
  savedAt: string;
  schemaVersion: number;
}

export type SaveCreationDraftInput<K extends CreationDraftKind> =
  CreationDraftScope & {
    draft: CreationDraftsByKind[K];
    kind: K;
    savedAt?: string;
  };

const schemaVersion = 1;
const defaultNamespace = "rastro:creation-draft";
const defaultScope = "default";

export function createCreationDraftStore({
  namespace = defaultNamespace,
  storage,
}: CreateCreationDraftStoreInput): CreationDraftStore {
  return {
    async clearDraft(kind, options) {
      await storage.removeItem(toStorageKey({ kind, namespace, ...options }));
    },
    async loadDraft<K extends CreationDraftKind>(
      kind: K,
      options?: CreationDraftScope,
    ) {
      const stored = await storage.getItem(
        toStorageKey({ kind, namespace, ...options }),
      );

      if (stored === null) {
        return undefined;
      }

      const parsed = JSON.parse(
        stored,
      ) as StoredCreationDraft<CreationDraftKind>;

      if (
        parsed.kind !== kind ||
        parsed.schemaVersion !== schemaVersion ||
        typeof parsed.savedAt !== "string"
      ) {
        return undefined;
      }

      return parsed as DurableCreationDraft<K>;
    },
    async saveDraft(input) {
      const durableDraft = {
        draft: input.draft,
        kind: input.kind,
        savedAt: input.savedAt ?? new Date().toISOString(),
        schemaVersion,
      } satisfies DurableCreationDraft<typeof input.kind>;

      await storage.setItem(
        toStorageKey({ kind: input.kind, namespace, scopeId: input.scopeId }),
        JSON.stringify(durableDraft),
      );

      return durableDraft;
    },
  };
}

function toStorageKey({
  kind,
  namespace,
  scopeId,
}: CreationDraftScope & {
  kind: CreationDraftKind;
  namespace: string;
}): string {
  return `${namespace}:v${schemaVersion}:${scopeId ?? defaultScope}:${kind}`;
}
