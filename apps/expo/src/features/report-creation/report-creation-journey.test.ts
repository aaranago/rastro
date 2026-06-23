import { describe, expect, it, vi } from "vitest";

import {
  advanceReportCreationJourney,
  createReportCreationJourney,
  deriveReportCreationJourney,
  repairReportCreationJourney,
  retreatReportCreationJourney,
} from "./report-creation-journey";

const reportTypes = ["lost", "found", "sighting", "adoption"] as const;
const canonicalStepIds = [
  "chooseType",
  "photos",
  "details",
  "location",
  "contact",
  "review",
  "submitting",
  "success",
] as const;

describe("Report Creation canonical journey", () => {
  it("builds each report type with exactly one current step and Spanish progress text", () => {
    for (const reportType of reportTypes) {
      const journey = createReportCreationJourney({
        currentStepId: "photos",
        completedStepIds: ["chooseType"],
        reportType,
      });

      expect(journey.reportType).toBe(reportType);
      expect(journey.currentStep).toMatchObject({
        id: "photos",
        status: "current",
      });
      expect(journey.progressText).toBe("Paso 2 de 8");
      expect(journey.steps.map((step) => step.id)).toEqual(canonicalStepIds);
      expect(
        journey.steps.filter((step) => step.status === "current"),
      ).toHaveLength(1);
      expect(journey.steps.map((step) => step.status)).toEqual([
        "completed",
        "current",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
      ]);
    }
  });

  it("keeps exactly one current step for every valid state", () => {
    for (const reportType of reportTypes) {
      for (const [
        currentStepIndex,
        currentStepId,
      ] of canonicalStepIds.entries()) {
        const journey = createReportCreationJourney({
          currentStepId,
          completedStepIds: canonicalStepIds.slice(0, currentStepIndex),
          reportType,
        });

        expect(
          journey.steps.filter((step) => step.status === "current"),
        ).toHaveLength(1);
        expect(journey.currentStep.id).toBe(currentStepId);
        expect(journey.progressText).toBe(
          `Paso ${currentStepIndex + 1} de ${canonicalStepIds.length}`,
        );
      }
    }
  });

  it("moves every report type forward and back through valid adjacent steps", () => {
    for (const reportType of reportTypes) {
      const journey = createReportCreationJourney({
        currentStepId: "photos",
        completedStepIds: ["chooseType"],
        reportType,
      });

      const advanced = advanceReportCreationJourney(journey);

      expect(advanced).toMatchObject({
        ok: true,
        journey: {
          currentStep: { id: "details", status: "current" },
          progressText: "Paso 3 de 8",
          reportType,
        },
      });

      if (!advanced.ok) {
        throw new Error("Expected the journey to advance.");
      }

      expect(advanced.journey.steps.map((step) => step.status)).toEqual([
        "completed",
        "completed",
        "current",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
      ]);

      const retreated = retreatReportCreationJourney(advanced.journey);

      expect(retreated).toMatchObject({
        ok: true,
        journey: {
          currentStep: { id: "photos", status: "current" },
          progressText: "Paso 2 de 8",
          reportType,
        },
      });

      if (!retreated.ok) {
        throw new Error("Expected the journey to move back.");
      }

      expect(
        retreated.journey.steps.filter((step) => step.status === "current"),
      ).toHaveLength(1);
      expect(retreated.journey.steps.map((step) => step.status)).toEqual([
        "completed",
        "current",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
        "upcoming",
      ]);
    }
  });

  it("blocks forward movement with only the current step validator", () => {
    const validatePhotos = vi.fn(() => ({
      errors: ["Agrega al menos una foto."],
      ok: false as const,
    }));
    const validateDetails = vi.fn(() => ({
      ok: true as const,
    }));
    const journey = createReportCreationJourney({
      currentStepId: "photos",
      completedStepIds: ["chooseType"],
      reportType: "found",
    });

    const result = advanceReportCreationJourney(journey, {
      details: validateDetails,
      photos: validatePhotos,
    });

    expect(result).toEqual({
      errors: ["Agrega al menos una foto."],
      ok: false,
      reason: "invalid-current-step",
      stepId: "photos",
    });
    expect(validatePhotos).toHaveBeenCalledTimes(1);
    expect(validateDetails).not.toHaveBeenCalled();
  });

  it("rejects forward movement past the final step without validating", () => {
    const validateSuccess = vi.fn(() => ({
      errors: ["No hay un paso siguiente."],
      ok: false as const,
    }));
    const journey = createReportCreationJourney({
      completedStepIds: [
        "chooseType",
        "photos",
        "details",
        "location",
        "contact",
        "review",
        "submitting",
      ],
      currentStepId: "success",
      reportType: "sighting",
    });

    const result = advanceReportCreationJourney(journey, {
      success: validateSuccess,
    });

    expect(result).toEqual({
      ok: false,
      reason: "at-end",
    });
    expect(validateSuccess).not.toHaveBeenCalled();
  });

  it("repairs restored stale state to the earliest incomplete valid step", () => {
    const journey = repairReportCreationJourney({
      completedStepIds: [
        "chooseType",
        "details",
        "location",
        "unknown-restored-step",
      ],
      currentStepId: "review",
      reportType: "adoption",
    });

    expect(journey.currentStep).toMatchObject({
      id: "photos",
      status: "current",
    });
    expect(journey.progressText).toBe("Paso 2 de 8");
    expect(journey.steps.map((step) => step.status)).toEqual([
      "completed",
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("derives the current step from the earliest incomplete completion state", () => {
    const journey = deriveReportCreationJourney({
      currentStepIdWhenComplete: "review",
      reportType: "lost",
      stepCompletion: [
        {
          id: "chooseType",
          isComplete: true,
        },
        {
          id: "photos",
          isComplete: false,
        },
        {
          id: "details",
          isComplete: true,
        },
      ],
    });

    expect(journey.currentStep).toMatchObject({
      id: "photos",
      status: "current",
    });
    expect(journey.steps.map((step) => step.status)).toEqual([
      "completed",
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("uses the configured current step when every supplied completion state is complete", () => {
    const journey = deriveReportCreationJourney({
      currentStepIdWhenComplete: "review",
      reportType: "adoption",
      stepCompletion: [
        {
          id: "chooseType",
          isComplete: true,
        },
        {
          id: "photos",
          isComplete: true,
        },
        {
          id: "details",
          isComplete: true,
        },
        {
          id: "location",
          isComplete: true,
        },
        {
          id: "contact",
          isComplete: true,
        },
      ],
    });

    expect(journey.currentStep).toMatchObject({
      id: "review",
      status: "current",
    });
    expect(journey.progressText).toBe("Paso 6 de 8");
    expect(journey.steps.map((step) => step.status)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "current",
      "upcoming",
      "upcoming",
    ]);
  });
});
