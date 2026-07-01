import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  petProfileCreateInputSchema,
  petProfileCreateOutputSchema,
  petProfileGetOutputSchema,
  petProfileIdInputSchema,
  petProfileListInputSchema,
  petProfileListOutputSchema,
  petProfileUpdateInputSchema,
  petProfileUpdateOutputSchema,
} from "@acme/validators";

import type { PetProfileRepositoryErrorCode } from "../pet-profile-repository";
import { PetProfileRepositoryError } from "../pet-profile-repository";
import { protectedProcedure } from "../trpc";

const petProfileRepositoryErrorCodeToTRPCErrorCode = {
  pet_profile_not_found: "NOT_FOUND",
  pet_profile_user_not_found: "NOT_FOUND",
} satisfies Record<PetProfileRepositoryErrorCode, "NOT_FOUND">;

export const petProfilesRouter = {
  create: protectedProcedure
    .input(petProfileCreateInputSchema)
    .output(petProfileCreateOutputSchema)
    .mutation(({ ctx, input }) =>
      withPetProfileRepositoryErrors(() =>
        ctx.petProfileRepository.create({
          memberId: ctx.session.user.id,
          profile: input,
        }),
      ),
    ),
  get: protectedProcedure
    .input(petProfileIdInputSchema)
    .output(petProfileGetOutputSchema)
    .query(({ ctx, input }) =>
      withPetProfileRepositoryErrors(() =>
        ctx.petProfileRepository.get({
          memberId: ctx.session.user.id,
          profileId: input.id,
        }),
      ),
    ),
  list: protectedProcedure
    .input(petProfileListInputSchema)
    .output(petProfileListOutputSchema)
    .query(({ ctx }) =>
      withPetProfileRepositoryErrors(() =>
        ctx.petProfileRepository.list({
          memberId: ctx.session.user.id,
        }),
      ),
    ),
  update: protectedProcedure
    .input(petProfileUpdateInputSchema)
    .output(petProfileUpdateOutputSchema)
    .mutation(({ ctx, input }) =>
      withPetProfileRepositoryErrors(() =>
        ctx.petProfileRepository.update({
          memberId: ctx.session.user.id,
          profile: input,
          profileId: input.id,
        }),
      ),
    ),
} satisfies TRPCRouterRecord;

async function withPetProfileRepositoryErrors<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PetProfileRepositoryError) {
      throw new TRPCError({
        code: petProfileRepositoryErrorCodeToTRPCErrorCode[error.code],
        message: error.message,
      });
    }

    throw error;
  }
}
