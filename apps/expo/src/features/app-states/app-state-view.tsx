import type { ScrollViewProps, StyleProp, ViewStyle } from "react-native";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  AppStateActionDescriptor,
  AppStateActionHandler,
  AppStateDescriptor,
  AppStateKind,
  AppStateTone,
} from "./app-state-types";
import { ShellIcon } from "../shell/shell-icon";
import { shellColors } from "../shell/shell-theme";

export interface AppStatePanelProps {
  descriptor: AppStateDescriptor;
  onActionPress?: AppStateActionHandler;
  layout?: "screen" | "embedded" | "compact";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface AppStateScreenProps
  extends Omit<AppStatePanelProps, "layout" | "style"> {
  contentContainerStyle?: StyleProp<ViewStyle>;
  panelStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<
    ScrollViewProps,
    "children" | "contentContainerStyle" | "contentInsetAdjustmentBehavior"
  >;
  scrollViewStyle?: StyleProp<ViewStyle>;
}

interface ToneColors {
  accent: string;
  accentSoft: string;
  border: string;
  foreground: string;
}

const defaultIconByKind: Record<AppStateKind, string> = {
  loading: "pawprint.fill",
  empty: "tray.fill",
  error: "exclamationmark.triangle.fill",
  "permission-denied": "hand.raised.fill",
  offline: "wifi.slash",
  retry: "arrow.clockwise",
  "permission-education": "info.circle.fill",
};

const defaultToneByKind: Record<AppStateKind, AppStateTone> = {
  loading: "neutral",
  empty: "info",
  error: "danger",
  "permission-denied": "warning",
  offline: "warning",
  retry: "info",
  "permission-education": "info",
};

const tonePalette: Record<AppStateTone, ToneColors> = {
  neutral: {
    accent: shellColors.primary,
    accentSoft: shellColors.primarySoft,
    border: "#A9D4C9",
    foreground: shellColors.primaryDark,
  },
  info: {
    accent: shellColors.sighting,
    accentSoft: "#E5F0F8",
    border: "#B9D7EA",
    foreground: "#1F5479",
  },
  warning: {
    accent: "#9D6B1F",
    accentSoft: "#FFF4D8",
    border: "#E5C778",
    foreground: "#6F4B13",
  },
  danger: {
    accent: shellColors.lost,
    accentSoft: "#FDEAE7",
    border: "#F0B9B4",
    foreground: "#9B2924",
  },
  success: {
    accent: shellColors.found,
    accentSoft: "#E4F4EB",
    border: "#A9D9BE",
    foreground: "#155C3D",
  },
};

export function AppStateScreen({
  contentContainerStyle,
  descriptor,
  onActionPress,
  panelStyle,
  scrollViewProps,
  scrollViewStyle,
  testID,
}: AppStateScreenProps) {
  return (
    <ScrollView
      {...scrollViewProps}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      contentInsetAdjustmentBehavior="automatic"
      style={[styles.screen, scrollViewStyle]}
    >
      <AppStatePanel
        descriptor={descriptor}
        layout="screen"
        onActionPress={onActionPress}
        style={panelStyle}
        testID={testID}
      />
    </ScrollView>
  );
}

export function AppStatePanel({
  descriptor,
  layout = "embedded",
  onActionPress,
  style,
  testID,
}: AppStatePanelProps) {
  const tone = descriptor.tone ?? defaultToneByKind[descriptor.kind];
  const toneColors = tonePalette[tone];
  const iconName = descriptor.iconName ?? defaultIconByKind[descriptor.kind];
  const detailLines = getDetailLines(descriptor);
  const actions = descriptor.actions ?? [];
  const progressLabel =
    descriptor.kind === "loading" ? descriptor.progressLabel : undefined;
  const lastUpdatedLabel =
    descriptor.kind === "offline" ? descriptor.lastUpdatedLabel : undefined;
  const retryTargetLabel =
    descriptor.kind === "retry" ? descriptor.retryTargetLabel : undefined;

  return (
    <View
      style={[
        styles.panel,
        layout === "screen" ? styles.screenPanel : null,
        layout === "compact" ? styles.compactPanel : null,
        { borderColor: toneColors.border },
        style,
      ]}
      testID={testID}
    >
      {descriptor.eyebrow ? (
        <Text selectable style={styles.eyebrow}>
          {descriptor.eyebrow}
        </Text>
      ) : null}

      <View
        style={[
          styles.iconShell,
          {
            backgroundColor: toneColors.accentSoft,
            borderColor: toneColors.border,
          },
        ]}
      >
        {descriptor.kind === "loading" ? (
          <ActivityIndicator color={toneColors.accent} />
        ) : (
          <ShellIcon color={toneColors.accent} name={iconName} size={28} />
        )}
      </View>

      {descriptor.statusLabel ? (
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: toneColors.accentSoft,
              borderColor: toneColors.border,
            },
          ]}
        >
          <Text
            selectable
            style={[styles.statusText, { color: toneColors.foreground }]}
          >
            {descriptor.statusLabel}
          </Text>
        </View>
      ) : null}

      <Text maxFontSizeMultiplier={1.25} selectable style={styles.title}>
        {descriptor.title}
      </Text>

      {descriptor.body ? (
        <Text maxFontSizeMultiplier={1.3} selectable style={styles.body}>
          {descriptor.body}
        </Text>
      ) : null}

      {progressLabel ? (
        <Text selectable style={styles.metaText}>
          {progressLabel}
        </Text>
      ) : null}

      {lastUpdatedLabel ? (
        <Text selectable style={styles.metaText}>
          {lastUpdatedLabel}
        </Text>
      ) : null}

      {retryTargetLabel ? (
        <Text selectable style={styles.metaText}>
          {retryTargetLabel}
        </Text>
      ) : null}

      {detailLines.length > 0 ? (
        <View style={styles.detailList}>
          {detailLines.map((line, index) => (
            <View key={`${line}-${index}`} style={styles.detailRow}>
              <View
                style={[
                  styles.detailDot,
                  { backgroundColor: toneColors.accent },
                ]}
              />
              <Text
                maxFontSizeMultiplier={1.25}
                selectable
                style={styles.detailText}
              >
                {line}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <AppStateActionButton
              action={action}
              descriptor={descriptor}
              key={action.id}
              onActionPress={onActionPress}
              toneColors={toneColors}
            />
          ))}
        </View>
      ) : null}

      {descriptor.footnote ? (
        <Text selectable style={styles.footnote}>
          {descriptor.footnote}
        </Text>
      ) : null}
    </View>
  );
}

function AppStateActionButton({
  action,
  descriptor,
  onActionPress,
  toneColors,
}: {
  action: AppStateActionDescriptor;
  descriptor: AppStateDescriptor;
  onActionPress?: AppStateActionHandler;
  toneColors: ToneColors;
}) {
  const handlePress = useCallback(() => {
    if (action.disabled) {
      return;
    }

    onActionPress?.(action, descriptor);
  }, [action, descriptor, onActionPress]);

  const variant = action.variant ?? "primary";
  const iconColor =
    variant === "primary" ? shellColors.white : toneColors.accent;

  return (
    <Pressable
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityRole="button"
      accessibilityState={{ disabled: action.disabled ? true : undefined }}
      disabled={action.disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "primary"
          ? {
              backgroundColor: toneColors.accent,
              borderColor: toneColors.accent,
            }
          : null,
        variant === "secondary"
          ? {
              backgroundColor: shellColors.surface,
              borderColor: toneColors.border,
            }
          : null,
        variant === "quiet"
          ? {
              backgroundColor: "transparent",
              borderColor: "transparent",
            }
          : null,
        pressed ? (action.disabled ? null : styles.pressed) : null,
        action.disabled ? styles.disabled : null,
      ]}
    >
      {action.iconName ? (
        <ShellIcon color={iconColor} name={action.iconName} size={18} />
      ) : null}
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={2}
        style={[
          styles.actionText,
          variant === "primary"
            ? { color: shellColors.white }
            : { color: toneColors.accent },
        ]}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

function getDetailLines(descriptor: AppStateDescriptor) {
  if (descriptor.kind === "permission-education") {
    return descriptor.reasons;
  }

  return descriptor.detailLines ?? [];
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    minWidth: 148,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    minWidth: 0,
    textAlign: "center",
  },
  actions: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    paddingTop: 4,
  },
  body: {
    color: shellColors.muted,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 23,
    maxWidth: 480,
    textAlign: "center",
  },
  compactPanel: {
    alignItems: "flex-start",
    padding: 16,
  },
  detailDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  detailList: {
    alignSelf: "stretch",
    gap: 10,
    maxWidth: 480,
  },
  detailRow: {
    flexDirection: "row",
    gap: 10,
  },
  detailText: {
    color: shellColors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    minWidth: 0,
  },
  disabled: {
    opacity: 0.48,
  },
  eyebrow: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 17,
    textTransform: "uppercase",
  },
  footnote: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    maxWidth: 460,
    textAlign: "center",
  },
  iconShell: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 28,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  metaText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    textAlign: "center",
  },
  panel: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: shellColors.surface,
    borderCurve: "continuous",
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 14px 30px rgba(23, 32, 28, 0.08)",
    gap: 14,
    padding: 22,
  },
  pressed: {
    opacity: 0.82,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  screenPanel: {
    marginHorizontal: "auto",
    maxWidth: 560,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  statusPill: {
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  title: {
    color: shellColors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    maxWidth: 500,
    textAlign: "center",
  },
});
