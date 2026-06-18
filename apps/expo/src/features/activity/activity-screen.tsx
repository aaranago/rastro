import type { LegendListRenderItemProps } from "@legendapp/list";
import type { Href } from "expo-router";
import * as React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";

import type { ChatConversation } from "../chat/chat-model";
import type { ShellSession } from "../shell/shell-model";
import type {
  ActivityActionViewModel,
  ActivityItemKind,
  ActivityItemViewModel,
  ActivityMemberViewModel,
  BuildActivityViewModelInput,
} from "./activity-model";
import { ShellIcon } from "../shell/shell-overlays";
import { useRastroShell } from "../shell/shell-provider";
import { shellColors } from "../shell/shell-theme";
import { buildActivityViewModel } from "./activity-model";

type ActivityItemType = "alert" | "chat" | "match" | "report-update";

interface ActivitySignedOutViewModel {
  action: ActivityActionViewModel;
  body: string;
  title: string;
}

interface ActivityItemForScreen {
  actionLabel?: string;
  badgeLabel?: string;
  body?: string;
  href: string;
  iconName?: string;
  id: string;
  isUnread?: boolean;
  meta?: string;
  title: string;
  type: ActivityItemType;
}

interface ActivitySectionForScreen {
  id: string;
  items: readonly ActivityItemForScreen[];
  title: string;
}

type ActivityScreenViewModel =
  | {
      kind: "visitor";
      sections: readonly [];
      signedOut: ActivitySignedOutViewModel;
      title: string;
    }
  | {
      empty?: {
        body?: string;
        title: string;
      };
      kind: "member";
      sections: readonly ActivitySectionForScreen[];
      subtitle?: string;
      title: string;
    };

type ActivityListItem =
  | {
      id: string;
      title: string;
      type: "section-header";
    }
  | ActivityItemForScreen;

export interface ActivityScreenProps {
  onOpenHref?: (href: string) => void;
}

const bottomInset = 140;
const defaultEstimatedItemSize = 96;
const activityDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

const activityKeyExtractor = (item: ActivityListItem) => item.id;
const activityItemType = (item: ActivityListItem) => item.type;

function activityEstimatedItemSize(
  _index: number,
  _item: ActivityListItem,
  itemType: string | undefined,
) {
  return itemType === "section-header" ? 40 : defaultEstimatedItemSize;
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

export function ActivityScreen({ onOpenHref }: ActivityScreenProps) {
  const { session } = useRastroShell();
  const router = useRouter();
  const viewModel = React.useMemo(
    () => buildScreenViewModel(session),
    [session],
  );
  const data = React.useMemo(() => buildListData(viewModel), [viewModel]);

  const openHref = React.useCallback(
    (href: string) => {
      if (onOpenHref) {
        onOpenHref(href);
        return;
      }

      const routerHref = getRouterHref(href);

      if (routerHref) {
        router.push(routerHref);
        return;
      }

      void Linking.openURL(href);
    },
    [onOpenHref, router],
  );

  const renderItem = React.useCallback(
    ({ item }: LegendListRenderItemProps<ActivityListItem>) => {
      if (item.type === "section-header") {
        return <ActivitySectionHeader title={item.title} />;
      }

      return (
        <ActivityRow
          actionLabel={item.actionLabel}
          badgeLabel={item.badgeLabel}
          body={item.body}
          href={item.href}
          iconName={item.iconName}
          isUnread={item.isUnread}
          meta={item.meta}
          onOpenHref={openHref}
          title={item.title}
          type={item.type}
        />
      );
    },
    [openHref],
  );

  const header =
    viewModel.kind === "member" ? (
      <ActivityHeader subtitle={viewModel.subtitle} title={viewModel.title} />
    ) : null;
  const emptyState =
    viewModel.kind === "visitor" ? (
      <SignedOutState
        action={viewModel.signedOut.action}
        body={viewModel.signedOut.body}
        onOpenHref={openHref}
        title={viewModel.signedOut.title}
      />
    ) : (
      <ActivityEmptyState
        body={viewModel.empty?.body}
        title={viewModel.empty?.title ?? "No hay actividad reciente"}
      />
    );

  return (
    <LegendList
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      data={data}
      estimatedItemSize={defaultEstimatedItemSize}
      getEstimatedItemSize={activityEstimatedItemSize}
      getItemType={activityItemType}
      ItemSeparatorComponent={ListSeparator}
      keyExtractor={activityKeyExtractor}
      ListEmptyComponent={emptyState}
      ListHeaderComponent={header}
      recycleItems
      renderItem={renderItem}
      style={styles.screen}
    />
  );
}

const ActivityHeader = React.memo(function ActivityHeader({
  subtitle,
  title,
}: {
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerIcon}>
        <ShellIcon color={shellColors.primary} name="bell.fill" size={24} />
      </View>
      <View style={styles.headerCopy}>
        <Text maxFontSizeMultiplier={1.2} style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text maxFontSizeMultiplier={1.25} style={styles.headerSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const ActivitySectionHeader = React.memo(function ActivitySectionHeader({
  title,
}: {
  title: string;
}) {
  return (
    <Text maxFontSizeMultiplier={1.2} style={styles.sectionTitle}>
      {title}
    </Text>
  );
});

const ActivityRow = React.memo(function ActivityRow({
  actionLabel,
  badgeLabel,
  body,
  href,
  iconName,
  isUnread = false,
  meta,
  onOpenHref,
  title,
  type,
}: {
  actionLabel?: string;
  badgeLabel?: string;
  body?: string;
  href: string;
  iconName?: string;
  isUnread?: boolean;
  meta?: string;
  onOpenHref: (href: string) => void;
  title: string;
  type: ActivityItemType;
}) {
  const handlePress = React.useCallback(() => {
    onOpenHref(href);
  }, [href, onOpenHref]);
  const tone = getActivityTone(type);
  const resolvedIconName = iconName ?? tone.iconName;
  const resolvedBadgeLabel = badgeLabel ?? tone.badgeLabel;

  return (
    <Pressable
      accessibilityHint="Abre el detalle relacionado"
      accessibilityLabel={getActivityAccessibilityLabel({
        body,
        meta,
        title,
      })}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={[styles.rowIcon, tone.iconStyle]}>
        <ShellIcon color={tone.iconColor} name={resolvedIconName} size={21} />
      </View>

      <ActivityRowCopy
        badgeLabel={resolvedBadgeLabel}
        body={body}
        isUnread={isUnread}
        meta={meta}
        title={title}
        type={type}
      />
      <ActivityRowAccessory actionLabel={actionLabel} />
    </Pressable>
  );
});

const ActivityRowCopy = React.memo(function ActivityRowCopy({
  badgeLabel,
  body,
  isUnread,
  meta,
  title,
  type,
}: {
  badgeLabel: string;
  body?: string;
  isUnread: boolean;
  meta?: string;
  title: string;
  type: ActivityItemType;
}) {
  const tone = getActivityTone(type);

  return (
    <View style={styles.rowCopy}>
      <View style={styles.rowTopLine}>
        <Text
          maxFontSizeMultiplier={1.18}
          numberOfLines={1}
          style={styles.rowTitle}
        >
          {title}
        </Text>
        {isUnread ? <View style={styles.unreadDot} /> : null}
      </View>

      {body ? (
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
          style={styles.rowBody}
        >
          {body}
        </Text>
      ) : null}

      <View style={styles.rowMetaLine}>
        <Text
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
          style={[styles.badge, tone.badgeStyle]}
        >
          {badgeLabel}
        </Text>
        {meta ? (
          <Text
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
            style={styles.rowMeta}
          >
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const ActivityRowAccessory = React.memo(function ActivityRowAccessory({
  actionLabel,
}: {
  actionLabel?: string;
}) {
  if (!actionLabel) {
    return (
      <ShellIcon color={shellColors.muted} name="chevron.right" size={17} />
    );
  }

  return (
    <Text
      maxFontSizeMultiplier={1.12}
      numberOfLines={2}
      style={styles.actionLabel}
    >
      {actionLabel}
    </Text>
  );
});

const SignedOutState = React.memo(function SignedOutState({
  action,
  body,
  onOpenHref,
  title,
}: {
  action: ActivityActionViewModel;
  body: string;
  onOpenHref: (href: string) => void;
  title: string;
}) {
  const handlePress = React.useCallback(() => {
    onOpenHref(action.href);
  }, [action.href, onOpenHref]);

  return (
    <View style={styles.signedOutCard}>
      <View style={styles.signedOutIcon}>
        <ShellIcon color={shellColors.primary} name="lock.fill" size={28} />
      </View>
      <Text maxFontSizeMultiplier={1.2} style={styles.signedOutTitle}>
        {title}
      </Text>
      <Text maxFontSizeMultiplier={1.25} style={styles.signedOutBody}>
        {body}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.primaryButtonPressed : null,
        ]}
      >
        <Text maxFontSizeMultiplier={1.12} style={styles.primaryButtonLabel}>
          {action.label}
        </Text>
      </Pressable>
    </View>
  );
});

const ActivityEmptyState = React.memo(function ActivityEmptyState({
  body,
  title,
}: {
  body?: string;
  title: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Text maxFontSizeMultiplier={1.2} style={styles.emptyTitle}>
        {title}
      </Text>
      {body ? (
        <Text maxFontSizeMultiplier={1.25} style={styles.emptyBody}>
          {body}
        </Text>
      ) : null}
    </View>
  );
});

function buildScreenViewModel(session: ShellSession): ActivityScreenViewModel {
  const rawViewModel = buildActivityViewModel(getActivityModelInput(session));

  if (session.kind === "visitor" && rawViewModel.kind === "visitor") {
    return rawViewModel;
  }

  if (rawViewModel.kind === "member") {
    return normalizeMemberViewModel(rawViewModel);
  }

  return {
    kind: "visitor",
    sections: [],
    signedOut: {
      action: {
        href: "rastro://auth/sign-in?returnTo=/actividad",
        label: "Iniciar sesion",
      },
      body: "Tus alertas, mensajes y actualizaciones apareceran aqui cuando seas miembro.",
      title: "Inicia sesion para ver tu actividad",
    },
    title: "Actividad",
  };
}

function normalizeMemberViewModel(
  viewModel: ActivityMemberViewModel,
): Extract<ActivityScreenViewModel, { kind: "member" }> {
  return {
    empty: viewModel.emptyState,
    kind: "member",
    sections: viewModel.sections.map((section) => ({
      id: section.id,
      items: section.items.map(toActivityItemForScreen),
      title: section.title,
    })),
    subtitle: viewModel.subtitle,
    title: viewModel.title,
  };
}

function getActivityModelSession(
  session: ShellSession,
): BuildActivityViewModelInput["session"] {
  if (session.kind === "visitor") {
    return { kind: "visitor" as const };
  }

  return {
    displayName: session.name ?? session.email ?? "Miembro",
    kind: "member" as const,
    memberId: session.id,
  };
}

function getActivityModelInput(
  session: ShellSession,
): BuildActivityViewModelInput {
  const modelSession = getActivityModelSession(session);

  if (session.kind === "visitor") {
    return {
      session: modelSession,
    };
  }

  return {
    candidateMatches: sampleCandidateMatches,
    chatConversations: [createSampleChatConversation(session)],
    nearbyLostPetAlerts: [createSampleNearbyLostPetAlert(session)],
    ownedReportPrompts: sampleOwnedReportPrompts,
    session: modelSession,
  };
}

function createSampleNearbyLostPetAlert(
  session: Extract<ShellSession, { kind: "member" }>,
): NonNullable<BuildActivityViewModelInput["nearbyLostPetAlerts"]>[number] {
  return {
    notification: {
      body: "Toby fue reportada cerca de Sopocachi.",
      deepLink: "rastro://reportes/perdidos/lost-report-1",
      memberId: session.id,
      reportId: "lost-report-1",
      title: "Mascota perdida cerca de ti",
      webUrl: "https://rastro.bo/reportes/perdidos/lost-report-1",
    },
    receivedAt: "2026-06-18T12:10:00.000Z",
  };
}

function createSampleChatConversation(
  session: Extract<ShellSession, { kind: "member" }>,
): ChatConversation {
  return {
    blockedMemberships: [],
    createdAt: "2026-06-18T12:00:00.000Z",
    hiddenByMemberIds: [],
    id: "chat-conversation-1",
    messages: [
      {
        conversationId: "chat-conversation-1",
        createdAt: "2026-06-18T12:20:00.000Z",
        id: "chat-message-1",
        senderMemberId: "member-diego",
        text: "Lo vi cerca de la plaza.",
      },
    ],
    participants: [
      {
        displayName: session.name ?? session.email ?? "Camila",
        memberId: session.id,
      },
      {
        displayName: "Diego",
        memberId: "member-diego",
      },
    ],
    reports: [],
    subject: {
      href: "rastro://reportes/perdidos/lost-report-1",
      id: "lost-report-1",
      kind: "lost-pet-report" as const,
      subtitle: "Sopocachi",
      title: "Toby",
    },
    updatedAt: "2026-06-18T12:20:00.000Z",
  };
}

const sampleOwnedReportPrompts: NonNullable<
  BuildActivityViewModelInput["ownedReportPrompts"]
> = [
  {
    href: "rastro://reportes/perdidos/lost-report-1",
    promptedAt: "2026-06-18T12:00:00.000Z",
    prompt: {
      actionLabel: "Confirmar o actualizar",
      message: "Confirma si este reporte sigue activo o elige un resultado.",
      outcomeOptions: [
        { label: "Sigue activa", outcome: "still-missing" },
        { label: "Reunida", outcome: "reunited" },
        {
          label: "Trasladada a refugio",
          outcome: "transferred-to-shelter",
        },
        { label: "No se pudo ubicar", outcome: "unable-to-locate" },
        { label: "Inactiva", outcome: "inactive" },
      ],
      reportId: "lost-report-1",
      title: "Toby",
    },
  },
];

const sampleCandidateMatches: NonNullable<
  BuildActivityViewModelInput["candidateMatches"]
> = [
  {
    candidate: {
      href: "rastro://reportes/avistamientos/sighting-report-1",
      id: "sighting-report-1",
      kind: "sighting-report",
      title: "Avistamiento en Sopocachi",
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
];

function buildListData(viewModel: ActivityScreenViewModel): ActivityListItem[] {
  if (viewModel.kind === "visitor") {
    return [];
  }

  return viewModel.sections.flatMap((section) => [
    {
      id: `section-${section.id}`,
      title: section.title,
      type: "section-header" as const,
    },
    ...section.items,
  ]);
}

function toActivityItemForScreen(
  item: ActivityItemViewModel,
): ActivityItemForScreen {
  const type = getActivityTypeFromModelKind(item.kind);
  const actionLabel =
    item.kind === "candidate-match" || item.kind === "owned-report-update"
      ? item.action.label
      : undefined;

  return {
    actionLabel,
    badgeLabel: getActivityBadgeLabelFromModelKind(item.kind),
    body: item.body,
    href: item.action.href,
    id: item.id,
    isUnread: item.tone === "urgent",
    meta: formatActivityMeta(item),
    title: item.title,
    type,
  };
}

function getActivityTypeFromModelKind(
  kind: ActivityItemKind,
): ActivityItemType {
  switch (kind) {
    case "candidate-match":
      return "match";
    case "chat-conversation":
      return "chat";
    case "nearby-lost-pet-alert":
      return "alert";
    case "owned-report-update":
      return "report-update";
  }
}

function getActivityBadgeLabelFromModelKind(kind: ActivityItemKind) {
  switch (kind) {
    case "candidate-match":
      return "Candidato";
    case "chat-conversation":
      return "Chat";
    case "nearby-lost-pet-alert":
      return "Alerta";
    case "owned-report-update":
      return "Reporte";
  }
}

function formatActivityMeta(item: ActivityItemViewModel) {
  return [item.meta, formatActivityTime(item.occurredAt)]
    .filter((part): part is string => Boolean(part))
    .join(" - ");
}

function formatActivityTime(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return activityDateFormatter.format(new Date(timestamp));
}

function getRouterHref(href: string): Href | null {
  if (href.startsWith("/")) {
    return href as Href;
  }

  for (const pattern of internalDeepLinkPatterns) {
    if (pattern.test(href)) {
      return href.replace("rastro://", "/") as Href;
    }
  }

  return null;
}

const internalDeepLinkPatterns = [
  /^rastro:\/\/adopciones\/[^/]+$/,
  /^rastro:\/\/chats\/[^/]+$/,
  /^rastro:\/\/reportes\/avistamientos\/[^/]+$/,
  /^rastro:\/\/reportes\/perdidos\/[^/]+$/,
] as const;

function getActivityAccessibilityLabel({
  body,
  meta,
  title,
}: {
  body?: string;
  meta?: string;
  title: string;
}) {
  return [title, body, meta].filter(Boolean).join(". ");
}

function getActivityTone(type: ActivityItemType) {
  switch (type) {
    case "alert":
      return {
        badgeLabel: "Alerta",
        badgeStyle: styles.alertBadge,
        iconColor: shellColors.lost,
        iconName: "bell.badge.fill",
        iconStyle: styles.alertIcon,
      };
    case "chat":
      return {
        badgeLabel: "Chat",
        badgeStyle: styles.chatBadge,
        iconColor: shellColors.sighting,
        iconName: "message.fill",
        iconStyle: styles.chatIcon,
      };
    case "match":
      return {
        badgeLabel: "Candidato",
        badgeStyle: styles.matchBadge,
        iconColor: shellColors.adoption,
        iconName: "sparkles",
        iconStyle: styles.matchIcon,
      };
    case "report-update":
      return {
        badgeLabel: "Reporte",
        badgeStyle: styles.updateBadge,
        iconColor: shellColors.primary,
        iconName: "arrow.triangle.2.circlepath",
        iconStyle: styles.updateIcon,
      };
  }
}

const styles = StyleSheet.create({
  actionLabel: {
    backgroundColor: shellColors.primarySoft,
    borderRadius: 14,
    color: shellColors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 112,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: "center",
  },
  alertBadge: {
    backgroundColor: "#FFF1F0",
    color: shellColors.lost,
  },
  alertIcon: {
    backgroundColor: "#FFF1F0",
  },
  badge: {
    borderRadius: 12,
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chatBadge: {
    backgroundColor: "#E8F1F8",
    color: shellColors.sighting,
  },
  chatIcon: {
    backgroundColor: "#E8F1F8",
  },
  emptyBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  emptyTitle: {
    color: shellColors.text,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  headerSubtitle: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    color: shellColors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  listContent: {
    gap: 10,
    padding: 18,
    paddingBottom: bottomInset,
  },
  matchBadge: {
    backgroundColor: "#F8E9EF",
    color: shellColors.adoption,
  },
  matchIcon: {
    backgroundColor: "#F8E9EF",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 18,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  primaryButtonPressed: {
    opacity: 0.84,
  },
  row: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 82,
    padding: 12,
  },
  rowBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  rowCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  rowMeta: {
    color: shellColors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  rowMetaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  rowPressed: {
    opacity: 0.84,
  },
  rowTitle: {
    color: shellColors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  rowTopLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  sectionTitle: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 4,
    paddingTop: 4,
    textTransform: "uppercase",
  },
  separator: {
    height: 0,
  },
  signedOutBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  signedOutCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  signedOutIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  signedOutTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  unreadDot: {
    backgroundColor: shellColors.lost,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  updateBadge: {
    backgroundColor: shellColors.primarySoft,
    color: shellColors.primary,
  },
  updateIcon: {
    backgroundColor: shellColors.primarySoft,
  },
});
