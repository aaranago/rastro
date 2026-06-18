import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  PublicReportLifecycleViewModel,
  ReportLifecycleActionId,
  ReportLifecycleActionViewModel,
} from "./report-lifecycle-view-model";
import { shellColors } from "../shell/shell-theme";

const bottomInset = 36;

export function PublicReportDeepLinkScreen({
  accentColor,
  body,
  lifecycle,
  onLifecycleAction,
  reportId,
  title,
  webUrl,
}: {
  accentColor: string;
  body: string;
  lifecycle?: PublicReportLifecycleViewModel;
  onLifecycleAction?: (actionId: ReportLifecycleActionId) => void;
  reportId: string;
  title: string;
  webUrl: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <View style={styles.panel}>
        <Text selectable style={[styles.eyebrow, { color: accentColor }]}>
          Rastro
        </Text>
        <Text selectable style={styles.title}>
          {title}
        </Text>
        <Text selectable style={styles.body}>
          {body}
        </Text>
        <Text selectable style={styles.reportId}>
          {reportId}
        </Text>
        {lifecycle ? (
          <ReportLifecycleDetail
            lifecycle={lifecycle}
            onLifecycleAction={onLifecycleAction}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Linking.openURL(webUrl);
          }}
          style={[styles.button, { backgroundColor: accentColor }]}
        >
          <Text style={styles.buttonText}>Abrir pagina publica</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ReportLifecycleDetail({
  lifecycle,
  onLifecycleAction,
}: {
  lifecycle: PublicReportLifecycleViewModel;
  onLifecycleAction?: (actionId: ReportLifecycleActionId) => void;
}) {
  return (
    <View style={styles.lifecycleBlock}>
      <View
        style={[
          styles.lifecycleBadge,
          lifecycle.tone === "closed" ? styles.lifecycleBadgeClosed : null,
        ]}
      >
        <Text
          selectable
          style={[
            styles.lifecycleBadgeText,
            lifecycle.tone === "closed"
              ? styles.lifecycleBadgeTextClosed
              : null,
          ]}
        >
          {lifecycle.statusLabel} · {lifecycle.outcomeLabel}
        </Text>
      </View>
      <Text selectable style={styles.lifecycleTitle}>
        {lifecycle.banner.title}
      </Text>
      <Text selectable style={styles.lifecycleBody}>
        {lifecycle.banner.body}
      </Text>
      {lifecycle.stalePrompt ? (
        <View style={styles.stalePrompt}>
          <Text selectable style={styles.staleTitle}>
            {lifecycle.stalePrompt.title}
          </Text>
          <Text selectable style={styles.staleBody}>
            {lifecycle.stalePrompt.body}
          </Text>
          <View style={styles.lifecycleActions}>
            <LifecycleActionButton
              action={lifecycle.stalePrompt.primaryAction}
              onLifecycleAction={onLifecycleAction}
            />
            <LifecycleActionButton
              action={lifecycle.stalePrompt.secondaryAction}
              onLifecycleAction={onLifecycleAction}
            />
          </View>
        </View>
      ) : null}
      {lifecycle.actions.length > 0 ? (
        <View style={styles.lifecycleActions}>
          {lifecycle.actions.map((action) => (
            <LifecycleActionButton
              action={action}
              key={action.id}
              onLifecycleAction={onLifecycleAction}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LifecycleActionButton({
  action,
  onLifecycleAction,
}: {
  action: ReportLifecycleActionViewModel;
  onLifecycleAction?: (actionId: ReportLifecycleActionId) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onLifecycleAction?.(action.id)}
      style={[
        styles.lifecycleAction,
        action.role === "primary" ? styles.lifecycleActionPrimary : null,
      ]}
    >
      <Text
        style={[
          styles.lifecycleActionText,
          action.role === "primary" ? styles.lifecycleActionTextPrimary : null,
        ]}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    color: shellColors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  buttonText: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  content: {
    padding: 18,
    paddingTop: 32,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  lifecycleAction: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  lifecycleActionPrimary: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  lifecycleActionText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  lifecycleActionTextPrimary: {
    color: shellColors.white,
  },
  lifecycleActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  lifecycleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e8f3ee",
    borderCurve: "continuous",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lifecycleBadgeClosed: {
    backgroundColor: "#edf0f2",
  },
  lifecycleBadgeText: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  lifecycleBadgeTextClosed: {
    color: shellColors.muted,
  },
  lifecycleBlock: {
    borderColor: shellColors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 14,
  },
  lifecycleBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  lifecycleTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  panel: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  reportId: {
    color: shellColors.text,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  staleBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  stalePrompt: {
    borderColor: shellColors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  staleTitle: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  title: {
    color: shellColors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
});
