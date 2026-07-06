import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type {
  PublicReportDetail,
  PublicReportDetailCaller,
} from "./public-report-detail-api-adapter";
import { getPublicReportDetailWithCaller } from "./public-report-detail-api-adapter";

const persistedLostReportId = "11111111-1111-4111-8111-111111110001";
const persistedV7LostReportId = "019f4e42-15f5-7689-89c7-3f089e90fd08";
const hiddenReportId = "11111111-1111-4111-8111-111111110002";
const unknownReportId = "11111111-1111-4111-8111-111111110003";

const persistedLostReport = {
  id: persistedLostReportId,
  type: "lost_pet",
  status: "active",
  outcome: null,
  title: "Bruno está perdido en Achumani DB",
  description: "Bruno responde a su nombre y llevaba collar azul.",
  pet: {
    name: "Bruno",
    species: "dog",
    breed: "Mestizo",
    color: "miel",
    size: "mediano",
    distinguishingTraits: null,
  },
  eventOccurredAt: new Date("2026-06-19T22:40:00.000Z"),
  contact: {
    actions: [
      {
        href: `rastro://reportes/perdidos/${persistedLostReportId}`,
        kind: "in_app_chat",
      },
    ],
    preference: "in_app_chat",
    hasWhatsapp: false,
  },
  location: {
    latitude: -16.53,
    longitude: -68.07,
    precision: "approximate",
    label: "Achumani, La Paz",
    locationCell: "bo-lpb-achumani",
  },
  media: [],
  owner: {
    isCurrentMember: false,
  },
  createdAt: new Date("2026-06-19T22:45:00.000Z"),
  updatedAt: new Date("2026-06-19T22:45:00.000Z"),
  resolvedAt: null,
} satisfies PublicReportDetail;

function callerThat(
  detail: PublicReportDetailCaller["report"]["detail"],
): PublicReportDetailCaller {
  return {
    report: {
      detail,
    },
  };
}

describe("public report detail API adapter", () => {
  it("loads a persisted public report detail through the server caller", async () => {
    const report = await getPublicReportDetailWithCaller(
      callerThat(() => Promise.resolve(persistedLostReport)),
      persistedLostReportId,
    );

    expect(report).toBe(persistedLostReport);
  });

  it("accepts shared public UUID versions before calling the API", async () => {
    const detail = vi.fn<PublicReportDetailCaller["report"]["detail"]>(() =>
      Promise.resolve({
        ...persistedLostReport,
        id: persistedV7LostReportId,
      }),
    );

    const report = await getPublicReportDetailWithCaller(
      callerThat(detail),
      persistedV7LostReportId,
    );

    expect(report?.id).toBe(persistedV7LostReportId);
    expect(detail).toHaveBeenCalledWith({ id: persistedV7LostReportId });
  });

  it("returns null for malformed public IDs before calling the API", async () => {
    const detail = vi.fn<PublicReportDetailCaller["report"]["detail"]>();

    const report = await getPublicReportDetailWithCaller(
      callerThat(detail),
      "does-not-exist",
    );

    expect(report).toBeNull();
    expect(detail).not.toHaveBeenCalled();
  });

  it("maps tRPC NOT_FOUND responses to null for hidden, deleted, or unknown reports", async () => {
    const report = await getPublicReportDetailWithCaller(
      callerThat(() => Promise.reject(new TRPCError({ code: "NOT_FOUND" }))),
      hiddenReportId,
    );

    expect(report).toBeNull();
  });

  it("maps serialized tRPC NOT_FOUND responses to null", async () => {
    const report = await getPublicReportDetailWithCaller(
      callerThat(() =>
        Promise.reject(
          Object.assign(new Error("Serialized tRPC not found"), {
            data: {
              code: "NOT_FOUND",
            },
          }),
        ),
      ),
      unknownReportId,
    );

    expect(report).toBeNull();
  });

  it("propagates non-NOT_FOUND tRPC errors", async () => {
    await expect(
      getPublicReportDetailWithCaller(
        callerThat(() =>
          Promise.reject(new TRPCError({ code: "INTERNAL_SERVER_ERROR" })),
        ),
        persistedLostReportId,
      ),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
