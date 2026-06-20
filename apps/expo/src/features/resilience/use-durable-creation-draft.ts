import * as React from "react";

import type {
  CreationDraftKind,
  CreationDraftsByKind,
  CreationDraftScope,
  CreationDraftStore,
  DurableCreationDraft,
} from "./creation-drafts";

export interface UseDurableCreationDraftInput<K extends CreationDraftKind>
  extends CreationDraftScope {
  initialDraft: CreationDraftsByKind[K];
  kind: K;
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
  draft: CreationDraftsByKind[K];
  draftPersistence: DurableCreationDraftPersistence;
  hasLoaded: boolean;
  restoredDraft: DurableCreationDraft<K> | null;
  setDraft: React.Dispatch<React.SetStateAction<CreationDraftsByKind[K]>>;
}

const loadDraftErrorMessage =
  "No pudimos recuperar tu borrador guardado. Puedes seguir editando.";
const saveDraftErrorMessage =
  "No pudimos guardar el borrador en este dispositivo. Tus cambios siguen en pantalla.";

export function useDurableCreationDraft<K extends CreationDraftKind>({
  initialDraft,
  kind,
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
  const skipNextSaveRef = React.useRef(true);

  React.useEffect(() => {
    if (store === undefined) {
      setDraft(initialDraft);
      setHasLoaded(true);
      setRestoredDraft(null);
      setDraftPersistence({ error: null, status: "disabled" });
      skipNextSaveRef.current = true;
      return;
    }

    let isCurrent = true;
    setHasLoaded(false);
    setDraftPersistence({ error: null, status: "loading" });

    store
      .loadDraft(kind, { scopeId })
      .then((savedDraft) => {
        if (!isCurrent) {
          return;
        }

        setDraft(savedDraft?.draft ?? initialDraft);
        setRestoredDraft(savedDraft ?? null);
        skipNextSaveRef.current = true;
        setHasLoaded(true);
        setDraftPersistence({ error: null, status: "ready" });
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setRestoredDraft(null);
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
  }, [initialDraft, kind, scopeId, store]);

  React.useEffect(() => {
    if (store === undefined || !hasLoaded) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    let isCurrent = true;
    setDraftPersistence({ error: null, status: "saving" });

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

    return () => {
      isCurrent = false;
    };
  }, [draft, hasLoaded, kind, scopeId, store]);

  const clearDraft = React.useCallback(async () => {
    await store?.clearDraft(kind, { scopeId });
    setRestoredDraft(null);
    setDraftPersistence((current) =>
      current.status === "disabled"
        ? current
        : {
            error: null,
            status: "ready",
          },
    );
  }, [kind, scopeId, store]);

  return {
    clearDraft,
    draft,
    draftPersistence,
    hasLoaded,
    restoredDraft,
    setDraft,
  };
}
