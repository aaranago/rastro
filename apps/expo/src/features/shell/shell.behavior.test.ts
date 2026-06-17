import { describe, expect, it } from "vitest";

import { getShellCopy } from "../../i18n";
import {
  chooseReportAction,
  createInitialShellState,
  createShellModel,
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
});
