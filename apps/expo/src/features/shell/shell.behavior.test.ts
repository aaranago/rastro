import { describe, expect, it } from "vitest";

import { getShellCopy } from "../../i18n";
import {
  deriveShellSessionFromAuthState,
  prepareShellAuthCredentials,
} from "./shell-auth";
import {
  chooseReportAction,
  completeAuthPromptWithPendingMemberIntent,
  continueReportActionAsMember,
  createInitialShellState,
  createShellModel,
  createShellProfileModel,
  promotePendingMemberIntentForSession,
  requestShellAuthPrompt,
  shouldShowGlobalFabForSegments,
  toShellMemberCreationSession,
} from "./shell-model";
import {
  createShellFirstRunTourStore,
  loadShellFirstRunTourModel,
} from "./shell-onboarding";
import { reportIntentColors, shellColors } from "./shell-theme";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => Promise.resolve(values.get(key) ?? null),
    removeItem: (key: string) => {
      values.delete(key);
      return Promise.resolve();
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
}

describe("Rastro shell", () => {
  it("opens with Spanish Rastro tabs and report actions", () => {
    const copy = getShellCopy();
    const shell = createShellModel({ copy, session: { kind: "visitor" } });

    expect(shell.brand.name).toBe("Rastro");
    expect(shell.tabs.map((tab) => tab.label)).toEqual([
      "Cerca",
      "Actividad",
      "Recursos",
      "Perfil",
    ]);
    expect(shell.reportActions.map((action) => action.label)).toEqual([
      "Reportar perdida",
      "Reportar encontrada",
      "Reportar avistamiento",
      "Dar en adopcion",
    ]);
  });

  it("distinguishes Found Pet Report and Sighting Report actions with their own visual tones", () => {
    expect(reportIntentColors.found.background).toBe(shellColors.found);
    expect(reportIntentColors.sighting.background).toBe(shellColors.sighting);
    expect(reportIntentColors.found.background).not.toBe(
      reportIntentColors.sighting.background,
    );
  });

  it("derives signed-in shell state from Better Auth session data", () => {
    const copy = getShellCopy();

    const visitorShell = createShellModel({
      copy,
      session: deriveShellSessionFromAuthState({
        data: null,
        error: null,
        isPending: false,
      }),
    });
    const memberShell = createShellModel({
      copy,
      session: deriveShellSessionFromAuthState({
        data: {
          session: { id: "session_123" },
          user: {
            email: "ana@example.com",
            id: "member_123",
            name: "Ana",
          },
        },
        error: null,
        isPending: false,
      }),
    });

    expect(visitorShell.session.kind).toBe("visitor");
    expect(memberShell.session.kind).toBe("member");
  });

  it("derives pending auth as app loading instead of visitor browsing", () => {
    const copy = getShellCopy();

    const pendingShell = createShellModel({
      copy,
      session: deriveShellSessionFromAuthState({
        data: undefined,
        error: null,
        isPending: true,
      }),
    });

    expect(pendingShell.session.kind).toBe("loading");
    expect(pendingShell.session.kind).not.toBe("visitor");
    expect(pendingShell.appStates.states.loading.title).toBe("Cargando Rastro");
  });

  it("shows member account settings from Perfil", () => {
    const copy = getShellCopy();
    const profile = createShellProfileModel({
      copy,
      session: {
        email: "ana@example.com",
        id: "member_123",
        kind: "member",
        name: "Ana",
      },
    });

    expect(profile.accountSettings).toMatchObject({
      email: "ana@example.com",
      passwordResetAction: "Enviar enlace de restablecimiento",
      signOutAction: "Cerrar sesion",
      deletionAction: "Solicitar eliminacion de cuenta",
    });
    expect(profile.accountSettings?.deletionImpacts).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Perfiles de mascota"),
        expect.stringContaining("Reportes"),
        expect.stringContaining("adopcion"),
        expect.stringContaining("Conversaciones"),
        expect.stringContaining("Contenido publico"),
      ]),
    );
  });

  it("keeps signed-out Perfil copy for visitors", () => {
    const copy = getShellCopy();
    const profile = createShellProfileModel({
      copy,
      session: { kind: "visitor" },
    });

    expect(profile).toMatchObject({
      accountSettings: null,
      body: "Puedes explorar Cerca y Recursos. Inicia sesion para crear reportes y guardar tu actividad.",
      isMember: false,
      title: "Usas Rastro como visitante",
    });
  });

  it("prepares email and password prompt input for Better Auth actions", () => {
    expect(
      prepareShellAuthCredentials({
        email: " ANA@EXAMPLE.COM ",
        name: " Ana ",
        password: " rastro123 ",
      }),
    ).toEqual({
      credentials: {
        email: "ana@example.com",
        name: "Ana",
        password: " rastro123 ",
      },
      ok: true,
    });

    expect(
      prepareShellAuthCredentials({
        email: "",
        name: "",
        password: "rastro123",
      }),
    ).toEqual({
      ok: false,
      reason: "missing-credentials",
    });
  });

  it.each([
    ["lost", "Reportar perdida"],
    ["found", "Reportar encontrada"],
    ["sighting", "Reportar avistamiento"],
    ["adoption", "Dar en adopcion"],
  ] as const)(
    "preserves a visitor's selected %s report intent in the sign-in prompt",
    (intent, label) => {
      const copy = getShellCopy();
      const shell = createShellModel({ copy, session: { kind: "visitor" } });
      const action = shell.reportActions.find((item) => item.intent === intent);

      if (!action) {
        throw new Error(`Expected a ${intent} report action`);
      }

      const nextState = chooseReportAction(
        createInitialShellState(),
        action,
        copy,
      );

      expect(nextState.authPrompt?.title).toBe("Inicia sesion para continuar");
      expect(nextState.authPrompt?.selectedIntentLabel).toBe(label);
      expect(nextState.authPrompt?.body).toContain(label);
    },
  );

  it.each([
    ["lost", "Reportar perdida"],
    ["found", "Reportar encontrada"],
    ["sighting", "Reportar avistamiento"],
    ["adoption", "Dar en adopcion"],
  ] as const)(
    "continues a signed-in member's %s report action into the creation flow",
    (intent, label) => {
      const copy = getShellCopy();
      const shell = createShellModel({
        copy,
        session: {
          email: "ana@example.com",
          id: "member_123",
          kind: "member",
          name: "Ana",
        },
      });
      const action = shell.reportActions.find((item) => item.intent === intent);

      if (!action) {
        throw new Error(`Expected a ${intent} report action`);
      }

      const nextState = continueReportActionAsMember(
        createInitialShellState(),
        action,
      );

      expect(nextState.authPrompt).toBeNull();
      expect(nextState.memberIntent).toEqual({
        intent,
        label,
      });
    },
  );

  it("hands a protected visitor FAB action to the member creation flow after successful sign-in", () => {
    const copy = getShellCopy();
    const shell = createShellModel({ copy, session: { kind: "visitor" } });
    const action = shell.reportActions.find((item) => item.intent === "found");

    if (!action) {
      throw new Error("Expected a found report action");
    }

    const promptedState = chooseReportAction(
      createInitialShellState(),
      action,
      copy,
    );
    const signedInState =
      completeAuthPromptWithPendingMemberIntent(promptedState);

    expect(signedInState.authPrompt).toBeNull();
    expect(signedInState.memberIntent).toBeNull();
    expect(signedInState.pendingMemberIntent).toEqual({
      intent: "found",
      label: "Reportar encontrada",
    });

    expect(
      promotePendingMemberIntentForSession(signedInState, {
        kind: "visitor",
      }).memberIntent,
    ).toBeNull();
    expect(
      promotePendingMemberIntentForSession(signedInState, {
        kind: "loading",
      }).memberIntent,
    ).toBeNull();

    const memberSession = {
      email: "ana@example.com",
      id: "member_123",
      kind: "member",
      name: "Ana",
    } as const;
    const readyState = promotePendingMemberIntentForSession(
      signedInState,
      memberSession,
    );

    expect(readyState.pendingMemberIntent).toBeNull();
    expect(readyState.memberIntent).toEqual({
      intent: "found",
      label: "Reportar encontrada",
    });
    expect(toShellMemberCreationSession(memberSession)).toEqual({
      displayName: "Ana",
      kind: "member",
      memberId: "member_123",
    });
  });

  it("opens a reusable auth prompt for Activity/Profile links and preserves returnTo after successful auth", () => {
    const copy = getShellCopy();
    const promptedState = requestShellAuthPrompt(
      createInitialShellState(),
      copy,
      {
        returnTo: "/(tabs)/(activity)",
        sourceHref: "rastro://auth/sign-in?returnTo=/actividad",
      },
    );

    expect(promptedState.authPrompt).toMatchObject({
      body: "Inicia sesion o crea una cuenta para guardar tu actividad y continuar en Rastro.",
      returnTo: "/(tabs)/(activity)",
      title: "Inicia sesion para continuar",
    });
    expect(promptedState.memberIntent).toBeNull();
    expect(promptedState.pendingMemberIntent).toBeNull();

    const signedInState =
      completeAuthPromptWithPendingMemberIntent(promptedState);

    expect(signedInState.authPrompt).toBeNull();
    expect(signedInState.authReturnTo).toBe("/(tabs)/(activity)");
    expect(signedInState.pendingMemberIntent).toBeNull();
  });

  it("shows the three-step first-run tour once and persists skip or completion", async () => {
    const copy = getShellCopy();
    const storage = createMemoryStorage();
    const store = createShellFirstRunTourStore({ storage });

    const firstRun = await loadShellFirstRunTourModel({ copy, store });

    expect(firstRun.shouldShow).toBe(true);
    expect(firstRun.steps.map((step) => step.title)).toEqual([
      "Encuentra reportes cerca",
      "Reporta con datos utiles",
      "Activa ayuda local",
    ]);
    expect(firstRun.skipLabel).toBe("Omitir");
    expect(firstRun.completeLabel).toBe("Empezar");

    await store.markCompleted({ reason: "skip" });

    const nextStore = createShellFirstRunTourStore({ storage });
    const nextRun = await loadShellFirstRunTourModel({
      copy,
      store: nextStore,
    });

    expect(await nextStore.hasCompleted()).toBe(true);
    expect(nextRun.shouldShow).toBe(false);
  });

  it("shows the global FAB only on main tab routes", () => {
    expect(shouldShowGlobalFabForSegments(["(tabs)", "(nearby)"])).toBe(true);
    expect(shouldShowGlobalFabForSegments(["(tabs)", "(profile)"])).toBe(true);
    expect(
      shouldShowGlobalFabForSegments([
        "(tabs)",
        "(nearby)",
        "reportes",
        "perdidos",
        "[reportId]",
      ]),
    ).toBe(false);
    expect(
      shouldShowGlobalFabForSegments([
        "(tabs)",
        "(activity)",
        "chats",
        "[conversationId]",
      ]),
    ).toBe(false);
  });

  it("exposes reusable Spanish app states from the shell", () => {
    const copy = getShellCopy();
    const shell = createShellModel({ copy, session: { kind: "visitor" } });

    expect(shell.appStates.states.loading).toMatchObject({
      kind: "loading",
      title: "Cargando Rastro",
    });
    expect(shell.appStates.states.empty).toMatchObject({
      kind: "empty",
      title: "Nada por aqui todavia",
    });
    expect(shell.appStates.states.empty.actions?.[0]).toMatchObject({
      id: "manual-search",
      label: "Buscar por zona",
    });
    expect(shell.appStates.states["offline-stale"]).toMatchObject({
      isStale: true,
      kind: "offline",
      title: "Sin conexion",
    });
    expect(shell.appStates.states.retry.actions?.[0]).toMatchObject({
      id: "retry",
      label: "Reintentar",
    });
    expect(shell.appStates.states.error.body).not.toMatch(
      /error|failed|try again/i,
    );
  });

  it("describes contextual permission education before system prompts", () => {
    const copy = getShellCopy();
    const shell = createShellModel({ copy, session: { kind: "visitor" } });

    expect(shell.appStates.permissionEducation.location).toMatchObject({
      context: "nearby",
      kind: "permission-education",
      permission: "location",
      title: "Encuentra reportes cerca de ti",
      body: "Usamos tu ubicacion solo para ordenar reportes por distancia.",
    });
    expect(shell.appStates.permissionEducation.location.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "request-permission",
          label: "Usar mi ubicacion actual",
        }),
        expect.objectContaining({
          id: "manual-search",
          label: "Buscar ciudad o zona",
        }),
      ]),
    );
    expect(shell.appStates.permissionEducation.notifications).toMatchObject({
      context: "alert-subscription",
      permission: "notifications",
    });
    expect(shell.appStates.permissionEducation["photos-camera"].body).toContain(
      "foto",
    );
    expect(
      shell.appStates.permissionEducation["background-location"],
    ).toMatchObject({
      context: "moving-alerts",
      permission: "background-location",
    });
    expect(
      shell.appStates.permissionEducation["background-location"].body,
    ).toContain("alertas mientras me muevo");
  });
});
