import * as React from "react";
import { useLocalSearchParams } from "expo-router";

import type {
  ChatConversation,
  ChatParticipant,
  ChatRepository,
  ChatSubject,
} from "~/features/chat/chat-model";
import { createInMemoryChatRepository } from "~/features/chat/chat-model";
import { ChatScreen } from "~/features/chat/chat-screen";

const viewerMemberId = "member-camila";

const sampleParticipants: [ChatParticipant, ChatParticipant] = [
  {
    displayName: "Camila",
    memberId: "member-camila",
  },
  {
    displayName: "Diego",
    memberId: "member-diego",
  },
];

const sampleSubject: ChatSubject = {
  href: "rastro://reportes/perdidos/lost-report-1",
  id: "lost-report-1",
  kind: "lost-pet-report",
  subtitle: "Sopocachi, La Paz",
  title: "Toby",
};

const sampleConversation: ChatConversation = {
  blockedMemberships: [],
  createdAt: "2026-06-18T12:00:00.000Z",
  hiddenByMemberIds: [],
  id: "chat-conversation-1",
  messages: [
    {
      conversationId: "chat-conversation-1",
      createdAt: "2026-06-18T12:01:00.000Z",
      id: "chat-message-1",
      senderMemberId: "member-diego",
      text: "Hola, vi a Toby cerca de la plaza Abaroa hace unos minutos.",
    },
    {
      conversationId: "chat-conversation-1",
      createdAt: "2026-06-18T12:03:00.000Z",
      id: "chat-message-2",
      senderMemberId: "member-camila",
      text: "Gracias. Estoy cerca, puedes decirme si iba hacia la avenida?",
    },
  ],
  participants: sampleParticipants,
  reports: [],
  subject: sampleSubject,
  updatedAt: "2026-06-18T12:03:00.000Z",
};

export default function ActivityChatRoute() {
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const conversationId = getConversationId(params.conversationId);
  const repository = React.useMemo(() => createSampleChatRepository(), []);

  return (
    <ChatScreen
      conversationId={conversationId}
      initialConversation={sampleConversation}
      pollIntervalMs={20000}
      repository={repository}
      viewerMemberId={viewerMemberId}
    />
  );
}

function createSampleChatRepository(): ChatRepository {
  let currentTime = sampleConversation.createdAt;
  let seedPromise: Promise<void> | undefined;
  const repository = createInMemoryChatRepository({
    now: () => currentTime,
  });

  async function seedSampleConversation() {
    seedPromise ??= (async () => {
      const conversation = await repository.getOrCreateConversation({
        participants: sampleParticipants,
        subject: sampleSubject,
      });

      if (conversation.messages.length > 0) {
        return;
      }

      for (const message of sampleConversation.messages) {
        currentTime = message.createdAt;
        await repository.sendMessage({
          conversationId: conversation.id,
          senderMemberId: message.senderMemberId,
          text: message.text,
        });
      }
    })();

    await seedPromise;
  }

  return {
    async blockMember(input) {
      await seedSampleConversation();

      return repository.blockMember(input);
    },
    async getConversation(input) {
      await seedSampleConversation();

      return repository.getConversation(input);
    },
    getOrCreateConversation(input) {
      return repository.getOrCreateConversation(input);
    },
    async hideConversation(input) {
      await seedSampleConversation();

      return repository.hideConversation(input);
    },
    async listConversations(input) {
      await seedSampleConversation();

      return repository.listConversations(input);
    },
    async refreshConversation(input) {
      await seedSampleConversation();

      return repository.refreshConversation(input);
    },
    async reportConversation(input) {
      await seedSampleConversation();

      return repository.reportConversation(input);
    },
    async sendMessage(input) {
      await seedSampleConversation();
      currentTime = new Date().toISOString();

      return repository.sendMessage(input);
    },
  };
}

function getConversationId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? sampleConversation.id;
  }

  return value ?? sampleConversation.id;
}
