import * as React from "react";

import type {
  CreationDraftKind,
  CreationDraftLoadResult,
  CreationDraftsByKind,
  CreationDraftScope,
  CreationDraftStore,
  DurableCreationDraft,
} from "./creation-drafts";

export interface UseDurableCreationDraftInput<K extends CreationDraftKind>
  extends CreationDraftScope {
  initialDraft: CreationDraftsByKind[K];
  kind: K;
  recoveryMode?: "explicit" | "silent";
  store?: CreationDraftStore;
}

export type DurableCreationDraftPersistenceStatus =
  | "disabled"
  | "error"
  | "loading"
  | "ready"
  | "saved"
  | "saving";

export type DurableCreationDraftPersistenceErrorKind = "load" | "save";

export interface DurableCreationDraftPersistenceError {
  cause: unknown;
  kind: DurableCreationDraftPersistenceErrorKind;
  message: string;
}

export interface DurableCreationDraftPersistence {
  error: DurableCreationDraftPersistenceError | null;
  status: DurableCreationDraftPersistenceStatus;
}

export interface DurableCreationDraftState<K extends CreationDraftKind> {
  clearDraft: () => Promise<void>;
  discardDraft: () => Promise<void>;
  draft: CreationDraftsByKind[K];
  draftPersistence: DurableCreationDraftPersistence;
  draftRecovery: DurableCreationDraftRecovery<K>;
  draftResetVersion: number;
  hasLoaded: boolean;
  restoredDraft: DurableCreationDraft<K> | null;
  resumeDraft: () => void;
  setDraft: React.Dispatch<React.SetStateAction<CreationDraftsByKind[K]>>;
}

export type DurableCreationDraftRecovery<K extends CreationDraftKind> =
  | { status: "available"; draft: DurableCreationDraft<K> }
  | { status: "checking" }
  | { status: "disabled" }
  | { status: "incompatible"; reason: string }
  | { status: "none" };

const loadDraftErrorMessage =
  "No pudimos recuperar tu borrador guardado. Puedes seguir editando.";
const saveDraftErrorMessage =
  "No pudimos guardar el borrador en este dispositivo. Tus cambios siguen en pantalla.";

export function useDurableCreationDraft<K extends CreationDraftKind>({
  initialDraft,
  kind,
  recoveryMode = "silent",
  scopeId,
  store,
}: UseDurableCreationDraftInput<K>): DurableCreationDraftState<K> {
  const [draft, setDraft] =
    React.useState<CreationDraftsByKind[K]>(initialDraft);
  const [hasLoaded, setHasLoaded] = React.useState(store === undefined);
  const [restoredDraft, setRestoredDraft] =
    React.useState<DurableCreationDraft<K> | null>(null);
  const [draftPersistence, setDraftPersistence] =
    React.useState<DurableCreationDraftPersistence>(() => ({
      error: null,
      status: store === undefined ? "disabled" : "loading",
    }));
  const [draftRecovery, setDraftRecovery] = React.useState<
    DurableCreationDraftRecovery<K>
  >(() => ({
    status: store === undefined ? "disabled" : "checking",
  }));
  const [draftResetVersion, setDraftResetVersion] = React.useState(0);
  const lastSavedDraftSignatureRef = React.useRef(serializeDraft(initialDraft));
  const skipNextSaveRef = React.useRef(true);

  React.useEffect(() => {
    if (store === undefined) {
      setDraft(initialDraft);
      setHasLoaded(true);
      setRestoredDraft(null);
      setDraftRecovery({ status: "disabled" });
      setDraftPersistence({ error: null, status: "disabled" });
      lastSavedDraftSignatureRef.current = serializeDraft(initialDraft);
      skipNextSaveRef.current = true;
      return;
    }

    let isCurrent = true;
    setHasLoaded(false);
    setDraftRecovery({ status: "checking" });
    setDraftPersistence({ error: null, status: "loading" });

    const loadSavedDraft =
      recoveryMode === "explicit"
        ? store.loadDraftForRecovery(kind, { scopeId })
        : store.loadDraft(kind, { scopeId });

    loadSavedDraft
      .then((savedDraftOrResult) => {
        if (!isCurrent) {
          return;
        }

        if (recoveryMode === "explicit") {
          const result = savedDraftOrResult as CreationDraftLoadResult<K>;

          setDraft(initialDraft);
          lastSavedDraftSignatureRef.current = serializeDraft(initialDraft);
          setRestoredDraft(null);
          setDraftRecovery(toDraftRecovery(result));
        } else {
          const savedDraft = savedDraftOrResult as
            | DurableCreationDraft<K>
            | undefined;

          setDraft(savedDraft?.draft ?? initialDraft);
          lastSavedDraftSignatureRef.current = serializeDraft(
            savedDraft?.draft ?? initialDraft,
          );
          setRestoredDraft(savedDraft ?? null);
          setDraftRecovery(
            savedDraft === undefined
              ? { status: "none" }
              : { draft: savedDraft, status: "available" },
          );
        }

        skipNextSaveRef.current = true;
        setHasLoaded(true);
        setDraftPersistence({ error: null, status: "ready" });
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setRestoredDraft(null);
        setDraftRecovery({ status: "none" });
        lastSavedDraftSignatureRef.current = serializeDraft(initialDraft);
        skipNextSaveRef.current = true;
        setHasLoaded(true);
        setDraftPersistence({
          error: {
            cause: error,
            kind: "load",
            message: loadDraftErrorMessage,
          },
          status: "error",
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [initialDraft, kind, recoveryMode, scopeId, store]);

  React.useEffect(() => {
    if (store === undefined || !hasLoaded) {
      return;
    }

    if (
      draftRecovery.status === "available" ||
      draftRecovery.status === "checking"
    ) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const draftSignature = serializeDraft(draft);

    if (draftSignature === lastSavedDraftSignatureRef.current) {
      return;
    }

    let isCurrent = true;
    setDraftPersistence({ error: null, status: "saving" });

    const saveTimeout = setTimeout(() => {
      store
        .saveDraft({
          draft,
          kind,
          scopeId,
        })
        .then(() => {
          if (!isCurrent) {
            return;
          }

          lastSavedDraftSignatureRef.current = draftSignature;
          setDraftPersistence({ error: null, status: "saved" });
        })
        .catch((error: unknown) => {
          if (!isCurrent) {
            return;
          }

          setDraftPersistence({
            error: {
              cause: error,
              kind: "save",
              message: saveDraftErrorMessage,
            },
            status: "error",
          });
        });
    }, 500);

    return () => {
      isCurrent = false;
      clearTimeout(saveTimeout);
    };
  }, [draft, draftRecovery.status, hasLoaded, kind, scopeId, store]);

  const clearDraft = React.useCallback(async () => {
    await store?.clearDraft(kind, { scopeId });
    setRestoredDraft(null);
    setDraftRecovery({ status: store === undefined ? "disabled" : "none" });
    setDraftPersistence((current) =>
      current.status === "disabled"
        ? current
        : {
            error: null,
            status: "ready",
          },
    );
  }, [kind, scopeId, store]);

  const discardDraft = React.useCallback(async () => {
    await store?.clearDraft(kind, { scopeId });
    setDraft(initialDraft);
    setRestoredDraft(null);
    setDraftRecovery({ status: store === undefined ? "disabled" : "none" });
    setDraftResetVersion((version) => version + 1);
    lastSavedDraftSignatureRef.current = serializeDraft(initialDraft);
    skipNextSaveRef.current = true;
    setDraftPersistence((current) =>
      current.status === "disabled"
        ? current
        : {
            error: null,
            status: "ready",
          },
    );
  }, [initialDraft, kind, scopeId, store]);

  const resumeDraft = React.useCallback(() => {
    if (draftRecovery.status !== "available") {
      return;
    }

    setDraft(draftRecovery.draft.draft);
    setRestoredDraft(draftRecovery.draft);
    setDraftRecovery({ status: "none" });
    setDraftResetVersion((version) => version + 1);
    lastSavedDraftSignatureRef.current = serializeDraft(
      draftRecovery.draft.draft,
    );
    skipNextSaveRef.current = true;
  }, [draftRecovery]);

  return {
    clearDraft,
    discardDraft,
    draft,
    draftPersistence,
    draftRecovery,
    draftResetVersion,
    hasLoaded,
    resumeDraft,
    restoredDraft,
    setDraft,
  };
}

function toDraftRecovery<K extends CreationDraftKind>(
  result: CreationDraftLoadResult<K>,
): DurableCreationDraftRecovery<K> {
  switch (result.status) {
    case "found":
    case "migrated":
      return {
        draft: result.draft,
        status: "available",
      };
    case "incompatible":
      return {
        reason: result.reason,
        status: "incompatible",
      };
    case "missing":
      return { status: "none" };
  }
}

function serializeDraft(draft: unknown): string {
  return JSON.stringify(draft);
}
