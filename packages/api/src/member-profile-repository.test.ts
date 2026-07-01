import { describe, expect, it } from "vitest";

import type { ContactPreference } from "@acme/validators";
import { MemberProfile, user } from "@acme/db/schema";

import { createDrizzleMemberProfileRepository } from "./member-profile-repository";

interface UserRow {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  image: string | null;
  name: string;
  updatedAt: Date;
}

interface MemberProfileRow {
  createdAt: Date;
  defaultContactPreference: ContactPreference;
  memberId: string;
  phone: string | null;
  updatedAt: Date;
  whatsapp: string | null;
}

describe("member profile repository", () => {
  it("returns auth display name and contact defaults before profile settings exist", async () => {
    const db = createFakeMemberProfileDb({
      users: [
        {
          email: "camila@example.com",
          id: "member-camila",
          name: "Camila",
        },
      ],
    });
    const repository = createDrizzleMemberProfileRepository(db as never);

    await expect(
      repository.get({ memberId: "member-camila" }),
    ).resolves.toEqual({
      defaultContactPreference: "in_app_chat",
      displayName: "Camila",
      memberId: "member-camila",
      phone: null,
      whatsapp: null,
    });
  });

  it("persists contact defaults and updates Better Auth user name together", async () => {
    const db = createFakeMemberProfileDb({
      users: [
        {
          email: "camila@example.com",
          id: "member-camila",
          name: "Camila",
        },
      ],
    });
    const repository = createDrizzleMemberProfileRepository(db as never);

    await expect(
      repository.update({
        memberId: "member-camila",
        profile: {
          defaultContactPreference: "both",
          displayName: " Camila R. ",
          phone: " +591 2 222 1111 ",
          whatsapp: " +591 70000001 ",
        },
      }),
    ).resolves.toEqual({
      defaultContactPreference: "both",
      displayName: "Camila R.",
      memberId: "member-camila",
      phone: "+591 2 222 1111",
      whatsapp: "+591 70000001",
    });

    expect(db.users.get("member-camila")?.name).toBe("Camila R.");
    expect(db.profiles.get("member-camila")).toMatchObject({
      defaultContactPreference: "both",
      memberId: "member-camila",
      phone: "+591 2 222 1111",
      whatsapp: "+591 70000001",
    });

    await expect(
      repository.get({ memberId: "member-camila" }),
    ).resolves.toEqual({
      defaultContactPreference: "both",
      displayName: "Camila R.",
      memberId: "member-camila",
      phone: "+591 2 222 1111",
      whatsapp: "+591 70000001",
    });
  });
});

function createFakeMemberProfileDb(input: {
  users: { email: string; id: string; name: string }[];
}) {
  const users = new Map<string, UserRow>();
  const profiles = new Map<string, MemberProfileRow>();
  const now = new Date("2026-07-01T12:00:00.000Z");

  for (const member of input.users) {
    users.set(member.id, {
      createdAt: now,
      email: member.email,
      emailVerified: false,
      id: member.id,
      image: null,
      name: member.name,
      updatedAt: now,
    });
  }

  const baseDb = {
    profiles,
    query: {
      MemberProfile: {
        findFirst: () => Promise.resolve([...profiles.values()][0] ?? null),
      },
      user: {
        findFirst: () => Promise.resolve([...users.values()][0] ?? null),
      },
    },
    update: (table: unknown) => {
      if (table !== user) {
        throw new Error("Unexpected update table.");
      }

      return {
        set(update: Partial<UserRow>) {
          return {
            where: () => ({
              returning: () => {
                const existing = [...users.values()][0];

                if (!existing) {
                  return Promise.resolve([]);
                }

                const updated = {
                  ...existing,
                  ...update,
                };

                users.set(updated.id, updated);

                return Promise.resolve([updated]);
              },
            }),
          };
        },
      };
    },
    insert: (table: unknown) => {
      if (table !== MemberProfile) {
        throw new Error("Unexpected insert table.");
      }

      return {
        values(value: Partial<MemberProfileRow> & { memberId: string }) {
          return {
            onConflictDoUpdate({ set }: { set: Partial<MemberProfileRow> }) {
              return {
                returning: () => {
                  const existing = profiles.get(value.memberId);
                  const saved: MemberProfileRow = {
                    createdAt: existing?.createdAt ?? now,
                    defaultContactPreference:
                      set.defaultContactPreference ??
                      value.defaultContactPreference ??
                      "in_app_chat",
                    memberId: value.memberId,
                    phone:
                      "phone" in set
                        ? (set.phone ?? null)
                        : (value.phone ?? null),
                    updatedAt: set.updatedAt ?? value.updatedAt ?? now,
                    whatsapp:
                      "whatsapp" in set
                        ? (set.whatsapp ?? null)
                        : (value.whatsapp ?? null),
                  };

                  profiles.set(value.memberId, saved);

                  return Promise.resolve([saved]);
                },
              };
            },
          };
        },
      };
    },
    users,
  };
  const db: typeof baseDb & {
    transaction: <T>(callback: (tx: typeof baseDb) => Promise<T>) => Promise<T>;
  } = {
    ...baseDb,
    transaction: async (callback) => callback(baseDb),
  };

  return db;
}
