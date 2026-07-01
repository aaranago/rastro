import type { Href } from "expo-router";
import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { ApiChatRepository } from "~/features/chat/api-chat-repository";
import {
  AppStateScreen,
  createEmptyStateDescriptor,
  createErrorStateDescriptor,
  createLoadingStateDescriptor,
} from "~/features/app-states";
import { createApiChatRepository } from "~/features/chat/api-chat-repository";
import { useRastroShell } from "~/features/shell/shell-provider";
import { trpcClient } from "~/utils/api";

const chatRepository = createApiChatRepository({
  client: trpcClient,
});

type OpenReportChatState = "error" | "opening";

export default function ReportChatRoute() {
  const { reportId } = useLocalSearchParams<{
    reportId?: string | string[];
  }>();
  const resolvedReportId = normalizeRouteParam(reportId);
  const router = useRouter();
  const { model, requestAuthPrompt, session } = useRastroShell();
  const [state, setState] = React.useState<OpenReportChatState>("opening");
  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    if (model.session.kind === "loading" || session.kind !== "member") {
      return undefined;
    }

    if (!resolvedReportId) {
      setState("error");
      return undefined;
    }

    let isCurrent = true;

    setState("opening");
    void openReportChatConversation({
      reportId: resolvedReportId,
      repository: chatRepository,
      routerReplace: (href) => {
        router.replace(href);
      },
    }).catch(() => {
      if (isCurrent) {
        setState("error");
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [model.session.kind, resolvedReportId, retryKey, router, session.kind]);

  if (model.session.kind === "loading") {
    return <AppStateScreen descriptor={model.appStates.states.loading} />;
  }

  if (!resolvedReportId) {
    return (
      <AppStateScreen
        descriptor={createErrorStateDescriptor({
          body: "No encontramos el reporte para abrir este chat.",
          retryActionLabel: false,
          title: "Chat no disponible",
        })}
        testID="report-chat-route-invalid"
      />
    );
  }

  if (session.kind !== "member") {
    const sourceHref = `rastro://chats/report/${resolvedReportId}`;

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
          body: "Inicia sesión para usar el chat de Rastro y contactar a la persona cuidadora.",
          iconName: "message.fill",
          title: "Inicia sesión para usar el chat",
          tone: "info",
        })}
        onActionPress={(action) => {
          if (action.id === "sign-in") {
            requestAuthPrompt({
              returnTo: `/chats/report/${resolvedReportId}`,
              sourceHref,
            });
          }
        }}
        testID="report-chat-route-signed-out"
      />
    );
  }

  if (state === "error") {
    return (
      <AppStateScreen
        descriptor={createErrorStateDescriptor({
          body: "No pudimos abrir el chat de este reporte. Intenta de nuevo en un momento.",
          title: "No pudimos abrir el chat",
        })}
        onActionPress={(action) => {
          if (action.id === "retry") {
            setRetryKey((current) => current + 1);
          }
        }}
        testID="report-chat-route-error"
      />
    );
  }

  return (
    <AppStateScreen
      descriptor={createLoadingStateDescriptor({
        body: "Estamos preparando la conversación vinculada a este reporte.",
        progressLabel: "Abriendo chat",
        title: "Abriendo chat",
      })}
      testID="report-chat-route-loading"
    />
  );
}

export async function openReportChatConversation({
  reportId,
  repository,
  routerReplace,
}: {
  reportId: string;
  repository: ApiChatRepository;
  routerReplace: (href: Href) => void;
}) {
  const conversation = await repository.openReportConversation({
    reportId,
  });

  routerReplace(`/chats/${conversation.id}` as Href);

  return conversation;
}

function normalizeRouteParam(value: string | string[] | undefined) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = firstValue?.trim();

  return normalizedValue && normalizedValue.length > 0
    ? normalizedValue
    : undefined;
}
