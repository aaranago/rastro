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
        body: "Tus alertas cercanas, chats, actualizaciones y coincidencias aparecerán aquí.",
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
            body: "Perro encontrado en Sopocachi podria coincidir con Toby.",
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
