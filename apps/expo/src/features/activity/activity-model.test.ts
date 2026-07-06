import { describe, expect, it } from "vitest";

import type { LostPetAlertNotification } from "../alert-subscriptions/alert-subscriptions";
import type { ChatParticipant, ChatSubject } from "../chat/chat-model";
import { createInMemoryChatRepository } from "../chat/chat-model";
import { findStaleActiveReportPrompts } from "../reports/report-lifecycle";
import { buildActivityViewModel } from "./activity-model";

const member = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
} as const;

const finder: ChatParticipant = {
  displayName: "Diego",
  memberId: "member-diego",
};

const lostReportSubject: ChatSubject = {
  href: "rastro://reportes/perdidos/lost-report-1",
  id: "lost-report-1",
  kind: "lost-pet-report",
  subtitle: "Sopocachi",
  title: "Toby",
};

describe("Activity view model", () => {
  it("keeps visitors in a signed-out Spanish Activity state", () => {
    const viewModel = buildActivityViewModel({
      session: { kind: "visitor" },
    });

    expect(viewModel).toMatchObject({
      kind: "visitor",
      signedOut: {
        action: {
          href: "rastro://auth/sign-in?returnTo=/actividad",
          label: "Iniciar sesión",
        },
        body: "Tus alertas, mensajes y actualizaciones aparecerán aquí cuando seas miembro.",
        title: "Inicia sesión para ver tu actividad",
      },
      title: "Actividad",
    });
    expect(viewModel.sections).toEqual([]);
  });

  it("shows nearby lost-pet alert history with report deep links", () => {
    const notification: LostPetAlertNotification = {
      body: "Toby fue reportada cerca de Sopocachi.",
      deepLink: "rastro://reportes/perdidos/lost-report-1",
      memberId: member.memberId,
      reportId: "lost-report-1",
      title: "Mascota perdida cerca de ti",
      webUrl: "https://rastro.bo/reportes/perdidos/lost-report-1",
    };

    const viewModel = buildActivityViewModel({
      nearbyLostPetAlerts: [
        {
          notification,
          receivedAt: "2026-06-18T12:10:00.000Z",
        },
      ],
      session: member,
    });

    expect(viewModel).toMatchObject({
      kind: "member",
      sections: [
        {
          id: "nearby-alerts",
          items: [
            {
              action: {
                href: "rastro://reportes/perdidos/lost-report-1",
                label: "Ver reporte",
              },
              body: "Toby fue reportada cerca de Sopocachi.",
              id: "nearby-alert-lost-report-1",
              kind: "nearby-lost-pet-alert",
              occurredAt: "2026-06-18T12:10:00.000Z",
              title: "Mascota perdida cerca de ti",
              tone: "urgent",
            },
          ],
          title: "Historial de alertas",
        },
      ],
      title: "Actividad",
    });
  });

  it("shows an empty member hub state when there is no activity yet", () => {
    const viewModel = buildActivityViewModel({
      session: member,
    });

    expect(viewModel).toMatchObject({
      emptyState: {
        action: {
          href: "/(tabs)/(nearby)",
          label: "Ver reportes cercanos",
        },
        body: "Cuando publiques un reporte, recibas un mensaje o una alerta cercana, lo verás aquí.",
        title: "Sin actividad todavía",
      },
      kind: "member",
      sections: [],
      subtitle: "Alertas, mensajes y actualizaciones",
      title: "Actividad",
    });
  });

  it("shows report-linked chat conversations with chat deep links", async () => {
    const repository = createInMemoryChatRepository({
      now: () => "2026-06-18T12:20:00.000Z",
    });
    const conversation = await repository.getOrCreateConversation({
      participants: [
        { displayName: member.displayName, memberId: member.memberId },
        finder,
      ],
      subject: lostReportSubject,
    });
    const updated = await repository.sendMessage({
      conversationId: conversation.id,
      senderMemberId: finder.memberId,
      text: "Lo vi cerca de la plaza.",
    });

    const viewModel = buildActivityViewModel({
      chatConversations: [updated],
      session: member,
    });

    expect(viewModel.sections).toEqual([
      {
        id: "chats",
        items: [
          {
            action: {
              href: "rastro://chats/chat-conversation-1",
              label: "Abrir chat",
            },
            body: "Diego: Lo vi cerca de la plaza.",
            id: "chat-chat-conversation-1",
            kind: "chat-conversation",
            meta: "Toby - Sopocachi",
            occurredAt: "2026-06-18T12:20:00.000Z",
            title: "Diego",
            tone: "info",
          },
        ],
        title: "Mensajes",
      },
    ]);
  });

  it("shows backend alert deliveries and chat summaries with preserved links", () => {
    const viewModel = buildActivityViewModel({
      alertDeliveries: [
        {
          body: "Toby fue reportado cerca de Sopocachi.",
          deliveryId: "alert-delivery-1",
          href: "rastro://reportes/perdidos/lost-report-1",
          id: "activity-alert-1",
          occurredAt: "2026-06-30T13:00:00.000Z",
          reportId: "lost-report-1",
          status: "delivered",
          title: "Mascota perdida cerca de ti",
        },
      ],
      chatSummaries: [
        {
          conversationId: "chat-conversation-1",
          href: "rastro://chats/chat-conversation-1",
          id: "activity-chat-1",
          lastMessage: {
            authorLabel: "Diego",
            id: "chat-message-1",
            sentAt: "2026-06-30T13:03:00.000Z",
            text: "Lo vi cerca de la plaza.",
          },
          occurredAt: "2026-06-30T13:04:00.000Z",
          otherParticipant: {
            displayName: "Diego",
            memberId: "member-diego",
          },
          subject: {
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            kind: "lost-pet-report",
            subtitle: "Sopocachi",
            title: "Toby",
          },
        },
      ],
      session: member,
    });

    expect(viewModel.sections).toEqual([
      {
        id: "chats",
        items: [
          {
            action: {
              href: "rastro://chats/chat-conversation-1",
              label: "Abrir chat",
            },
            body: "Diego: Lo vi cerca de la plaza.",
            id: "chat-chat-conversation-1",
            kind: "chat-conversation",
            meta: "Toby - Sopocachi",
            occurredAt: "2026-06-30T13:04:00.000Z",
            targetId: "chat-conversation-1",
            title: "Diego",
            tone: "info",
          },
        ],
        title: "Mensajes",
      },
      {
        id: "nearby-alerts",
        items: [
          {
            action: {
              href: "rastro://reportes/perdidos/lost-report-1",
              label: "Ver reporte",
            },
            body: "Toby fue reportado cerca de Sopocachi.",
            id: "alert-alert-delivery-1",
            kind: "nearby-lost-pet-alert",
            meta: "Entregada",
            occurredAt: "2026-06-30T13:00:00.000Z",
            targetId: "lost-report-1",
            title: "Mascota perdida cerca de ti",
            tone: "urgent",
          },
        ],
        title: "Historial de alertas",
      },
    ]);
  });

  it("shows backend report updates and moderation events as separate sections", () => {
    const viewModel = buildActivityViewModel({
      moderationEvents: [
        {
          action: "hide",
          adminId: "member-admin",
          id: "moderation-event-1",
          note: "Ubicación sensible.",
          occurredAt: "2026-06-30T13:06:00.000Z",
          reason: "Ubicación exacta expuesta",
          report: {
            availability: "hidden",
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            kind: "lost-pet-report",
            outcome: null,
            status: "active",
            title: "Toby",
            type: "lost_pet",
          },
        },
      ],
      reportUpdates: [
        {
          actorMemberId: member.memberId,
          eventType: "resolved",
          fromStatus: "active",
          id: "report-update-1",
          note: null,
          occurredAt: "2026-06-30T13:05:00.000Z",
          outcome: "reunited",
          report: {
            availability: "available",
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            kind: "lost-pet-report",
            outcome: "reunited",
            status: "closed",
            title: "Toby",
            type: "lost_pet",
          },
          toStatus: "closed",
        },
      ],
      session: member,
    });

    expect(viewModel.sections).toEqual([
      {
        id: "moderation-events",
        items: [
          {
            action: {
              href: "/mis-reportes",
              label: "Revisar en Mis reportes",
            },
            body: "El equipo retiró temporalmente este reporte: Ubicación exacta expuesta.",
            id: "moderation-event-moderation-event-1",
            kind: "moderation-event",
            meta: "Mascota perdida - Retirado de la búsqueda",
            occurredAt: "2026-06-30T13:06:00.000Z",
            targetId: "lost-report-1",
            title: "Toby",
            tone: "attention",
          },
        ],
        title: "Moderación",
      },
      {
        id: "report-updates",
        items: [
          {
            action: {
              href: "rastro://reportes/perdidos/lost-report-1",
              label: "Ver reporte",
            },
            body: "Resultado registrado: Reunida.",
            id: "report-update-report-update-1",
            kind: "report-update",
            meta: "Mascota perdida - Reunida",
            occurredAt: "2026-06-30T13:05:00.000Z",
            targetId: "lost-report-1",
            title: "Toby",
            tone: "info",
          },
        ],
        title: "Actualizaciones",
      },
    ]);
  });

  it("labels stale cached member Activity without changing the section data", () => {
    const viewModel = buildActivityViewModel({
      isOffline: true,
      isStale: true,
      reportUpdates: [
        {
          eventType: "updated",
          id: "report-update-1",
          occurredAt: "2026-06-30T13:05:00.000Z",
          report: {
            availability: "available",
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            kind: "lost-pet-report",
            outcome: null,
            status: "active",
            title: "Toby",
            type: "lost_pet",
          },
        },
      ],
      session: member,
    });

    expect(viewModel).toMatchObject({
      kind: "member",
      offlineLabel: "Sin conexión - actividad guardada",
      sections: [
        {
          id: "report-updates",
        },
      ],
    });
  });

  it("shows owned report status prompts with explicit update hrefs", () => {
    const [prompt] = findStaleActiveReportPrompts({
      now: "2026-06-18T12:00:00.000Z",
      reports: [
        {
          id: "lost-report-1",
          lifecycleConfirmedAt: "2026-06-01T12:00:00.000Z",
          outcome: "still-missing",
          status: "active",
          title: "Toby",
          updatedAt: "2026-06-01T12:00:00.000Z",
        },
      ],
      staleAfterDays: 14,
    });

    if (!prompt) {
      throw new Error("Expected stale active report prompt.");
    }

    const viewModel = buildActivityViewModel({
      ownedReportPrompts: [
        {
          href: "rastro://reportes/perdidos/lost-report-1/actualizar",
          promptedAt: "2026-06-18T12:00:00.000Z",
          prompt,
        },
      ],
      session: member,
    });

    expect(viewModel.sections).toEqual([
      {
        id: "report-updates",
        items: [
          {
            action: {
              href: "rastro://reportes/perdidos/lost-report-1/actualizar",
              label: "Confirmar o actualizar",
            },
            body: "Confirma si este reporte sigue activo o elige un resultado.",
            id: "report-update-lost-report-1",
            kind: "owned-report-update",
            meta: "Reporte activo",
            occurredAt: "2026-06-18T12:00:00.000Z",
            title: "Toby",
            tone: "attention",
          },
        ],
        title: "Actualizaciones",
      },
    ]);
  });

  it("represents candidate matches with candidate report hrefs", () => {
    const viewModel = buildActivityViewModel({
      candidateMatches: [
        {
          candidate: {
            href: "rastro://reportes/encontrados/found-report-1",
            id: "found-report-1",
            kind: "found-pet-report",
            title: "Perro encontrado en Sopocachi",
          },
          confidence: "possible",
          createdAt: "2026-06-18T12:30:00.000Z",
          id: "match-1",
          locationLabel: "Sopocachi",
          ownedReport: {
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            title: "Toby",
          },
        },
      ],
      session: member,
    });

    expect(viewModel.sections).toEqual([
      {
        id: "candidate-matches",
        items: [
          {
            action: {
              href: "rastro://reportes/encontrados/found-report-1",
              label: "Revisar coincidencia",
            },
            body: "Perro encontrado en Sopocachi podría coincidir con Toby.",
            id: "candidate-match-match-1",
            kind: "candidate-match",
            meta: "Sopocachi",
            occurredAt: "2026-06-18T12:30:00.000Z",
            title: "Coincidencia posible",
            tone: "attention",
          },
        ],
        title: "Coincidencias",
      },
    ]);
  });
});
