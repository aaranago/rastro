import { describe, expect, it, vi } from "vitest";

import type { MyReportSummary } from "./my-reports";
import {
  buildMyReportsViewModel,
  createApiMyReportsRepository,
} from "./my-reports";

describe("my reports model", () => {
  it("groups owned reports by actionable owner states", () => {
    const viewModel = buildMyReportsViewModel({
      filter: "active",
      reports: [
        createReport({
          availability: {
            label: "Activo",
            state: "active",
          },
          id: "report-active",
          status: "active",
        }),
        createReport({
          availability: {
            label: "En revisión",
            state: "pending_review",
          },
          id: "report-review",
          status: "pending_review",
        }),
        createReport({
          availability: {
            label: "Retirado",
            state: "deleted",
          },
          id: "report-deleted",
          status: "closed",
        }),
        createReport({
          availability: {
            label: "Cerrado",
            state: "closed",
          },
          id: "report-closed",
          outcome: "reunited",
          status: "closed",
        }),
      ],
    });

    expect(viewModel.counts).toEqual({
      active: 1,
      closed: 1,
      retired: 1,
      review: 1,
    });
    expect(viewModel.filters.map((filter) => filter.label)).toEqual([
      "Activos",
      "Cerrados",
      "Revisión",
      "Retirados",
    ]);
    expect(viewModel.reports).toEqual([
      expect.objectContaining({
        availabilityLabel: "Activo",
        canDelete: true,
        canResolve: true,
        href: "/(tabs)/(nearby)/reportes/perdidos/report-active",
        id: "report-active",
        primaryActionLabel: "Cerrar",
        statusTone: "active",
      }),
    ]);
  });

  it("shows closed outcome labels and disables resolve for closed reports", () => {
    const viewModel = buildMyReportsViewModel({
      filter: "closed",
      reports: [
        createReport({
          availability: {
            label: "Cerrado",
            state: "closed",
          },
          outcome: "transferred_to_shelter",
          status: "closed",
        }),
      ],
    });

    expect(viewModel.reports[0]).toMatchObject({
      availabilityLabel: "Trasladada a refugio",
      canDelete: true,
      canResolve: false,
      outcomeLabel: "Trasladada a refugio",
      primaryActionLabel: "Gestionar",
      statusTone: "closed",
    });
  });
});

describe("my reports API repository", () => {
  it("calls the typed report management procedures", async () => {
    const report = createReport();
    const client = {
      report: {
        delete: {
          mutate: vi.fn().mockResolvedValue({
            deleted: true,
            id: report.id,
          }),
        },
        mine: {
          query: vi.fn().mockResolvedValue([report]),
        },
        resolve: {
          mutate: vi.fn().mockResolvedValue({
            ...report,
            outcome: "reunited",
            status: "closed",
          }),
        },
      },
    };
    const repository = createApiMyReportsRepository({ client });

    await expect(repository.listReports()).resolves.toEqual([report]);
    await repository.resolveReport({
      id: report.id,
      outcome: "reunited",
    });
    await repository.deleteReport({
      id: report.id,
    });

    expect(client.report.mine.query).toHaveBeenCalledWith({});
    expect(client.report.resolve.mutate).toHaveBeenCalledWith({
      id: report.id,
      outcome: "reunited",
    });
    expect(client.report.delete.mutate).toHaveBeenCalledWith({
      id: report.id,
    });
  });
});

function createReport(
  overrides: Partial<MyReportSummary> = {},
): MyReportSummary {
  return {
    availability: {
      label: "Activo",
      state: "active",
    },
    contact: {
      actions: [],
      hasWhatsapp: false,
      preference: "in_app_chat",
    },
    createdAt: new Date("2026-06-24T13:00:00.000Z"),
    description: "Luna salió de casa y puede estar asustada.",
    eventOccurredAt: new Date("2026-06-24T12:30:00.000Z"),
    id: "report-active",
    location: {
      latitude: -16.5,
      longitude: -68.12,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    media: [
      {
        altText: null,
        canonicalUrl: "https://cdn.rastro.bo/luna.jpg",
        height: 1200,
        id: "media-1",
        mimeType: "image/jpeg",
        objectKey: "reports/luna.jpg",
        position: 1,
        sizeBytes: 320_000,
        thumbnailObjectKey: "reports/luna-thumb.jpg",
        width: 1200,
      },
    ],
    outcome: null,
    owner: {
      isCurrentMember: true,
    },
    pet: {
      breed: "Siames",
      color: "gris",
      distinguishingTraits: null,
      name: "Luna",
      size: "mediana",
      species: "cat",
    },
    resolvedAt: null,
    status: "active",
    title: "Luna perdida en Sopocachi",
    type: "lost_pet",
    updatedAt: new Date("2026-06-24T13:20:00.000Z"),
    ...overrides,
  };
}
