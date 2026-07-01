import { describe, expect, it } from "vitest";

import type { MemberProfileRepository } from "../member-profile-repository";
import { appRouter } from "../root";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

describe("member profile router", () => {
  it("rejects unauthenticated profile reads before repository work", async () => {
    let read = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      memberProfileRepository: {
        get: () => {
          read = true;
          return Promise.reject(new Error("Should not read without auth."));
        },
      },
      session: null,
    });

    await expect(caller.memberProfile.get({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(read).toBe(false);
  });

  it("uses the session member for profile reads and updates", async () => {
    const repository = createFakeMemberProfileRepository();
    const caller = createCaller({
      authApi: {},
      db: {},
      memberProfileRepository: repository,
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(caller.memberProfile.get({})).resolves.toEqual({
      defaultContactPreference: "in_app_chat",
      displayName: "Camila",
      memberId: "member-camila",
      phone: null,
      whatsapp: null,
    });
    await expect(
      caller.memberProfile.update({
        defaultContactPreference: "both",
        displayName: "  Camila R.  ",
        phone: "+591 2 222 1111",
        whatsapp: "+591 70000001",
      }),
    ).resolves.toEqual({
      defaultContactPreference: "both",
      displayName: "Camila R.",
      memberId: "member-camila",
      phone: "+591 2 222 1111",
      whatsapp: "+591 70000001",
    });
    expect(repository.inputs).toEqual([
      {
        kind: "get",
        memberId: "member-camila",
      },
      {
        defaultContactPreference: "both",
        displayName: "Camila R.",
        kind: "update",
        memberId: "member-camila",
        phone: "+591 2 222 1111",
        whatsapp: "+591 70000001",
      },
    ]);
  });

  it("rejects invalid profile updates and client-supplied member ids before repository work", async () => {
    const repository = createFakeMemberProfileRepository();
    const caller = createCaller({
      authApi: {},
      db: {},
      memberProfileRepository: repository,
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.memberProfile.get({
        memberId: "member-attacker",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.memberProfile.update({
        defaultContactPreference: "whatsapp",
        displayName: "Camila R.",
        whatsapp: "not-a-phone",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.memberProfile.update({
        defaultContactPreference: "in_app_chat",
        displayName: "Camila R.",
        memberId: "member-attacker",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(repository.inputs).toEqual([]);
  });
});

type FakeMemberProfileRepository = MemberProfileRepository & {
  inputs: (
    | { kind: "get"; memberId: string }
    | {
        defaultContactPreference: "both" | "in_app_chat" | "whatsapp";
        displayName: string;
        kind: "update";
        memberId: string;
        phone: string | null;
        whatsapp: string | null;
      }
  )[];
};

function createFakeMemberProfileRepository(): FakeMemberProfileRepository {
  const inputs: FakeMemberProfileRepository["inputs"] = [];

  return {
    inputs,
    get: ({ memberId }) => {
      inputs.push({ kind: "get", memberId });

      return Promise.resolve({
        defaultContactPreference: "in_app_chat",
        displayName: "Camila",
        memberId,
        phone: null,
        whatsapp: null,
      });
    },
    update: ({ memberId, profile }) => {
      inputs.push({
        defaultContactPreference: profile.defaultContactPreference,
        displayName: profile.displayName,
        kind: "update",
        memberId,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
      });

      return Promise.resolve({
        defaultContactPreference: profile.defaultContactPreference,
        displayName: profile.displayName,
        memberId,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
      });
    },
  };
}
