import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PetProfileDraft } from "../pet-profiles/pet-profile-types";
import type {
  CreationDraftStore,
  DurableCreationDraft,
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
    hookRuntime.effectIndex = 0;
    hookRuntime.effectSlots = [];
    hookRuntime.pendingEffects = [];
    hookRuntime.refIndex = 0;
    hookRuntime.refSlots = [];
    hookRuntime.stateIndex = 0;
    hookRuntime.stateSlots = [];
  });

  it("keeps the in-memory draft and exposes an accessible save failure when autosave fails", async () => {
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
});

function renderDurablePetProfileDraft({
  initialDraft,
  store,
}: {
  initialDraft: PetProfileDraft;
  store: CreationDraftStore;
}) {
  hookRuntime.effectIndex = 0;
  hookRuntime.refIndex = 0;
  hookRuntime.stateIndex = 0;

  // eslint-disable-next-line react-hooks/rules-of-hooks -- This test harness supplies a mocked React dispatcher.
  return useDurableCreationDraft({
    initialDraft,
    kind: "pet-profile",
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

  await new Promise((resolve) => setTimeout(resolve, 0));
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

function createDraftStore({
  loadDraft = () => Promise.resolve(undefined),
  saveDraft = (input) =>
    Promise.resolve({
      draft: input.draft,
      kind: input.kind,
      savedAt: input.savedAt ?? "2026-06-19T12:00:00.000Z",
      schemaVersion: 1,
    } as DurableCreationDraft<typeof input.kind>),
}: Partial<CreationDraftStore> = {}): CreationDraftStore {
  return {
    clearDraft: () => Promise.resolve(),
    loadDraft,
    saveDraft,
  };
}
