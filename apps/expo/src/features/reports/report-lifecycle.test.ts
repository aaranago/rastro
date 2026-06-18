import { describe, expect, it } from "vitest";

import { findStaleActiveReportPrompts } from "./report-lifecycle";

describe("Report lifecycle stale prompts", () => {
  it("identifies stale active reports for caretaker confirmation and ignores recent or closed reports", () => {
    const prompts = findStaleActiveReportPrompts({
      now: "2026-06-18T12:00:00.000Z",
      reports: [
        {
          id: "lost-report-1",
          lifecycleConfirmedAt: "2026-05-20T12:00:00.000Z",
          outcome: "still-missing",
          status: "active",
          title: "Toby",
          updatedAt: "2026-05-20T12:00:00.000Z",
        },
        {
          id: "found-report-1",
          lifecycleConfirmedAt: "2026-06-17T12:00:00.000Z",
          outcome: "still-missing",
          status: "active",
          title: "Perro encontrado",
          updatedAt: "2026-06-17T12:00:00.000Z",
        },
        {
          id: "sighting-report-1",
          lifecycleConfirmedAt: "2026-05-20T12:00:00.000Z",
          outcome: "inactive",
          status: "closed",
          title: "Perro visto",
          updatedAt: "2026-05-20T12:00:00.000Z",
        },
      ],
      staleAfterDays: 14,
    });

    expect(prompts).toEqual([
      {
        actionLabel: "Confirmar o actualizar",
        message: "Confirma si este reporte sigue activo o elige un resultado.",
        outcomeOptions: [
          { label: "Sigue activa", outcome: "still-missing" },
          { label: "Reunida", outcome: "reunited" },
          { label: "Trasladada a refugio", outcome: "transferred-to-shelter" },
          { label: "No se pudo ubicar", outcome: "unable-to-locate" },
          { label: "Inactiva", outcome: "inactive" },
        ],
        reportId: "lost-report-1",
        title: "Toby",
      },
    ]);
  });
});
