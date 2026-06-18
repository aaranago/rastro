import { describe, expect, it } from "vitest";

import {
  createInMemoryTrustSafetyRepository,
  trustSafetyReportReasonOptions,
} from ".";

describe("Trust safety reporting", () => {
  it("exposes the exact shared report reasons with Spanish UI labels", () => {
    expect(
      trustSafetyReportReasonOptions.map((option) => option.value),
    ).toEqual([
      "spam",
      "scam",
      "incorrect_location",
      "offensive_content",
      "animal_cruelty",
      "stolen_pet_concern",
      "impersonation",
      "other",
    ]);
    expect(trustSafetyReportReasonOptions).toEqual([
      { label: "Spam", value: "spam" },
      { label: "Estafa", value: "scam" },
      { label: "Ubicación incorrecta", value: "incorrect_location" },
      { label: "Contenido ofensivo", value: "offensive_content" },
      { label: "Crueldad animal", value: "animal_cruelty" },
      { label: "Sospecha de mascota robada", value: "stolen_pet_concern" },
      { label: "Suplantación de identidad", value: "impersonation" },
      { label: "Otro motivo", value: "other" },
    ]);
  });

  it("creates pending admin-review items when reportable Rastro surfaces are submitted", async () => {
    const repository = createInMemoryTrustSafetyRepository({
      now: () => "2026-06-18T14:00:00.000Z",
    });
    const targets = [
      { targetId: "lost-report-1", targetType: "lost_pet_report" },
      { targetId: "found-report-1", targetType: "found_pet_report" },
      { targetId: "sighting-report-1", targetType: "sighting_report" },
      { targetId: "adoption-listing-1", targetType: "adoption_listing" },
      { targetId: "chat-conversation-1", targetType: "chat_conversation" },
      { targetId: "clinic-san-roque", targetType: "resource_provider" },
    ] as const;

    for (const target of targets) {
      await expect(
        repository.submitReport({
          ...target,
          detail:
            "La información publicada puede poner en riesgo a una mascota.",
          reason: "stolen_pet_concern",
          reporterMemberId: "member-camila",
        }),
      ).resolves.toMatchObject({
        reviewItem: {
          createdAt: "2026-06-18T14:00:00.000Z",
          detail:
            "La información publicada puede poner en riesgo a una mascota.",
          reason: "stolen_pet_concern",
          reporterMemberId: "member-camila",
          status: "pending",
          targetId: target.targetId,
          targetType: target.targetType,
        },
        status: "pending_admin_review",
      });
    }

    await expect(repository.listAdminReviewItems()).resolves.toHaveLength(
      targets.length,
    );
  });

  it("returns the existing receipt for duplicate reports from the same reporter, target, and reason", async () => {
    const repository = createInMemoryTrustSafetyRepository({
      now: () => "2026-06-18T14:05:00.000Z",
    });

    const firstReceipt = await repository.submitReport({
      detail: "Perfil duplicado con datos falsos.",
      reason: "impersonation",
      reporterMemberId: "member-diego",
      targetId: "clinic-san-roque",
      targetType: "resource_provider",
    });
    const duplicateReceipt = await repository.submitReport({
      detail: "Otra nota sobre el mismo problema.",
      reason: "impersonation",
      reporterMemberId: "member-diego",
      targetId: "clinic-san-roque",
      targetType: "resource_provider",
    });

    expect(duplicateReceipt).toEqual(firstReceipt);
    await expect(repository.listAdminReviewItems()).resolves.toEqual([
      firstReceipt.reviewItem,
    ]);
  });
});
