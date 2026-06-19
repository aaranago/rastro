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

export interface DurableCreationDraftState<K extends CreationDraftKind> {
  clearDraft: () => Promise<void>;
  draft: CreationDraftsByKind[K];
  hasLoaded: boolean;
  restoredDraft: DurableCreationDraft<K> | null;
  setDraft: React.Dispatch<React.SetStateAction<CreationDraftsByKind[K]>>;
}

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
  const skipNextSaveRef = React.useRef(true);

  React.useEffect(() => {
    if (store === undefined) {
      setDraft(initialDraft);
      setHasLoaded(true);
      setRestoredDraft(null);
      skipNextSaveRef.current = true;
      return;
    }

    let isCurrent = true;
    setHasLoaded(false);

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
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }

        setDraft(initialDraft);
        setRestoredDraft(null);
        skipNextSaveRef.current = true;
        setHasLoaded(true);
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

    void store.saveDraft({
      draft,
      kind,
      scopeId,
    });
  }, [draft, hasLoaded, kind, scopeId, store]);

  const clearDraft = React.useCallback(async () => {
    await store?.clearDraft(kind, { scopeId });
    setRestoredDraft(null);
  }, [kind, scopeId, store]);

  return {
    clearDraft,
    draft,
    hasLoaded,
    restoredDraft,
    setDraft,
  };
}
