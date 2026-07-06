import { describe, expect, it } from "vitest";

import { createInMemoryAdminModerationDashboard } from "./admin-moderation";

const adminViewer = {
  memberId: "member-admin-la-paz",
  role: "admin",
} as const;

describe("admin moderation dashboard", () => {
  it("lets admins view flagged reports, adoption listings, chats, and provider profiles", () => {
    const dashboard = createInMemoryAdminModerationDashboard();

    const result = dashboard.getViewModel(adminViewer);

    expect(result).toMatchObject({
      status: "authorized",
      viewModel: {
        locale: "es-BO",
        settings: {
          adoptionReviewMode: {
            label: "Modo de revisión",
          },
          verifiedEmailRequiredToPublish: {
            label: "Correo verificado requerido para publicar",
          },
        },
        title: "Panel de moderación",
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
          surfaceLabel: "Reporte de mascota perdida",
          targetId: "lost-bruno-achumani",
        }),
        expect.objectContaining({
          city: "Cochabamba",
          department: "Cochabamba",
          surfaceLabel: "Reporte de mascota encontrada",
          targetId: "found-michi-sarco",
        }),
        expect.objectContaining({
          city: "La Paz",
          department: "La Paz",
          surfaceLabel: "Reporte de avistamiento",
          targetId: "sighting-toby-miraflores",
        }),
      ]),
    );
    expect(result.viewModel.queues.flaggedAdoptionListings.items).toEqual([
      expect.objectContaining({
        surfaceLabel: "Publicación de adopción",
        targetId: "adopt-nala-sopocachi",
      }),
    ]);
    expect(result.viewModel.queues.flaggedChats.items).toEqual([
      expect.objectContaining({
        surfaceLabel: "Chat interno",
        targetId: "chat-bruno-achumani",
      }),
    ]);
    const resourceProvider =
      result.viewModel.queues.flaggedResourceProviders.items[0];

    expect(resourceProvider).toMatchObject({
      surfaceLabel: "Perfil de proveedor",
      targetId: "clinic-san-roque",
    });

    if (!resourceProvider) {
      throw new Error("Expected a flagged provider profile");
    }

    expect(resourceProvider.verificationBadge).toMatchObject({
      label: "Insignia de verificación",
    });
  });

  it("lets admins hide and restore reports and adoption listings", () => {
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
      statusLabel: "Oculto de superficies públicas",
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
      statusLabel: "Visible en superficies públicas",
      visibility: "visible",
    });

    dashboard.applyAction(adminViewer, {
      targetId: "adopt-nala-sopocachi",
      targetType: "adoption_listing",
      type: "hide_target",
    });

    expect(findModerationItem(dashboard, "adopt-nala-sopocachi")).toMatchObject(
      {
        statusLabel: "Oculto de superficies públicas",
        surfaceLabel: "Publicación de adopción",
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

  it("lets admins toggle review mode and verified email requirements", () => {
    const dashboard = createInMemoryAdminModerationDashboard();

    expect(getAuthorizedViewModel(dashboard).settings).toMatchObject({
      adoptionReviewMode: {
        enabled: false,
        label: "Modo de revisión",
      },
      verifiedEmailRequiredToPublish: {
        enabled: false,
        label: "Correo verificado requerido para publicar",
      },
    });

    expect(
      dashboard.applyAction(adminViewer, {
        type: "toggle_adoption_review_mode",
      }),
    ).toMatchObject({
      announcement: {
        title: "Modo de revisión activado",
      },
      status: "updated",
    });
    expect(
      getAuthorizedViewModel(dashboard).settings.adoptionReviewMode,
    ).toMatchObject({
      enabled: true,
      stateLabel: "Activado",
      summary: "Nuevas adopciones requieren revisión antes de publicarse.",
    });

    expect(
      dashboard.applyAction(adminViewer, {
        type: "toggle_verified_email_required_to_publish",
      }),
    ).toMatchObject({
      announcement: {
        title: "Correo verificado requerido",
      },
      status: "updated",
    });
    expect(
      getAuthorizedViewModel(dashboard).settings.verifiedEmailRequiredToPublish,
    ).toMatchObject({
      enabled: true,
      stateLabel: "Activado",
      summary:
        "Los miembros deben verificar su correo antes de crear reportes o adopciones.",
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
        body: "Esta superficie está disponible solo para administradores de Rastro.",
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
        body: "Esta superficie está disponible solo para administradores de Rastro.",
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
