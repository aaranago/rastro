import { describe, expect, it } from "vitest";

import { getShellCopy } from "../../i18n";
import {
  deriveShellSessionFromAuthState,
  prepareShellAuthCredentials,
} from "./shell-auth";
import {
  chooseReportAction,
  createInitialShellState,
  createShellModel,
  createShellProfileModel,
} from "./shell-model";

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

  it("preserves a visitor's selected report intent in the sign-in prompt", () => {
    const copy = getShellCopy();
    const shell = createShellModel({ copy, session: { kind: "visitor" } });
    const lostAction = shell.reportActions.find(
      (action) => action.intent === "lost",
    );

    if (!lostAction) {
      throw new Error("Expected a lost report action");
    }

    const nextState = chooseReportAction(
      createInitialShellState(),
      lostAction,
      copy,
    );

    expect(nextState.authPrompt?.title).toBe("Inicia sesion para continuar");
    expect(nextState.authPrompt?.selectedIntentLabel).toBe("Reportar perdida");
    expect(nextState.authPrompt?.body).toContain("Reportar perdida");
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
    });
    expect(shell.appStates.permissionEducation.location.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "request-permission",
          label: "Usar mi ubicacion",
        }),
        expect.objectContaining({
          id: "manual-search",
          label: "Buscar por zona",
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
