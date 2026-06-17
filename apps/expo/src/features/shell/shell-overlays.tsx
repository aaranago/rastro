import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import type { ReportIntent } from "../../i18n";
import type { ShellAuthPrompt, ShellReportAction } from "./shell-model";
import { useRastroShell } from "./shell-provider";
import { reportIntentColors, shellColors } from "./shell-theme";

interface IconProps {
  name: string;
  color: string;
  size?: number;
}

export function ShellIcon({ name, color, size = 22 }: IconProps) {
  return (
    <Image
      source={`sf:${name}`}
      tintColor={color}
      contentFit="contain"
      style={{ height: size, width: size }}
    />
  );
}

export function ShellFabHost() {
  const {
    chooseReportIntent,
    closeReportActions,
    continueAsVisitor,
    copy,
    createAccountFromPrompt,
    dismissAuthPrompt,
    model,
    openReportActions,
    signInFromPrompt,
    state,
  } = useRastroShell();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Pressable
        accessibilityLabel={copy.shell.reportFabLabel}
        accessibilityRole="button"
        onPress={openReportActions}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: Math.max(insets.bottom, 12) + 76,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <ShellIcon name="plus" color={shellColors.white} size={28} />
      </Pressable>

      <ReportActionSheet
        actions={model.reportActions}
        bottomInset={insets.bottom}
        closeLabel={copy.shell.close}
        onClose={closeReportActions}
        onSelect={chooseReportIntent}
        subtitle={copy.shell.reportSheetSubtitle}
        title={copy.shell.reportSheetTitle}
        visible={state.activeSheet === "report-actions"}
      />

      <SignInPrompt
        bottomInset={insets.bottom}
        closeLabel={copy.shell.close}
        createAccountLabel={copy.authPrompt.createAccount}
        continueAsVisitorLabel={copy.authPrompt.continueAsVisitor}
        onClose={dismissAuthPrompt}
        onContinueAsVisitor={continueAsVisitor}
        onCreateAccount={createAccountFromPrompt}
        onSignIn={signInFromPrompt}
        prompt={state.authPrompt}
        signInLabel={copy.authPrompt.signIn}
      />
    </>
  );
}

export function ReportActionSheet({
  actions,
  bottomInset,
  closeLabel,
  onClose,
  onSelect,
  subtitle,
  title,
  visible,
}: {
  actions: ShellReportAction[];
  bottomInset: number;
  closeLabel: string;
  onClose: () => void;
  onSelect: (intent: ReportIntent) => void;
  subtitle: string;
  title: string;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.actionSheet,
            { paddingBottom: Math.max(bottomInset, 16) + 18 },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleGroup}>
              <Text maxFontSizeMultiplier={1.25} style={styles.sheetTitle}>
                {title}
              </Text>
              <Text maxFontSizeMultiplier={1.25} style={styles.sheetSubtitle}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <ShellIcon name="xmark" color={shellColors.muted} size={20} />
            </Pressable>
          </View>

          <View style={styles.actionList}>
            {actions.map((action) => {
              const colors = reportIntentColors[action.intent];

              return (
                <Pressable
                  accessibilityRole="button"
                  key={action.intent}
                  onPress={() => onSelect(action.intent)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: colors.iconBackground },
                    ]}
                  >
                    <ShellIcon
                      color={colors.foreground}
                      name={action.icon}
                      size={22}
                    />
                  </View>
                  <Text
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={2}
                    style={[styles.actionLabel, { color: colors.foreground }]}
                  >
                    {action.label}
                  </Text>
                  <ShellIcon
                    color={colors.foreground}
                    name="chevron.right"
                    size={18}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SignInPrompt({
  bottomInset,
  closeLabel,
  createAccountLabel,
  continueAsVisitorLabel,
  onClose,
  onContinueAsVisitor,
  onCreateAccount,
  onSignIn,
  prompt,
  signInLabel,
}: {
  bottomInset: number;
  closeLabel: string;
  createAccountLabel: string;
  continueAsVisitorLabel: string;
  onClose: () => void;
  onContinueAsVisitor: () => void;
  onCreateAccount: () => void;
  onSignIn: () => void;
  prompt: ShellAuthPrompt | null;
  signInLabel: string;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(prompt)}
    >
      <View style={styles.promptBackdrop}>
        <View
          accessibilityViewIsModal
          style={[
            styles.promptCard,
            { marginBottom: Math.max(bottomInset, 16) },
          ]}
        >
          <Pressable
            accessibilityLabel={closeLabel}
            accessibilityRole="button"
            onPress={onClose}
            style={styles.promptCloseButton}
          >
            <ShellIcon name="xmark" color={shellColors.muted} size={20} />
          </Pressable>

          <View style={styles.promptIcon}>
            <ShellIcon
              name="person.crop.circle.badge.plus"
              color={shellColors.primary}
              size={42}
            />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={styles.promptTitle}>
            {prompt?.title}
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={styles.promptBody}>
            {prompt?.body}
          </Text>

          <View style={styles.promptActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onSignIn}
              style={({ pressed }) => [
                styles.primaryPromptButton,
                { opacity: pressed ? 0.84 : 1 },
              ]}
            >
              <ShellIcon
                name="arrow.right.to.line"
                color={shellColors.white}
                size={20}
              />
              <Text
                maxFontSizeMultiplier={1.2}
                style={styles.primaryPromptButtonText}
              >
                {signInLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onCreateAccount}
              style={({ pressed }) => [
                styles.secondaryPromptButton,
                { opacity: pressed ? 0.84 : 1 },
              ]}
            >
              <ShellIcon
                name="person.badge.plus"
                color={shellColors.primary}
                size={20}
              />
              <Text
                maxFontSizeMultiplier={1.2}
                style={styles.secondaryPromptButtonText}
              >
                {createAccountLabel}
              </Text>
            </Pressable>
            <Pressable onPress={onContinueAsVisitor}>
              <Text maxFontSizeMultiplier={1.2} style={styles.visitorLink}>
                {continueAsVisitorLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  actionList: {
    gap: 12,
  },
  actionRow: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    boxShadow: "0 14px 24px rgba(23, 32, 28, 0.12)",
    flexDirection: "row",
    gap: 14,
    minHeight: 76,
    paddingHorizontal: 16,
  },
  actionSheet: {
    backgroundColor: shellColors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    gap: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fab: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 30,
    boxShadow: "0 18px 28px rgba(20, 108, 90, 0.28)",
    height: 60,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    width: 60,
    zIndex: 30,
  },
  modalBackdrop: {
    backgroundColor: "rgba(23, 32, 28, 0.20)",
    flex: 1,
    justifyContent: "flex-end",
  },
  primaryPromptButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 28,
    boxShadow: "0 12px 24px rgba(20, 108, 90, 0.22)",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 18,
  },
  primaryPromptButtonText: {
    color: shellColors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  promptActions: {
    alignSelf: "stretch",
    gap: 12,
    marginTop: 12,
  },
  promptBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(20, 108, 90, 0.12)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  promptBody: {
    color: shellColors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  promptCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderRadius: 28,
    boxShadow: "0 18px 40px rgba(23, 32, 28, 0.14)",
    gap: 14,
    maxWidth: 420,
    padding: 26,
    width: "100%",
  },
  promptCloseButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    top: 14,
    width: 40,
  },
  promptIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 42,
    height: 84,
    justifyContent: "center",
    marginTop: 10,
    width: 84,
  },
  promptTitle: {
    color: shellColors.text,
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryPromptButton: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 28,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  secondaryPromptButtonText: {
    color: shellColors.primary,
    fontSize: 17,
    fontWeight: "700",
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  sheetSubtitle: {
    color: shellColors.muted,
    fontSize: 15,
  },
  sheetTitle: {
    color: shellColors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  sheetTitleGroup: {
    flex: 1,
    gap: 3,
  },
  visitorLink: {
    color: shellColors.muted,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 8,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
