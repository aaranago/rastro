import type {
  MemberProfileDefaultContactPreference,
  MemberProfileRepository,
  MemberProfileSessionState,
  MemberProfileSettings,
  MemberProfileSettingsUpdateInput,
} from "./member-profile";
import {
  assertMemberProfileSession,
  isSupportedDefaultContactPreference,
} from "./member-profile";

export interface ApiMemberProfileSettings {
  defaultContactPreference: string;
  displayName: string;
  id?: string;
  memberId?: string;
  phone?: string | null;
  updatedAt?: Date | string;
  whatsapp?: string | null;
}

interface ExpectedMemberProfileRouterInputs {
  get: Record<string, never>;
  update: {
    defaultContactPreference: MemberProfileDefaultContactPreference;
    displayName: string;
    phone?: string | null;
    whatsapp?: string | null;
  };
}

interface ExpectedMemberProfileRouterOutputs {
  get: ApiMemberProfileSettings;
  update: ApiMemberProfileSettings;
}

interface ApiMemberProfileClient {
  memberProfile: {
    get: {
      query: (
        input: ExpectedMemberProfileRouterInputs["get"],
      ) => Promise<ExpectedMemberProfileRouterOutputs["get"]>;
    };
    update: {
      mutate: (
        input: ExpectedMemberProfileRouterInputs["update"],
      ) => Promise<ExpectedMemberProfileRouterOutputs["update"]>;
    };
  };
}

export function createApiMemberProfileRepository({
  client,
}: {
  client: unknown;
}): MemberProfileRepository {
  return {
    getSettings(session) {
      const memberSession = assertMemberProfileSession(session);

      return getMemberProfileClient(client)
        .get.query({})
        .then((settings) =>
          normalizeMemberProfileSettings(settings, memberSession),
        );
    },
    updateSettings(session, input) {
      const memberSession = assertMemberProfileSession(session);

      return getMemberProfileClient(client)
        .update.mutate(buildUpdateInput(input))
        .then((settings) =>
          normalizeMemberProfileSettings(settings, memberSession),
        );
    },
  };
}

function buildUpdateInput(
  input: MemberProfileSettingsUpdateInput,
): ExpectedMemberProfileRouterInputs["update"] {
  return {
    defaultContactPreference: input.defaultContactPreference,
    displayName: input.displayName,
    phone: input.phone,
    whatsapp: input.whatsapp,
  };
}

function normalizeMemberProfileSettings(
  settings: ApiMemberProfileSettings,
  session: Extract<MemberProfileSessionState, { kind: "member" }>,
): MemberProfileSettings {
  if (!isSupportedDefaultContactPreference(settings.defaultContactPreference)) {
    throw new Error(
      "Member profile API returned an unsupported contact preference.",
    );
  }

  return {
    defaultContactPreference: settings.defaultContactPreference,
    displayName: settings.displayName,
    memberId: settings.memberId ?? settings.id ?? session.memberId,
    phone: settings.phone ?? null,
    updatedAt: normalizeOptionalDate(settings.updatedAt),
    whatsapp: settings.whatsapp ?? null,
  };
}

function normalizeOptionalDate(value: Date | string | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function getMemberProfileClient(
  client: unknown,
): ApiMemberProfileClient["memberProfile"] {
  const memberProfile = (client as Partial<ApiMemberProfileClient>)
    .memberProfile;

  if (!memberProfile) {
    throw new Error("Member profile API client is not available.");
  }

  return memberProfile;
}
