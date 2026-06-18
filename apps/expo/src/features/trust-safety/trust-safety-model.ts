const trustSafetyReportReasons = [
  "spam",
  "scam",
  "incorrect_location",
  "offensive_content",
  "animal_cruelty",
  "stolen_pet_concern",
  "impersonation",
  "other",
] as const;

export type TrustSafetyReportReason = (typeof trustSafetyReportReasons)[number];

export interface TrustSafetyReportReasonOption {
  label: string;
  value: TrustSafetyReportReason;
}

const trustSafetyReportReasonLabels: Record<TrustSafetyReportReason, string> = {
  animal_cruelty: "Crueldad animal",
  impersonation: "Suplantación de identidad",
  incorrect_location: "Ubicación incorrecta",
  offensive_content: "Contenido ofensivo",
  other: "Otro motivo",
  scam: "Estafa",
  spam: "Spam",
  stolen_pet_concern: "Sospecha de mascota robada",
};

export const trustSafetyReportReasonOptions: readonly TrustSafetyReportReasonOption[] =
  trustSafetyReportReasons.map((value) => ({
    label: trustSafetyReportReasonLabels[value],
    value,
  }));

export type TrustSafetyReportTargetType =
  | "lost_pet_report"
  | "found_pet_report"
  | "sighting_report"
  | "adoption_listing"
  | "chat_conversation"
  | "resource_provider";

export interface SubmitTrustSafetyReportInput {
  detail?: string;
  reason: TrustSafetyReportReason;
  reporterMemberId?: string;
  targetId: string;
  targetType: TrustSafetyReportTargetType;
}

export interface TrustSafetyAdminReviewItem {
  createdAt: string;
  detail?: string;
  id: string;
  kind: "abuse_report";
  reason: TrustSafetyReportReason;
  reporterMemberId?: string;
  status: "pending";
  targetId: string;
  targetType: TrustSafetyReportTargetType;
}

export interface TrustSafetyReportReceipt {
  reviewItem: TrustSafetyAdminReviewItem;
  status: "pending_admin_review";
}

export interface TrustSafetyRepository {
  listAdminReviewItems: () => Promise<TrustSafetyAdminReviewItem[]>;
  submitReport: (
    input: SubmitTrustSafetyReportInput,
  ) => Promise<TrustSafetyReportReceipt>;
}

export interface InMemoryTrustSafetyRepositoryOptions {
  now?: () => string;
}

export function createInMemoryTrustSafetyRepository(
  options: InMemoryTrustSafetyRepositoryOptions = {},
): TrustSafetyRepository {
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const reviewItems: TrustSafetyAdminReviewItem[] = [];

  return {
    listAdminReviewItems() {
      return Promise.resolve(reviewItems.map(cloneAdminReviewItem));
    },
    submitReport(input) {
      const existingReviewItem = input.reporterMemberId
        ? reviewItems.find(
            (reviewItem) =>
              reviewItem.reporterMemberId === input.reporterMemberId &&
              reviewItem.targetId === input.targetId &&
              reviewItem.targetType === input.targetType &&
              reviewItem.reason === input.reason,
          )
        : undefined;

      if (existingReviewItem) {
        return Promise.resolve(toReportReceipt(existingReviewItem));
      }

      const reviewItem: TrustSafetyAdminReviewItem = {
        createdAt: now(),
        id: `trust-safety-report-${reviewItems.length + 1}`,
        kind: "abuse_report",
        reason: input.reason,
        status: "pending",
        targetId: input.targetId,
        targetType: input.targetType,
        ...(input.detail ? { detail: input.detail } : {}),
        ...(input.reporterMemberId
          ? { reporterMemberId: input.reporterMemberId }
          : {}),
      };

      reviewItems.push(reviewItem);

      return Promise.resolve(toReportReceipt(reviewItem));
    },
  };
}

function toReportReceipt(
  reviewItem: TrustSafetyAdminReviewItem,
): TrustSafetyReportReceipt {
  return {
    reviewItem: cloneAdminReviewItem(reviewItem),
    status: "pending_admin_review",
  };
}

function cloneAdminReviewItem(
  reviewItem: TrustSafetyAdminReviewItem,
): TrustSafetyAdminReviewItem {
  return { ...reviewItem };
}
