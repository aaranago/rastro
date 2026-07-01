import { describe, expect, it, vi } from "vitest";

import type { ApiMemberProfileSettings } from "./api-member-profile-repository";
import type { MemberProfileMemberSession } from "./member-profile";
import { createApiMemberProfileRepository } from "./api-member-profile-repository";

const member: MemberProfileMemberSession = {
  displayName: "Camila",
  email: "camila@example.com",
  kind: "member",
  memberId: "member-camila",
};

describe("API member profile repository", () => {
  it("loads and normalizes the authenticated member settings", async () => {
    const client = createApiMemberProfileClient({
      get: createApiMemberProfileSettings({
        updatedAt: new Date("2026-06-30T13:00:00.000Z"),
      }),
    });
    const repository = createApiMemberProfileRepository({ client });

    await expect(repository.getSettings(member)).resolves.toEqual({
      defaultContactPreference: "whatsapp",
      displayName: "Camila R.",
      memberId: "member-camila",
      phone: "+591 70123456",
      updatedAt: "2026-06-30T13:00:00.000Z",
      whatsapp: "+591 71234567",
    });
    expect(client.memberProfile.get.query).toHaveBeenCalledWith({});
  });

  it("updates settings without forwarding spoofable memberId", async () => {
    const client = createApiMemberProfileClient();
    const repository = createApiMemberProfileRepository({ client });

    await repository.updateSettings(
      {
        ...member,
        memberId: "member-spoofed",
      },
      {
        defaultContactPreference: "both",
        displayName: "Nueva Camila",
        phone: "+591 75555555",
        whatsapp: "+591 71234567",
      },
    );

    expect(client.memberProfile.update.mutate).toHaveBeenCalledWith({
      defaultContactPreference: "both",
      displayName: "Nueva Camila",
      phone: "+591 75555555",
      whatsapp: "+591 71234567",
    });
    expect(
      JSON.stringify(client.memberProfile.update.mutate.mock.calls),
    ).not.toContain("member-spoofed");
  });

  it("rejects API settings with unsupported contact preferences", async () => {
    const client = createApiMemberProfileClient({
      get: createApiMemberProfileSettings({
        defaultContactPreference: "sms",
      }),
    });
    const repository = createApiMemberProfileRepository({ client });

    await expect(repository.getSettings(member)).rejects.toThrow(
      "unsupported contact preference",
    );
  });
});

function createApiMemberProfileClient(
  overrides: Partial<{
    get: ApiMemberProfileSettings;
    update: ApiMemberProfileSettings;
  }> = {},
) {
  const fallbackSettings = createApiMemberProfileSettings();

  return {
    memberProfile: {
      get: {
        query: vi.fn(() => Promise.resolve(overrides.get ?? fallbackSettings)),
      },
      update: {
        mutate: vi.fn(() =>
          Promise.resolve(overrides.update ?? fallbackSettings),
        ),
      },
    },
  };
}

function createApiMemberProfileSettings(
  overrides: Partial<ApiMemberProfileSettings> = {},
): ApiMemberProfileSettings {
  return {
    defaultContactPreference: "whatsapp",
    displayName: "Camila R.",
    memberId: "member-camila",
    phone: "+591 70123456",
    updatedAt: "2026-06-30T13:00:00.000Z",
    whatsapp: "+591 71234567",
    ...overrides,
  };
}
