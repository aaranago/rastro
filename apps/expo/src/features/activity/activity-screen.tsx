import type { LegendListRenderItemProps } from "@legendapp/list";
import type { Href } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";

import type { InternalAuthPromptRequest } from "../navigation/internal-rastro-links";
import type { ShellSession } from "../shell/shell-model";
import type {
  ActivityActionViewModel,
  ActivityInbox,
  ActivityInboxQuery,
  ActivityItemKind,
  ActivityItemViewModel,
  ActivityMemberViewModel,
  ActivityRepository,
  ActivitySectionId,
  BuildActivityViewModelInput,
} from "./activity-model";
import {
  openInternalRastroHref,
  resolveInternalRastroHref,
} from "../navigation/internal-rastro-links";
import { ShellIcon } from "../shell/shell-overlays";
import { useRastroShell } from "../shell/shell-provider";
import { shellColors } from "../shell/shell-theme";
import { buildActivityViewModel } from "./activity-model";

type ActivityItemType =
  | "alert"
  | "chat"
  | "match"
  | "moderation"
  | "report-update";

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
  testID?: string;
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
        action?: ActivityActionViewModel;
        body?: string;
        title: string;
      };
      kind: "member";
      offlineLabel?: string;
      sections: readonly ActivitySectionForScreen[];
      subtitle?: string;
      title: string;
    };

type ActivityListItem =
  | {
      id: string;
      testID: string;
      title: string;
      type: "section-header";
    }
  | ActivityItemForScreen;

export interface ActivityScreenProps {
  authReturnToPath?: string;
  focus?: ActivityScreenFocus;
  inboxLimit?: number;
  onOpenHref?: (href: string) => void;
  repository: ActivityRepository;
}

export type ActivityScreenFocus = "all" | "conversations" | "reports";

export interface OpenActivityHrefInput {
  href: string;
  onOpenHref?: (href: string) => void;
  openAuthPrompt?: (request: InternalAuthPromptRequest) => void;
  openExternalUrl: (href: string) => Promise<void> | void;
  routerPush: (href: Href) => void;
}

type ActivityInboxLoadState =
  | { kind: "error" }
  | { kind: "idle" }
  | { kind: "loading" }
  | { inbox: ActivityInbox; kind: "ready" };

const bottomInset = 156;
const defaultEstimatedItemSize = 96;
const emptyActivityInbox: ActivityInbox = {
  alertDeliveries: [],
  candidateMatches: [],
  chatSummaries: [],
  moderationEvents: [],
  reportUpdates: [],
};
const activityDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});
const allActivitySectionIds = [
  "nearby-alerts",
  "chats",
  "report-updates",
  "moderation-events",
  "candidate-matches",
] as const satisfies readonly ActivitySectionId[];

interface ActivityScreenFocusConfig {
  empty?: {
    action?: ActivityActionViewModel;
    body: string;
    title: string;
  };
  sectionIds: readonly ActivitySectionId[];
  subtitle?: string;
  title?: string;
}

const activityScreenFocusConfig: Record<
  ActivityScreenFocus,
  ActivityScreenFocusConfig
> = {
  all: {
    sectionIds: allActivitySectionIds,
  },
  conversations: {
    empty: {
      action: {
        href: "/(tabs)/(nearby)",
        label: "Ver reportes cercanos",
      },
      body: "Tus chats sobre reportes aparecerán aquí cuando tengas conversaciones activas.",
      title: "Sin conversaciones todavía",
    },
    sectionIds: ["chats"],
    subtitle: "Chats sobre reportes y recuperaciones",
    title: "Mis conversaciones",
  },
  reports: {
    empty: {
      action: {
        href: "/report-create/lost",
        label: "Crear reporte",
      },
      body: "Los cambios y recordatorios de tus reportes aparecerán aquí.",
      title: "Sin actualizaciones de reportes",
    },
    sectionIds: ["report-updates"],
    subtitle: "Actualizaciones y recordatorios de tus reportes",
    title: "Mis reportes",
  },
};

const activityKeyExtractor = (item: ActivityListItem | undefined) =>
  item?.id ?? "activity-transition-item";
const activityItemType = (item: ActivityListItem | undefined) => item?.type;

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

export function ActivityScreen({
  authReturnToPath = "/actividad",
  focus = "all",
  inboxLimit,
  onOpenHref,
  repository,
}: ActivityScreenProps) {
  const { requestAuthPrompt, session } = useRastroShell();
  const safeAreaInsets = useSafeAreaInsets();
  const router = useRouter();
  const [loadState, setLoadState] = React.useState<ActivityInboxLoadState>({
    kind: "idle",
  });
  const [requestVersion, setRequestVersion] = React.useState(0);
  const memberSessionKey = session.kind === "member" ? session.id : "visitor";

  React.useEffect(() => {
    if (session.kind !== "member") {
      setLoadState({ kind: "idle" });
      return;
    }

    let isCurrent = true;

    setLoadState({ kind: "loading" });
    repository
      .getInbox(buildActivityInboxQuery(inboxLimit))
      .then((inbox) => {
        if (isCurrent) {
          setLoadState({ inbox, kind: "ready" });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoadState({ kind: "error" });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [inboxLimit, memberSessionKey, repository, requestVersion, session.kind]);

  const viewModel = React.useMemo(
    () =>
      buildScreenViewModel(
        session,
        loadState.kind === "ready" ? loadState.inbox : undefined,
        focus,
        authReturnToPath,
      ),
    [authReturnToPath, focus, loadState, session],
  );
  const data = React.useMemo(() => buildListData(viewModel), [viewModel]);
  const handleRetry = React.useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);
  const listBottomInset = bottomInset + safeAreaInsets.bottom;
  const listTopInset = Math.max(14, safeAreaInsets.top + 10);

  const openHref = React.useCallback(
    (href: string) => {
      openActivityHref({
        href,
        onOpenHref,
        openAuthPrompt: requestAuthPrompt,
        openExternalUrl: (url) => Linking.openURL(url),
        routerPush: (routerHref) => {
          router.push(routerHref);
        },
      });
    },
    [onOpenHref, requestAuthPrompt, router],
  );

  const renderItem = React.useCallback(
    ({ item }: LegendListRenderItemProps<ActivityListItem | undefined>) => {
      if (!item) {
        return null;
      }

      if (item.type === "section-header") {
        return (
          <ActivitySectionHeader testID={item.testID} title={item.title} />
        );
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
          testID={item.testID}
          title={item.title}
          type={item.type}
        />
      );
    },
    [openHref],
  );

  const header =
    viewModel.kind === "member" ? (
      <ActivityHeader
        offlineLabel={viewModel.offlineLabel}
        subtitle={viewModel.subtitle}
        title={viewModel.title}
      />
    ) : null;
  const emptyState =
    viewModel.kind === "visitor" ? (
      <SignedOutState
        action={viewModel.signedOut.action}
        body={viewModel.signedOut.body}
        onOpenHref={openHref}
        title={viewModel.signedOut.title}
      />
    ) : loadState.kind === "loading" ? (
      <ActivityLoadingState />
    ) : loadState.kind === "error" ? (
      <ActivityErrorState onRetry={handleRetry} />
    ) : (
      <ActivityEmptyState
        action={viewModel.empty?.action}
        body={viewModel.empty?.body}
        onOpenHref={openHref}
        title={viewModel.empty?.title ?? "No hay actividad reciente"}
      />
    );

  return (
    <View style={styles.screen} testID="activity-screen">
      <LegendList
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: listBottomInset,
            paddingTop: listTopInset,
          },
        ]}
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
        scrollIndicatorInsets={{ bottom: listBottomInset }}
        style={styles.list}
        testID="activity-list"
      />
    </View>
  );
}

const ActivityHeader = React.memo(function ActivityHeader({
  offlineLabel,
  subtitle,
  title,
}: {
  offlineLabel?: string;
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
        {offlineLabel ? (
          <Text maxFontSizeMultiplier={1.2} style={styles.offlineLabel}>
            {offlineLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const ActivitySectionHeader = React.memo(function ActivitySectionHeader({
  testID,
  title,
}: {
  testID: string;
  title: string;
}) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={styles.sectionTitle}
      testID={testID}
    >
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
  testID,
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
  testID?: string;
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
      testID={testID}
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
        accessibilityHint="Abre el ingreso o la creación de cuenta."
        accessibilityLabel={action.label}
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
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
  action,
  body,
  onOpenHref,
  title,
}: {
  action?: ActivityActionViewModel;
  body?: string;
  onOpenHref: (href: string) => void;
  title: string;
}) {
  const handlePress = React.useCallback(() => {
    if (action) {
      onOpenHref(action.href);
    }
  }, [action, onOpenHref]);

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
      {action ? (
        <Pressable
          accessibilityLabel={action.label}
          accessibilityRole="button"
          onPress={handlePress}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.secondaryButtonPressed : null,
          ]}
          testID="activity-empty-action"
        >
          <Text maxFontSizeMultiplier={1.12} style={styles.secondaryButtonLabel}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const ActivityLoadingState = React.memo(function ActivityLoadingState() {
  return (
    <View style={styles.stateCard} testID="activity-loading">
      <ActivityIndicator color={shellColors.primary} />
      <Text maxFontSizeMultiplier={1.2} style={styles.emptyTitle}>
        Cargando actividad
      </Text>
      <Text maxFontSizeMultiplier={1.25} style={styles.emptyBody}>
        Estamos buscando tus alertas y mensajes recientes.
      </Text>
    </View>
  );
});

const ActivityErrorState = React.memo(function ActivityErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <View style={styles.stateCard} testID="activity-error">
      <Text maxFontSizeMultiplier={1.2} style={styles.emptyTitle}>
        No pudimos cargar tu actividad
      </Text>
      <Text maxFontSizeMultiplier={1.25} style={styles.emptyBody}>
        Revisa tu conexión e intenta nuevamente.
      </Text>
      <Pressable
        accessibilityLabel="Reintentar carga de actividad"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.primaryButtonPressed : null,
        ]}
        testID="activity-retry-button"
      >
        <Text maxFontSizeMultiplier={1.12} style={styles.primaryButtonLabel}>
          Reintentar
        </Text>
      </Pressable>
    </View>
  );
});

function buildScreenViewModel(
  session: ShellSession,
  inbox?: ActivityInbox,
  focus: ActivityScreenFocus = "all",
  authReturnToPath = "/actividad",
): ActivityScreenViewModel {
  const rawViewModel = buildActivityViewModel(
    getActivityModelInput(session, inbox),
  );

  if (session.kind === "visitor" && rawViewModel.kind === "visitor") {
    return withSignedOutAuthReturnTo(rawViewModel, authReturnToPath);
  }

  if (rawViewModel.kind === "member") {
    return normalizeMemberViewModel(rawViewModel, focus);
  }

  return {
    kind: "visitor",
    sections: [],
    signedOut: {
      action: {
        href: buildActivityAuthHref(authReturnToPath),
        label: "Iniciar sesión",
      },
      body: "Tus alertas, mensajes y actualizaciones aparecerán aquí cuando seas miembro.",
      title: "Inicia sesión para ver tu actividad",
    },
    title: "Actividad",
  };
}

function withSignedOutAuthReturnTo(
  viewModel: Extract<ActivityScreenViewModel, { kind: "visitor" }>,
  authReturnToPath: string,
): Extract<ActivityScreenViewModel, { kind: "visitor" }> {
  return {
    ...viewModel,
    signedOut: {
      ...viewModel.signedOut,
      action: {
        ...viewModel.signedOut.action,
        href: buildActivityAuthHref(authReturnToPath),
      },
    },
  };
}

function buildActivityAuthHref(authReturnToPath: string) {
  return `rastro://auth/sign-in?returnTo=${encodeURIComponent(
    authReturnToPath,
  )}`;
}

function normalizeMemberViewModel(
  viewModel: ActivityMemberViewModel,
  focus: ActivityScreenFocus,
): Extract<ActivityScreenViewModel, { kind: "member" }> {
  const focusConfig = activityScreenFocusConfig[focus];
  const sections = viewModel.sections
    .filter((section) => focusConfig.sectionIds.includes(section.id))
    .map((section) => ({
      id: section.id,
      items: section.items.map(toActivityItemForScreen),
      title: section.title,
    }));

  return {
    empty: focusConfig.empty ?? viewModel.emptyState,
    kind: "member",
    offlineLabel: viewModel.offlineLabel,
    sections,
    subtitle: focusConfig.subtitle ?? viewModel.subtitle,
    title: focusConfig.title ?? viewModel.title,
  };
}

function getActivityModelSession(
  session: ShellSession,
): BuildActivityViewModelInput["session"] {
  if (session.kind !== "member") {
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
  inbox?: ActivityInbox,
): BuildActivityViewModelInput {
  const modelSession = getActivityModelSession(session);

  if (session.kind !== "member") {
    return {
      session: modelSession,
    };
  }

  const activityInbox = inbox ?? emptyActivityInbox;

  return {
    alertDeliveries: activityInbox.alertDeliveries,
    candidateMatches: activityInbox.candidateMatches,
    chatSummaries: activityInbox.chatSummaries,
    isOffline: activityInbox.isOffline,
    isStale: activityInbox.isStale,
    moderationEvents: activityInbox.moderationEvents,
    reportUpdates: activityInbox.reportUpdates,
    session: modelSession,
  };
}

function buildListData(viewModel: ActivityScreenViewModel): ActivityListItem[] {
  if (viewModel.kind === "visitor") {
    return [];
  }

  return viewModel.sections.flatMap((section) => [
    {
      id: `section-${section.id}`,
      testID: `activity-section-${section.id}`,
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
    item.kind === "candidate-match" ||
    item.kind === "moderation-event" ||
    item.kind === "owned-report-update" ||
    item.kind === "report-update"
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
    testID: getActivityItemTestID(item),
    title: item.title,
    type,
  };
}

function buildActivityInboxQuery(
  limit: number | undefined,
): ActivityInboxQuery {
  return typeof limit === "number" ? { limit } : {};
}

function getActivityItemTestID(item: ActivityItemViewModel) {
  if (item.kind === "nearby-lost-pet-alert") {
    return `activity-item-alert-${getActivityTargetId(item, [
      "nearby-alert-",
      "alert-",
    ])}`;
  }

  if (item.kind === "chat-conversation") {
    return `activity-item-chat-${getActivityTargetId(item, ["chat-"])}`;
  }

  if (item.kind === "report-update") {
    return `activity-item-report-update-${getActivityIdWithoutPrefix(item, "report-update-")}`;
  }

  if (item.kind === "moderation-event") {
    return `activity-item-moderation-${getActivityIdWithoutPrefix(item, "moderation-event-")}`;
  }

  if (item.kind === "candidate-match") {
    return `activity-item-match-${getActivityIdWithoutPrefix(item, "candidate-match-")}`;
  }

  return undefined;
}

function getActivityIdWithoutPrefix(
  item: ActivityItemViewModel,
  prefix: string,
) {
  return item.id.startsWith(prefix) ? item.id.slice(prefix.length) : item.id;
}

function getActivityTargetId(
  item: ActivityItemViewModel,
  prefixes: readonly string[],
) {
  if (item.targetId) {
    return item.targetId;
  }

  const prefix = prefixes.find((candidate) => item.id.startsWith(candidate));

  return prefix ? item.id.slice(prefix.length) : item.id;
}

function getActivityTypeFromModelKind(
  kind: ActivityItemKind,
): ActivityItemType {
  switch (kind) {
    case "candidate-match":
      return "match";
    case "chat-conversation":
      return "chat";
    case "moderation-event":
      return "moderation";
    case "nearby-lost-pet-alert":
      return "alert";
    case "owned-report-update":
    case "report-update":
      return "report-update";
  }
}

function getActivityBadgeLabelFromModelKind(kind: ActivityItemKind) {
  switch (kind) {
    case "candidate-match":
      return "Candidato";
    case "chat-conversation":
      return "Chat";
    case "moderation-event":
      return "Moderación";
    case "nearby-lost-pet-alert":
      return "Alerta";
    case "owned-report-update":
    case "report-update":
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

export function openActivityHref({
  href,
  onOpenHref,
  openAuthPrompt,
  openExternalUrl,
  routerPush,
}: OpenActivityHrefInput) {
  openInternalRastroHref({
    href,
    onOpenHref,
    openAuthPrompt,
    openExternalUrl,
    routerPush,
  });
}

export function resolveActivityRouterHref(href: string): Href | null {
  return resolveInternalRastroHref(href);
}

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
    case "moderation":
      return {
        badgeLabel: "Moderación",
        badgeStyle: styles.moderationBadge,
        iconColor: shellColors.lost,
        iconName: "exclamationmark.triangle.fill",
        iconStyle: styles.moderationIcon,
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
  list: {
    flex: 1,
  },
  matchBadge: {
    backgroundColor: "#F8E9EF",
    color: shellColors.adoption,
  },
  matchIcon: {
    backgroundColor: "#F8E9EF",
  },
  moderationBadge: {
    backgroundColor: "#FFF1F0",
    color: shellColors.lost,
  },
  moderationIcon: {
    backgroundColor: "#FFF1F0",
  },
  offlineLabel: {
    color: shellColors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
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
  secondaryButton: {
    alignItems: "center",
    borderColor: shellColors.primary,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonLabel: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButtonPressed: {
    backgroundColor: shellColors.primarySoft,
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
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  signedOutCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderRadius: 20,
    gap: 12,
    padding: 20,
  },
  signedOutIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  signedOutTitle: {
    color: shellColors.text,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 20,
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
