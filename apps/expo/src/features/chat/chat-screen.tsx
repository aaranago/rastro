import type { Href } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import type { MaterialCommunityIconName } from "../icons/safe-material-community-icon";
import type { TrustSafetyReportReason } from "../trust-safety";
import type {
  ChatConversation,
  ChatParticipant,
  ChatRepository,
  ChatSubject,
} from "~/features/chat/chat-model";
import { buildChatConversationViewModel } from "~/features/chat/chat-model";
import { SafeMaterialCommunityIcon } from "../icons/safe-material-community-icon";
import { openInternalRastroHref } from "../navigation/internal-rastro-links";
import { shellColors } from "../shell/shell-theme";
import { trustSafetyReportReasonOptions } from "../trust-safety/trust-safety-model";

export type ChatScreenConversation = ChatConversation;
export type ChatScreenRepository = ChatRepository;

export interface ChatScreenProps {
  conversationId: string;
  initialConversation?: ChatScreenConversation;
  onBlockParticipant?: (input: {
    conversation: ChatScreenConversation;
    participant?: ChatParticipant;
  }) => void;
  onOpenHref?: (href: string) => void;
  onOpenSubject?: (subject: ChatSubject) => void;
  onReportConversation?: (conversation: ChatScreenConversation) => void;
  pollIntervalMs?: number;
  repository: ChatScreenRepository;
  viewerMemberId: string;
}

export interface ChatScreenViewModel {
  actions: {
    blockDisabled: boolean;
    blockLabel: string;
    refreshLabel: string;
    reportDisabled: boolean;
    reportLabel: string;
    sendLabel: string;
    subjectLinkLabel: string;
  };
  blockStatusLabel?: string;
  composerDisabledReason?: string;
  composerPlaceholder: string;
  emptyMessageLabel: string;
  errorLabel?: string;
  headerSubtitle: string;
  headerTitle: string;
  messages: ChatMessageViewModel[];
  otherParticipant?: ChatParticipant;
  reportStatusLabel?: string;
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
  groupPosition: "single" | "first" | "middle" | "last";
  id: string;
  isMine: boolean;
  senderLabel: string;
  showSenderLabel: boolean;
  showTimestamp: boolean;
}

export interface OpenChatSubjectHrefInput {
  onOpenHref?: (href: string) => void;
  openExternalUrl: (href: string) => Promise<void> | void;
  routerPush: (href: Href) => void;
  subject: ChatSubject;
}

const defaultPollIntervalMs = 30000;
const chatComposerBasePadding = 12;
const chatComposerTabMargin = 208;
const chatListTabPadding = 304;
const chatListKeyboardPadding = 132;
const chatMinimumComposerTabMargin = 208;
const chatMinimumComposerTabPadding = 12;
const chatMinimumComposerKeyboardMargin = 24;
const chatMinimumListTabInset = 304;
const chatMinimumListKeyboardInset = 180;
const messageTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit",
});

const messageKeyExtractor = (item: ChatMessageViewModel) => item.id;
const defaultReportReason: TrustSafetyReportReason = "other";

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
      blockDisabled:
        conversationViewModel?.controls.block.status !== "available",
      blockLabel: conversationViewModel?.controls.block.label ?? "Bloquear",
      refreshLabel: "Actualizar",
      reportDisabled:
        conversationViewModel?.controls.report.status === "reported",
      reportLabel: conversationViewModel?.controls.report.label ?? "Reportar",
      sendLabel: conversationViewModel?.composer.sendLabel ?? "Enviar",
      subjectLinkLabel,
    },
    blockStatusLabel: conversationViewModel?.controls.block.statusLabel,
    composerDisabledReason: conversationViewModel?.composer.disabledReason,
    composerPlaceholder:
      conversationViewModel?.composer.disabledReason ??
      conversationViewModel?.composer.placeholder ??
      "Escribe un mensaje",
    emptyMessageLabel:
      conversationViewModel?.emptyState ?? "Aun no hay mensajes.",
    errorLabel,
    headerSubtitle: conversationViewModel
      ? formatChatHeaderSubtitle({
          subjectSubtitle: conversationViewModel.subjectLink.subtitle,
          subjectTitle: conversationViewModel.subjectLink.title,
        })
      : "Conversacion vinculada a Rastro",
    headerTitle: conversationViewModel?.title ?? "Chat en Rastro",
    messages:
      conversationViewModel?.messages.map((message) => ({
        body: message.text,
        createdAtLabel: formatMessageTime(message.sentAt),
        groupPosition: message.groupPosition,
        id: message.id,
        isMine: message.isMine,
        senderLabel: message.authorLabel,
        showSenderLabel: message.showSenderLabel,
        showTimestamp: message.showTimestamp,
      })) ?? [],
    otherParticipant,
    reportStatusLabel: conversationViewModel?.controls.report.statusLabel,
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
  onOpenHref,
  onOpenSubject,
  onReportConversation,
  pollIntervalMs = defaultPollIntervalMs,
  repository,
  viewerMemberId,
}: ChatScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboardBottomInset, setKeyboardBottomInset] = React.useState(0);
  const { composerBottomMargin, composerBottomPadding, listBottomInset } =
    getChatComposerLayoutInsets({
      bottomSafeAreaInset: insets.bottom,
      keyboardBottomInset,
    });
  const [conversation, setConversation] = React.useState<
    ChatScreenConversation | null | undefined
  >(initialConversation);
  const [draftMessage, setDraftMessage] = React.useState("");
  const [errorLabel, setErrorLabel] = React.useState<string | undefined>();
  const [isRefreshing, setIsRefreshing] = React.useState(!initialConversation);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = React.useState(false);
  const [isBlocking, setIsBlocking] = React.useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = React.useState(false);
  const [reportDraft, setReportDraft] = React.useState<{
    isOpen: boolean;
    note: string;
    reason: TrustSafetyReportReason;
  }>({
    isOpen: false,
    note: "",
    reason: defaultReportReason,
  });
  const [reportDraftError, setReportDraftError] = React.useState<
    string | undefined
  >();
  const [safetyNoticeLabel, setSafetyNoticeLabel] = React.useState<
    string | undefined
  >();
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardBottomInset(Math.max(event.endCoordinates.height, 0));
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardBottomInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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

    openChatSubjectHref({
      onOpenHref,
      openExternalUrl: (url) => Linking.openURL(url),
      routerPush: (href) => {
        router.push(href);
      },
      subject: conversation.subject,
    });
  }, [conversation, onOpenHref, onOpenSubject, router]);

  const openReportConversationDialog = React.useCallback(() => {
    if (!conversation || viewModel.actions.reportDisabled) {
      return;
    }

    setReportDraft({
      isOpen: true,
      note: "",
      reason: defaultReportReason,
    });
    setReportDraftError(undefined);
  }, [conversation, viewModel.actions.reportDisabled]);

  const closeReportConversationDialog = React.useCallback(() => {
    if (isReportSubmitting) {
      return;
    }

    setReportDraft((current) => ({
      ...current,
      isOpen: false,
    }));
    setReportDraftError(undefined);
  }, [isReportSubmitting]);

  const submitReportConversation = React.useCallback(async () => {
    if (!conversation || isReportSubmitting) {
      return;
    }

    const note = reportDraft.note.trim();

    if (note.length > 0 && note.length < 10) {
      setReportDraftError(
        "Si agregas detalle, escribe al menos 10 caracteres.",
      );
      return;
    }

    if (onReportConversation) {
      onReportConversation(conversation);
    }

    setIsReportSubmitting(true);
    setReportDraftError(undefined);
    setErrorLabel(undefined);

    try {
      const nextConversation = await repository.reportConversation({
        conversationId: conversation.id,
        note: note.length > 0 ? note : undefined,
        reason: reportDraft.reason,
        reporterMemberId: viewerMemberId,
      });

      setConversation(nextConversation);
      setReportDraft((current) => ({
        ...current,
        isOpen: false,
      }));
      setSafetyNoticeLabel("Reporte enviado. Moderación revisará este chat.");
    } catch {
      setReportDraftError("No pudimos reportar el chat.");
    } finally {
      setIsReportSubmitting(false);
    }
  }, [
    conversation,
    isReportSubmitting,
    onReportConversation,
    reportDraft.note,
    reportDraft.reason,
    repository,
    viewerMemberId,
  ]);

  const openBlockParticipantConfirmation = React.useCallback(() => {
    if (!conversation || viewModel.actions.blockDisabled) {
      return;
    }

    setIsBlockConfirmOpen(true);
  }, [conversation, viewModel.actions.blockDisabled]);

  const closeBlockParticipantConfirmation = React.useCallback(() => {
    if (!isBlocking) {
      setIsBlockConfirmOpen(false);
    }
  }, [isBlocking]);

  const confirmBlockParticipant = React.useCallback(async () => {
    if (!conversation || isBlocking) {
      return;
    }

    if (onBlockParticipant) {
      onBlockParticipant({
        conversation,
        participant: viewModel.otherParticipant,
      });
    }

    if (!viewModel.otherParticipant) {
      return;
    }

    setIsBlocking(true);
    setErrorLabel(undefined);

    try {
      const nextConversation = await repository.blockMember({
        blockedMemberId: viewModel.otherParticipant.memberId,
        blockerMemberId: viewerMemberId,
        conversationId: conversation.id,
      });

      setConversation(nextConversation);
      setIsBlockConfirmOpen(false);
      setSafetyNoticeLabel(
        `Bloqueaste a ${viewModel.otherParticipant.displayName}. No podrá responder en este chat.`,
      );
    } catch {
      setErrorLabel("No pudimos bloquear este chat.");
    } finally {
      setIsBlocking(false);
    }
  }, [
    conversation,
    isBlocking,
    onBlockParticipant,
    repository,
    viewerMemberId,
    viewModel.otherParticipant,
  ]);

  const handleSendMessage = React.useCallback(async () => {
    const body = draftMessage.trim();

    if (
      !body ||
      !conversation ||
      isSending ||
      viewModel.composerDisabledReason
    ) {
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
  }, [
    conversation,
    draftMessage,
    isSending,
    repository,
    viewerMemberId,
    viewModel.composerDisabledReason,
  ]);

  const renderMessage = React.useCallback(
    ({ item }: { item: ChatMessageViewModel }) => (
      <MessageBubble message={item} />
    ),
    [],
  );

  const canSend =
    draftMessage.trim().length > 0 &&
    !!conversation &&
    !viewModel.composerDisabledReason;

  return (
    <View style={styles.screen} testID="chat-screen">
      <FlatList
        testID="chat-message-list"
        ListEmptyComponent={
          isRefreshing ? (
            <ChatState label="Cargando chat..." loading />
          ) : (
            <ChatState label={viewModel.emptyMessageLabel} />
          )
        }
        ListHeaderComponent={
          <ChatHeader
            onBlockParticipant={openBlockParticipantConfirmation}
            onOpenSubject={handleOpenSubject}
            onRefresh={() => {
              void refreshConversation();
            }}
            onReportConversation={openReportConversationDialog}
            safetyNoticeLabel={safetyNoticeLabel}
            viewModel={viewModel}
          />
        }
        contentContainerStyle={styles.listContent}
        contentInset={{ bottom: listBottomInset }}
        contentInsetAdjustmentBehavior="automatic"
        data={viewModel.messages}
        keyExtractor={messageKeyExtractor}
        keyboardShouldPersistTaps="handled"
        onRefresh={() => {
          void refreshConversation();
        }}
        refreshing={isRefreshing}
        renderItem={renderMessage}
        scrollIndicatorInsets={{ bottom: listBottomInset }}
        style={styles.list}
      />
      {reportDraft.isOpen ? (
        <ReportConversationModal
          errorLabel={reportDraftError}
          isSubmitting={isReportSubmitting}
          note={reportDraft.note}
          onCancel={closeReportConversationDialog}
          onChangeNote={(note) => {
            setReportDraft((current) => ({
              ...current,
              note,
            }));
          }}
          onChangeReason={(reason) => {
            setReportDraft((current) => ({
              ...current,
              reason,
            }));
            setReportDraftError(undefined);
          }}
          onSubmit={submitReportConversation}
          reason={reportDraft.reason}
        />
      ) : null}
      {isBlockConfirmOpen ? (
        <BlockParticipantModal
          isSubmitting={isBlocking}
          onCancel={closeBlockParticipantConfirmation}
          onConfirm={confirmBlockParticipant}
          participantName={
            viewModel.otherParticipant?.displayName ?? "este miembro"
          }
        />
      ) : null}
      <View
        style={[
          styles.composerShell,
          {
            marginBottom: composerBottomMargin,
            paddingBottom: composerBottomPadding,
          },
        ]}
      >
        {viewModel.composerDisabledReason ? (
          <Text
            maxFontSizeMultiplier={1.1}
            style={styles.composerDisabledText}
            testID="chat-composer-disabled-reason"
          >
            {viewModel.composerDisabledReason}
          </Text>
        ) : null}
        <View style={styles.composerRow}>
          <TextInput
            accessibilityLabel="Mensaje"
            editable={!viewModel.composerDisabledReason}
            maxFontSizeMultiplier={1.2}
            multiline
            onChangeText={setDraftMessage}
            placeholder={viewModel.composerPlaceholder}
            placeholderTextColor={shellColors.muted}
            style={styles.composerInput}
            testID="chat-message-input"
            value={draftMessage}
          />
          <Pressable
            accessibilityLabel={viewModel.actions.sendLabel}
            accessibilityRole="button"
            accessibilityState={{
              busy: isSending,
              disabled: !canSend || isSending,
            }}
            disabled={!canSend || isSending}
            onPress={handleSendMessage}
            testID="chat-send-button"
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
      </View>
    </View>
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

export function openChatSubjectHref({
  onOpenHref,
  openExternalUrl,
  routerPush,
  subject,
}: OpenChatSubjectHrefInput) {
  openInternalRastroHref({
    href: subject.href,
    onOpenHref,
    openExternalUrl,
    routerPush,
  });
}

export function getChatComposerLayoutInsets({
  bottomSafeAreaInset,
  keyboardBottomInset,
}: {
  bottomSafeAreaInset: number;
  keyboardBottomInset: number;
}) {
  const safeBottomInset = Math.max(bottomSafeAreaInset, 0);
  const safeKeyboardInset = Math.max(keyboardBottomInset, 0);

  if (safeKeyboardInset > 0) {
    return {
      composerBottomMargin: Math.max(
        safeKeyboardInset,
        chatMinimumComposerKeyboardMargin,
      ),
      composerBottomPadding: Math.max(
        safeBottomInset + chatComposerBasePadding,
        chatMinimumComposerTabPadding,
      ),
      listBottomInset: Math.max(
        safeKeyboardInset + chatListKeyboardPadding,
        chatMinimumListKeyboardInset,
      ),
    };
  }

  return {
    composerBottomMargin: Math.max(
      safeBottomInset + chatComposerTabMargin,
      chatMinimumComposerTabMargin,
    ),
    composerBottomPadding: Math.max(
      safeBottomInset + chatComposerBasePadding,
      chatMinimumComposerTabPadding,
    ),
    listBottomInset: Math.max(
      safeBottomInset + chatListTabPadding,
      chatMinimumListTabInset,
    ),
  };
}

function ChatHeader({
  onBlockParticipant,
  onOpenSubject,
  onRefresh,
  onReportConversation,
  safetyNoticeLabel,
  viewModel,
}: {
  onBlockParticipant: () => void;
  onOpenSubject: () => void;
  onRefresh: () => void;
  onReportConversation: () => void;
  safetyNoticeLabel?: string;
  viewModel: ChatScreenViewModel;
}) {
  const statusLabel =
    safetyNoticeLabel ??
    viewModel.blockStatusLabel ??
    viewModel.reportStatusLabel ??
    viewModel.statusLabel;

  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={styles.titleBlock}>
          <Text maxFontSizeMultiplier={1.15} selectable style={styles.title}>
            {viewModel.headerTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.1} selectable style={styles.subtitle}>
            {viewModel.headerSubtitle}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <HeaderAction
            iconName="refresh"
            label={viewModel.actions.refreshLabel}
            onPress={onRefresh}
          />
          <HeaderAction
            disabled={viewModel.actions.reportDisabled}
            iconName="flag-outline"
            label={viewModel.actions.reportLabel}
            onPress={onReportConversation}
          />
          <HeaderAction
            disabled={viewModel.actions.blockDisabled}
            iconName="block-helper"
            label={viewModel.actions.blockLabel}
            onPress={onBlockParticipant}
          />
        </View>
      </View>

      {viewModel.subject ? (
        <Pressable
          accessibilityLabel={viewModel.actions.subjectLinkLabel}
          accessibilityRole="button"
          onPress={onOpenSubject}
          testID="chat-subject-link"
          style={styles.subjectPill}
        >
          <View style={styles.subjectPillCopy}>
            <Text numberOfLines={1} style={styles.subjectPillLabel}>
              {viewModel.subject.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              style={styles.subjectPillTitle}
            >
              {viewModel.subject.title}
            </Text>
          </View>
          <SafeMaterialCommunityIcon
            color={shellColors.primary}
            name="chevron-right"
            size={18}
          />
        </Pressable>
      ) : null}

      {statusLabel ? (
        <Text selectable style={styles.safetyNoticeLabel}>
          {statusLabel}
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
  disabled = false,
  iconName,
  label,
  onPress,
}: {
  disabled?: boolean;
  iconName: MaterialCommunityIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={`chat-header-action-${toTestIdSegment(label)}`}
      style={[styles.headerAction, disabled ? styles.disabledButton : null]}
    >
      <SafeMaterialCommunityIcon
        color={shellColors.primary}
        name={iconName}
        size={19}
      />
    </Pressable>
  );
}

function MessageBubble({ message }: { message: ChatMessageViewModel }) {
  return (
    <View
      style={[
        styles.messageBubble,
        message.isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
        styles[`messageGroup_${message.groupPosition}`],
      ]}
    >
      {message.showSenderLabel ? (
        <Text
          maxFontSizeMultiplier={1.1}
          style={[
            styles.messageSender,
            message.isMine ? styles.messageSenderMine : null,
          ]}
        >
          {message.senderLabel}
        </Text>
      ) : null}
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
      {message.showTimestamp ? (
        <Text
          maxFontSizeMultiplier={1.05}
          style={[
            styles.messageTime,
            message.isMine ? styles.messageTimeMine : null,
          ]}
        >
          {message.createdAtLabel}
        </Text>
      ) : null}
    </View>
  );
}

function ReportConversationModal({
  errorLabel,
  isSubmitting,
  note,
  onCancel,
  onChangeNote,
  onChangeReason,
  onSubmit,
  reason,
}: {
  errorLabel?: string;
  isSubmitting: boolean;
  note: string;
  onCancel: () => void;
  onChangeNote: (note: string) => void;
  onChangeReason: (reason: TrustSafetyReportReason) => void;
  onSubmit: () => void;
  reason: TrustSafetyReportReason;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSurface}>
          <Text maxFontSizeMultiplier={1.15} style={styles.modalTitle}>
            Reportar chat
          </Text>
          <Text maxFontSizeMultiplier={1.1} style={styles.modalBody}>
            Rastro revisará este chat y el reporte vinculado. La otra persona no
            verá tu reporte.
          </Text>
          <View style={styles.reasonGrid}>
            {trustSafetyReportReasonOptions.map((option) => {
              const isSelected = option.value === reason;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option.value}
                  onPress={() => {
                    onChangeReason(option.value);
                  }}
                  style={[
                    styles.reasonChip,
                    isSelected ? styles.reasonChipSelected : null,
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.05}
                    style={[
                      styles.reasonChipText,
                      isSelected ? styles.reasonChipTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text maxFontSizeMultiplier={1.05} style={styles.inputLabel}>
            Detalle opcional
          </Text>
          <TextInput
            accessibilityHint="Opcional. Si escribes un detalle, usa al menos 10 caracteres."
            accessibilityLabel="Detalle opcional del reporte de chat"
            maxFontSizeMultiplier={1.1}
            multiline
            onChangeText={onChangeNote}
            placeholder="Describe el problema con este chat"
            placeholderTextColor={shellColors.muted}
            style={styles.reportDetailInput}
            value={note}
          />
          <Text maxFontSizeMultiplier={1.05} style={styles.inputHelper}>
            Si agregas detalle, escribe al menos 10 caracteres.
          </Text>
          {errorLabel ? (
            <Text maxFontSizeMultiplier={1.05} style={styles.errorLabel}>
              {errorLabel}
            </Text>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onCancel}
              style={styles.secondaryModalButton}
            >
              <Text style={styles.secondaryModalButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting }}
              disabled={isSubmitting}
              onPress={onSubmit}
              style={[
                styles.primaryModalButton,
                isSubmitting ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.primaryModalButtonText}>
                {isSubmitting ? "Enviando..." : "Enviar reporte"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function BlockParticipantModal({
  isSubmitting,
  onCancel,
  onConfirm,
  participantName,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  participantName: string;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSurface}>
          <Text maxFontSizeMultiplier={1.15} style={styles.modalTitle}>
            Bloquear a {participantName}
          </Text>
          <Text maxFontSizeMultiplier={1.1} style={styles.modalBody}>
            No podrá enviarte nuevos mensajes en este chat. También puedes
            reportar el chat si hay estafa, acoso o riesgo para una mascota.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onCancel}
              style={styles.secondaryModalButton}
            >
              <Text style={styles.secondaryModalButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting }}
              disabled={isSubmitting}
              onPress={onConfirm}
              style={[
                styles.dangerModalButton,
                isSubmitting ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.primaryModalButtonText}>
                {isSubmitting ? "Bloqueando..." : "Bloquear"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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

function toTestIdSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCompactSubjectLinkLabel(subject: ChatSubject) {
  return subject.kind === "adoption-listing" ? "Ver adopcion" : "Ver reporte";
}

function getSubjectKindLabel(subject: ChatSubject) {
  return subject.kind === "adoption-listing"
    ? "Adopcion vinculada"
    : "Reporte vinculado";
}

function formatChatHeaderSubtitle({
  subjectSubtitle,
  subjectTitle,
}: {
  subjectSubtitle: string;
  subjectTitle: string;
}) {
  return [subjectTitle, subjectSubtitle].filter(Boolean).join(" - ");
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
    gap: 8,
  },
  composerDisabledText: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  composerInput: {
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    color: shellColors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 96,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  composerRow: {
    flexDirection: "row",
    gap: 10,
  },
  composerShell: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderTopWidth: 1,
    gap: 8,
    padding: 12,
  },
  dangerModalButton: {
    alignItems: "center",
    backgroundColor: shellColors.lost,
    borderCurve: "continuous",
    borderRadius: 14,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
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
  header: {
    gap: 10,
    paddingBottom: 10,
  },
  headerAction: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  inputHelper: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  inputLabel: {
    color: shellColors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  list: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  listContent: {
    gap: 4,
    padding: 12,
    paddingTop: 12,
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
    borderRadius: 16,
    gap: 4,
    maxWidth: "86%",
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  messageGroup_first: {
    marginTop: 8,
  },
  messageGroup_last: {
    marginBottom: 4,
  },
  messageGroup_middle: {
    marginVertical: 0,
  },
  messageGroup_single: {
    marginVertical: 4,
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
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBackdrop: {
    backgroundColor: "rgba(16, 24, 40, 0.38)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  modalBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalSurface: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  modalTitle: {
    color: shellColors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  primaryModalButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderCurve: "continuous",
    borderRadius: 14,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryModalButtonText: {
    color: shellColors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  reasonChip: {
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reasonChipSelected: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  reasonChipText: {
    color: shellColors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  reasonChipTextSelected: {
    color: shellColors.white,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reportDetailInput: {
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    color: shellColors.text,
    fontSize: 14,
    lineHeight: 19,
    minHeight: 88,
    padding: 12,
    textAlignVertical: "top",
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
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 80,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  safetyNoticeLabel: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  secondaryModalButton: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryModalButtonText: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  subjectPill: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  subjectPillCopy: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  subjectPillLabel: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  subjectPillTitle: {
    color: shellColors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  subtitle: {
    color: shellColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: shellColors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
