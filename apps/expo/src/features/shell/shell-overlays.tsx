import type { Href } from "expo-router";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInputProps,
} from "react-native";
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
import { useRouter, useSegments } from "expo-router";

import type { ReportIntent } from "../../i18n";
import type {
  ShellAuthActionResult,
  ShellAuthCredentials,
  ShellSocialAuthAction,
  ShellSocialAuthProvider,
} from "./shell-auth";
import type {
  ShellAuthPrompt,
  ShellMemberCreationSession,
  ShellReportAction,
} from "./shell-model";
import type {
  ShellFirstRunTourCompletionReason,
  ShellFirstRunTourModel,
  ShellFirstRunTourStore,
} from "./shell-onboarding";
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
import {
  shouldShowGlobalFabForSegments,
  toShellMemberCreationSession,
} from "./shell-model";
import {
  createShellFirstRunTourModel,
  createShellFirstRunTourStore,
  loadShellFirstRunTourModel,
} from "./shell-onboarding";
import { useRastroShell } from "./shell-provider";
import { reportIntentColors, shellColors } from "./shell-theme";

interface IconProps {
  name: string;
  color: string;
  fallback?: string;
  size?: number;
}

type ShellAuthPromptAction = "create-account" | "sign-in";
type ShellAuthPromptPendingAction =
  | ShellAuthPromptAction
  | ShellSocialAuthProvider;

export function ShellIcon({ name, color, fallback, size = 22 }: IconProps) {
  if (Platform.OS !== "ios" && fallback) {
    return (
      <Text
        maxFontSizeMultiplier={1}
        style={[
          styles.iconFallback,
          {
            color,
            fontSize: fallback.length > 1 ? Math.max(9, size * 0.34) : size,
            height: size,
            lineHeight: size,
            width: size,
          },
        ]}
      >
        {fallback}
      </Text>
    );
  }

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
    clearAuthReturnTo,
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
    signInWithSocialProviderFromPrompt,
    socialProviderActions,
    state,
  } = useRastroShell();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const shouldShowFab = shouldShowGlobalFabForSegments(segments);
  const secureStorage = React.useMemo(
    () => createExpoSecureStoreKeyValueStorage(),
    [],
  );
  const creationDraftStore = React.useMemo(
    () =>
      createCreationDraftStore({
        storage: secureStorage,
      }),
    [secureStorage],
  );
  const firstRunTourStore = React.useMemo(
    () => createShellFirstRunTourStore({ storage: secureStorage }),
    [secureStorage],
  );
  const draftScopeId = session.kind === "member" ? session.id : undefined;
  const memberCreationSession = toShellMemberCreationSession(session);
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

  React.useEffect(() => {
    if (!state.authReturnTo) {
      return;
    }

    router.push(state.authReturnTo as Href);
    clearAuthReturnTo();
  }, [clearAuthReturnTo, router, state.authReturnTo]);

  return (
    <>
      {shouldShowFab ? (
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
          <ShellIcon
            name="plus"
            color={shellColors.white}
            fallback="+"
            size={24}
          />
          <Text maxFontSizeMultiplier={1} style={styles.fabLabel}>
            Reportar
          </Text>
        </Pressable>
      ) : null}

      <ShellFirstRunTourHost store={firstRunTourStore} />

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
        actions={{
          onClose: dismissAuthPrompt,
          onContinueAsVisitor: continueAsVisitor,
          onCreateAccount: createAccountFromPrompt,
          onSignIn: signInFromPrompt,
          onSignInWithSocialProvider: signInWithSocialProviderFromPrompt,
        }}
        copy={{
          authFailedLabel: copy.authPrompt.authFailed,
          closeLabel: copy.shell.close,
          createAccountLabel: copy.authPrompt.createAccount,
          createAccountPendingLabel: copy.authPrompt.creatingAccount,
          continueAsVisitorLabel: copy.authPrompt.continueAsVisitor,
          emailLabel: copy.authPrompt.emailLabel,
          emailPlaceholder: copy.authPrompt.emailPlaceholder,
          formHelp: copy.authPrompt.formHelp,
          missingCredentialsLabel: copy.authPrompt.missingCredentials,
          nameLabel: copy.authPrompt.nameLabel,
          namePlaceholder: copy.authPrompt.namePlaceholder,
          passwordLabel: copy.authPrompt.passwordLabel,
          passwordPlaceholder: copy.authPrompt.passwordPlaceholder,
          signInLabel: copy.authPrompt.signIn,
          signInPendingLabel: copy.authPrompt.signingIn,
          socialAuthHelp: copy.authPrompt.socialProviderHelp,
          socialProviderPendingLabel: copy.authPrompt.socialProviderPending,
        }}
        prompt={state.authPrompt}
        socialProviderActions={socialProviderActions}
      />

      <LostReportCreationModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onOpenSponsorPlacement={handleOpenSponsorPlacement}
        onReportSponsorPlacement={handleReportSponsorPlacement}
        onClose={clearMemberIntent}
        visible={
          Boolean(memberCreationSession) &&
          state.memberIntent?.intent === "lost"
        }
      />

      <FoundReportCreationModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onClose={clearMemberIntent}
        session={memberCreationSession}
        visible={
          Boolean(memberCreationSession) &&
          state.memberIntent?.intent === "found"
        }
      />

      <SightingReportStartModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onClose={clearMemberIntent}
        session={memberCreationSession}
        visible={
          Boolean(memberCreationSession) &&
          state.memberIntent?.intent === "sighting"
        }
      />

      <AdoptionListingCreationModal
        draftScopeId={draftScopeId}
        draftStore={creationDraftStore}
        onClose={clearMemberIntent}
        session={memberCreationSession}
        visible={
          Boolean(memberCreationSession) &&
          state.memberIntent?.intent === "adoption"
        }
      />
    </>
  );
}

function ShellFirstRunTourHost({ store }: { store: ShellFirstRunTourStore }) {
  const { copy } = useRastroShell();
  const [tourModel, setTourModel] =
    React.useState<ShellFirstRunTourModel | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    let isActive = true;

    loadShellFirstRunTourModel({ copy, store })
      .then((model) => {
        if (!isActive) {
          return;
        }

        setTourModel(model);
        setIsVisible(model.shouldShow);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setTourModel(createShellFirstRunTourModel({ shouldShow: true }));
        setIsVisible(true);
      });

    return () => {
      isActive = false;
    };
  }, [copy, store]);

  const closeTour = React.useCallback(
    async (reason: ShellFirstRunTourCompletionReason) => {
      setIsVisible(false);
      setTourModel((current) =>
        current ? { ...current, shouldShow: false } : current,
      );

      try {
        await store.markCompleted({ reason });
      } catch {
        // The tour should not block app use if persistence is temporarily unavailable.
      }
    },
    [store],
  );

  if (!tourModel) {
    return null;
  }

  return (
    <ShellFirstRunTourModal
      model={tourModel}
      onComplete={() => {
        void closeTour("complete");
      }}
      onSkip={() => {
        void closeTour("skip");
      }}
      visible={isVisible && tourModel.shouldShow}
    />
  );
}

function ShellFirstRunTourModal({
  model,
  onComplete,
  onSkip,
  visible,
}: {
  model: ShellFirstRunTourModel;
  onComplete: () => void;
  onSkip: () => void;
  visible: boolean;
}) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [pageWidth, setPageWidth] = React.useState(1);
  const scrollRef = React.useRef<ScrollView>(null);
  const stepCount = model.steps.length;
  const isLastStep = currentStep >= stepCount - 1;

  React.useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      scrollRef.current?.scrollTo({ animated: false, x: 0 });
    }
  }, [visible]);

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    setPageWidth(Math.max(1, event.nativeEvent.layout.width));
  }, []);

  const handleMomentumScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const width = event.nativeEvent.layoutMeasurement.width;

      if (width <= 0) {
        return;
      }

      setCurrentStep(Math.round(event.nativeEvent.contentOffset.x / width));
    },
    [],
  );

  const moveNext = React.useCallback(() => {
    if (isLastStep) {
      onComplete();
      return;
    }

    const nextStep = Math.min(currentStep + 1, stepCount - 1);

    setCurrentStep(nextStep);
    scrollRef.current?.scrollTo({
      animated: true,
      x: pageWidth * nextStep,
    });
  }, [currentStep, isLastStep, onComplete, pageWidth, stepCount]);

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.tourBackdrop}>
        <View
          accessibilityViewIsModal
          onLayout={handleLayout}
          style={styles.tourCard}
        >
          <View style={styles.tourHeader}>
            <Text maxFontSizeMultiplier={1.15} style={styles.tourStepLabel}>
              {model.stepLabel(currentStep + 1, stepCount)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onSkip}
              style={styles.tourSkipButton}
            >
              <Text maxFontSizeMultiplier={1.1} style={styles.tourSkipText}>
                {model.skipLabel}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            onMomentumScrollEnd={handleMomentumScrollEnd}
            pagingEnabled
            ref={scrollRef}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
          >
            {model.steps.map((step) => (
              <View
                key={step.title}
                style={[styles.tourPage, { width: pageWidth }]}
              >
                <View style={styles.tourIconShell}>
                  <ShellIcon
                    color={shellColors.primary}
                    fallback={step.iconFallback}
                    name={step.iconName}
                    size={34}
                  />
                </View>
                <Text maxFontSizeMultiplier={1.15} style={styles.tourTitle}>
                  {step.title}
                </Text>
                <Text maxFontSizeMultiplier={1.25} style={styles.tourBody}>
                  {step.body}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.tourFooter}>
            <View style={styles.tourDots}>
              {model.steps.map((step, index) => (
                <View
                  key={step.title}
                  style={[
                    styles.tourDot,
                    index === currentStep ? styles.tourDotActive : null,
                  ]}
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={moveNext}
              style={styles.tourPrimaryButton}
            >
              <Text
                maxFontSizeMultiplier={1.15}
                style={styles.tourPrimaryButtonText}
              >
                {isLastStep ? model.completeLabel : model.nextLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  session: ShellMemberCreationSession | null;
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
        session={session ?? { kind: "visitor" }}
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
  session: ShellMemberCreationSession | null;
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
        session={session ?? { kind: "visitor" }}
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
  session: ShellMemberCreationSession | null;
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
        session={session ?? { kind: "visitor" }}
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
  actions,
  bottomInset,
  copy,
  prompt,
  socialProviderActions,
}: {
  actions: {
    onClose: () => void;
    onContinueAsVisitor: () => void;
    onCreateAccount: (
      credentials: ShellAuthCredentials,
    ) => Promise<ShellAuthActionResult>;
    onSignIn: (
      credentials: ShellAuthCredentials,
    ) => Promise<ShellAuthActionResult>;
    onSignInWithSocialProvider: (
      provider: ShellSocialAuthProvider,
    ) => Promise<ShellAuthActionResult>;
  };
  bottomInset: number;
  copy: {
    authFailedLabel: string;
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
    passwordLabel: string;
    passwordPlaceholder: string;
    signInLabel: string;
    signInPendingLabel: string;
    socialAuthHelp: string;
    socialProviderPendingLabel: (providerLabel: string) => string;
  };
  prompt: ShellAuthPrompt | null;
  socialProviderActions: ShellSocialAuthAction[];
}) {
  const promptState = useSignInPromptState({
    authFailedLabel: copy.authFailedLabel,
    missingCredentialsLabel: copy.missingCredentialsLabel,
    onCreateAccount: actions.onCreateAccount,
    onSignIn: actions.onSignIn,
    onSignInWithSocialProvider: actions.onSignInWithSocialProvider,
    prompt,
  });
  const isSubmitting = promptState.pendingAction !== null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={actions.onClose}
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
              accessibilityLabel={copy.closeLabel}
              accessibilityRole="button"
              onPress={actions.onClose}
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
              {copy.formHelp}
            </Text>

            <PromptSocialProviders
              actions={socialProviderActions}
              disabled={isSubmitting}
              helpLabel={copy.socialAuthHelp}
              onSubmit={promptState.submitSocialProviderAction}
              pendingAction={promptState.pendingAction}
              pendingLabel={copy.socialProviderPendingLabel}
            />

            <View style={styles.promptFields}>
              <PromptTextField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="email-address"
                label={copy.emailLabel}
                onChangeText={promptState.setEmail}
                placeholder={copy.emailPlaceholder}
                returnKeyType="next"
                textContentType="emailAddress"
                value={promptState.email}
              />
              <PromptTextField
                autoCapitalize="none"
                autoComplete="password"
                autoCorrect={false}
                editable={!isSubmitting}
                label={copy.passwordLabel}
                onChangeText={promptState.setPassword}
                placeholder={copy.passwordPlaceholder}
                returnKeyType="done"
                secureTextEntry
                textContentType="password"
                value={promptState.password}
              />
              <PromptTextField
                autoCapitalize="words"
                autoComplete="name"
                autoCorrect
                editable={!isSubmitting}
                label={copy.nameLabel}
                onChangeText={promptState.setName}
                placeholder={copy.namePlaceholder}
                returnKeyType="done"
                textContentType="name"
                value={promptState.name}
              />
            </View>

            {promptState.authError ? (
              <Text
                accessibilityRole="alert"
                maxFontSizeMultiplier={1.2}
                style={styles.promptError}
              >
                {promptState.authError}
              </Text>
            ) : null}

            <PromptActions
              continueAsVisitorLabel={copy.continueAsVisitorLabel}
              createAccountLabel={copy.createAccountLabel}
              createAccountPendingLabel={copy.createAccountPendingLabel}
              isSubmitting={isSubmitting}
              onContinueAsVisitor={actions.onContinueAsVisitor}
              onSubmitAuthAction={promptState.submitAuthAction}
              pendingAction={promptState.pendingAction}
              signInLabel={copy.signInLabel}
              signInPendingLabel={copy.signInPendingLabel}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface SignInPromptStateInput {
  authFailedLabel: string;
  missingCredentialsLabel: string;
  onCreateAccount: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  onSignIn: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  onSignInWithSocialProvider: (
    provider: ShellSocialAuthProvider,
  ) => Promise<ShellAuthActionResult>;
  prompt: ShellAuthPrompt | null;
}

function useSignInPromptState({
  authFailedLabel,
  missingCredentialsLabel,
  onCreateAccount,
  onSignIn,
  onSignInWithSocialProvider,
  prompt,
}: SignInPromptStateInput) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    React.useState<ShellAuthPromptPendingAction | null>(null);

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
    async (action: ShellAuthPromptAction) => {
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

  const submitSocialProviderAction = React.useCallback(
    async (action: ShellSocialAuthAction) => {
      setAuthError(null);
      setPendingAction(action.provider);

      const result = await onSignInWithSocialProvider(action.provider);

      setPendingAction(null);

      if (!result.ok) {
        setAuthError(result.message ?? authFailedLabel);
      }
    },
    [authFailedLabel, onSignInWithSocialProvider],
  );

  return {
    authError,
    email,
    name,
    password,
    pendingAction,
    setEmail,
    setName,
    setPassword,
    submitAuthAction,
    submitSocialProviderAction,
  };
}

function PromptSocialProviders({
  actions,
  disabled,
  helpLabel,
  onSubmit,
  pendingAction,
  pendingLabel,
}: {
  actions: ShellSocialAuthAction[];
  disabled: boolean;
  helpLabel: string;
  onSubmit: (action: ShellSocialAuthAction) => Promise<void>;
  pendingAction: ShellAuthPromptPendingAction | null;
  pendingLabel: (providerLabel: string) => string;
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.socialProviderGroup}>
      <Text maxFontSizeMultiplier={1.15} style={styles.socialProviderHelp}>
        {helpLabel}
      </Text>
      <View style={styles.socialProviderActions}>
        {actions.map((action) => (
          <SocialProviderButton
            action={action}
            disabled={disabled}
            isPending={pendingAction === action.provider}
            key={action.provider}
            onPress={() => {
              void onSubmit(action);
            }}
            pendingLabel={pendingLabel(action.label)}
          />
        ))}
      </View>
    </View>
  );
}

function PromptTextField({
  autoCapitalize,
  autoComplete,
  autoCorrect,
  editable,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  returnKeyType,
  secureTextEntry,
  textContentType,
  value,
}: {
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  autoCorrect?: TextInputProps["autoCorrect"];
  editable: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  secureTextEntry?: boolean;
  textContentType?: TextInputProps["textContentType"];
  value: string;
}) {
  return (
    <View style={styles.promptFieldGroup}>
      <Text maxFontSizeMultiplier={1.15} style={styles.promptLabel}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={shellColors.muted}
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry}
        style={styles.promptInput}
        textContentType={textContentType}
        value={value}
      />
    </View>
  );
}

function PromptActions({
  continueAsVisitorLabel,
  createAccountLabel,
  createAccountPendingLabel,
  isSubmitting,
  onContinueAsVisitor,
  onSubmitAuthAction,
  pendingAction,
  signInLabel,
  signInPendingLabel,
}: {
  continueAsVisitorLabel: string;
  createAccountLabel: string;
  createAccountPendingLabel: string;
  isSubmitting: boolean;
  onContinueAsVisitor: () => void;
  onSubmitAuthAction: (action: ShellAuthPromptAction) => Promise<void>;
  pendingAction: ShellAuthPromptPendingAction | null;
  signInLabel: string;
  signInPendingLabel: string;
}) {
  return (
    <View style={styles.promptActions}>
      <PromptActionButton
        disabled={isSubmitting}
        iconColor={shellColors.white}
        iconName="arrow.right.to.line"
        label={pendingAction === "sign-in" ? signInPendingLabel : signInLabel}
        onPress={() => {
          void onSubmitAuthAction("sign-in");
        }}
        variant="primary"
      />
      <PromptActionButton
        disabled={isSubmitting}
        iconColor={shellColors.primary}
        iconName="person.badge.plus"
        label={
          pendingAction === "create-account"
            ? createAccountPendingLabel
            : createAccountLabel
        }
        onPress={() => {
          void onSubmitAuthAction("create-account");
        }}
        variant="secondary"
      />
      <Pressable disabled={isSubmitting} onPress={onContinueAsVisitor}>
        <Text maxFontSizeMultiplier={1.2} style={styles.visitorLink}>
          {continueAsVisitorLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function SocialProviderButton({
  action,
  disabled,
  isPending,
  onPress,
  pendingLabel,
}: {
  action: ShellSocialAuthAction;
  disabled: boolean;
  isPending: boolean;
  onPress: () => void;
  pendingLabel: string;
}) {
  const icon = getSocialProviderIcon(action.provider);

  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialProviderButton,
        { opacity: pressed || disabled ? 0.84 : 1 },
      ]}
    >
      <ShellIcon
        color={shellColors.primary}
        fallback={icon.fallback}
        name={icon.name}
        size={20}
      />
      <Text
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        style={styles.socialProviderButtonText}
      >
        {isPending ? pendingLabel : action.label}
      </Text>
    </Pressable>
  );
}

function PromptActionButton({
  disabled,
  iconColor,
  iconName,
  label,
  onPress,
  variant,
}: {
  disabled: boolean;
  iconColor: string;
  iconName: string;
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
}) {
  const buttonStyle =
    variant === "primary"
      ? styles.primaryPromptButton
      : styles.secondaryPromptButton;
  const textStyle =
    variant === "primary"
      ? styles.primaryPromptButtonText
      : styles.secondaryPromptButtonText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        buttonStyle,
        { opacity: pressed || disabled ? 0.84 : 1 },
      ]}
    >
      <ShellIcon name={iconName} color={iconColor} size={20} />
      <Text maxFontSizeMultiplier={1.2} style={textStyle}>
        {label}
      </Text>
    </Pressable>
  );
}

function getSocialProviderIcon(provider: ShellSocialAuthProvider) {
  return provider === "google"
    ? {
        fallback: "G",
        name: "globe",
      }
    : {
        fallback: "f",
        name: "person.2.fill",
      };
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
    gap: 1,
    height: 60,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    width: 60,
    zIndex: 30,
  },
  fabLabel: {
    color: shellColors.white,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 10,
  },
  iconFallback: {
    fontWeight: "900",
    textAlign: "center",
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
  tourBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(23, 32, 28, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  tourBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  tourCard: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 420,
    overflow: "hidden",
    width: "100%",
  },
  tourDot: {
    backgroundColor: shellColors.border,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  tourDotActive: {
    backgroundColor: shellColors.primary,
    width: 18,
  },
  tourDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  tourFooter: {
    alignItems: "center",
    borderTopColor: shellColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  tourHeader: {
    alignItems: "center",
    borderBottomColor: shellColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tourIconShell: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderColor: "#A9D4C9",
    borderRadius: 34,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  tourPage: {
    alignItems: "center",
    gap: 12,
    minHeight: 220,
    padding: 20,
  },
  tourPrimaryButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 116,
    paddingHorizontal: 18,
  },
  tourPrimaryButtonText: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  tourSkipButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tourSkipText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  tourStepLabel: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  tourTitle: {
    color: shellColors.text,
    fontSize: 21,
    fontWeight: "900",
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
  socialProviderActions: {
    alignSelf: "stretch",
    gap: 10,
  },
  socialProviderButton: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  socialProviderButtonText: {
    color: shellColors.primary,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  socialProviderGroup: {
    alignSelf: "stretch",
    gap: 10,
  },
  socialProviderHelp: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
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
