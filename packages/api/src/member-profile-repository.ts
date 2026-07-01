import type { Database } from "@acme/db/client";
import type {
  ContactPreference,
  MemberProfile as PersistedMemberProfile,
  UpdateMemberProfileInput,
} from "@acme/validators";
import { eq } from "@acme/db";
import { MemberProfile, user } from "@acme/db/schema";

export type MemberProfileRepositoryErrorCode = "member_profile_user_not_found";

export class MemberProfileRepositoryError extends Error {
  code: MemberProfileRepositoryErrorCode;

  constructor(code: MemberProfileRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MemberProfileRepositoryError";
  }
}

export interface MemberProfileRepository {
  get(input: { memberId: string }): Promise<PersistedMemberProfile>;
  update(input: {
    memberId: string;
    profile: UpdateMemberProfileInput;
  }): Promise<PersistedMemberProfile>;
}

export const defaultMemberProfileContactPreference =
  "in_app_chat" satisfies ContactPreference;

export function createDrizzleMemberProfileRepository(
  db: Database,
): MemberProfileRepository {
  return {
    get: async ({ memberId }) => {
      const member = await db.query.user.findFirst({
        where: eq(user.id, memberId),
      });

      if (!member) {
        throw new MemberProfileRepositoryError(
          "member_profile_user_not_found",
          "No encontramos el perfil de este miembro.",
        );
      }

      const profile = await db.query.MemberProfile.findFirst({
        where: eq(MemberProfile.memberId, memberId),
      });

      return toPersistedMemberProfile({
        defaultContactPreference:
          profile?.defaultContactPreference ??
          defaultMemberProfileContactPreference,
        displayName: member.name,
        memberId: member.id,
        phone: profile?.phone ?? null,
        whatsapp: profile?.whatsapp ?? null,
      });
    },
    update: async ({ memberId, profile }) => {
      const normalized = normalizeMemberProfileUpdate(profile);

      return db.transaction(async (tx) => {
        const txDb = tx as unknown as Database;
        const existingMember = await txDb.query.user.findFirst({
          columns: {
            id: true,
          },
          where: eq(user.id, memberId),
        });

        if (!existingMember) {
          throw new MemberProfileRepositoryError(
            "member_profile_user_not_found",
            "No encontramos el perfil de este miembro.",
          );
        }

        const updatedAt = new Date();
        const [updatedMember] = await tx
          .update(user)
          .set({
            name: normalized.displayName,
            updatedAt,
          })
          .where(eq(user.id, memberId))
          .returning();

        if (!updatedMember) {
          throw new MemberProfileRepositoryError(
            "member_profile_user_not_found",
            "No encontramos el perfil de este miembro.",
          );
        }

        const [savedProfile] = await tx
          .insert(MemberProfile)
          .values({
            defaultContactPreference: normalized.defaultContactPreference,
            memberId,
            phone: normalized.phone,
            updatedAt,
            whatsapp: normalized.whatsapp,
          })
          .onConflictDoUpdate({
            target: MemberProfile.memberId,
            set: {
              defaultContactPreference: normalized.defaultContactPreference,
              phone: normalized.phone,
              updatedAt,
              whatsapp: normalized.whatsapp,
            },
          })
          .returning();

        if (!savedProfile) {
          throw new Error("Member profile could not be persisted.");
        }

        return toPersistedMemberProfile({
          defaultContactPreference: savedProfile.defaultContactPreference,
          displayName: updatedMember.name,
          memberId: updatedMember.id,
          phone: savedProfile.phone,
          whatsapp: savedProfile.whatsapp,
        });
      });
    },
  };
}

function normalizeMemberProfileUpdate(
  profile: UpdateMemberProfileInput,
): UpdateMemberProfileInput {
  return {
    defaultContactPreference: profile.defaultContactPreference,
    displayName: profile.displayName.trim(),
    phone: normalizeContactPhone(profile.phone),
    whatsapp: normalizeContactPhone(profile.whatsapp),
  };
}

function normalizeContactPhone(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

function toPersistedMemberProfile(input: {
  defaultContactPreference: ContactPreference;
  displayName: string;
  memberId: string;
  phone: string | null;
  whatsapp: string | null;
}): PersistedMemberProfile {
  return {
    defaultContactPreference: input.defaultContactPreference,
    displayName: input.displayName,
    memberId: input.memberId,
    phone: input.phone,
    whatsapp: input.whatsapp,
  };
}
