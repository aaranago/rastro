import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type { ReportMediaUploadSessionClient } from "./report-media-draft";

export type ReportCreateUploadSessionInput =
  RouterInputs["report"]["createUploadSession"];
export type ReportCreateUploadSessionOutput =
  RouterOutputs["report"]["createUploadSession"];
export type ReportCompleteUploadSessionInput =
  RouterInputs["report"]["completeUploadSession"];
export type ReportCompleteUploadSessionOutput =
  RouterOutputs["report"]["completeUploadSession"];
export type ReportRefreshUploadSessionInput =
  RouterInputs["report"]["refreshUploadSession"];
export type ReportRefreshUploadSessionOutput =
  RouterOutputs["report"]["refreshUploadSession"];

export interface ReportMediaUploadSessionApiClient {
  report: {
    completeUploadSession: {
      mutate: (
        input: ReportCompleteUploadSessionInput,
      ) => Promise<ReportCompleteUploadSessionOutput>;
    };
    createUploadSession: {
      mutate: (
        input: ReportCreateUploadSessionInput,
      ) => Promise<ReportCreateUploadSessionOutput>;
    };
    refreshUploadSession: {
      mutate: (
        input: ReportRefreshUploadSessionInput,
      ) => Promise<ReportRefreshUploadSessionOutput>;
    };
  };
}

export function createApiReportMediaUploadSessionClient({
  client,
}: {
  client: ReportMediaUploadSessionApiClient;
}): ReportMediaUploadSessionClient {
  return {
    completeUploadSession: (input) =>
      client.report.completeUploadSession.mutate(input),
    createUploadSession: (input) =>
      client.report.createUploadSession.mutate(input),
    refreshUploadSession: (input) =>
      client.report.refreshUploadSession.mutate(input),
  };
}
