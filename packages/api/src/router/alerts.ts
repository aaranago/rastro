import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  alertGetInputSchema,
  alertGetOutputSchema,
  alertPauseInputSchema,
  alertPauseOutputSchema,
  alertRecordLocationInputSchema,
  alertRecordLocationOutputSchema,
  alertRegisterPushTokenInputSchema,
  alertRegisterPushTokenOutputSchema,
  alertUnsubscribeInputSchema,
  alertUnsubscribeOutputSchema,
  alertUpdateMovingAlertsInputSchema,
  alertUpdateMovingAlertsOutputSchema,
  alertUpsertSettingsInputSchema,
  alertUpsertSettingsOutputSchema,
} from "@acme/validators";

import type { AlertRepositoryErrorCode } from "../alert-repository";
import { AlertRepositoryError } from "../alert-repository";
import { protectedProcedure } from "../trpc";

const alertRepositoryErrorCodeToTRPCErrorCode = {
  alert_subscription_not_found: "NOT_FOUND",
} satisfies Record<AlertRepositoryErrorCode, "NOT_FOUND">;

export const alertsRouter = {
  get: protectedProcedure
    .input(alertGetInputSchema)
    .output(alertGetOutputSchema)
    .query(({ ctx }) =>
      withAlertRepositoryErrors(() =>
        ctx.alertRepository.get({
          memberId: ctx.session.user.id,
        }),
      ),
    ),
  upsertSettings: protectedProcedure
    .input(alertUpsertSettingsInputSchema)
    .output(alertUpsertSettingsOutputSchema)
    .mutation(({ ctx, input }) =>
      withAlertRepositoryErrors(() =>
        ctx.alertRepository.upsertSettings({
          categories: input.categories,
          memberId: ctx.session.user.id,
          radiusMeters: input.radiusMeters,
        }),
      ),
    ),
  recordLocation: protectedProcedure
    .input(alertRecordLocationInputSchema)
    .output(alertRecordLocationOutputSchema)
    .mutation(({ ctx, input }) =>
      withAlertRepositoryErrors(() =>
        ctx.alertRepository.recordLocation({
          label: input.label,
          latitude: input.latitude,
          locationCell: input.locationCell,
          longitude: input.longitude,
          memberId: ctx.session.user.id,
        }),
      ),
    ),
  updateMovingAlerts: protectedProcedure
    .input(alertUpdateMovingAlertsInputSchema)
    .output(alertUpdateMovingAlertsOutputSchema)
    .mutation(({ ctx, input }) =>
      withAlertRepositoryErrors(() =>
        ctx.alertRepository.updateMovingAlertsPreference({
          enabled: input.enabled,
          memberId: ctx.session.user.id,
          permissionState: input.permissionState,
        }),
      ),
    ),
  pause: protectedProcedure
    .input(alertPauseInputSchema)
    .output(alertPauseOutputSchema)
    .mutation(({ ctx, input }) =>
      withAlertRepositoryErrors(() =>
        ctx.alertRepository.pause({
          memberId: ctx.session.user.id,
          pausedUntil: input.pausedUntil,
        }),
      ),
    ),
  unsubscribe: protectedProcedure
    .input(alertUnsubscribeInputSchema)
    .output(alertUnsubscribeOutputSchema)
    .mutation(({ ctx }) =>
      withAlertRepositoryErrors(() =>
        ctx.alertRepository.unsubscribe({
          memberId: ctx.session.user.id,
        }),
      ),
    ),
  registerPushToken: protectedProcedure
    .input(alertRegisterPushTokenInputSchema)
    .output(alertRegisterPushTokenOutputSchema)
    .mutation(({ ctx, input }) =>
      withAlertRepositoryErrors(() =>
        ctx.alertRepository.registerPushToken({
          deviceId: input.deviceId,
          memberId: ctx.session.user.id,
          platform: input.platform,
          token: input.token,
        }),
      ),
    ),
} satisfies TRPCRouterRecord;

async function withAlertRepositoryErrors<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AlertRepositoryError) {
      throw new TRPCError({
        code: alertRepositoryErrorCodeToTRPCErrorCode[error.code],
        message: error.message,
      });
    }

    throw error;
  }
}
