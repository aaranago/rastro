import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PetProfileDraft } from "../pet-profiles/pet-profile-types";
import type {
  CreationDraftLoadResult,
  CreationDraftScope,
  CreationDraftStore,
  DurableCreationDraft,
  SaveCreationDraftInput,
} from "./creation-drafts";
import type { DurableCreationDraftState } from "./use-durable-creation-draft";
import { useDurableCreationDraft } from "./use-durable-creation-draft";

const hookRuntime = vi.hoisted(() => {
  type EffectCleanup = void | (() => void);
  interface EffectSlot {
    cleanup?: EffectCleanup;
    deps?: readonly unknown[];
  }

  return {
    effectIndex: 0,
    effectSlots: [] as EffectSlot[],
    pendingEffects: [] as (() => EffectCleanup)[],
    refIndex: 0,
    refSlots: [] as { current: unknown }[],
    stateIndex: 0,
    stateSlots: [] as unknown[],
  };
});

vi.mock("react", () => ({
  useCallback: <TCallback>(callback: TCallback) => callback,
  useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => {
    const index = hookRuntime.effectIndex;
    hookRuntime.effectIndex += 1;
    const previous = hookRuntime.effectSlots[index];
    const shouldRun =
      deps === undefined ||
      previous?.deps === undefined ||
      deps.length !== previous.deps.length ||
      deps.some((dependency, dependencyIndex) =>
        Object.is(dependency, previous.deps?.[dependencyIndex]) ? false : true,
      );

    if (!shouldRun) {
      return;
    }

    hookRuntime.pendingEffects.push(() => {
      if (typeof previous?.cleanup === "function") {
        previous.cleanup();
      }

      const cleanup = effect();
      hookRuntime.effectSlots[index] = { cleanup, deps };

      return cleanup;
    });
  },
  useRef: <TValue>(initialValue: TValue) => {
    const index = hookRuntime.refIndex;
    hookRuntime.refIndex += 1;

    hookRuntime.refSlots[index] ??= { current: initialValue };

    return hookRuntime.refSlots[index] as { current: TValue };
  },
  useState: <TValue>(initialValue: TValue | (() => TValue)) => {
    const index = hookRuntime.stateIndex;
    hookRuntime.stateIndex += 1;

    if (hookRuntime.stateSlots[index] === undefined) {
      hookRuntime.stateSlots[index] =
        typeof initialValue === "function"
          ? (initialValue as () => TValue)()
          : initialValue;
    }

    const setState = (nextValue: TValue | ((current: TValue) => TValue)) => {
      const currentValue = hookRuntime.stateSlots[index] as TValue;
      hookRuntime.stateSlots[index] =
        typeof nextValue === "function"
          ? (nextValue as (current: TValue) => TValue)(currentValue)
          : nextValue;
    };

    return [hookRuntime.stateSlots[index], setState] as const;
  },
}));

describe("useDurableCreationDraft", () => {
  beforeEach(() => {
    vi.useRealTimers();
    hookRuntime.effectIndex = 0;
    hookRuntime.effectSlots = [];
    hookRuntime.pendingEffects = [];
    hookRuntime.refIndex = 0;
    hookRuntime.refSlots = [];
    hookRuntime.stateIndex = 0;
    hookRuntime.stateSlots = [];
  });

  it("keeps the in-memory draft and exposes an accessible save failure when autosave fails", async () => {
    vi.useFakeTimers();
    const initialDraft = createPetProfileDraft({ name: "" });
    const store = createDraftStore({
      saveDraft: () => Promise.reject(new Error("SecureStore unavailable")),
    });

    let state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();

    state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();

    state.setDraft((current) => ({
      ...current,
      name: "Toby",
    }));

    state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    state = renderDurablePetProfileDraft({ initialDraft, store });

    expect(state.draft.name).toBe("Toby");
    expect(
      (
        state as DurableCreationDraftState<"pet-profile"> & {
          draftPersistence?: unknown;
        }
      ).draftPersistence,
    ).toMatchObject({
      error: {
        kind: "save",
        message:
          "No pudimos guardar el borrador en este dispositivo. Tus cambios siguen en pantalla.",
      },
      status: "error",
    });
  });

  it("keeps the current draft and exposes a load failure when draft restore fails", async () => {
    const initialDraft = createPetProfileDraft({ name: "Toby" });
    const store = createDraftStore({
      loadDraft: () => Promise.reject(new Error("Cannot read SecureStore")),
    });

    let state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();

    state = renderDurablePetProfileDraft({ initialDraft, store });

    expect(state.draft.name).toBe("Toby");
    expect(state.draftPersistence).toMatchObject({
      error: {
        kind: "load",
        message:
          "No pudimos recuperar tu borrador guardado. Puedes seguir editando.",
      },
      status: "error",
    });
  });

  it("offers a saved draft for explicit recovery without replacing the initial draft", async () => {
    const initialDraft = createPetProfileDraft({ name: "Fresh start" });
    const savedDraft = createPetProfileDraft({ name: "Saved Toby" });
    const store = createDraftStore({
      loadDraftForRecovery: () =>
        Promise.resolve(createFoundPetProfileRecoveryResult(savedDraft)),
    });

    let state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    await flushEffects();

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });

    expect(state.draft.name).toBe("Fresh start");
    expect(state.draftResetVersion).toBe(0);
    expect(state.restoredDraft).toBeNull();
    expect(state.draftRecovery).toMatchObject({
      draft: {
        draft: savedDraft,
        kind: "pet-profile",
      },
      status: "available",
    });
  });

  it("resumes an explicitly offered saved draft only after resume is invoked", async () => {
    const initialDraft = createPetProfileDraft({ name: "Fresh start" });
    const savedDraft = createPetProfileDraft({ name: "Saved Toby" });
    const store = createDraftStore({
      loadDraftForRecovery: () =>
        Promise.resolve(createFoundPetProfileRecoveryResult(savedDraft)),
    });

    let state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    await flushEffects();

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    state.resumeDraft();

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });

    expect(state.draft.name).toBe("Saved Toby");
    expect(state.draftRecovery).toEqual({ status: "none" });
    expect(state.draftResetVersion).toBe(1);
    expect(state.restoredDraft).toMatchObject({
      draft: savedDraft,
      kind: "pet-profile",
    });
  });

  it("discards an explicitly offered saved draft and keeps the initial draft", async () => {
    const initialDraft = createPetProfileDraft({ name: "Fresh start" });
    const savedDraft = createPetProfileDraft({ name: "Saved Toby" });
    const clearDraft = vi.fn(() => Promise.resolve());
    const store = createDraftStore({
      clearDraft,
      loadDraftForRecovery: () =>
        Promise.resolve(createFoundPetProfileRecoveryResult(savedDraft)),
    });

    let state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    await flushEffects();

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    await state.discardDraft();

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });

    expect(clearDraft).toHaveBeenCalledWith("pet-profile", {
      scopeId: "member-camila",
    });
    expect(state.draft.name).toBe("Fresh start");
    expect(state.draftRecovery).toEqual({ status: "none" });
    expect(state.draftResetVersion).toBe(1);
  });

  it("debounces autosave and persists only the latest meaningful draft change", async () => {
    vi.useFakeTimers();
    const initialDraft = createPetProfileDraft({ name: "" });
    const saveDraft = vi.fn((input: SaveCreationDraftInput<"pet-profile">) =>
      Promise.resolve({
        draft: input.draft,
        kind: input.kind,
        savedAt: "2026-06-19T12:00:00.000Z",
        schemaVersion: 2,
      } satisfies DurableCreationDraft<"pet-profile">),
    );
    const store = createDraftStore({ saveDraft });

    let state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();

    state = renderDurablePetProfileDraft({ initialDraft, store });
    state.setDraft((current) => ({ ...current, name: "To" }));

    state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();
    await vi.advanceTimersByTimeAsync(300);

    state.setDraft((current) => ({ ...current, name: "Toby" }));

    state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();
    await vi.advanceTimersByTimeAsync(499);

    expect(saveDraft).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith({
      draft: createPetProfileDraft({ name: "Toby" }),
      kind: "pet-profile",
      scopeId: "member-camila",
    });
  });

  it("does not autosave while explicit recovery is still pending or available", async () => {
    vi.useFakeTimers();
    const initialDraft = createPetProfileDraft({ name: "Fresh start" });
    const savedDraft = createPetProfileDraft({ name: "Saved Toby" });
    const saveDraft = vi.fn();
    let resolveRecovery:
      | ((result: CreationDraftLoadResult<"pet-profile">) => void)
      | undefined;
    const recoveryPromise = new Promise<CreationDraftLoadResult<"pet-profile">>(
      (resolve) => {
        resolveRecovery = resolve;
      },
    );
    const store = createDraftStore({
      loadDraftForRecovery: () => recoveryPromise,
      saveDraft,
    });

    let state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    await flushEffects();

    state.setDraft((current) => ({ ...current, name: "Typing before load" }));

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    expect(saveDraft).not.toHaveBeenCalled();

    resolveRecovery?.(createFoundPetProfileRecoveryResult(savedDraft));
    await flushEffects();

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    state.setDraft((current) => ({ ...current, name: "Still pending user" }));

    state = renderDurablePetProfileDraft({
      initialDraft,
      recoveryMode: "explicit",
      store,
    });
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    expect(state.draftRecovery.status).toBe("available");
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it("does not autosave a semantically identical draft", async () => {
    vi.useFakeTimers();
    const initialDraft = createPetProfileDraft({ name: "Toby" });
    const saveDraft = vi.fn();
    const store = createDraftStore({ saveDraft });

    let state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();

    state = renderDurablePetProfileDraft({ initialDraft, store });
    state.setDraft((current) => ({ ...current }));

    state = renderDurablePetProfileDraft({ initialDraft, store });
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    expect(saveDraft).not.toHaveBeenCalled();
  });
});

function renderDurablePetProfileDraft({
  initialDraft,
  recoveryMode,
  store,
}: {
  initialDraft: PetProfileDraft;
  recoveryMode?: "explicit" | "silent";
  store: CreationDraftStore;
}) {
  hookRuntime.effectIndex = 0;
  hookRuntime.refIndex = 0;
  hookRuntime.stateIndex = 0;

  // eslint-disable-next-line react-hooks/rules-of-hooks -- This test harness supplies a mocked React dispatcher.
  return useDurableCreationDraft({
    initialDraft,
    kind: "pet-profile",
    recoveryMode,
    scopeId: "member-camila",
    store,
  });
}

async function flushEffects() {
  const pendingEffects = hookRuntime.pendingEffects;
  hookRuntime.pendingEffects = [];

  for (const effect of pendingEffects) {
    effect();
  }

  await Promise.resolve();
  await Promise.resolve();
}

function createPetProfileDraft(
  overrides: Partial<PetProfileDraft> = {},
): PetProfileDraft {
  return {
    breed: "",
    description: "",
    name: "",
    photos: [],
    type: "",
    ...overrides,
  };
}

interface PetProfileDraftStoreOverrides {
  clearDraft?: CreationDraftStore["clearDraft"];
  loadDraft?: CreationDraftStore["loadDraft"];
  loadDraftForRecovery?: (
    kind: "pet-profile",
    options?: CreationDraftScope,
  ) => Promise<CreationDraftLoadResult<"pet-profile">>;
  saveDraft?: (
    input: SaveCreationDraftInput<"pet-profile">,
  ) => Promise<DurableCreationDraft<"pet-profile">>;
}

function createDraftStore({
  clearDraft = () => Promise.resolve(),
  loadDraft = () => Promise.resolve(undefined),
  loadDraftForRecovery = async (kind, options) => {
    const draft = await loadDraft(kind, options);

    return draft === undefined
      ? { status: "missing" }
      : { draft, status: "found" };
  },
  saveDraft = (input) =>
    Promise.resolve({
      draft: input.draft,
      kind: input.kind,
      savedAt: input.savedAt ?? "2026-06-19T12:00:00.000Z",
      schemaVersion: 2,
    } as DurableCreationDraft<typeof input.kind>),
}: PetProfileDraftStoreOverrides = {}): CreationDraftStore {
  return {
    clearDraft,
    loadDraft,
    loadDraftForRecovery: async (kind, options) => {
      if (kind !== "pet-profile") {
        return { status: "missing" };
      }

      return (await loadDraftForRecovery(
        kind,
        options,
      )) as CreationDraftLoadResult<typeof kind>;
    },
    saveDraft: (input) => {
      if (input.kind !== "pet-profile") {
        throw new Error(`Unsupported test draft kind: ${input.kind}`);
      }

      return saveDraft(
        input as SaveCreationDraftInput<"pet-profile">,
      ) as Promise<DurableCreationDraft<typeof input.kind>>;
    },
  };
}

function createFoundPetProfileRecoveryResult(
  draft: PetProfileDraft,
): CreationDraftLoadResult<"pet-profile"> {
  return {
    draft: {
      draft,
      kind: "pet-profile",
      savedAt: "2026-06-19T12:00:00.000Z",
      schemaVersion: 2,
    },
    status: "found",
  };
}
