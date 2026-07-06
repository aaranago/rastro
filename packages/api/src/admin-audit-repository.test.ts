import { describe, expect, it } from "vitest";

import { createInMemoryAdminAuditRepository } from "./admin-audit-repository";

describe("admin audit repository", () => {
  it("writes durable audit events and lists them newest first with filter options", async () => {
    let tick = 0;
    const repository = createInMemoryAdminAuditRepository({
      now: () => new Date(`2026-06-26T16:0${tick++}:00.000Z`),
    });

    await repository.record({
      action: "settings.update",
      actor: {
        email: "admin@rastro.bo",
        id: "member-admin",
      },
      metadata: {
        adoptionReviewModeEnabled: true,
        ignored: undefined,
      },
      source: "admin.settings.update",
      summary: "Actualizo ajustes globales de publicación.",
      target: {
        id: "global",
        label: "Ajustes globales",
        type: "admin_settings",
      },
    });
    await repository.record({
      action: "report.hide",
      actor: {
        email: "ops@rastro.bo",
        id: "member-ops",
      },
      summary: "Oculto Lost Pet Report por spam.",
      target: {
        id: "report-1",
        label: "Bruno perdido",
        type: "lost_pet_report",
      },
    });

    await expect(repository.list()).resolves.toMatchObject({
      availableFilters: {
        actions: ["report.hide", "settings.update"],
        actors: [
          {
            email: "admin@rastro.bo",
            id: "member-admin",
            label: "admin@rastro.bo",
          },
          {
            email: "ops@rastro.bo",
            id: "member-ops",
            label: "ops@rastro.bo",
          },
        ],
        targetTypes: ["admin_settings", "lost_pet_report"],
      },
      events: [
        {
          action: "report.hide",
          target: {
            id: "report-1",
          },
        },
        {
          action: "settings.update",
          metadata: {
            adoptionReviewModeEnabled: true,
          },
        },
      ],
    });

    await expect(
      repository.list({
        actorId: "member-admin",
        targetType: "admin_settings",
      }),
    ).resolves.toMatchObject({
      events: [
        {
          action: "settings.update",
          actor: {
            id: "member-admin",
          },
          target: {
            type: "admin_settings",
          },
        },
      ],
    });
  });
});
