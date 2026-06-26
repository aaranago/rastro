import { describe, expect, it } from "vitest";

import type { PersistedMemberSuspension } from "./member-suspension-repository";
import { createInMemoryMemberSuspensionRepository } from "./member-suspension-repository";

describe("member suspension repository", () => {
  it("searches Better Auth members by email, name, and id with active suspension state", async () => {
    const repository = createInMemoryMemberSuspensionRepository({
      members: [
        {
          email: "camila@example.com",
          emailVerified: true,
          id: "member-camila",
          name: "Camila R.",
        },
        {
          email: "diego@example.com",
          id: "member-diego",
          name: "Diego P.",
        },
      ],
      suspensions: [
        activeSuspension({
          memberId: "member-diego",
          reason: "Publicaciones repetidas con datos falsos.",
        }),
      ],
    });

    await expect(
      repository.searchMembers({ query: "camila" }),
    ).resolves.toEqual([
      expect.objectContaining({
        currentSuspension: null,
        email: "camila@example.com",
        emailVerified: true,
        id: "member-camila",
        name: "Camila R.",
      }),
    ]);
    const [diego] = await repository.searchMembers({
      query: "diego@example.com",
    });

    expect(diego?.id).toBe("member-diego");
    expect(diego?.currentSuspension).toMatchObject({
      reason: "Publicaciones repetidas con datos falsos.",
      status: "active",
    });
    await expect(
      repository.searchMembers({ query: "member-camila" }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "member-camila",
      }),
    ]);
  });

  it("persists one active suspension and keeps revoked rows in history", async () => {
    let tick = 0;
    const repository = createInMemoryMemberSuspensionRepository({
      members: [
        {
          email: "ana@example.com",
          id: "member-ana",
          name: "Ana S.",
        },
      ],
      now: () => new Date(`2026-06-26T16:0${tick++}:00.000Z`),
    });

    const suspended = await repository.suspendMember({
      adminId: "member-admin",
      memberId: "member-ana",
      reason: "Intentos repetidos de estafa.",
    });
    const duplicate = await repository.suspendMember({
      adminId: "member-admin-2",
      memberId: "member-ana",
      reason: "Otro motivo no debe crear una fila activa nueva.",
    });

    expect(duplicate?.id).toBe(suspended?.id);
    await expect(
      repository.findActiveByMemberId("member-ana"),
    ).resolves.toEqual(
      expect.objectContaining({
        memberId: "member-ana",
        reason: "Intentos repetidos de estafa.",
        status: "active",
        suspendedByAdminId: "member-admin",
      }),
    );

    await expect(
      repository.unsuspendMember({
        adminId: "member-admin-2",
        memberId: "member-ana",
        reason: "Identidad verificada por soporte.",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        revokedByAdminId: "member-admin-2",
        revokedReason: "Identidad verificada por soporte.",
        status: "revoked",
      }),
    );
    await expect(
      repository.findActiveByMemberId("member-ana"),
    ).resolves.toBeNull();

    const profile = await repository.getMemberProfile("member-ana");

    expect(profile?.currentSuspension).toBeNull();
    expect(profile?.suspensionHistory).toEqual([
      expect.objectContaining({
        reason: "Intentos repetidos de estafa.",
        revokedReason: "Identidad verificada por soporte.",
        status: "revoked",
      }),
    ]);
  });

  it("returns member profiles with account state, reports, moderation reports, and suspension history", async () => {
    const repository = createInMemoryMemberSuspensionRepository({
      members: [
        {
          email: "huellitas@example.com",
          emailVerified: false,
          id: "member-huellitas",
          name: "Huellitas La Paz",
        },
      ],
      moderationReports: [
        {
          action: "hide",
          adminId: "member-admin",
          createdAt: new Date("2026-06-26T16:30:00.000Z"),
          id: "moderation-action-1",
          note: "Fotos no corresponden al caso.",
          reason: "spam",
          reportId: "member-huellitas-adoption-1",
          reportTitle: "Nala busca nuevo hogar",
          reportType: "adoption",
        },
      ],
      recentReports: [
        {
          createdAt: new Date("2026-06-26T15:00:00.000Z"),
          hiddenAt: new Date("2026-06-26T16:30:00.000Z"),
          id: "adoption-1",
          locationLabel: "Sopocachi, La Paz",
          memberId: "member-huellitas",
          status: "active",
          title: "Nala busca nuevo hogar",
          type: "adoption",
        },
        {
          createdAt: new Date("2026-06-26T14:00:00.000Z"),
          hiddenAt: null,
          id: "lost-1",
          locationLabel: "Achumani, La Paz",
          memberId: "member-huellitas",
          status: "active",
          title: "Bruno perdido",
          type: "lost_pet",
        },
      ],
      suspensions: [
        activeSuspension({
          memberId: "member-huellitas",
          reason: "Publicación de adopción con información inconsistente.",
        }),
      ],
    });

    const profile = await repository.getMemberProfile("member-huellitas");

    expect(profile).toMatchObject({
      currentSuspension: {
        reason: "Publicación de adopción con información inconsistente.",
        status: "active",
      },
      member: {
        email: "huellitas@example.com",
        emailVerified: false,
        id: "member-huellitas",
        name: "Huellitas La Paz",
      },
      summary: {
        adoptionListingCount: 1,
        moderationReportCount: 1,
        reportCount: 2,
      },
    });
    expect(profile?.recentReports.map((report) => report.title)).toEqual([
      "Nala busca nuevo hogar",
      "Bruno perdido",
    ]);
    expect(profile?.moderationReports).toEqual([
      expect.objectContaining({
        action: "hide",
        reason: "spam",
        reportTitle: "Nala busca nuevo hogar",
      }),
    ]);
    expect(profile?.suspensionHistory).toHaveLength(1);
  });
});

function activeSuspension(
  overrides: Partial<PersistedMemberSuspension>,
): PersistedMemberSuspension {
  return {
    id: "member-suspension-existing",
    memberId: "member-diego",
    reason: "Abuso confirmado.",
    revokedAt: null,
    revokedByAdminId: null,
    revokedReason: null,
    status: "active",
    suspendedAt: new Date("2026-06-26T15:00:00.000Z"),
    suspendedByAdminId: "member-admin",
    updatedAt: new Date("2026-06-26T15:00:00.000Z"),
    ...overrides,
  };
}
