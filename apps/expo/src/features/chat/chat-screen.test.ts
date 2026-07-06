import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import type { ChatConversation, ChatSubject } from "./chat-model";
import type { ChatScreenRepository } from "./chat-screen";
import {
  buildChatScreenViewModel,
  ChatScreen,
  getChatComposerLayoutInsets,
  openChatSubjectHref,
} from "./chat-screen";

vi.mock("react", async () => {
  const actual = await vi.importActual("react");

  return {
    ...actual,
    useCallback: <TCallback>(callback: TCallback) => callback,
    useEffect: () => undefined,
    useMemo: <TValue>(factory: () => TValue) => factory(),
    useState: <TValue>(initialValue: TValue | (() => TValue)) => [
      typeof initialValue === "function"
        ? (initialValue as () => TValue)()
        : initialValue,
      () => undefined,
    ],
  };
});

vi.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("~/features/chat/chat-model", async () =>
  vi.importActual("./chat-model"),
);

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  FlatList: "FlatList",
  Keyboard: {
    addListener: () => ({
      remove: vi.fn(),
    }),
  },
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Linking: {
    openURL: () => Promise.resolve(),
  },
  Modal: "Modal",
  Platform: {
    OS: "ios",
  },
  Pressable: "Pressable",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

describe("ChatScreen view model", () => {
  it("surfaces Spanish report-linked chat labels without unsupported chat surfaces", () => {
    const viewModel = buildChatScreenViewModel({
      conversation: {
        blockedMemberships: [],
        createdAt: "2026-06-18T12:00:00.000Z",
        hiddenByMemberIds: [],
        id: "conversation-1",
        messages: [
          {
            conversationId: "conversation-1",
            createdAt: "2026-06-18T12:01:00.000Z",
            id: "message-1",
            senderMemberId: "member-diego",
            text: "Vi a Toby cerca de la plaza.",
          },
        ],
        participants: [
          { displayName: "Camila", memberId: "member-camila" },
          { displayName: "Diego", memberId: "member-diego" },
        ],
        reports: [],
        subject: {
          href: "rastro://reportes/perdidos/lost-report-1",
          id: "lost-report-1",
          kind: "lost-pet-report",
          subtitle: "Sopocachi",
          title: "Toby",
        },
        updatedAt: "2026-06-18T12:01:00.000Z",
      },
      viewerMemberId: "member-camila",
    });

    expect(viewModel.actions).toMatchObject({
      blockDisabled: false,
      blockLabel: "Bloquear a Diego",
      refreshLabel: "Actualizar",
      reportDisabled: false,
      reportLabel: "Reportar chat",
      sendLabel: "Enviar",
      subjectLinkLabel: "Ver reporte",
    });
    expect(viewModel.composerPlaceholder).toBe("Escribe un mensaje");
    expect(viewModel.headerTitle).toBe("Diego");
    expect(viewModel.headerSubtitle).toBe("Toby - Sopocachi");

    const renderedCopy = [
      viewModel.actions.blockLabel,
      viewModel.actions.refreshLabel,
      viewModel.actions.reportLabel,
      viewModel.actions.sendLabel,
      viewModel.actions.subjectLinkLabel,
      viewModel.composerPlaceholder,
      viewModel.emptyMessageLabel,
      viewModel.headerSubtitle,
      viewModel.headerTitle,
      viewModel.messages.map((message) => message.body).join(" "),
      viewModel.reportStatusLabel,
      viewModel.statusLabel,
      viewModel.subject?.label,
      viewModel.subject?.subtitle,
      viewModel.subject?.title,
    ]
      .join(" ")
      .toLowerCase();

    for (const forbiddenCopy of [
      "archivo",
      "attachment",
      "comentario",
      "comment",
      "dm",
      "grupo",
      "group",
    ]) {
      expect(renderedCopy).not.toContain(forbiddenCopy);
    }
  });

  it("opens internal report subject links with injected navigation instead of external Linking", () => {
    const openExternalUrl = vi.fn();
    const routerPush = vi.fn();
    const subject: ChatSubject = {
      href: "rastro://reportes/encontrados/found-report-1",
      id: "found-report-1",
      kind: "found-pet-report",
      subtitle: "Sopocachi",
      title: "Perro encontrado",
    };

    openChatSubjectHref({
      openExternalUrl,
      routerPush,
      subject,
    });

    expect(routerPush).toHaveBeenCalledWith(
      "/reportes/encontrados/found-report-1",
    );
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("exposes the empty composer send button as disabled", () => {
    const conversation = createChatConversation();
    const repository = createStaticChatRepository(conversation);
    const screen = renderFunctionElement(
      ChatScreen({
        conversationId: conversation.id,
        initialConversation: conversation,
        pollIntervalMs: 0,
        repository,
        viewerMemberId: "member-camila",
      }),
    );
    const sendButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && element.props.disabled === true,
    );

    expect(sendButton?.props.accessibilityLabel).toBe("Enviar");
    expect(sendButton?.props.accessibilityRole).toBe("button");
    expect(sendButton?.props.accessibilityState).toEqual({
      busy: false,
      disabled: true,
    });
  });

  it("opens safety workflows from header actions without instant mutation", () => {
    const conversation = createChatConversation();
    const repository = createSpyChatRepository(conversation);
    const screen = renderFunctionElement(
      ChatScreen({
        conversationId: conversation.id,
        initialConversation: conversation,
        pollIntervalMs: 0,
        repository,
        viewerMemberId: "member-camila",
      }),
    );
    const header = getFlatListHeader(screen);
    const reportAction = findElement(
      header,
      (element) =>
        element.type === "Pressable" &&
        element.props.testID === "chat-header-action-reportar-chat",
    );
    const blockAction = findElement(
      header,
      (element) =>
        element.type === "Pressable" &&
        element.props.testID === "chat-header-action-bloquear-a-diego",
    );

    toPressHandler(reportAction?.props.onPress)();
    toPressHandler(blockAction?.props.onPress)();

    expect(repository.reportConversation).not.toHaveBeenCalled();
    expect(repository.blockMember).not.toHaveBeenCalled();
  });

  it("disables the composer when the viewer blocked the chat", () => {
    const conversation = {
      ...createChatConversation(),
      blockedMemberships: [
        {
          blockedAt: "2026-06-18T12:20:00.000Z",
          blockedMemberId: "member-diego",
          blockerMemberId: "member-camila",
        },
      ],
    };
    const repository = createStaticChatRepository(conversation);
    const screen = renderFunctionElement(
      ChatScreen({
        conversationId: conversation.id,
        initialConversation: conversation,
        pollIntervalMs: 0,
        repository,
        viewerMemberId: "member-camila",
      }),
    );
    const input = findElement(
      screen,
      (element) =>
        element.type === "TextInput" &&
        element.props.testID === "chat-message-input",
    );
    const disabledReason = findElement(
      screen,
      (element) =>
        element.type === "Text" &&
        element.props.testID === "chat-composer-disabled-reason",
    );

    expect(input?.props.editable).toBe(false);
    expect(disabledReason?.props.children).toBe("Chat bloqueado");
  });

  it("keeps tab clearance at rest and compacts the composer when the keyboard is visible", () => {
    expect(
      getChatComposerLayoutInsets({
        bottomSafeAreaInset: 0,
        keyboardBottomInset: 0,
      }),
    ).toEqual({
      composerBottomMargin: 208,
      composerBottomPadding: 12,
      listBottomInset: 304,
    });

    expect(
      getChatComposerLayoutInsets({
        bottomSafeAreaInset: 34,
        keyboardBottomInset: 320,
      }),
    ).toEqual({
      composerBottomMargin: 320,
      composerBottomPadding: 46,
      listBottomInset: 452,
    });
  });
});

function createChatConversation(): ChatConversation {
  return {
    blockedMemberships: [],
    createdAt: "2026-06-18T12:00:00.000Z",
    hiddenByMemberIds: [],
    id: "conversation-1",
    messages: [],
    participants: [
      { displayName: "Camila", memberId: "member-camila" },
      { displayName: "Diego", memberId: "member-diego" },
    ],
    reports: [],
    subject: {
      href: "rastro://reportes/perdidos/lost-report-1",
      id: "lost-report-1",
      kind: "lost-pet-report",
      subtitle: "Sopocachi",
      title: "Toby",
    },
    updatedAt: "2026-06-18T12:00:00.000Z",
  };
}

function createStaticChatRepository(
  conversation: ChatConversation,
): ChatScreenRepository {
  return {
    blockMember: () => Promise.resolve(conversation),
    getConversation: () => Promise.resolve(conversation),
    getOrCreateConversation: () => Promise.resolve(conversation),
    hideConversation: () => Promise.resolve(conversation),
    listConversations: () => Promise.resolve([conversation]),
    refreshConversation: () => Promise.resolve(conversation),
    reportConversation: () => Promise.resolve(conversation),
    sendMessage: () => Promise.resolve(conversation),
  };
}

function createSpyChatRepository(
  conversation: ChatConversation,
): ChatScreenRepository & {
  blockMember: ReturnType<typeof vi.fn>;
  reportConversation: ReturnType<typeof vi.fn>;
} {
  return {
    blockMember: vi.fn(() => Promise.resolve(conversation)),
    getConversation: () => Promise.resolve(conversation),
    getOrCreateConversation: () => Promise.resolve(conversation),
    hideConversation: () => Promise.resolve(conversation),
    listConversations: () => Promise.resolve([conversation]),
    refreshConversation: () => Promise.resolve(conversation),
    reportConversation: vi.fn(() => Promise.resolve(conversation)),
    sendMessage: () => Promise.resolve(conversation),
  };
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  if (typeof node.type !== "function") {
    return node;
  }

  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return Component(node.props);
}

function getFlatListHeader(node: React.ReactNode): React.ReactNode {
  const flatList = findElement(node, (element) => element.type === "FlatList");
  const header = flatList?.props.ListHeaderComponent;

  if (!React.isValidElement(header)) {
    throw new Error("Expected chat list header.");
  }

  return renderFunctionElement(header);
}

function toPressHandler(value: unknown): () => void {
  if (typeof value !== "function") {
    throw new Error("Expected press handler.");
  }

  return value as () => void;
}

function findElement(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement | undefined {
  const rendered = renderFunctionElement(node);

  if (!React.isValidElement<ElementProps>(rendered)) {
    return undefined;
  }

  if (predicate(rendered)) {
    return rendered;
  }

  for (const child of React.Children.toArray(rendered.props.children)) {
    const found = findElement(child, predicate);

    if (found) {
      return found;
    }
  }

  return undefined;
}
