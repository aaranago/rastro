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
  ShellAuthPromptAction,
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
import authWelcomeIllustration from "../../../assets/auth-welcome-illustration.png";
import { trpcClient } from "../../utils/api";
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
import { createApiSightingReportPublishHandler } from "../sighting-report-creation/sighting-report-publish-adapter";
import {
  prepareShellAuthCredentialsForAction,
  prepareShellPasswordResetEmail,
} from "./shell-auth";
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

type ShellAuthPromptMode = "create-account" | "password-reset" | "sign-in";
type ShellAuthPromptPendingAction =
  | ShellAuthPromptAction
  | "password-reset"
  | ShellSocialAuthProvider;

const androidIconFallbacks: Record<string, string> = {
  "arrow.right.to.line": "->",
  "bell.fill": "!",
  "checkmark.seal.fill": "OK",
  "chevron.right": ">",
  "eye.fill": "o",
  "heart.fill": "<3",
  "lock.fill": "*",
  "megaphone.fill": "!",
  "person.badge.plus": "+",
  "person.crop.circle.badge.plus": "+",
  sparkles: "*",
  xmark: "x",
};

export function ShellIcon({ name, color, fallback, size = 22 }: IconProps) {
  const resolvedFallback = fallback ?? androidIconFallbacks[name];

  if (Platform.OS !== "ios" && resolvedFallback) {
    return (
      <Text
        maxFontSizeMultiplier={1}
        style={[
          styles.iconFallback,
          {
            color,
            fontSize:
              resolvedFallback.length > 1 ? Math.max(9, size * 0.34) : size,
            height: size,
            lineHeight: size,
            width: size,
          },
        ]}
      >
        {resolvedFallback}
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
    requestPasswordResetFromPrompt,
    session,
    signInFromPrompt,
    signInWithSocialProviderFromPrompt,
    socialProviderActions,
    state,
  } = useRastroShell();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const shouldShowFab = shouldDisplayGlobalReportFab({
    isAuthPromptVisible: Boolean(state.authPrompt),
    segments,
    sessionKind: session.kind,
  });
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
  const publishSightingReport = React.useMemo(
    () => createApiSightingReportPublishHandler({ client: trpcClient }),
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
              bottom: Math.max(insets.bottom, 12) + 92,
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

      <ShellFirstRunTourHost
        isSuppressed={Boolean(state.authPrompt)}
        store={firstRunTourStore}
      />

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
          onRequestPasswordReset: requestPasswordResetFromPrompt,
          onSignIn: signInFromPrompt,
          onSignInWithSocialProvider: signInWithSocialProviderFromPrompt,
        }}
        copy={{
          authFailedLabel: copy.authPrompt.authFailed,
          closeLabel: copy.shell.close,
          createAccountHelp: copy.authPrompt.createAccountHelp,
          createAccountLabel: copy.authPrompt.createAccount,
          createAccountPendingLabel: copy.authPrompt.creatingAccount,
          continueAsVisitorLabel: copy.authPrompt.continueAsVisitor,
          emailLabel: copy.authPrompt.emailLabel,
          emailPlaceholder: copy.authPrompt.emailPlaceholder,
          formHelp: copy.authPrompt.formHelp,
          missingCredentialsLabel: copy.authPrompt.missingCredentials,
          missingNameLabel: copy.authPrompt.missingName,
          nameLabel: copy.authPrompt.nameLabel,
          namePlaceholder: copy.authPrompt.namePlaceholder,
          passwordLabel: copy.authPrompt.passwordLabel,
          passwordPlaceholder: copy.authPrompt.passwordPlaceholder,
          passwordResetBackLabel: copy.authPrompt.passwordResetBack,
          passwordResetHelp: copy.authPrompt.passwordResetHelp,
          passwordResetLabel: copy.authPrompt.passwordReset,
          passwordResetPendingLabel: copy.authPrompt.passwordResetPending,
          passwordResetSubmitLabel: copy.authPrompt.passwordResetSubmit,
          passwordResetSuccessLabel: copy.authPrompt.passwordResetSuccess,
          signInLabel: copy.authPrompt.signIn,
          signInModeLabel: copy.authPrompt.signInMode,
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
        onPublishSightingReport={publishSightingReport}
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

export function shouldDisplayShellFirstRunTour({
  isSuppressed,
  isVisible,
  shouldShow,
}: {
  isSuppressed: boolean;
  isVisible: boolean;
  shouldShow: boolean;
}) {
  return isVisible && shouldShow && !isSuppressed;
}

export function shouldDisplayGlobalReportFab({
  isAuthPromptVisible,
  segments,
  sessionKind,
}: {
  isAuthPromptVisible: boolean;
  segments: readonly string[];
  sessionKind: "member" | "visitor";
}) {
  if (!shouldShowGlobalFabForSegments(segments)) {
    return false;
  }

  return !(
    sessionKind === "visitor" &&
    !isAuthPromptVisible &&
    segments.includes("(activity)")
  );
}

function ShellFirstRunTourHost({
  isSuppressed,
  store,
}: {
  isSuppressed: boolean;
  store: ShellFirstRunTourStore;
}) {
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
      visible={shouldDisplayShellFirstRunTour({
        isSuppressed,
        isVisible,
        shouldShow: tourModel.shouldShow,
      })}
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
  onPublishSightingReport,
  session,
  visible,
}: {
  draftScopeId?: string;
  draftStore?: ReturnType<typeof createCreationDraftStore>;
  onClose: () => void;
  onPublishSightingReport?: React.ComponentProps<
    typeof SightingReportCreationScreen
  >["onPublishSightingReport"];
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
        onPublishSightingReport={onPublishSightingReport}
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
    onRequestPasswordReset: (email: string) => Promise<ShellAuthActionResult>;
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
    createAccountHelp: string;
    createAccountLabel: string;
    createAccountPendingLabel: string;
    continueAsVisitorLabel: string;
    emailLabel: string;
    emailPlaceholder: string;
    formHelp: string;
    missingCredentialsLabel: string;
    missingNameLabel: string;
    nameLabel: string;
    namePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordResetBackLabel: string;
    passwordResetHelp: string;
    passwordResetLabel: string;
    passwordResetPendingLabel: string;
    passwordResetSubmitLabel: string;
    passwordResetSuccessLabel: string;
    signInLabel: string;
    signInModeLabel: string;
    signInPendingLabel: string;
    socialAuthHelp: string;
    socialProviderPendingLabel: (providerLabel: string) => string;
  };
  prompt: ShellAuthPrompt | null;
  socialProviderActions: ShellSocialAuthAction[];
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const promptState = useSignInPromptState({
    authFailedLabel: copy.authFailedLabel,
    missingCredentialsLabel: copy.missingCredentialsLabel,
    missingNameLabel: copy.missingNameLabel,
    onCreateAccount: actions.onCreateAccount,
    onRequestPasswordReset: actions.onRequestPasswordReset,
    onSignIn: actions.onSignIn,
    onSignInWithSocialProvider: actions.onSignInWithSocialProvider,
    passwordResetSuccessLabel: copy.passwordResetSuccessLabel,
    prompt,
  });
  const isSubmitting = promptState.pendingAction !== null;
  const isCreateAccountMode = promptState.mode === "create-account";
  const isPasswordResetMode = promptState.mode === "password-reset";
  const promptHelp = isCreateAccountMode
    ? copy.createAccountHelp
    : isPasswordResetMode
      ? copy.passwordResetHelp
      : copy.formHelp;
  const promptTopInset = Math.max(safeAreaInsets.top, 16);
  const promptBottomInset = Math.max(bottomInset, 16);

  return (
    <Modal
      animationType="slide"
      onRequestClose={actions.onClose}
      presentationStyle="fullScreen"
      transparent={false}
      visible={Boolean(prompt)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.promptBackdrop}
      >
        <View
          pointerEvents="box-none"
          style={[
            styles.promptNavigationHeader,
            {
              paddingHorizontal: 18,
              paddingTop: promptTopInset + 10,
            },
          ]}
        >
          <Pressable
            accessibilityLabel={copy.closeLabel}
            accessibilityRole="button"
            onPress={actions.onClose}
            style={styles.promptNavigationButton}
          >
            <PromptBackIcon />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.promptScrollContent,
            {
              paddingBottom: promptBottomInset + 24,
              paddingTop: promptTopInset + 66,
            },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{
            bottom: promptBottomInset + 16,
          }}
        >
          <View accessibilityViewIsModal style={styles.promptCard}>
            <View style={styles.promptHeroFrame}>
              <Image
                accessibilityLabel="Ilustración de una persona con un perro y un gato en un mapa de alertas"
                accessibilityRole="image"
                contentFit="cover"
                source={authWelcomeIllustration}
                style={styles.promptHeroImage}
                testID="auth-welcome-illustration"
              />
            </View>
            <Text maxFontSizeMultiplier={1.2} style={styles.promptTitle}>
              {prompt?.title}
            </Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.promptBody}>
              {prompt?.body}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={styles.promptHelp}>
              {promptHelp}
            </Text>

            {!isPasswordResetMode ? (
              <PromptSocialProviders
                actions={socialProviderActions}
                disabled={isSubmitting}
                helpLabel={copy.socialAuthHelp}
                onSubmit={promptState.submitSocialProviderAction}
                pendingAction={promptState.pendingAction}
                pendingLabel={copy.socialProviderPendingLabel}
              />
            ) : null}

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
              {!isPasswordResetMode ? (
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
              ) : null}
              {isCreateAccountMode ? (
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
              ) : null}
            </View>

            {promptState.mode === "sign-in" ? (
              <Pressable
                accessibilityLabel={copy.passwordResetLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={promptState.openPasswordResetMode}
                style={styles.promptTextButton}
              >
                <Text
                  maxFontSizeMultiplier={1.15}
                  style={styles.promptTextButtonLabel}
                >
                  {copy.passwordResetLabel}
                </Text>
              </Pressable>
            ) : null}

            {promptState.authError ? (
              <Text
                accessibilityRole="alert"
                maxFontSizeMultiplier={1.2}
                style={styles.promptError}
              >
                {promptState.authError}
              </Text>
            ) : null}

            {promptState.authSuccess ? (
              <Text
                accessibilityRole="alert"
                maxFontSizeMultiplier={1.2}
                style={styles.promptSuccess}
              >
                {promptState.authSuccess}
              </Text>
            ) : null}

            <PromptActions
              continueAsVisitorLabel={copy.continueAsVisitorLabel}
              createAccountLabel={copy.createAccountLabel}
              createAccountPendingLabel={copy.createAccountPendingLabel}
              isSubmitting={isSubmitting}
              mode={promptState.mode}
              onContinueAsVisitor={actions.onContinueAsVisitor}
              onOpenCreateAccountMode={promptState.openCreateAccountMode}
              onOpenSignInMode={promptState.openSignInMode}
              onSubmitPasswordReset={promptState.submitPasswordReset}
              onSubmitAuthAction={promptState.submitAuthAction}
              passwordResetBackLabel={copy.passwordResetBackLabel}
              passwordResetPendingLabel={copy.passwordResetPendingLabel}
              passwordResetSubmitLabel={copy.passwordResetSubmitLabel}
              pendingAction={promptState.pendingAction}
              signInLabel={copy.signInLabel}
              signInModeLabel={copy.signInModeLabel}
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
  missingNameLabel: string;
  onCreateAccount: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  onRequestPasswordReset: (email: string) => Promise<ShellAuthActionResult>;
  onSignIn: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  onSignInWithSocialProvider: (
    provider: ShellSocialAuthProvider,
  ) => Promise<ShellAuthActionResult>;
  passwordResetSuccessLabel: string;
  prompt: ShellAuthPrompt | null;
}

function useSignInPromptState({
  authFailedLabel,
  missingCredentialsLabel,
  missingNameLabel,
  onCreateAccount,
  onRequestPasswordReset,
  onSignIn,
  onSignInWithSocialProvider,
  passwordResetSuccessLabel,
  prompt,
}: SignInPromptStateInput) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mode, setMode] = React.useState<ShellAuthPromptMode>("sign-in");
  const [authError, setAuthError] = React.useState<string | null | undefined>(
    undefined,
  );
  const [authSuccess, setAuthSuccess] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    React.useState<ShellAuthPromptPendingAction | null>(null);

  React.useEffect(() => {
    if (!prompt) {
      setAuthError(undefined);
      setEmail("");
      setName("");
      setPassword("");
      setMode("sign-in");
      setPendingAction(null);
      setAuthSuccess(null);
      return;
    }

    setAuthError(undefined);
    setAuthSuccess(null);
    setMode("sign-in");
  }, [prompt]);

  const submitAuthAction = React.useCallback(
    async (action: ShellAuthPromptAction) => {
      const prepared = prepareShellAuthCredentialsForAction({
        action,
        email,
        name,
        password,
      });

      if (!prepared.ok) {
        setAuthError(
          prepared.reason === "missing-name"
            ? missingNameLabel
            : missingCredentialsLabel,
        );
        return;
      }

      setAuthError(null);
      setAuthSuccess(null);
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
      missingNameLabel,
      name,
      onCreateAccount,
      onSignIn,
      password,
    ],
  );

  const submitPasswordReset = React.useCallback(async () => {
    const prepared = prepareShellPasswordResetEmail(email);

    if (!prepared.ok) {
      setAuthSuccess(null);
      setAuthError(missingCredentialsLabel);
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setPendingAction("password-reset");

    const result = await onRequestPasswordReset(prepared.email);

    setPendingAction(null);

    if (result.ok) {
      setAuthSuccess(passwordResetSuccessLabel);
      return;
    }

    setAuthError(result.message ?? authFailedLabel);
  }, [
    authFailedLabel,
    email,
    missingCredentialsLabel,
    onRequestPasswordReset,
    passwordResetSuccessLabel,
  ]);

  const submitSocialProviderAction = React.useCallback(
    async (action: ShellSocialAuthAction) => {
      setAuthError(null);
      setAuthSuccess(null);
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
    authError: authError === undefined ? (prompt?.error ?? null) : authError,
    authSuccess,
    email,
    mode,
    name,
    openCreateAccountMode: () => {
      setAuthError(null);
      setAuthSuccess(null);
      setMode("create-account");
    },
    openPasswordResetMode: () => {
      setAuthError(null);
      setAuthSuccess(null);
      setMode("password-reset");
    },
    openSignInMode: () => {
      setAuthError(null);
      setAuthSuccess(null);
      setMode("sign-in");
    },
    password,
    pendingAction,
    setEmail,
    setName,
    setPassword,
    submitAuthAction,
    submitPasswordReset,
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
  mode,
  onContinueAsVisitor,
  onOpenCreateAccountMode,
  onOpenSignInMode,
  onSubmitPasswordReset,
  onSubmitAuthAction,
  passwordResetBackLabel,
  passwordResetPendingLabel,
  passwordResetSubmitLabel,
  pendingAction,
  signInLabel,
  signInModeLabel,
  signInPendingLabel,
}: PromptActionsProps) {
  if (mode === "password-reset") {
    return (
      <PromptPasswordResetActions
        continueAsVisitorLabel={continueAsVisitorLabel}
        isSubmitting={isSubmitting}
        onContinueAsVisitor={onContinueAsVisitor}
        onOpenSignInMode={onOpenSignInMode}
        onSubmitPasswordReset={onSubmitPasswordReset}
        passwordResetBackLabel={passwordResetBackLabel}
        passwordResetPendingLabel={passwordResetPendingLabel}
        passwordResetSubmitLabel={passwordResetSubmitLabel}
        pendingAction={pendingAction}
      />
    );
  }

  return (
    <PromptEmailAuthActions
      continueAsVisitorLabel={continueAsVisitorLabel}
      createAccountLabel={createAccountLabel}
      createAccountPendingLabel={createAccountPendingLabel}
      isSubmitting={isSubmitting}
      mode={mode}
      onContinueAsVisitor={onContinueAsVisitor}
      onOpenCreateAccountMode={onOpenCreateAccountMode}
      onOpenSignInMode={onOpenSignInMode}
      onSubmitAuthAction={onSubmitAuthAction}
      pendingAction={pendingAction}
      signInLabel={signInLabel}
      signInModeLabel={signInModeLabel}
      signInPendingLabel={signInPendingLabel}
    />
  );
}

interface PromptActionsProps {
  continueAsVisitorLabel: string;
  createAccountLabel: string;
  createAccountPendingLabel: string;
  isSubmitting: boolean;
  mode: ShellAuthPromptMode;
  onContinueAsVisitor: () => void;
  onOpenCreateAccountMode: () => void;
  onOpenSignInMode: () => void;
  onSubmitPasswordReset: () => Promise<void>;
  onSubmitAuthAction: (action: ShellAuthPromptAction) => Promise<void>;
  passwordResetBackLabel: string;
  passwordResetPendingLabel: string;
  passwordResetSubmitLabel: string;
  pendingAction: ShellAuthPromptPendingAction | null;
  signInLabel: string;
  signInModeLabel: string;
  signInPendingLabel: string;
}

function PromptEmailAuthActions({
  continueAsVisitorLabel,
  createAccountLabel,
  createAccountPendingLabel,
  isSubmitting,
  mode,
  onContinueAsVisitor,
  onOpenCreateAccountMode,
  onOpenSignInMode,
  onSubmitAuthAction,
  pendingAction,
  signInLabel,
  signInModeLabel,
  signInPendingLabel,
}: Pick<
  PromptActionsProps,
  | "continueAsVisitorLabel"
  | "createAccountLabel"
  | "createAccountPendingLabel"
  | "isSubmitting"
  | "mode"
  | "onContinueAsVisitor"
  | "onOpenCreateAccountMode"
  | "onOpenSignInMode"
  | "onSubmitAuthAction"
  | "pendingAction"
  | "signInLabel"
  | "signInModeLabel"
  | "signInPendingLabel"
>) {
  const isCreateAccountMode = mode === "create-account";

  return (
    <View style={styles.promptActions}>
      <PromptActionButton
        disabled={isSubmitting}
        label={
          isCreateAccountMode
            ? pendingAction === "create-account"
              ? createAccountPendingLabel
              : createAccountLabel
            : pendingAction === "sign-in"
              ? signInPendingLabel
              : signInLabel
        }
        onPress={() => {
          void onSubmitAuthAction(
            isCreateAccountMode ? "create-account" : "sign-in",
          );
        }}
        variant="primary"
      />
      <PromptActionButton
        disabled={isSubmitting}
        label={isCreateAccountMode ? signInModeLabel : createAccountLabel}
        onPress={
          isCreateAccountMode ? onOpenSignInMode : onOpenCreateAccountMode
        }
        variant="secondary"
      />
      <Pressable
        accessibilityLabel={continueAsVisitorLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        disabled={isSubmitting}
        onPress={onContinueAsVisitor}
        style={styles.visitorLinkButton}
      >
        <Text maxFontSizeMultiplier={1.2} style={styles.visitorLink}>
          {continueAsVisitorLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function PromptPasswordResetActions({
  continueAsVisitorLabel,
  isSubmitting,
  onContinueAsVisitor,
  onOpenSignInMode,
  onSubmitPasswordReset,
  passwordResetBackLabel,
  passwordResetPendingLabel,
  passwordResetSubmitLabel,
  pendingAction,
}: Pick<
  PromptActionsProps,
  | "continueAsVisitorLabel"
  | "isSubmitting"
  | "onContinueAsVisitor"
  | "onOpenSignInMode"
  | "onSubmitPasswordReset"
  | "passwordResetBackLabel"
  | "passwordResetPendingLabel"
  | "passwordResetSubmitLabel"
  | "pendingAction"
>) {
  return (
    <View style={styles.promptActions}>
      <PromptActionButton
        disabled={isSubmitting}
        label={
          pendingAction === "password-reset"
            ? passwordResetPendingLabel
            : passwordResetSubmitLabel
        }
        onPress={() => {
          void onSubmitPasswordReset();
        }}
        variant="primary"
      />
      <PromptActionButton
        disabled={isSubmitting}
        label={passwordResetBackLabel}
        onPress={onOpenSignInMode}
        variant="secondary"
      />
      <Pressable
        accessibilityLabel={continueAsVisitorLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        disabled={isSubmitting}
        onPress={onContinueAsVisitor}
        style={styles.visitorLinkButton}
      >
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
  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialProviderButton,
        { opacity: disabled ? 0.58 : pressed ? 0.84 : 1 },
      ]}
    >
      <SocialProviderMark provider={action.provider} />
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

function PromptBackIcon() {
  return (
    <View accessible={false} style={styles.promptBackIcon}>
      <View style={[styles.promptBackIconStroke, styles.promptBackIconTop]} />
      <View
        style={[styles.promptBackIconStroke, styles.promptBackIconBottom]}
      />
    </View>
  );
}

function SocialProviderMark({
  provider,
}: {
  provider: ShellSocialAuthProvider;
}) {
  const isGoogle = provider === "google";

  return (
    <View
      accessible={false}
      style={[
        styles.socialProviderMark,
        isGoogle
          ? styles.socialProviderMarkGoogle
          : styles.socialProviderMarkFacebook,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1}
        style={[
          styles.socialProviderMarkText,
          isGoogle
            ? styles.socialProviderMarkTextGoogle
            : styles.socialProviderMarkTextFacebook,
        ]}
      >
        {isGoogle ? "G" : "f"}
      </Text>
    </View>
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
  iconColor?: string;
  iconName?: string;
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
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        buttonStyle,
        { opacity: disabled ? 0.58 : pressed ? 0.84 : 1 },
      ]}
    >
      {iconName ? (
        <ShellIcon
          name={iconName}
          color={iconColor ?? shellColors.primary}
          size={20}
        />
      ) : null}
      <Text maxFontSizeMultiplier={1.2} style={textStyle}>
        {label}
      </Text>
    </Pressable>
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
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryPromptButtonText: {
    color: shellColors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  promptActions: {
    alignSelf: "stretch",
    gap: 10,
    marginTop: 4,
  },
  promptBackdrop: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  promptScrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  promptBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  promptCard: {
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 8,
    maxWidth: 460,
    paddingHorizontal: 2,
    width: "100%",
  },
  promptBackIcon: {
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  promptBackIconBottom: {
    top: 13,
    transform: [{ rotate: "45deg" }],
  },
  promptBackIconStroke: {
    backgroundColor: shellColors.primary,
    borderRadius: 2,
    height: 3,
    left: 4,
    position: "absolute",
    width: 14,
  },
  promptBackIconTop: {
    top: 6,
    transform: [{ rotate: "-45deg" }],
  },
  promptNavigationButton: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  promptNavigationHeader: {
    alignItems: "flex-start",
    left: 0,
    paddingBottom: 8,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  promptHeroFrame: {
    alignSelf: "stretch",
    backgroundColor: shellColors.surface,
    borderColor: "#D6E9E1",
    borderRadius: 28,
    borderWidth: 1,
    boxShadow: "0 14px 30px rgba(23, 32, 28, 0.10)",
    height: 118,
    overflow: "hidden",
  },
  promptHeroImage: {
    height: "100%",
    width: "100%",
  },
  promptIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 30,
    height: 48,
    justifyContent: "center",
    marginTop: 4,
    width: 48,
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
    minHeight: 50,
    paddingHorizontal: 14,
  },
  promptLabel: {
    color: shellColors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  promptTitle: {
    color: shellColors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
    textAlign: "center",
  },
  promptSuccess: {
    alignSelf: "stretch",
    backgroundColor: "#EAF7EF",
    borderColor: "#B7DFC5",
    borderRadius: 16,
    borderWidth: 1,
    color: "#1F6B3A",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    padding: 12,
  },
  promptTextButton: {
    alignSelf: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
  },
  promptTextButtonLabel: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
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
    minHeight: 52,
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
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  socialProviderButtonText: {
    color: shellColors.text,
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
  socialProviderMark: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  socialProviderMarkFacebook: {
    backgroundColor: "#1877F2",
  },
  socialProviderMarkGoogle: {
    backgroundColor: shellColors.surface,
    borderColor: "#DADCE0",
    borderWidth: 1,
  },
  socialProviderMarkText: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20,
  },
  socialProviderMarkTextFacebook: {
    color: shellColors.white,
  },
  socialProviderMarkTextGoogle: {
    color: "#4285F4",
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
    textAlign: "center",
    textDecorationLine: "underline",
  },
  visitorLinkButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
});
