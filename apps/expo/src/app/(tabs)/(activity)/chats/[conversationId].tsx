import { useLocalSearchParams } from "expo-router";

import {
  AppStateScreen,
  createEmptyStateDescriptor,
  createErrorStateDescriptor,
} from "~/features/app-states";
import { createApiChatRepository } from "~/features/chat/api-chat-repository";
import { ChatScreen } from "~/features/chat/chat-screen";
import { useRastroShell } from "~/features/shell/shell-provider";
import { trpcClient } from "~/utils/api";

const chatRepository = createApiChatRepository({
  client: trpcClient,
});

export default function ActivityChatRoute() {
  const { conversationId } = useLocalSearchParams<{
    conversationId?: string | string[];
  }>();
  const resolvedConversationId = normalizeRouteParam(conversationId);
  const { model, requestAuthPrompt, session } = useRastroShell();

  if (model.session.kind === "loading") {
    return <AppStateScreen descriptor={model.appStates.states.loading} />;
  }

  if (!resolvedConversationId) {
    return (
      <AppStateScreen
        descriptor={createErrorStateDescriptor({
          body: "No encontramos el identificador de este chat.",
          retryActionLabel: false,
          title: "Chat no disponible",
        })}
        testID="chat-route-invalid"
      />
    );
  }

  if (session.kind !== "member") {
    const sourceHref = `rastro://chats/${resolvedConversationId}`;

    return (
      <AppStateScreen
        descriptor={createEmptyStateDescriptor({
          actions: [
            {
              iconName: "person.crop.circle.fill",
              id: "sign-in",
              label: "Iniciar sesión",
            },
          ],
          body: "Inicia sesión para usar el chat de Rastro y continuar esta conversación.",
          iconName: "message.fill",
          title: "Inicia sesión para usar el chat",
          tone: "info",
        })}
        onActionPress={(action) => {
          if (action.id === "sign-in") {
            requestAuthPrompt({
              returnTo: `/chats/${resolvedConversationId}`,
              sourceHref,
            });
          }
        }}
        testID="chat-route-signed-out"
      />
    );
  }

  return (
    <ChatScreen
      conversationId={resolvedConversationId}
      repository={chatRepository}
      viewerMemberId={session.id}
    />
  );
}

function normalizeRouteParam(value: string | string[] | undefined) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = firstValue?.trim();

  return normalizedValue && normalizedValue.length > 0
    ? normalizedValue
    : undefined;
}
