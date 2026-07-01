import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  memberProfileGetInputSchema,
  memberProfileGetOutputSchema,
  memberProfileUpdateInputSchema,
  memberProfileUpdateOutputSchema,
} from "@acme/validators";

import type { MemberProfileRepositoryErrorCode } from "../member-profile-repository";
import { MemberProfileRepositoryError } from "../member-profile-repository";
import { protectedProcedure } from "../trpc";

const memberProfileRepositoryErrorCodeToTRPCErrorCode = {
  member_profile_user_not_found: "NOT_FOUND",
} satisfies Record<MemberProfileRepositoryErrorCode, "NOT_FOUND">;

export const memberProfileRouter = {
  get: protectedProcedure
    .input(memberProfileGetInputSchema)
    .output(memberProfileGetOutputSchema)
    .query(({ ctx }) =>
      withMemberProfileRepositoryErrors(() =>
        ctx.memberProfileRepository.get({
          memberId: ctx.session.user.id,
        }),
      ),
    ),
  update: protectedProcedure
    .input(memberProfileUpdateInputSchema)
    .output(memberProfileUpdateOutputSchema)
    .mutation(({ ctx, input }) =>
      withMemberProfileRepositoryErrors(() =>
        ctx.memberProfileRepository.update({
          memberId: ctx.session.user.id,
          profile: input,
        }),
      ),
    ),
} satisfies TRPCRouterRecord;

async function withMemberProfileRepositoryErrors<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof MemberProfileRepositoryError) {
      throw new TRPCError({
        code: memberProfileRepositoryErrorCodeToTRPCErrorCode[error.code],
        message: error.message,
      });
    }

    throw error;
  }
}
