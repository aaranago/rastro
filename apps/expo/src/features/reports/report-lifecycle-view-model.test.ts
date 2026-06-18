import { describe, expect, it } from "vitest";

import {
  buildPublicReportLifecycleViewModel,
  formatReportOutcome,
} from "./report-lifecycle-view-model";

describe("public report lifecycle presentation", () => {
  it("prompts the caretaker to confirm or close a stale Active Report from detail", () => {
    const viewModel = buildPublicReportLifecycleViewModel({
      caretakerMemberId: "member-camila",
      now: "2026-06-18T12:00:00.000Z",
      outcome: "still-missing",
      reportTitle: "Bruno",
      status: "active",
      staleAfterDays: 14,
      updatedAt: "2026-06-01T12:00:00.000Z",
      viewer: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel.canManage).toBe(true);
    expect(viewModel.actions).toEqual([
      { id: "update-report", label: "Actualizar reporte", role: "secondary" },
      { id: "close-report", label: "Cerrar reporte", role: "primary" },
    ]);
    expect(viewModel.stalePrompt).toMatchObject({
      body: "Bruno no se actualiza desde hace 17 dias. Confirma que sigue vigente o cierra el reporte con un resultado.",
      primaryAction: {
        id: "confirm-still-active",
        label: "Sigue activa",
      },
      secondaryAction: {
        id: "close-report",
        label: "Cerrar reporte",
      },
      title: "Confirma si sigue activa",
    });
  });

  it("keeps a Closed Report readable with reduced urgency in detail", () => {
    const viewModel = buildPublicReportLifecycleViewModel({
      caretakerMemberId: "member-camila",
      now: "2026-06-18T12:00:00.000Z",
      outcome: "transferred-to-shelter",
      reportTitle: "Luna",
      status: "closed",
      staleAfterDays: 14,
      updatedAt: "2026-06-01T12:00:00.000Z",
      viewer: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel).toMatchObject({
      banner: {
        body: "Luna tiene resultado: Trasladada a refugio. Ya no activa alertas cercanas.",
        title: "Reporte cerrado",
        tone: "closed",
      },
      outcomeLabel: "Trasladada a refugio",
      statusLabel: "Cerrado",
      stalePrompt: undefined,
      urgency: "reduced",
    });
    expect(viewModel.actions).toEqual([
      {
        id: "update-report",
        label: "Actualizar resultado",
        role: "secondary",
      },
    ]);
  });

  it("labels the Bolivia v1 Report Outcomes in Spanish", () => {
    expect({
      inactive: formatReportOutcome("inactive"),
      reunited: formatReportOutcome("reunited"),
      stillMissing: formatReportOutcome("still-missing"),
      transferredToShelter: formatReportOutcome("transferred-to-shelter"),
      unableToLocate: formatReportOutcome("unable-to-locate"),
    }).toEqual({
      inactive: "Inactiva",
      reunited: "Reunida",
      stillMissing: "Sigue activa",
      transferredToShelter: "Trasladada a refugio",
      unableToLocate: "No se pudo ubicar",
    });
  });
});
