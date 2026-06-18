import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import type {
  ChatConversation,
  ChatParticipant,
  ChatRepository,
  ChatSubject,
} from "~/features/chat/chat-model";
import { buildChatConversationViewModel } from "~/features/chat/chat-model";
import { shellColors } from "../shell/shell-theme";

export type ChatScreenConversation = ChatConversation;
export type ChatScreenRepository = ChatRepository;

export interface ChatScreenProps {
  conversationId: string;
  initialConversation?: ChatScreenConversation;
  onBlockParticipant?: (input: {
    conversation: ChatScreenConversation;
    participant?: ChatParticipant;
  }) => void;
  onOpenSubject?: (subject: ChatSubject) => void;
  onReportConversation?: (conversation: ChatScreenConversation) => void;
  pollIntervalMs?: number;
  repository: ChatScreenRepository;
  viewerMemberId: string;
}

export interface ChatScreenViewModel {
  actions: {
    blockLabel: string;
    refreshLabel: string;
    reportLabel: string;
    sendLabel: string;
    subjectLinkLabel: string;
  };
  composerPlaceholder: string;
  emptyMessageLabel: string;
  errorLabel?: string;
  headerSubtitle: string;
  headerTitle: string;
  messages: ChatMessageViewModel[];
  otherParticipant?: ChatParticipant;
  statusLabel?: string;
  subject?: {
    href: string;
    label: string;
    subtitle?: string;
    title: string;
  };
}

export interface ChatMessageViewModel {
  body: string;
  createdAtLabel: string;
  id: string;
  isMine: boolean;
  senderLabel: string;
}

const bottomInset = 28;
const defaultPollIntervalMs = 30000;
const messageTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit",
});

const messageKeyExtractor = (item: ChatMessageViewModel) => item.id;

export function buildChatScreenViewModel({
  conversation,
  errorLabel,
  viewerMemberId,
}: {
  conversation?: ChatScreenConversation | null;
  errorLabel?: string;
  viewerMemberId: string;
}): ChatScreenViewModel {
  const conversationViewModel = conversation
    ? buildChatConversationViewModel({
        conversation,
        viewerMemberId,
      })
    : undefined;
  const subjectLinkLabel = conversation
    ? getCompactSubjectLinkLabel(conversation.subject)
    : "Ver reporte";
  const otherParticipant = conversation
    ? getOtherParticipant(conversation, viewerMemberId)
    : undefined;

  return {
    actions: {
      blockLabel: "Bloquear",
      refreshLabel: "Actualizar",
      reportLabel: "Reportar",
      sendLabel: conversationViewModel?.composer.sendLabel ?? "Enviar",
      subjectLinkLabel,
    },
    composerPlaceholder:
      conversationViewModel?.composer.placeholder ?? "Escribe un mensaje",
    emptyMessageLabel:
      conversationViewModel?.emptyState ?? "Aun no hay mensajes.",
    errorLabel,
    headerSubtitle: conversationViewModel
      ? `Con ${conversationViewModel.title}`
      : "Conversacion vinculada a Rastro",
    headerTitle: conversationViewModel?.contactOptionLabel ?? "Chat en Rastro",
    messages:
      conversationViewModel?.messages.map((message) => ({
        body: message.text,
        createdAtLabel: formatMessageTime(message.sentAt),
        id: message.id,
        isMine: message.isMine,
        senderLabel: message.authorLabel,
      })) ?? [],
    otherParticipant,
    statusLabel:
      conversationViewModel?.refreshPolicy.label ??
      "Se actualiza al abrir, enviar o cada cierto tiempo.",
    subject:
      conversation && conversationViewModel
        ? {
            href: conversationViewModel.subjectLink.href,
            label: getSubjectKindLabel(conversation.subject),
            subtitle: conversationViewModel.subjectLink.subtitle,
            title: conversationViewModel.subjectLink.title,
          }
        : undefined,
  };
}

export function ChatScreen({
  conversationId,
  initialConversation,
  onBlockParticipant,
  onOpenSubject,
  onReportConversation,
  pollIntervalMs = defaultPollIntervalMs,
  repository,
  viewerMemberId,
}: ChatScreenProps) {
  const [conversation, setConversation] = React.useState<
    ChatScreenConversation | null | undefined
  >(initialConversation);
  const [draftMessage, setDraftMessage] = React.useState("");
  const [errorLabel, setErrorLabel] = React.useState<string | undefined>();
  const [isRefreshing, setIsRefreshing] = React.useState(!initialConversation);
  const [isSending, setIsSending] = React.useState(false);

  const refreshConversation = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsRefreshing(true);
      }
      setErrorLabel(undefined);

      try {
        const nextConversation = await loadChatConversation({
          conversationId,
          repository,
          viewerMemberId,
        });

        setConversation(nextConversation);

        if (!nextConversation) {
          setErrorLabel("No encontramos este chat.");
        }
      } catch {
        setErrorLabel("No pudimos actualizar el chat.");
      } finally {
        setIsRefreshing(false);
      }
    },
    [conversationId, repository, viewerMemberId],
  );

  React.useEffect(() => {
    let isCurrent = true;

    async function loadInitialConversation() {
      try {
        const nextConversation = await loadChatConversation({
          conversationId,
          repository,
          viewerMemberId,
        });

        if (isCurrent) {
          setConversation(nextConversation);
          setErrorLabel(
            nextConversation ? undefined : "No encontramos este chat.",
          );
        }
      } catch {
        if (isCurrent) {
          setErrorLabel("No pudimos cargar el chat.");
        }
      } finally {
        if (isCurrent) {
          setIsRefreshing(false);
        }
      }
    }

    void loadInitialConversation();

    return () => {
      isCurrent = false;
    };
  }, [conversationId, repository, viewerMemberId]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshConversation({ silent: true });

      if (pollIntervalMs <= 0) {
        return undefined;
      }

      const timer = setInterval(() => {
        void refreshConversation({ silent: true });
      }, pollIntervalMs);

      return () => {
        clearInterval(timer);
      };
    }, [pollIntervalMs, refreshConversation]),
  );

  const viewModel = React.useMemo(
    () =>
      buildChatScreenViewModel({
        conversation,
        errorLabel,
        viewerMemberId,
      }),
    [conversation, errorLabel, viewerMemberId],
  );

  const handleOpenSubject = React.useCallback(() => {
    if (!conversation) {
      return;
    }

    if (onOpenSubject) {
      onOpenSubject(conversation.subject);
      return;
    }

    void Linking.openURL(conversation.subject.href);
  }, [conversation, onOpenSubject]);

  const handleReportConversation = React.useCallback(async () => {
    if (!conversation) {
      return;
    }

    if (onReportConversation) {
      onReportConversation(conversation);
      return;
    }

    try {
      const nextConversation = await repository.reportConversation({
        conversationId: conversation.id,
        reporterMemberId: viewerMemberId,
      });

      setConversation(nextConversation);
    } catch {
      setErrorLabel("No pudimos reportar el chat.");
    }
  }, [conversation, onReportConversation, repository, viewerMemberId]);

  const handleBlockParticipant = React.useCallback(async () => {
    if (!conversation) {
      return;
    }

    if (onBlockParticipant) {
      onBlockParticipant({
        conversation,
        participant: viewModel.otherParticipant,
      });
      return;
    }

    if (!viewModel.otherParticipant) {
      return;
    }

    try {
      const nextConversation = await repository.blockMember({
        blockedMemberId: viewModel.otherParticipant.memberId,
        blockerMemberId: viewerMemberId,
        conversationId: conversation.id,
      });

      setConversation(nextConversation);
    } catch {
      setErrorLabel("No pudimos bloquear este chat.");
    }
  }, [
    conversation,
    onBlockParticipant,
    repository,
    viewerMemberId,
    viewModel.otherParticipant,
  ]);

  const handleSendMessage = React.useCallback(async () => {
    const body = draftMessage.trim();

    if (!body || !conversation || isSending) {
      return;
    }

    setIsSending(true);
    setErrorLabel(undefined);

    try {
      const nextConversation = await repository.sendMessage({
        conversationId: conversation.id,
        senderMemberId: viewerMemberId,
        text: body,
      });

      setDraftMessage("");

      setConversation(nextConversation);
    } catch {
      setErrorLabel("No pudimos enviar el mensaje.");
    } finally {
      setIsSending(false);
    }
  }, [conversation, draftMessage, isSending, repository, viewerMemberId]);

  const renderMessage = React.useCallback(
    ({ item }: { item: ChatMessageViewModel }) => (
      <MessageBubble message={item} />
    ),
    [],
  );

  const canSend = draftMessage.trim().length > 0 && !!conversation;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <FlatList
        ListEmptyComponent={
          isRefreshing ? (
            <ChatState label="Cargando chat..." loading />
          ) : (
            <ChatState label={viewModel.emptyMessageLabel} />
          )
        }
        ListHeaderComponent={
          <ChatHeader
            onBlockParticipant={handleBlockParticipant}
            onOpenSubject={handleOpenSubject}
            onRefresh={() => {
              void refreshConversation();
            }}
            onReportConversation={handleReportConversation}
            viewModel={viewModel}
          />
        }
        contentContainerStyle={styles.listContent}
        contentInset={{ bottom: bottomInset }}
        contentInsetAdjustmentBehavior="automatic"
        data={viewModel.messages}
        keyExtractor={messageKeyExtractor}
        keyboardShouldPersistTaps="handled"
        onRefresh={() => {
          void refreshConversation();
        }}
        refreshing={isRefreshing}
        renderItem={renderMessage}
        scrollIndicatorInsets={{ bottom: bottomInset }}
        style={styles.list}
      />
      <View style={styles.composer}>
        <TextInput
          maxFontSizeMultiplier={1.2}
          multiline
          onChangeText={setDraftMessage}
          placeholder={viewModel.composerPlaceholder}
          placeholderTextColor={shellColors.muted}
          style={styles.composerInput}
          value={draftMessage}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!canSend || isSending}
          onPress={handleSendMessage}
          style={[
            styles.sendButton,
            !canSend || isSending ? styles.disabledButton : null,
          ]}
        >
          {isSending ? (
            <ActivityIndicator color={shellColors.white} />
          ) : (
            <Text maxFontSizeMultiplier={1.1} style={styles.sendButtonText}>
              {viewModel.actions.sendLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

async function loadChatConversation({
  conversationId,
  repository,
  viewerMemberId,
}: {
  conversationId: string;
  repository: ChatScreenRepository;
  viewerMemberId: string;
}) {
  const refreshed = await repository.refreshConversation({
    conversationId,
    viewerMemberId,
  });

  if (refreshed) {
    return refreshed;
  }

  return repository.getConversation({
    conversationId,
    viewerMemberId,
  });
}

function ChatHeader({
  onBlockParticipant,
  onOpenSubject,
  onRefresh,
  onReportConversation,
  viewModel,
}: {
  onBlockParticipant: () => void;
  onOpenSubject: () => void;
  onRefresh: () => void;
  onReportConversation: () => void;
  viewModel: ChatScreenViewModel;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text selectable style={styles.eyebrow}>
          Actividad
        </Text>
        <Text maxFontSizeMultiplier={1.2} selectable style={styles.title}>
          {viewModel.headerTitle}
        </Text>
        <Text maxFontSizeMultiplier={1.2} selectable style={styles.subtitle}>
          {viewModel.headerSubtitle}
        </Text>
      </View>

      {viewModel.subject ? (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSubject}
          style={styles.subjectCard}
        >
          <View style={styles.subjectCopy}>
            <Text selectable style={styles.subjectLabel}>
              {viewModel.subject.label}
            </Text>
            <Text maxFontSizeMultiplier={1.15} style={styles.subjectTitle}>
              {viewModel.subject.title}
            </Text>
            {viewModel.subject.subtitle ? (
              <Text maxFontSizeMultiplier={1.15} style={styles.subjectMeta}>
                {viewModel.subject.subtitle}
              </Text>
            ) : null}
          </View>
          <Text maxFontSizeMultiplier={1.05} style={styles.subjectAction}>
            {viewModel.actions.subjectLinkLabel}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.actionRow}>
        <HeaderAction
          label={viewModel.actions.refreshLabel}
          onPress={onRefresh}
        />
        <HeaderAction
          label={viewModel.actions.reportLabel}
          onPress={onReportConversation}
        />
        <HeaderAction
          label={viewModel.actions.blockLabel}
          onPress={onBlockParticipant}
        />
      </View>

      {viewModel.statusLabel ? (
        <Text selectable style={styles.statusLabel}>
          {viewModel.statusLabel}
        </Text>
      ) : null}
      {viewModel.errorLabel ? (
        <Text selectable style={styles.errorLabel}>
          {viewModel.errorLabel}
        </Text>
      ) : null}
    </View>
  );
}

function HeaderAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.headerAction}
    >
      <Text maxFontSizeMultiplier={1.05} style={styles.headerActionText}>
        {label}
      </Text>
    </Pressable>
  );
}

function MessageBubble({ message }: { message: ChatMessageViewModel }) {
  return (
    <View
      style={[
        styles.messageBubble,
        message.isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.1}
        style={[
          styles.messageSender,
          message.isMine ? styles.messageSenderMine : null,
        ]}
      >
        {message.senderLabel}
      </Text>
      <Text
        maxFontSizeMultiplier={1.2}
        selectable
        style={[
          styles.messageBody,
          message.isMine ? styles.messageBodyMine : null,
        ]}
      >
        {message.body}
      </Text>
      <Text
        maxFontSizeMultiplier={1.05}
        style={[
          styles.messageTime,
          message.isMine ? styles.messageTimeMine : null,
        ]}
      >
        {message.createdAtLabel}
      </Text>
    </View>
  );
}

function ChatState({
  label,
  loading = false,
}: {
  label: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.stateBox}>
      {loading ? <ActivityIndicator color={shellColors.primary} /> : null}
      <Text maxFontSizeMultiplier={1.2} style={styles.stateText}>
        {label}
      </Text>
    </View>
  );
}

function getOtherParticipant(
  conversation: ChatScreenConversation,
  viewerMemberId: string,
) {
  return conversation.participants.find(
    (participant) => participant.memberId !== viewerMemberId,
  );
}

function getCompactSubjectLinkLabel(subject: ChatSubject) {
  return subject.kind === "adoption-listing" ? "Ver adopcion" : "Ver reporte";
}

function getSubjectKindLabel(subject: ChatSubject) {
  return subject.kind === "adoption-listing"
    ? "Adopcion vinculada"
    : "Reporte vinculado";
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return messageTimeFormatter.format(date);
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  composer: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  composerInput: {
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    color: shellColors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 110,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabledButton: {
    opacity: 0.45,
  },
  errorLabel: {
    color: shellColors.lost,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  eyebrow: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  header: {
    gap: 14,
    paddingBottom: 18,
  },
  headerAction: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerActionText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  list: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  listContent: {
    gap: 12,
    padding: 18,
    paddingTop: 24,
  },
  messageBody: {
    color: shellColors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  messageBodyMine: {
    color: shellColors.white,
  },
  messageBubble: {
    borderCurve: "continuous",
    borderRadius: 18,
    gap: 5,
    maxWidth: "86%",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  messageBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: shellColors.primary,
  },
  messageBubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderWidth: 1,
  },
  messageSender: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  messageSenderMine: {
    color: shellColors.primarySoft,
  },
  messageTime: {
    color: shellColors.muted,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  messageTimeMine: {
    color: shellColors.primarySoft,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  sendButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: shellColors.primary,
    borderCurve: "continuous",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 86,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonText: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  stateBox: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  stateText: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  statusLabel: {
    color: shellColors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  subjectAction: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  subjectCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  subjectCopy: {
    flex: 1,
    gap: 4,
  },
  subjectLabel: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  subjectMeta: {
    color: shellColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  subjectTitle: {
    color: shellColors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  subtitle: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  title: {
    color: shellColors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  titleBlock: {
    gap: 6,
  },
});
