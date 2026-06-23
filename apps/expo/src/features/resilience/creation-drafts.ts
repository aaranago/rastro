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
  recovery?: CreationDraftRecoveryMetadata;
  savedAt: string;
  schemaVersion: 2;
}

export interface CreationDraftRecoveryMetadata {
  currentStep?: string;
  idempotencyKey?: string;
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
  loadDraftForRecovery<K extends CreationDraftKind>(
    kind: K,
    options?: CreationDraftScope,
  ): Promise<CreationDraftLoadResult<K>>;
  saveDraft<K extends CreationDraftKind>(
    input: SaveCreationDraftInput<K>,
  ): Promise<DurableCreationDraft<K>>;
}

export type CreationDraftLoadResult<K extends CreationDraftKind> =
  | { status: "found"; draft: DurableCreationDraft<K> }
  | { status: "incompatible"; reason: string }
  | { status: "migrated"; draft: DurableCreationDraft<K> }
  | { status: "missing" };

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
  recovery?: CreationDraftRecoveryMetadata;
  savedAt: string;
  schemaVersion: number;
}

export type SaveCreationDraftInput<K extends CreationDraftKind> =
  CreationDraftScope & {
    draft: CreationDraftsByKind[K];
    kind: K;
    recovery?: CreationDraftRecoveryMetadata;
    savedAt?: string;
  };

const schemaVersion = 2;
const legacySchemaVersion = 1;
const defaultNamespace = "rastro:creation-draft";
const defaultScope = "default";

export function createCreationDraftStore({
  namespace = defaultNamespace,
  storage,
}: CreateCreationDraftStoreInput): CreationDraftStore {
  return {
    async clearDraft(kind, options) {
      await Promise.all([
        storage.removeItem(toStorageKey({ kind, namespace, ...options })),
        storage.removeItem(
          toStorageKey({
            kind,
            namespace,
            schemaVersion: legacySchemaVersion,
            ...options,
          }),
        ),
      ]);
    },
    async loadDraft<K extends CreationDraftKind>(
      kind: K,
      options?: CreationDraftScope,
    ) {
      const result = await this.loadDraftForRecovery(kind, options);

      return result.status === "found" || result.status === "migrated"
        ? result.draft
        : undefined;
    },
    async loadDraftForRecovery<K extends CreationDraftKind>(
      kind: K,
      options?: CreationDraftScope,
    ) {
      const stored = await storage.getItem(
        toStorageKey({ kind, namespace, ...options }),
      );

      if (stored === null) {
        const legacyStored = await storage.getItem(
          toStorageKey({
            kind,
            namespace,
            schemaVersion: legacySchemaVersion,
            ...options,
          }),
        );

        if (legacyStored === null) {
          return { status: "missing" };
        }

        const migrated = migrateLegacyStoredDraft<K>(legacyStored, kind);

        return migrated === null
          ? {
              reason: "Stored draft is not compatible with this app version.",
              status: "incompatible",
            }
          : {
              draft: migrated,
              status: "migrated",
            };
      }

      const parsed = safeParseStoredDraft(stored);

      if (!parsed) {
        return {
          reason: "Stored draft is not compatible with this app version.",
          status: "incompatible",
        };
      }

      if (
        parsed.kind !== kind ||
        parsed.schemaVersion !== schemaVersion ||
        typeof parsed.savedAt !== "string"
      ) {
        return {
          reason: "Stored draft is not compatible with this app version.",
          status: "incompatible",
        };
      }

      return {
        draft: parsed as DurableCreationDraft<K>,
        status: "found",
      };
    },
    async saveDraft(input) {
      const durableDraft = {
        draft: input.draft,
        kind: input.kind,
        ...(input.recovery === undefined ? {} : { recovery: input.recovery }),
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
  schemaVersion: storageSchemaVersion = schemaVersion,
  scopeId,
}: CreationDraftScope & {
  kind: CreationDraftKind;
  namespace: string;
  schemaVersion?: number;
}): string {
  return `${namespace}:v${storageSchemaVersion}:${scopeId ?? defaultScope}:${kind}`;
}

function migrateLegacyStoredDraft<K extends CreationDraftKind>(
  stored: string,
  kind: K,
): DurableCreationDraft<K> | null {
  const parsed = safeParseStoredDraft(stored);

  if (!parsed) {
    return null;
  }

  if (
    parsed.kind !== kind ||
    parsed.schemaVersion !== legacySchemaVersion ||
    typeof parsed.savedAt !== "string"
  ) {
    return null;
  }

  return {
    draft: parsed.draft as CreationDraftsByKind[K],
    kind,
    savedAt: parsed.savedAt,
    schemaVersion,
  };
}

function safeParseStoredDraft(
  stored: string,
): StoredCreationDraft<CreationDraftKind> | null {
  try {
    const parsed: unknown = JSON.parse(stored);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as StoredCreationDraft<CreationDraftKind>;
  } catch {
    return null;
  }
}
