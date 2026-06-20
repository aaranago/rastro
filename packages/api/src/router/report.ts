import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  createReportInputSchema,
  deleteReportInputSchema,
  nearbyReportsInputSchema,
  reportDetailInputSchema,
  resolveReportInputSchema,
  updateReportInputSchema,
} from "@acme/validators";

import type { PersistedReport } from "../report-repository";
import { toPublicReport } from "../report-repository";
import { protectedProcedure, publicProcedure } from "../trpc";

function requireOwnedReport(
  report: PersistedReport | null,
  caretakerId: string,
): PersistedReport {
  if (!report || report.deletedAt) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  if (report.caretakerId !== caretakerId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return report;
}

export const reportRouter = {
  create: protectedProcedure
    .input(createReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      const caretakerId = ctx.session.user.id;
      const existing =
        await ctx.reportRepository.findByCaretakerAndIdempotencyKey({
          caretakerId,
          idempotencyKey: input.idempotencyKey,
        });
      const report =
        existing ??
        (await ctx.reportRepository.create({
          caretakerId,
          report: input,
        }));

      return toPublicReport(report, caretakerId);
    }),
  detail: publicProcedure
    .input(reportDetailInputSchema)
    .query(async ({ ctx, input }) => {
      const report = await ctx.reportRepository.findById(input.id);

      if (!report || report.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return toPublicReport(report, ctx.session?.user.id ?? null);
    }),
  nearby: publicProcedure
    .input(nearbyReportsInputSchema)
    .query(async ({ ctx, input }) => {
      const reports = await ctx.reportRepository.nearby(input);

      return {
        query: input,
        results: reports
          .filter((report) => !report.deletedAt)
          .map((report) =>
            toPublicReport(report, ctx.session?.user.id ?? null),
          ),
      };
    }),
  update: protectedProcedure
    .input(updateReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireOwnedReport(
        await ctx.reportRepository.findById(input.id),
        ctx.session.user.id,
      );

      const report = await ctx.reportRepository.update({
        actorId: ctx.session.user.id,
        reportId: input.id,
        patch: input,
      });

      return toPublicReport(report, ctx.session.user.id);
    }),
  resolve: protectedProcedure
    .input(resolveReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireOwnedReport(
        await ctx.reportRepository.findById(input.id),
        ctx.session.user.id,
      );

      const report = await ctx.reportRepository.resolve({
        reportId: input.id,
        outcome: input.outcome,
        actorId: ctx.session.user.id,
      });

      return toPublicReport(report, ctx.session.user.id);
    }),
  delete: protectedProcedure
    .input(deleteReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireOwnedReport(
        await ctx.reportRepository.findById(input.id),
        ctx.session.user.id,
      );

      return ctx.reportRepository.delete({
        reportId: input.id,
        actorId: ctx.session.user.id,
      });
    }),
} satisfies TRPCRouterRecord;
