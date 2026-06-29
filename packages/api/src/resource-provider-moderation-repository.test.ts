import { describe, expect, it } from "vitest";

import { createInMemoryResourceProviderModerationRepository } from "./resource-provider-moderation-repository";

const provider = {
  city: "La Paz",
  department: "La Paz",
  locationLabel: "Sopocachi, La Paz",
  providerId: "11111111-1111-4111-8111-111111111111",
  providerName: "Clinica Veterinaria San Roque",
  verificationStatus: "verified" as const,
};

describe("Resource Provider moderation repository", () => {
  it("groups reports by provider and reason while retaining separate reporter details", async () => {
    let tick = 0;
    const repository = createInMemoryResourceProviderModerationRepository({
      now: () => new Date(`2026-06-26T16:0${tick++}:00.000Z`),
      providers: [provider],
      reporters: {
        "member-ana": {
          email: "ana@example.com",
          name: "Ana S.",
        },
        "member-luis": {
          email: "luis@example.com",
          name: "Luis V.",
        },
      },
    });

    await expect(
      repository.createResourceProviderReport({
        reporterId: "member-ana",
        report: {
          detail: "La direccion visible no coincide con el local.",
          providerId: provider.providerId,
          reason: "incorrect_location",
        },
      }),
    ).resolves.toMatchObject({
      status: "created",
      reviewItem: {
        provider: {
          city: "La Paz",
          department: "La Paz",
          name: "Clinica Veterinaria San Roque",
        },
        reason: "incorrect_location",
        reportCount: 1,
      },
    });
    await repository.createResourceProviderReport({
      reporterId: "member-luis",
      report: {
        detail: "El mapa lleva a otra zona.",
        providerId: provider.providerId,
        reason: "incorrect_location",
      },
    });

    const queue = await repository.listResourceProviderQueue();

    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]).toMatchObject({
      newestReport: {
        detail: "El mapa lleva a otra zona.",
        reporter: {
          displayName: "Luis V.",
          memberId: "member-luis",
        },
      },
      provider: {
        locationLabel: "Sopocachi, La Paz",
      },
      reason: "incorrect_location",
      reportCount: 2,
    });
  });

  it("suppresses duplicate reporter provider reason reports using the idempotency rule", async () => {
    const repository = createInMemoryResourceProviderModerationRepository({
      providers: [provider],
      reporters: {
        "member-ana": {
          name: "Ana S.",
        },
      },
    });
    const report = {
      detail: "Este perfil parece repetir informacion falsa.",
      providerId: provider.providerId,
      reason: "spam" as const,
    };

    const first = await repository.createResourceProviderReport({
      report,
      reporterId: "member-ana",
    });
    const duplicate = await repository.createResourceProviderReport({
      report: {
        ...report,
        detail: "Intento enviar el mismo motivo otra vez.",
      },
      reporterId: "member-ana",
    });
    const queue = await repository.listResourceProviderQueue();

    expect(first?.status).toBe("created");
    expect(duplicate?.status).toBe("already_reported");
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]?.reportCount).toBe(1);
    expect(queue.items[0]?.newestReport.detail).toBe(report.detail);
  });

  it("returns null when the reported provider is not an active target", async () => {
    const repository = createInMemoryResourceProviderModerationRepository({
      providers: [],
    });

    await expect(
      repository.createResourceProviderReport({
        reporterId: "member-ana",
        report: {
          detail: "No encontramos el proveedor reportado.",
          providerId: provider.providerId,
          reason: "other",
        },
      }),
    ).resolves.toBeNull();
  });
});
