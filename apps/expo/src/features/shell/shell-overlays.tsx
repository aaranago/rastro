import * as React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import type { ReportIntent } from "../../i18n";
import type { ShellAuthActionResult, ShellAuthCredentials } from "./shell-auth";
import type {
  ShellAuthPrompt,
  ShellReportAction,
  ShellSession,
} from "./shell-model";
import { AdoptionListingCreationScreen } from "../adoption-listing-creation/adoption-listing-creation-screen";
import { FoundReportCreationScreen } from "../found-report-creation/found-report-creation-screen";
import { LostReportCreationScreen } from "../lost-report-creation/lost-report-creation-screen";
import { createCreationDraftStore } from "../resilience/creation-drafts";
import { createExpoSecureStoreKeyValueStorage } from "../resilience/storage";
import {
  buildResourceProviderProfileHref,
  createStaticResourcesAdapter,
} from "../resources";
import { SightingReportCreationScreen } from "../sighting-report-creation/sighting-report-creation-screen";
import { prepareShellAuthCredentials } from "./shell-auth";
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
    clearMemberIntent,
    closeReportActions,
    continueAsVisitor,
    copy,
    createAccountFromPrompt,
    dismissAuthPrompt,
    model,
    openReportActions,
    session,
    signInFromPrompt,
    state,
  } = useRastroShell();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const creationDraftStore = React.useMemo(
    () =>
      createCreationDraftStore({
        storage: createExpoSecureStoreKeyValueStorage(),
      }),
    [],
  );
  const draftScopeId = session.kind === "member" ? session.id : undefined;
  const sponsorResourcesAdapter = React.useMemo(
    () => createStaticResourcesAdapter(),
    [],
  );
  const handleOpenSponsorPlacement = React.useCallback(
    (sponsorPlacementId: string) => {
      clearMemberIntent();
      router.push(buildResourceProviderProfileHref(sponsorPlacementId));
    },
    [clearMemberIntent, router],
  );
  const handleReportSponsorPlacement = React.useCallback(
    (sponsorPlacementId: string) => {
      void sponsorResourcesAdapter.reportProvider({
        detail: "Reporte enviado desde una colocacion patrocinada.",
        providerId: sponsorPlacementId,
        reason: "other",
      });
    },
    [sponsorResourcesAdapter],
  );

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
        authFailedLabel={copy.authPrompt.authFailed}
        closeLabel={copy.shell.close}
        createAccountPendingLabel={copy.authPrompt.creatingAccount}
        createAccountLabel={copy.authPrompt.createAccount}
        continueAsVisitorLabel={copy.authPrompt.continueAsVisitor}
        emailLabel={copy.authPrompt.emailLabel}
        emailPlaceholder={copy.authPrompt.emailPlaceholder}
        formHelp={copy.authPrompt.formHelp}
        missingCredentialsLabel={copy.authPrompt.missingCredentials}
        nameLabel={copy.authPrompt.nameLabel}
        namePlaceholder={copy.authPrompt.namePlaceholder}
        onClose={dismissAuthPrompt}
        onContinueAsVisitor={continueAsVisitor}
        onCreateAccount={createAccountFromPrompt}
        onSignIn={signInFromPrompt}
        passwordLabel={copy.authPrompt.passwordLabel}
        passwordPlaceholder={copy.authPrompt.passwordPlaceholder}
        prompt={state.authPrompt}
        signInPendingLabel={copy.authPrompt.signingIn}
        signInLabel={copy.authPrompt.signIn}
      />

      <LostReportCreationModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onOpenSponsorPlacement={handleOpenSponsorPlacement}
        onReportSponsorPlacement={handleReportSponsorPlacement}
        onClose={clearMemberIntent}
        visible={state.memberIntent?.intent === "lost"}
      />

      <FoundReportCreationModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onClose={clearMemberIntent}
        session={session}
        visible={state.memberIntent?.intent === "found"}
      />

      <SightingReportStartModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onClose={clearMemberIntent}
        session={session}
        visible={state.memberIntent?.intent === "sighting"}
      />

      <AdoptionListingCreationModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onClose={clearMemberIntent}
        session={session}
        visible={state.memberIntent?.intent === "adoption"}
      />
    </>
  );
}

function LostReportCreationModal({
  draftScopeId,
  draftStore,
  onClose,
  onOpenSponsorPlacement,
  onReportSponsorPlacement,
  visible,
}: {
  draftScopeId?: string;
  draftStore?: ReturnType<typeof createCreationDraftStore>;
  onClose: () => void;
  onOpenSponsorPlacement: (sponsorPlacementId: string) => void;
  onReportSponsorPlacement: (sponsorPlacementId: string) => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <LostReportCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        onClose={onClose}
        onOpenSponsorPlacement={onOpenSponsorPlacement}
        onReportSponsorPlacement={onReportSponsorPlacement}
      />
    </Modal>
  );
}

function FoundReportCreationModal({
  draftScopeId,
  draftStore,
  onClose,
  session,
  visible,
}: {
  draftScopeId?: string;
  draftStore?: ReturnType<typeof createCreationDraftStore>;
  onClose: () => void;
  session: ShellSession;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <FoundReportCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        onClose={onClose}
        session={
          session.kind === "member"
            ? {
                displayName: session.name ?? undefined,
                kind: "member",
                memberId: session.id,
              }
            : { kind: "visitor" }
        }
      />
    </Modal>
  );
}

function SightingReportStartModal({
  draftScopeId,
  draftStore,
  onClose,
  session,
  visible,
}: {
  draftScopeId?: string;
  draftStore?: ReturnType<typeof createCreationDraftStore>;
  onClose: () => void;
  session: ShellSession;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SightingReportCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        onClose={onClose}
        session={
          session.kind === "member"
            ? {
                displayName: session.name ?? undefined,
                kind: "member",
                memberId: session.id,
              }
            : { kind: "visitor" }
        }
      />
    </Modal>
  );
}

function AdoptionListingCreationModal({
  draftScopeId,
  draftStore,
  onClose,
  session,
  visible,
}: {
  draftScopeId?: string;
  draftStore?: ReturnType<typeof createCreationDraftStore>;
  onClose: () => void;
  session: ShellSession;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <AdoptionListingCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        onClose={onClose}
        session={
          session.kind === "member"
            ? {
                displayName: session.name ?? undefined,
                kind: "member",
                memberId: session.id,
              }
            : { kind: "visitor" }
        }
      />
    </Modal>
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
  authFailedLabel,
  bottomInset,
  closeLabel,
  createAccountLabel,
  createAccountPendingLabel,
  continueAsVisitorLabel,
  emailLabel,
  emailPlaceholder,
  formHelp,
  missingCredentialsLabel,
  nameLabel,
  namePlaceholder,
  onClose,
  onContinueAsVisitor,
  onCreateAccount,
  onSignIn,
  passwordLabel,
  passwordPlaceholder,
  prompt,
  signInLabel,
  signInPendingLabel,
}: {
  authFailedLabel: string;
  bottomInset: number;
  closeLabel: string;
  createAccountLabel: string;
  createAccountPendingLabel: string;
  continueAsVisitorLabel: string;
  emailLabel: string;
  emailPlaceholder: string;
  formHelp: string;
  missingCredentialsLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  onClose: () => void;
  onContinueAsVisitor: () => void;
  onCreateAccount: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  onSignIn: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  passwordLabel: string;
  passwordPlaceholder: string;
  prompt: ShellAuthPrompt | null;
  signInLabel: string;
  signInPendingLabel: string;
}) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<
    "create-account" | "sign-in" | null
  >(null);

  React.useEffect(() => {
    if (!prompt) {
      setAuthError(null);
      setEmail("");
      setName("");
      setPassword("");
      setPendingAction(null);
    }
  }, [prompt]);

  const submitAuthAction = React.useCallback(
    async (action: "create-account" | "sign-in") => {
      const prepared = prepareShellAuthCredentials({
        email,
        name,
        password,
      });

      if (!prepared.ok) {
        setAuthError(missingCredentialsLabel);
        return;
      }

      setAuthError(null);
      setPendingAction(action);

      const result =
        action === "sign-in"
          ? await onSignIn(prepared.credentials)
          : await onCreateAccount(prepared.credentials);

      setPendingAction(null);

      if (!result.ok) {
        setAuthError(result.message ?? authFailedLabel);
      }
    },
    [
      authFailedLabel,
      email,
      missingCredentialsLabel,
      name,
      onCreateAccount,
      onSignIn,
      password,
    ],
  );

  const isSubmitting = pendingAction !== null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(prompt)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.promptBackdrop}
      >
        <ScrollView
          contentContainerStyle={styles.promptScrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
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
            <Text maxFontSizeMultiplier={1.2} style={styles.promptHelp}>
              {formHelp}
            </Text>

            <View style={styles.promptFields}>
              <View style={styles.promptFieldGroup}>
                <Text maxFontSizeMultiplier={1.15} style={styles.promptLabel}>
                  {emailLabel}
                </Text>
                <TextInput
                  accessibilityLabel={emailLabel}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder={emailPlaceholder}
                  placeholderTextColor={shellColors.muted}
                  returnKeyType="next"
                  style={styles.promptInput}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>

              <View style={styles.promptFieldGroup}>
                <Text maxFontSizeMultiplier={1.15} style={styles.promptLabel}>
                  {passwordLabel}
                </Text>
                <TextInput
                  accessibilityLabel={passwordLabel}
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onChangeText={setPassword}
                  placeholder={passwordPlaceholder}
                  placeholderTextColor={shellColors.muted}
                  returnKeyType="done"
                  secureTextEntry
                  style={styles.promptInput}
                  textContentType="password"
                  value={password}
                />
              </View>

              <View style={styles.promptFieldGroup}>
                <Text maxFontSizeMultiplier={1.15} style={styles.promptLabel}>
                  {nameLabel}
                </Text>
                <TextInput
                  accessibilityLabel={nameLabel}
                  autoCapitalize="words"
                  autoComplete="name"
                  autoCorrect
                  editable={!isSubmitting}
                  onChangeText={setName}
                  placeholder={namePlaceholder}
                  placeholderTextColor={shellColors.muted}
                  returnKeyType="done"
                  style={styles.promptInput}
                  textContentType="name"
                  value={name}
                />
              </View>
            </View>

            {authError ? (
              <Text
                accessibilityRole="alert"
                maxFontSizeMultiplier={1.2}
                style={styles.promptError}
              >
                {authError}
              </Text>
            ) : null}

            <View style={styles.promptActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => {
                  void submitAuthAction("sign-in");
                }}
                style={({ pressed }) => [
                  styles.primaryPromptButton,
                  { opacity: pressed || isSubmitting ? 0.84 : 1 },
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
                  {pendingAction === "sign-in"
                    ? signInPendingLabel
                    : signInLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => {
                  void submitAuthAction("create-account");
                }}
                style={({ pressed }) => [
                  styles.secondaryPromptButton,
                  { opacity: pressed || isSubmitting ? 0.84 : 1 },
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
                  {pendingAction === "create-account"
                    ? createAccountPendingLabel
                    : createAccountLabel}
                </Text>
              </Pressable>
              <Pressable disabled={isSubmitting} onPress={onContinueAsVisitor}>
                <Text maxFontSizeMultiplier={1.2} style={styles.visitorLink}>
                  {continueAsVisitorLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: "rgba(20, 108, 90, 0.12)",
    flex: 1,
  },
  promptScrollContent: {
    alignItems: "center",
    flexGrow: 1,
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
  promptError: {
    alignSelf: "stretch",
    backgroundColor: "#FDECEC",
    borderColor: "#F3B6B6",
    borderRadius: 16,
    borderWidth: 1,
    color: "#9B1C1C",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    padding: 12,
  },
  promptFieldGroup: {
    gap: 6,
  },
  promptFields: {
    alignSelf: "stretch",
    gap: 10,
  },
  promptHelp: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  promptInput: {
    backgroundColor: shellColors.background,
    borderColor: shellColors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: shellColors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  promptLabel: {
    color: shellColors.text,
    fontSize: 13,
    fontWeight: "800",
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
