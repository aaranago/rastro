export type ReportCreationReportType =
  | "adoption"
  | "found"
  | "lost"
  | "sighting";

export type ReportCreationJourneyStepId =
  | "chooseType"
  | "photos"
  | "details"
  | "location"
  | "contact"
  | "review"
  | "submitting"
  | "success";

export type ReportCreationJourneyStepStatus =
  | "completed"
  | "current"
  | "upcoming";

export interface ReportCreationJourneyStep {
  id: ReportCreationJourneyStepId;
  label: string;
  status: ReportCreationJourneyStepStatus;
}

export interface ReportCreationJourney {
  currentStep: ReportCreationJourneyStep;
  progressText: string;
  reportType: ReportCreationReportType;
  steps: ReportCreationJourneyStep[];
}

export type ReportCreationJourneyTransitionResult =
  | {
      journey: ReportCreationJourney;
      ok: true;
    }
  | {
      ok: false;
      reason: "at-end" | "at-start";
    }
  | {
      errors: string[];
      ok: false;
      reason: "invalid-current-step";
      stepId: ReportCreationJourneyStepId;
    };

type ReportCreationCurrentStepValidationResult =
  | {
      ok: true;
    }
  | {
      errors: string[];
      ok: false;
      reason: "invalid-current-step";
      stepId: ReportCreationJourneyStepId;
    };

export type ReportCreationJourneyValidationResult =
  | {
      ok: true;
    }
  | {
      errors: string[];
      ok: false;
    };

export type ReportCreationJourneyValidators = Partial<
  Record<
    ReportCreationJourneyStepId,
    () => ReportCreationJourneyValidationResult
  >
>;

export function repairReportCreationJourney(input: {
  completedStepIds?: readonly string[];
  currentStepId?: string;
  reportType: ReportCreationReportType;
}): ReportCreationJourney {
  const { completedStepIds = [], reportType } = input;
  const restoredCompletedSteps = new Set(
    completedStepIds.filter(isReportCreationJourneyStepId),
  );
  const completedStepPrefix: ReportCreationJourneyStepId[] = [];
  let currentStepIdFromRepair: ReportCreationJourneyStepId | undefined;

  for (const step of canonicalSteps) {
    if (restoredCompletedSteps.has(step.id)) {
      completedStepPrefix.push(step.id);
      continue;
    }

    currentStepIdFromRepair = step.id;
    break;
  }

  const repairedCurrentStepId = currentStepIdFromRepair ?? "success";

  return createReportCreationJourney({
    completedStepIds: completedStepPrefix.filter(
      (stepId) => stepId !== repairedCurrentStepId,
    ),
    currentStepId: repairedCurrentStepId,
    reportType,
  });
}

export function createReportCreationJourney({
  completedStepIds = [],
  currentStepId,
  reportType,
}: {
  completedStepIds?: readonly ReportCreationJourneyStepId[];
  currentStepId: ReportCreationJourneyStepId;
  reportType: ReportCreationReportType;
}): ReportCreationJourney {
  const completedSteps = new Set(completedStepIds);
  const steps: ReportCreationJourneyStep[] = canonicalSteps.map((step) => {
    const status: ReportCreationJourneyStepStatus =
      step.id === currentStepId
        ? "current"
        : completedSteps.has(step.id)
          ? "completed"
          : "upcoming";

    return {
      ...step,
      status,
    };
  });
  const currentStep = steps.find((step) => step.id === currentStepId);

  if (!currentStep) {
    throw new Error(`Unknown report creation journey step: ${currentStepId}`);
  }

  return {
    currentStep,
    progressText: `Paso ${steps.indexOf(currentStep) + 1} de ${steps.length}`,
    reportType,
    steps,
  };
}

export function deriveReportCreationJourney({
  currentStepIdWhenComplete,
  reportType,
  stepCompletion,
}: {
  currentStepIdWhenComplete: ReportCreationJourneyStepId;
  reportType: ReportCreationReportType;
  stepCompletion: readonly {
    id: ReportCreationJourneyStepId;
    isComplete: boolean;
  }[];
}): ReportCreationJourney {
  const firstIncompleteStep = stepCompletion.find((step) => !step.isComplete);
  const firstIncompleteStepIndex = firstIncompleteStep
    ? stepCompletion.indexOf(firstIncompleteStep)
    : -1;
  const completedStepPrefix =
    firstIncompleteStepIndex === -1
      ? stepCompletion
      : stepCompletion.slice(0, firstIncompleteStepIndex);

  return createReportCreationJourney({
    completedStepIds: completedStepPrefix.map((step) => step.id),
    currentStepId: firstIncompleteStep?.id ?? currentStepIdWhenComplete,
    reportType,
  });
}

export function advanceReportCreationJourney(
  journey: ReportCreationJourney,
  validators: ReportCreationJourneyValidators = {},
): ReportCreationJourneyTransitionResult {
  const currentIndex = getCurrentStepIndex(journey);
  const nextStep = journey.steps[currentIndex + 1];

  if (!nextStep) {
    return {
      ok: false,
      reason: "at-end",
    };
  }

  const validationResult = validateCurrentReportCreationStep(
    journey,
    validators,
  );

  if (!validationResult.ok) {
    return validationResult;
  }

  return {
    journey: createReportCreationJourney({
      completedStepIds: [
        ...getCompletedStepIds(journey),
        journey.currentStep.id,
      ],
      currentStepId: nextStep.id,
      reportType: journey.reportType,
    }),
    ok: true,
  };
}

function validateCurrentReportCreationStep(
  journey: ReportCreationJourney,
  validators: ReportCreationJourneyValidators,
): ReportCreationCurrentStepValidationResult {
  const validator = validators[journey.currentStep.id];
  const result = validator?.() ?? { ok: true };

  if (result.ok) {
    return result;
  }

  return {
    errors: result.errors,
    ok: false,
    reason: "invalid-current-step",
    stepId: journey.currentStep.id,
  };
}

export function retreatReportCreationJourney(
  journey: ReportCreationJourney,
): ReportCreationJourneyTransitionResult {
  const currentIndex = getCurrentStepIndex(journey);
  const previousStep = journey.steps[currentIndex - 1];

  if (!previousStep) {
    return {
      ok: false,
      reason: "at-start",
    };
  }

  return {
    journey: createReportCreationJourney({
      completedStepIds: getCompletedStepIds(journey).filter(
        (stepId) => stepId !== previousStep.id,
      ),
      currentStepId: previousStep.id,
      reportType: journey.reportType,
    }),
    ok: true,
  };
}

function getCompletedStepIds(journey: ReportCreationJourney) {
  return journey.steps
    .filter((step) => step.status === "completed")
    .map((step) => step.id);
}

function getCurrentStepIndex(journey: ReportCreationJourney) {
  return journey.steps.findIndex((step) => step.id === journey.currentStep.id);
}

function isReportCreationJourneyStepId(
  value: string | undefined,
): value is ReportCreationJourneyStepId {
  return canonicalSteps.some((step) => step.id === value);
}

const canonicalSteps = [
  {
    id: "chooseType",
    label: "Tipo",
  },
  {
    id: "photos",
    label: "Fotos",
  },
  {
    id: "details",
    label: "Detalles",
  },
  {
    id: "location",
    label: "Ubicacion",
  },
  {
    id: "contact",
    label: "Contacto",
  },
  {
    id: "review",
    label: "Revisar",
  },
  {
    id: "submitting",
    label: "Publicando",
  },
  {
    id: "success",
    label: "Publicado",
  },
] satisfies readonly {
  id: ReportCreationJourneyStepId;
  label: string;
}[];
