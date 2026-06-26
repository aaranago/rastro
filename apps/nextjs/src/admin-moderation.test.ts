import { describe, expect, it } from "vitest";

import { createInMemoryAdminModerationDashboard } from "./admin-moderation";

const adminViewer = {
  memberId: "member-admin-la-paz",
  role: "admin",
} as const;

describe("admin moderation dashboard", () => {
  it("lets admins view flagged reports, Adoption Listings, In-App Chats, and Resource Provider profiles", () => {
    const dashboard = createInMemoryAdminModerationDashboard();

    const result = dashboard.getViewModel(adminViewer);

    expect(result).toMatchObject({
      status: "authorized",
      viewModel: {
        locale: "es-BO",
        settings: {
          adoptionReviewMode: {
            label: "Review Mode",
          },
          verifiedEmailRequiredToPublish: {
            label: "Email verificado requerido para publicar",
          },
        },
        title: "Panel de moderacion",
      },
    });

    if (result.status !== "authorized") {
      throw new Error("Expected an authorized admin dashboard");
    }

    expect(result.viewModel.queues.flaggedReports.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          city: "La Paz",
          department: "La Paz",
          surfaceLabel: "Lost Pet Report",
          targetId: "lost-bruno-achumani",
        }),
        expect.objectContaining({
          city: "Cochabamba",
          department: "Cochabamba",
          surfaceLabel: "Found Pet Report",
          targetId: "found-michi-sarco",
        }),
        expect.objectContaining({
          city: "La Paz",
          department: "La Paz",
          surfaceLabel: "Sighting Report",
          targetId: "sighting-toby-miraflores",
        }),
      ]),
    );
    expect(result.viewModel.queues.flaggedAdoptionListings.items).toEqual([
      expect.objectContaining({
        surfaceLabel: "Adoption Listing",
        targetId: "adopt-nala-sopocachi",
      }),
    ]);
    expect(result.viewModel.queues.flaggedChats.items).toEqual([
      expect.objectContaining({
        surfaceLabel: "In-App Chat",
        targetId: "chat-bruno-achumani",
      }),
    ]);
    const resourceProvider =
      result.viewModel.queues.flaggedResourceProviders.items[0];

    expect(resourceProvider).toMatchObject({
      surfaceLabel: "Resource Provider",
      targetId: "clinic-san-roque",
    });

    if (!resourceProvider) {
      throw new Error("Expected a flagged Resource Provider profile");
    }

    expect(resourceProvider.verificationBadge).toMatchObject({
      label: "Verification Badge",
    });
  });

  it("lets admins hide and restore reports and Adoption Listings", () => {
    const dashboard = createInMemoryAdminModerationDashboard();

    expect(
      dashboard.applyAction(adminViewer, {
        targetId: "lost-bruno-achumani",
        targetType: "lost_pet_report",
        type: "hide_target",
      }),
    ).toMatchObject({
      announcement: {
        title: "Contenido oculto",
      },
      status: "updated",
    });

    expect(findModerationItem(dashboard, "lost-bruno-achumani")).toMatchObject({
      availableActions: [
        {
          label: "Restaurar",
          type: "restore_target",
        },
      ],
      statusLabel: "Oculto de superficies publicas",
      visibility: "hidden",
    });

    expect(
      dashboard.applyAction(adminViewer, {
        targetId: "lost-bruno-achumani",
        targetType: "lost_pet_report",
        type: "restore_target",
      }),
    ).toMatchObject({
      announcement: {
        title: "Contenido restaurado",
      },
      status: "updated",
    });
    expect(findModerationItem(dashboard, "lost-bruno-achumani")).toMatchObject({
      availableActions: [
        {
          label: "Ocultar",
          type: "hide_target",
        },
      ],
      statusLabel: "Visible en superficies publicas",
      visibility: "visible",
    });

    dashboard.applyAction(adminViewer, {
      targetId: "adopt-nala-sopocachi",
      targetType: "adoption_listing",
      type: "hide_target",
    });

    expect(findModerationItem(dashboard, "adopt-nala-sopocachi")).toMatchObject(
      {
        statusLabel: "Oculto de superficies publicas",
        surfaceLabel: "Adoption Listing",
        visibility: "hidden",
      },
    );
  });

  it("lets admins ban and unban abusive members", () => {
    const dashboard = createInMemoryAdminModerationDashboard();

    expect(findModerationItem(dashboard, "chat-bruno-achumani")).toMatchObject({
      reportedMember: {
        displayName: "Diego P.",
        memberId: "member-diego",
        status: "active",
        statusLabel: "Miembro activo",
      },
    });

    expect(
      dashboard.applyAction(adminViewer, {
        memberId: "member-diego",
        type: "ban_member",
      }),
    ).toMatchObject({
      announcement: {
        title: "Miembro bloqueado",
      },
      status: "updated",
    });
    expect(findModerationItem(dashboard, "chat-bruno-achumani")).toMatchObject({
      reportedMember: {
        availableAction: {
          label: "Quitar bloqueo",
          type: "unban_member",
        },
        status: "banned",
        statusLabel: "Bloqueado por abuso",
      },
    });

    expect(
      dashboard.applyAction(adminViewer, {
        memberId: "member-diego",
        type: "unban_member",
      }),
    ).toMatchObject({
      announcement: {
        title: "Miembro restaurado",
      },
      status: "updated",
    });
    expect(findModerationItem(dashboard, "chat-bruno-achumani")).toMatchObject({
      reportedMember: {
        availableAction: {
          label: "Bloquear miembro",
          type: "ban_member",
        },
        status: "active",
        statusLabel: "Miembro activo",
      },
    });
  });

  it("lets admins toggle Review Mode and verified email requirements", () => {
    const dashboard = createInMemoryAdminModerationDashboard();

    expect(getAuthorizedViewModel(dashboard).settings).toMatchObject({
      adoptionReviewMode: {
        enabled: false,
        label: "Review Mode",
      },
      verifiedEmailRequiredToPublish: {
        enabled: false,
        label: "Email verificado requerido para publicar",
      },
    });

    expect(
      dashboard.applyAction(adminViewer, {
        type: "toggle_adoption_review_mode",
      }),
    ).toMatchObject({
      announcement: {
        title: "Review Mode activado",
      },
      status: "updated",
    });
    expect(
      getAuthorizedViewModel(dashboard).settings.adoptionReviewMode,
    ).toMatchObject({
      enabled: true,
      stateLabel: "Activado",
      summary:
        "Nuevas Adoption Listings requieren revision antes de publicarse.",
    });

    expect(
      dashboard.applyAction(adminViewer, {
        type: "toggle_verified_email_required_to_publish",
      }),
    ).toMatchObject({
      announcement: {
        title: "Email verificado requerido",
      },
      status: "updated",
    });
    expect(
      getAuthorizedViewModel(dashboard).settings.verifiedEmailRequiredToPublish,
    ).toMatchObject({
      enabled: true,
      stateLabel: "Activado",
      summary:
        "Los miembros deben verificar su email antes de crear reportes o Adoption Listings.",
    });
  });

  it("shows basic abuse metrics by city and department", () => {
    const dashboard = createInMemoryAdminModerationDashboard();

    expect(getAuthorizedViewModel(dashboard).metrics).toEqual({
      byCity: [
        {
          bannedMemberCount: 0,
          hiddenTargetCount: 0,
          label: "La Paz",
          reportCount: 13,
        },
        {
          bannedMemberCount: 0,
          hiddenTargetCount: 0,
          label: "Cochabamba",
          reportCount: 2,
        },
        {
          bannedMemberCount: 0,
          hiddenTargetCount: 0,
          label: "Santa Cruz de la Sierra",
          reportCount: 2,
        },
      ],
      byDepartment: [
        {
          bannedMemberCount: 0,
          hiddenTargetCount: 0,
          label: "La Paz",
          reportCount: 13,
        },
        {
          bannedMemberCount: 0,
          hiddenTargetCount: 0,
          label: "Cochabamba",
          reportCount: 2,
        },
        {
          bannedMemberCount: 0,
          hiddenTargetCount: 0,
          label: "Santa Cruz",
          reportCount: 2,
        },
      ],
    });

    dashboard.applyAction(adminViewer, {
      targetId: "lost-bruno-achumani",
      targetType: "lost_pet_report",
      type: "hide_target",
    });
    dashboard.applyAction(adminViewer, {
      memberId: "member-diego",
      type: "ban_member",
    });

    expect(getAuthorizedViewModel(dashboard).metrics.byCity[0]).toEqual({
      bannedMemberCount: 1,
      hiddenTargetCount: 1,
      label: "La Paz",
      reportCount: 13,
    });
  });

  it("blocks non-admin members from admin surfaces and commands", () => {
    const dashboard = createInMemoryAdminModerationDashboard();
    const memberViewer = {
      memberId: "member-diego",
      role: "member",
    } as const;

    expect(dashboard.getViewModel(memberViewer)).toEqual({
      status: "forbidden",
      viewModel: {
        body: "Esta superficie esta disponible solo para administradores de Rastro.",
        locale: "es-BO",
        title: "Acceso restringido",
      },
    });
    expect(
      dashboard.applyAction(memberViewer, {
        memberId: "member-camila",
        type: "ban_member",
      }),
    ).toEqual({
      status: "forbidden",
      viewModel: {
        body: "Esta superficie esta disponible solo para administradores de Rastro.",
        locale: "es-BO",
        title: "Acceso restringido",
      },
    });
    expect(findModerationItem(dashboard, "found-michi-sarco")).toMatchObject({
      reportedMember: {
        memberId: "member-camila",
        status: "active",
      },
    });
  });
});

function getAuthorizedViewModel(
  dashboard: ReturnType<typeof createInMemoryAdminModerationDashboard>,
) {
  const result = dashboard.getViewModel(adminViewer);

  if (result.status !== "authorized") {
    throw new Error("Expected an authorized admin dashboard");
  }

  return result.viewModel;
}

function findModerationItem(
  dashboard: ReturnType<typeof createInMemoryAdminModerationDashboard>,
  targetId: string,
) {
  const viewModel = getAuthorizedViewModel(dashboard);
  const items = [
    ...viewModel.queues.flaggedReports.items,
    ...viewModel.queues.flaggedAdoptionListings.items,
    ...viewModel.queues.flaggedChats.items,
    ...viewModel.queues.flaggedResourceProviders.items,
  ];
  const item = items.find((candidate) => candidate.targetId === targetId);

  if (!item) {
    throw new Error(`Expected moderation item ${targetId}`);
  }

  return item;
}
