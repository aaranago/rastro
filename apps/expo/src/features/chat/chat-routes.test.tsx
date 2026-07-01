import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellSession } from "../shell/shell-model";
import type { ApiChatRepository } from "./api-chat-repository";
import type { ChatConversation } from "./chat-model";
import ActivityChatRoute from "../../app/(tabs)/(activity)/chats/[conversationId]";
import ReportChatRoute, {
  openReportChatConversation,
} from "../../app/(tabs)/(activity)/chats/report/[reportId]";

(globalThis as { React?: typeof React }).React = React;

const params = vi.hoisted(() => ({
  value: {
    conversationId: "chat-conversation-1",
    reportId: "report-lost-1",
  },
}));

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

const shell = vi.hoisted(() => ({
  model: {
    appStates: {
      states: {
        loading: {
          kind: "loading",
          title: "Cargando Rastro",
        },
      },
    },
    session: {
      id: "member-camila",
      kind: "member",
    } as ShellSession,
  },
  requestAuthPrompt: vi.fn(),
  session: {
    email: "camila@example.com",
    id: "member-camila",
    kind: "member",
    name: "Camila",
  } as ShellSession,
}));

const chat = vi.hoisted(() => ({
  capturedScreenProps: [] as Record<string, unknown>[],
  createApiChatRepository: vi.fn(),
  repository: {
    blockMember: vi.fn(),
    getConversation: vi.fn(),
    getOrCreateConversation: vi.fn(),
    hideConversation: vi.fn(),
    listConversations: vi.fn(),
    openReportConversation: vi.fn(),
    refreshConversation: vi.fn(),
    reportConversation: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

const appState = vi.hoisted(() => ({
  capturedProps: [] as Record<string, unknown>[],
}));

const api = vi.hoisted(() => ({
  trpcClient: {},
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => {
      effect();
    },
    useState: <TValue,>(initialValue: TValue | (() => TValue)) => [
      typeof initialValue === "function"
        ? (initialValue as () => TValue)()
        : initialValue,
      vi.fn(),
    ],
  };
});

vi.mock("expo-router", () => ({
  useLocalSearchParams: () => params.value,
  useRouter: () => router,
}));

vi.mock("~/utils/api", () => ({
  trpcClient: api.trpcClient,
}));

vi.mock("~/features/shell/shell-provider", () => ({
  useRastroShell: () => shell,
}));

vi.mock("~/features/chat/api-chat-repository", () => {
  chat.createApiChatRepository.mockReturnValue(chat.repository);

  return {
    createApiChatRepository: chat.createApiChatRepository,
  };
});

vi.mock("~/features/chat/chat-screen", () => ({
  ChatScreen: (props: Record<string, unknown>) => {
    chat.capturedScreenProps.push(props);

    return React.createElement("ChatScreen", props);
  },
}));

vi.mock("~/features/app-states", () => ({
  AppStateScreen: (props: Record<string, unknown>) => {
    appState.capturedProps.push(props);

    return React.createElement("AppStateScreen", props);
  },
  createEmptyStateDescriptor: (input: Record<string, unknown>) => ({
    kind: "empty",
    ...input,
  }),
  createErrorStateDescriptor: (input: Record<string, unknown>) => ({
    kind: "error",
    ...input,
  }),
  createLoadingStateDescriptor: (input: Record<string, unknown>) => ({
    kind: "loading",
    ...input,
  }),
}));

describe("chat routes", () => {
  beforeEach(() => {
    params.value = {
      conversationId: "chat-conversation-1",
      reportId: "report-lost-1",
    };
    shell.model.session = {
      id: "member-camila",
      kind: "member",
    };
    shell.session = {
      email: "camila@example.com",
      id: "member-camila",
      kind: "member",
      name: "Camila",
    };
    chat.capturedScreenProps = [];
    appState.capturedProps = [];
    shell.requestAuthPrompt.mockReset();
    router.push.mockReset();
    router.replace.mockReset();
    chat.repository.openReportConversation.mockReset();
    chat.repository.openReportConversation.mockResolvedValue(
      createConversation(),
    );
  });

  it("passes the API chat repository and current member id to the chat screen", () => {
    void renderFunctionElements(<ActivityChatRoute />);

    expect(chat.capturedScreenProps).toEqual([
      expect.objectContaining({
        conversationId: "chat-conversation-1",
        repository: chat.repository,
        viewerMemberId: "member-camila",
      }),
    ]);
  });

  it("shows signed-out Spanish copy instead of sample chat data", () => {
    shell.model.session = { kind: "visitor" };
    shell.session = { kind: "visitor" };

    void renderFunctionElements(<ActivityChatRoute />);

    expect(chat.capturedScreenProps).toEqual([]);
    expect(appState.capturedProps[0]).toMatchObject({
      descriptor: {
        body: "Inicia sesión para usar el chat de Rastro y continuar esta conversación.",
        title: "Inicia sesión para usar el chat",
      },
      testID: "chat-route-signed-out",
    });

    const onActionPress = appState.capturedProps[0]?.onActionPress as
      | ((action: { id: string }) => void)
      | undefined;

    if (typeof onActionPress !== "function") {
      throw new Error("Expected a sign-in action handler.");
    }

    onActionPress({ id: "sign-in" });

    expect(shell.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/chats/chat-conversation-1",
      sourceHref: "rastro://chats/chat-conversation-1",
    });
  });

  it("opens a report conversation from the protected report chat route and replaces to the conversation route", async () => {
    void renderFunctionElements(<ReportChatRoute />);
    await Promise.resolve();

    expect(chat.repository.openReportConversation).toHaveBeenCalledWith({
      reportId: "report-lost-1",
    });
    expect(router.replace).toHaveBeenCalledWith("/chats/chat-conversation-1");
  });

  it("keeps the open-and-replace helper focused on the backend conversation id", async () => {
    const openReportConversation = vi
      .fn()
      .mockResolvedValue(createConversation());
    const repository = {
      ...chat.repository,
      openReportConversation,
    } as unknown as ApiChatRepository;
    const routerReplace = vi.fn();

    await openReportChatConversation({
      reportId: "report-lost-1",
      repository,
      routerReplace,
    });

    expect(openReportConversation).toHaveBeenCalledWith({
      reportId: "report-lost-1",
    });
    expect(routerReplace).toHaveBeenCalledWith("/chats/chat-conversation-1");
  });

  it("protects report chat creation for visitors", () => {
    shell.model.session = { kind: "visitor" };
    shell.session = { kind: "visitor" };

    void renderFunctionElements(<ReportChatRoute />);

    expect(chat.repository.openReportConversation).not.toHaveBeenCalled();
    expect(appState.capturedProps[0]).toMatchObject({
      descriptor: {
        body: "Inicia sesión para usar el chat de Rastro y contactar a la persona cuidadora.",
        title: "Inicia sesión para usar el chat",
      },
      testID: "report-chat-route-signed-out",
    });
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function renderFunctionElements(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  const rendered =
    typeof node.type === "function"
      ? renderFunctionComponent(node)
      : node.props.children;

  React.Children.forEach(rendered, (child) => {
    void renderFunctionElements(child);
  });

  return node;
}

function renderFunctionComponent(node: React.ReactElement<ElementProps>) {
  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return Component(node.props);
}

function createConversation(): ChatConversation {
  return {
    blockedMemberships: [],
    createdAt: "2026-06-30T13:00:00.000Z",
    hiddenByMemberIds: [],
    id: "chat-conversation-1",
    messages: [],
    participants: [
      { displayName: "Camila", memberId: "member-camila" },
      { displayName: "Diego", memberId: "member-diego" },
    ],
    reports: [],
    subject: {
      href: "rastro://reportes/perdidos/report-lost-1",
      id: "report-lost-1",
      kind: "lost-pet-report",
      subtitle: "Sopocachi",
      title: "Toby",
    },
    updatedAt: "2026-06-30T13:00:00.000Z",
  };
}
