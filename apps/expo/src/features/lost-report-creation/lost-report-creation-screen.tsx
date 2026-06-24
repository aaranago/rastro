import type { ScrollView } from "react-native";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { PublishLostPetReportInput } from "../lost-reports/lost-reports";
import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type {
  ReportCreationJourney,
  ReportCreationJourneyStepId,
} from "../report-creation/report-creation-journey";
import type { ReportCreationFieldViewModel } from "../report-creation/report-creation-ui";
import type {
  ReportMediaDraftSnapshot,
  ReportMediaStepController,
} from "../report-media";
import type { CreationDraftStore } from "../resilience/creation-drafts";
import type {
  DurableCreationDraftPersistence,
  DurableCreationDraftRecovery,
} from "../resilience/use-durable-creation-draft";
import type {
  LostReportDraft,
  LostReportPetProfileOption,
  LostReportPhoto,
} from "./lost-report-creation-types";
import type {
  LostReportCreationJourneyInput,
  LostReportCreationValidationDisplayInput,
} from "./lost-report-creation-view-model";
import {
  advanceReportCreationJourney,
  retreatReportCreationJourney,
} from "../report-creation/report-creation-journey";
import { publishReportCreation } from "../report-creation/report-creation-publish";
import {
  ReportCreationActionButton,
  ReportCreationContactOptionSection,
  ReportCreationDateTimeField,
  ReportCreationDraftPersistenceAlert,
  ReportCreationDraftRecoveryPrompt,
  ReportCreationErrorText,
  ReportCreationExistingPetProfileList,
  ReportCreationField,
  ReportCreationInfoRow,
  ReportCreationInlinePetTypeRow,
  ReportCreationLocationPreview,
  ReportCreationProgressSteps,
  ReportCreationReviewPublishSection,
  ReportCreationScreenFrame,
  ReportCreationSection,
  ReportCreationToggleRow,
  useReportCreationPublishedResultActions,
} from "../report-creation/report-creation-ui";
import { ReportLocationPickerScreen } from "../report-location-picker";
import { useReportLocationPickerDraft } from "../report-location-picker/use-report-location-picker";
import { reportMediaSnapshotToCreationPhotos } from "../report-media";
import { useDurableCreationDraft } from "../resilience/use-durable-creation-draft";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import { lostReportCreationFixtures } from "./lost-report-creation-fixtures";
import {
  appendLostReportPhoto,
  buildLostReportCreationViewModel,
  createInitialLostReportDraft,
  lostReportPetTypeOptions,
  removeLostReportPhoto,
  selectLostReportContactOption,
  toPublishLostPetReportInput,
} from "./lost-report-creation-view-model";

function ReportCreationIcon({
  color,
  name,
  size = 22,
}: {
  color: string;
  name: string;
  size?: number;
}) {
  return <ShellIcon color={color} name={name} size={size} />;
}

export interface LostReportCreationScreenProps {
  draftScopeId?: string;
  draftStore?: CreationDraftStore;
  initialDraft?: LostReportDraft;
  locationAdapter?: NearbyLocationAdapter;
  onChooseLostLocation?: () => void;
  onClose?: () => void;
  onDraftPublished?: () => void;
  onOpenPublishedReport?: (confirmation: LostReportPublishConfirmation) => void;
  onOpenSponsorPlacement?: (sponsorPlacementId: string) => void;
  onPublishLostReport?: (
    input: PublishLostPetReportInput,
  ) =>
    | LostReportPublishConfirmation
    | Promise<LostReportPublishConfirmation | void>
    | void;
  onReportSponsorPlacement?: (sponsorPlacementId: string) => void;
  onSharePublishedReport?: (
    confirmation: LostReportPublishConfirmation,
  ) => Promise<void> | void;
  petProfiles?: readonly LostReportPetProfileOption[];
  pickLostReportPhoto?: () =>
    | LostReportPhoto
    | Promise<LostReportPhoto | undefined>
    | undefined;
  renderReportMediaManager?: (props: {
    mediaDraftId: string;
    onControllerChange?: (controller: ReportMediaStepController | null) => void;
    onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
    photos: readonly LostReportPhoto[];
  }) => React.ReactNode;
}

type PublishState = "editing" | "publishing" | "success";
export interface LostReportPublishConfirmation {
  id: string;
  status: string;
}
type LostReportCreationViewModel = ReturnType<
  typeof buildLostReportCreationViewModel
>;

export function LostReportCreationScreen({
  draftScopeId,
  draftStore,
  initialDraft,
  locationAdapter,
  onChooseLostLocation,
  onClose,
  onDraftPublished,
  onOpenPublishedReport,
  onOpenSponsorPlacement,
  onPublishLostReport,
  onReportSponsorPlacement,
  onSharePublishedReport,
  petProfiles = [],
  pickLostReportPhoto,
  renderReportMediaManager,
}: LostReportCreationScreenProps) {
  const defaultDraft = React.useMemo(
    () => initialDraft ?? createInitialLostReportDraft({ petProfiles }),
    [initialDraft, petProfiles],
  );
  const {
    clearDraft,
    discardDraft,
    draft,
    draftPersistence,
    draftRecovery,
    draftResetVersion,
    hasLoaded,
    restoredDraft,
    resumeDraft,
    setDraft,
  } = useDurableCreationDraft({
    initialDraft: defaultDraft,
    kind: "lost-report",
    recoveryMode: "explicit",
    scopeId: draftScopeId,
    store: draftStore,
  });
  const [journey, setJourney] = React.useState<LostReportCreationJourneyInput>(
    () =>
      toLostReportJourneyInput(
        buildLostReportCreationViewModel({
          draft,
          petProfiles,
          validationDisplay: {},
        }).journey,
      ),
  );
  const [validationDisplay, setValidationDisplay] =
    React.useState<LostReportCreationValidationDisplayInput>({});
  const [publishState, setPublishState] =
    React.useState<PublishState>("editing");
  const [publishedReport, setPublishedReport] =
    React.useState<LostReportPublishConfirmation | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const publishLockRef = React.useRef(false);
  const journeyResetSource = hasLoaded
    ? `${restoredDraft?.savedAt ?? "fresh"}:${draftResetVersion}`
    : "loading";
  const journeyResetSourceRef = React.useRef<unknown>(journeyResetSource);

  React.useEffect(() => {
    if (journeyResetSourceRef.current === journeyResetSource) {
      return;
    }

    journeyResetSourceRef.current = journeyResetSource;
    setJourney(
      toLostReportJourneyInput(
        buildLostReportCreationViewModel({
          draft,
          petProfiles,
          validationDisplay: {},
        }).journey,
      ),
    );
    setValidationDisplay({});
  }, [draft, journeyResetSource, petProfiles]);

  const viewModel = React.useMemo(
    () =>
      buildLostReportCreationViewModel({
        draft,
        journey,
        petProfiles,
        validationDisplay,
      }),
    [draft, journey, petProfiles, validationDisplay],
  );

  const addPhoto = React.useCallback(async () => {
    if (pickLostReportPhoto) {
      const pickedPhoto = await pickLostReportPhoto();

      if (!pickedPhoto) {
        return;
      }

      setDraft((current) =>
        appendLostReportPhoto({
          draft: current,
          photo: pickedPhoto,
        }),
      );
      return;
    }

    const nextPhoto =
      lostReportCreationFixtures.photoSamples[draft.photos.length] ??
      createFallbackPhoto(draft.photos.length);

    setDraft((current) =>
      appendLostReportPhoto({
        draft: current,
        photo: nextPhoto,
      }),
    );
  }, [draft.photos.length, pickLostReportPhoto, setDraft]);
  const {
    closeLocationPicker,
    confirmLocation,
    isLocationPickerVisible,
    openLocationPicker,
  } = useReportLocationPickerDraft({
    applyLocation: (current, location) => ({
      ...current,
      exactLocation: location,
    }),
    locationAdapter,
    onChooseLocation: onChooseLostLocation,
    setDraft,
  });

  const publish = React.useCallback(async () => {
    if (!viewModel.canPublish || publishState === "publishing") {
      return;
    }

    setSubmitError(null);
    setPublishedReport(null);
    setPublishState("publishing");

    const result = await publishReportCreation({
      clearDraft,
      input: toPublishLostPetReportInput({
        draft,
        petProfiles,
      }),
      publishHandler: onPublishLostReport,
      publishLock: publishLockRef,
    });

    if (result.ok) {
      setPublishedReport(result.confirmation ?? null);
      onDraftPublished?.();
      setPublishState("success");
      return;
    }

    if (result.reason === "already-publishing") {
      return;
    }

    setSubmitError(result.message);
    setPublishState("editing");
  }, [
    clearDraft,
    draft,
    onDraftPublished,
    onPublishLostReport,
    petProfiles,
    publishState,
    viewModel,
  ]);

  if (isLocationPickerVisible && locationAdapter) {
    return (
      <ReportLocationPickerScreen
        adapter={locationAdapter}
        initialDepartment={draft.exactLocation?.department}
        initialMapCoordinate={draft.exactLocation?.coordinates}
        onCancel={closeLocationPicker}
        onConfirm={confirmLocation}
      />
    );
  }

  if (publishState === "success") {
    return (
      <LostReportCreationSuccess
        onClose={onClose}
        onOpenPublishedReport={onOpenPublishedReport}
        onOpenSponsorPlacement={onOpenSponsorPlacement}
        onReportSponsorPlacement={onReportSponsorPlacement}
        onSharePublishedReport={onSharePublishedReport}
        publishedReport={publishedReport}
        viewModel={viewModel}
      />
    );
  }

  return (
    <LostReportCreationEditor
      addPhoto={addPhoto}
      draft={draft}
      draftPersistence={draftPersistence}
      draftRecovery={draftRecovery}
      onDiscardRecoveredDraft={discardDraft}
      onChooseLocation={openLocationPicker}
      onClose={onClose}
      onResumeRecoveredDraft={resumeDraft}
      petProfiles={petProfiles}
      publish={publish}
      publishState={publishState}
      renderReportMediaManager={renderReportMediaManager}
      setDraft={setDraft}
      setJourney={setJourney}
      setValidationDisplay={setValidationDisplay}
      submitError={submitError}
      validationDisplay={validationDisplay}
      viewModel={viewModel}
    />
  );
}

function LostReportCreationSuccess({
  onClose,
  onOpenPublishedReport,
  onOpenSponsorPlacement,
  onReportSponsorPlacement,
  onSharePublishedReport,
  publishedReport,
  viewModel,
}: {
  onClose?: () => void;
  onOpenPublishedReport?: (confirmation: LostReportPublishConfirmation) => void;
  onOpenSponsorPlacement?: (sponsorPlacementId: string) => void;
  onReportSponsorPlacement?: (sponsorPlacementId: string) => void;
  onSharePublishedReport?: (
    confirmation: LostReportPublishConfirmation,
  ) => Promise<void> | void;
  publishedReport: LostReportPublishConfirmation | null;
  viewModel: LostReportCreationViewModel;
}) {
  const sponsorPlacement = viewModel.success.localSponsorPlacement;
  const { canSharePublishedResult, openPublishedResult, sharePublishedResult } =
    useReportCreationPublishedResultActions({
      onClose,
      onOpenPublishedResult: onOpenPublishedReport,
      onSharePublishedResult: onSharePublishedReport,
      publishedResult: publishedReport,
    });

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <View style={styles.successHero}>
        <View style={styles.successIcon}>
          <ReportCreationIcon
            color={shellColors.white}
            name="checkmark.seal.fill"
            size={34}
          />
        </View>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>
          {viewModel.success.title}
        </Text>
        <Text maxFontSizeMultiplier={1.25} style={styles.bodyText}>
          {viewModel.success.body}
        </Text>
      </View>
      {sponsorPlacement ? (
        <SuccessSponsorPlacement
          onOpen={onOpenSponsorPlacement}
          onReport={onReportSponsorPlacement}
          placement={sponsorPlacement}
        />
      ) : null}
      <View style={styles.buttonRow}>
        <ActionButton
          disabled={!canSharePublishedResult}
          icon="square.and.arrow.up"
          label={viewModel.success.shareActionLabel}
          onPress={sharePublishedResult}
          variant="secondary"
        />
        <ActionButton
          icon="list.bullet.rectangle"
          label={viewModel.success.primaryActionLabel}
          onPress={openPublishedResult}
        />
      </View>
    </ReportCreationScreenFrame>
  );
}

function SuccessSponsorPlacement({
  onOpen,
  onReport,
  placement,
}: {
  onOpen?: (sponsorPlacementId: string) => void;
  onReport?: (sponsorPlacementId: string) => void;
  placement: NonNullable<
    LostReportCreationViewModel["success"]["localSponsorPlacement"]
  >;
}) {
  const openPlacement = React.useCallback(() => {
    onOpen?.(placement.id);
  }, [onOpen, placement.id]);
  const reportPlacement = React.useCallback(() => {
    onReport?.(placement.id);
  }, [onReport, placement.id]);

  return (
    <View style={styles.sponsorPlacement}>
      <View style={styles.sponsorHeader}>
        <View style={styles.sponsorIcon}>
          <ReportCreationIcon
            color={shellColors.primary}
            name="cross.case.fill"
            size={22}
          />
        </View>
        <View style={styles.optionCopy}>
          <View style={styles.sponsorLabelRow}>
            <View style={styles.sponsorPill}>
              <Text maxFontSizeMultiplier={1.1} style={styles.sponsorPillText}>
                {placement.sponsorLabel}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.1} style={styles.sponsorDisclosure}>
              {placement.paidDisclosure}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.15} style={styles.itemTitle}>
            {placement.title}
          </Text>
        </View>
      </View>
      <View style={styles.sponsorCopy}>
        <Text maxFontSizeMultiplier={1.15} style={styles.sponsorName}>
          {placement.name}
        </Text>
        <Text maxFontSizeMultiplier={1.1} style={styles.sponsorCategory}>
          {placement.categoryLabel}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.metaText}>
          {placement.body}
        </Text>
      </View>
      <View style={styles.priorityDisclosure}>
        <ReportCreationIcon
          color={shellColors.primaryDark}
          name="info.circle.fill"
          size={16}
        />
        <Text maxFontSizeMultiplier={1.15} style={styles.priorityText}>
          {placement.recoveryPriorityDisclosure}
        </Text>
      </View>
      <View style={styles.sponsorActions}>
        <Pressable
          accessibilityLabel={`${placement.actionLabel}: ${placement.name}`}
          accessibilityRole="button"
          onPress={openPlacement}
          style={styles.sponsorAction}
        >
          <ReportCreationIcon
            color={shellColors.primary}
            name="arrow.up.right"
            size={14}
          />
          <Text maxFontSizeMultiplier={1.1} style={styles.sponsorActionText}>
            {placement.actionLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${placement.reportActionLabel} ${placement.name}`}
          accessibilityRole="button"
          onPress={reportPlacement}
          style={styles.sponsorReportAction}
        >
          <Text maxFontSizeMultiplier={1.1} style={styles.sponsorReportText}>
            {placement.reportActionLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function LostReportCreationEditor({
  addPhoto,
  draft,
  draftPersistence,
  draftRecovery,
  onDiscardRecoveredDraft,
  onChooseLocation,
  onClose,
  onResumeRecoveredDraft,
  petProfiles,
  publish,
  publishState,
  renderReportMediaManager,
  setDraft,
  setJourney,
  setValidationDisplay,
  submitError,
  validationDisplay,
  viewModel,
}: {
  addPhoto: () => void;
  draft: LostReportDraft;
  draftPersistence: DurableCreationDraftPersistence;
  draftRecovery: DurableCreationDraftRecovery<"lost-report">;
  onDiscardRecoveredDraft: () => Promise<void>;
  onChooseLocation: () => void;
  onClose?: () => void;
  onResumeRecoveredDraft: () => void;
  petProfiles: readonly LostReportPetProfileOption[];
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: LostReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  setJourney: React.Dispatch<
    React.SetStateAction<LostReportCreationJourneyInput>
  >;
  setValidationDisplay: React.Dispatch<
    React.SetStateAction<LostReportCreationValidationDisplayInput>
  >;
  submitError: string | null;
  validationDisplay: LostReportCreationValidationDisplayInput;
  viewModel: LostReportCreationViewModel;
}) {
  const scrollViewRef =
    React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  const mediaControllerRef = React.useRef<ReportMediaStepController | null>(
    null,
  );
  const currentStepId = viewModel.journey.currentStep.id;
  const previousEditableStepId = getPreviousEditableStepId(currentStepId);
  const canContinueCurrentStep = isLostReportContinueStepId(currentStepId);
  const shouldShowStepActions =
    canContinueCurrentStep || currentStepId === "review";
  const locationError =
    validationDisplay.attemptedStepId === "location" && !draft.exactLocation
      ? "Selecciona la ubicacion interna."
      : undefined;
  const scrollToActiveStep = React.useCallback(() => {
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: 0,
    });
  }, []);
  const continueStep = React.useCallback(async () => {
    if (!isLostReportContinueStepId(currentStepId)) {
      return;
    }

    const draftForValidation = await uploadLostReportPhotosBeforeContinue({
      currentStepId,
      draft,
      mediaController: mediaControllerRef.current,
      setDraft,
    });

    if (
      !isCurrentLostReportStepValid({
        draft: draftForValidation,
        journey: viewModel.journey,
        petProfiles,
      })
    ) {
      setValidationDisplay({ attemptedStepId: currentStepId });
      scrollToActiveStep();
      return;
    }

    const result = advanceReportCreationJourney(viewModel.journey);

    if (!result.ok) {
      return;
    }

    setJourney(toLostReportJourneyInput(result.journey));
    setValidationDisplay({});
    scrollToActiveStep();
  }, [
    currentStepId,
    draft,
    petProfiles,
    scrollToActiveStep,
    setDraft,
    setJourney,
    setValidationDisplay,
    viewModel.journey,
  ]);
  const retreatStep = React.useCallback(() => {
    if (!previousEditableStepId) {
      return;
    }

    const result = retreatReportCreationJourney(viewModel.journey);

    if (!result.ok) {
      return;
    }

    setJourney(toLostReportJourneyInput(result.journey));
    setValidationDisplay({});
    scrollToActiveStep();
  }, [
    previousEditableStepId,
    scrollToActiveStep,
    setJourney,
    setValidationDisplay,
    viewModel.journey,
  ]);

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      footer={
        shouldShowStepActions ? (
          <StepActions
            canContinue={canContinueCurrentStep}
            canGoBack={Boolean(previousEditableStepId)}
            onBack={retreatStep}
            onContinue={continueStep}
          />
        ) : undefined
      }
      scrollViewRef={scrollViewRef}
      style={styles.screen}
    >
      <CreationHeader onClose={onClose} title={viewModel.title} />
      <ProgressSteps steps={viewModel.journey.steps} />
      <ReportCreationDraftRecoveryPrompt
        draftRecovery={draftRecovery}
        onDiscardDraft={onDiscardRecoveredDraft}
        onResumeDraft={onResumeRecoveredDraft}
      />
      <ReportCreationDraftPersistenceAlert
        draftPersistence={draftPersistence}
      />
      <LostReportCurrentStepContent
        addPhoto={addPhoto}
        currentStepId={currentStepId}
        draft={draft}
        locationError={locationError}
        onChooseLocation={onChooseLocation}
        onMediaControllerChange={(controller) => {
          mediaControllerRef.current = controller;
        }}
        publish={publish}
        publishState={publishState}
        renderReportMediaManager={renderReportMediaManager}
        setDraft={setDraft}
        submitError={submitError}
        viewModel={viewModel}
      />
    </ReportCreationScreenFrame>
  );
}

function LostReportCurrentStepContent({
  addPhoto,
  currentStepId,
  draft,
  locationError,
  onChooseLocation,
  onMediaControllerChange,
  publish,
  publishState,
  renderReportMediaManager,
  setDraft,
  submitError,
  viewModel,
}: {
  addPhoto: () => void;
  currentStepId: ReportCreationJourneyStepId;
  draft: LostReportDraft;
  locationError?: string;
  onChooseLocation: () => void;
  onMediaControllerChange?: (
    controller: ReportMediaStepController | null,
  ) => void;
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: LostReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  submitError: string | null;
  viewModel: LostReportCreationViewModel;
}) {
  switch (currentStepId) {
    case "photos":
      return (
        <PhotoSection
          addPhoto={addPhoto}
          mediaDraftId={draft.id}
          onMediaControllerChange={onMediaControllerChange}
          renderReportMediaManager={renderReportMediaManager}
          setDraft={setDraft}
          viewModel={viewModel}
        />
      );
    case "details":
      return (
        <>
          <PetProfileSection
            draft={draft}
            setDraft={setDraft}
            viewModel={viewModel}
          />
          <LostDetailsSection setDraft={setDraft} viewModel={viewModel} />
        </>
      );
    case "location":
      return (
        <LocationPrivacySection
          coordinates={draft.exactLocation?.coordinates}
          error={locationError}
          onChooseLocation={onChooseLocation}
          setDraft={setDraft}
          viewModel={viewModel}
        />
      );
    case "contact":
      return <ContactOptionSection setDraft={setDraft} viewModel={viewModel} />;
    case "review":
      return (
        <ReviewPublishSection
          publish={publish}
          publishState={publishState}
          submitError={submitError}
          viewModel={viewModel}
        />
      );
    default:
      return null;
  }
}

async function uploadLostReportPhotosBeforeContinue({
  currentStepId,
  draft,
  mediaController,
  setDraft,
}: {
  currentStepId: ReportCreationJourneyStepId;
  draft: LostReportDraft;
  mediaController: ReportMediaStepController | null;
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
}) {
  if (currentStepId !== "photos" || !mediaController) {
    return draft;
  }

  const uploadedSnapshot = await mediaController.uploadPendingImages();
  const uploadedPhotos = reportMediaSnapshotToCreationPhotos(uploadedSnapshot);

  setDraft((current) => ({
    ...current,
    photos: uploadedPhotos,
  }));

  return {
    ...draft,
    photos: uploadedPhotos,
  };
}

function StepActions({
  canContinue,
  canGoBack,
  onBack,
  onContinue,
}: {
  canContinue: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.buttonRow}>
      {canGoBack ? (
        <ActionButton
          icon="chevron.left"
          label="Atrás"
          onPress={onBack}
          variant="secondary"
        />
      ) : null}
      {canContinue ? (
        <ActionButton
          icon="arrow.right"
          label="Continuar"
          onPress={onContinue}
        />
      ) : null}
    </View>
  );
}

function CreationHeader({
  onClose,
  title,
}: {
  onClose?: () => void;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerIcon}>
        <ReportCreationIcon
          color={shellColors.white}
          name="megaphone.fill"
          size={24}
        />
      </View>
      <View style={styles.headerCopy}>
        <Text maxFontSizeMultiplier={1.15} style={styles.eyebrow}>
          Mascota perdida
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>
          {title}
        </Text>
      </View>
      {onClose ? (
        <Pressable
          accessibilityLabel="Volver del reporte perdido"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.iconButton}
        >
          <ReportCreationIcon
            color={shellColors.muted}
            name="xmark"
            size={18}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function PetProfileSection({
  draft,
  setDraft,
  viewModel,
}: {
  draft: LostReportDraft;
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  viewModel: LostReportCreationViewModel;
}) {
  return (
    <Section title="Mascota">
      <SegmentedChoice
        options={[
          { label: "Usar perfil", value: "existing" },
          { label: "Crear aqui", value: "inline-create" },
        ]}
        selectedValue={draft.petSelectionMode}
        onSelect={(value) =>
          setDraft((current) => ({
            ...current,
            petSelectionMode: value as LostReportDraft["petSelectionMode"],
          }))
        }
      />
      {draft.petSelectionMode === "existing" ? (
        <ExistingPetProfileList setDraft={setDraft} viewModel={viewModel} />
      ) : (
        <InlinePetForm
          draft={draft}
          setDraft={setDraft}
          viewModel={viewModel}
        />
      )}
    </Section>
  );
}

function ExistingPetProfileList({
  setDraft,
  viewModel,
}: {
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  viewModel: LostReportCreationViewModel;
}) {
  return (
    <ReportCreationExistingPetProfileList
      accentColor={shellColors.primary}
      Icon={ReportCreationIcon}
      onSelectProfile={(profileId) =>
        setDraft((current) => ({
          ...current,
          petProfileId: profileId,
          petSelectionMode: "existing",
        }))
      }
      options={viewModel.petSelection.options}
      styles={styles}
    />
  );
}

function LostDetailsSection({
  setDraft,
  viewModel,
}: {
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  viewModel: LostReportCreationViewModel;
}) {
  return (
    <Section title={viewModel.lostDetails.title}>
      <ReportCreationDateTimeField
        accentColor={shellColors.primary}
        field={viewModel.lostDetails.fields.lastSeenAtLabel}
        onChangeDateTime={(value) =>
          setDraft((current) => ({
            ...current,
            lostDetails: {
              ...current.lostDetails,
              lastSeenAtLabel: value,
            },
          }))
        }
        placeholderTextColor={shellColors.muted}
        styles={styles}
      />
      <Field
        multiline
        field={viewModel.lostDetails.fields.circumstances}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            lostDetails: {
              ...current.lostDetails,
              circumstances: value,
            },
          }))
        }
      />
      <Field
        multiline
        field={viewModel.lostDetails.fields.markings}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            lostDetails: {
              ...current.lostDetails,
              markings: value,
            },
          }))
        }
      />
    </Section>
  );
}

function PhotoSection({
  addPhoto,
  mediaDraftId,
  onMediaControllerChange,
  renderReportMediaManager,
  setDraft,
  viewModel,
}: {
  addPhoto: () => void;
  mediaDraftId: string;
  onMediaControllerChange?: (
    controller: ReportMediaStepController | null,
  ) => void;
  renderReportMediaManager?: LostReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  viewModel: LostReportCreationViewModel;
}) {
  const renderedReportMediaManager = renderReportMediaManager?.({
    mediaDraftId,
    onControllerChange: onMediaControllerChange,
    onSnapshotChange: (snapshot) =>
      setDraft((current) => ({
        ...current,
        photos: reportMediaSnapshotToCreationPhotos(snapshot),
      })),
    photos: viewModel.photos.items,
  });

  return (
    <Section title="Fotos">
      {renderedReportMediaManager ?? (
        <>
          <View style={styles.permissionBox}>
            <ReportCreationIcon
              color={shellColors.primary}
              name="camera.fill"
              size={22}
            />
            <View style={styles.optionCopy}>
              <Text maxFontSizeMultiplier={1.15} style={styles.itemTitle}>
                {viewModel.photos.permissionTitle}
              </Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.metaText}>
                {viewModel.photos.permissionBody}
              </Text>
            </View>
          </View>
          <View style={styles.photoGrid}>
            {viewModel.photos.items.map((photo) => (
              <Pressable
                accessibilityLabel="Quitar foto"
                accessibilityRole="button"
                key={photo.id}
                onPress={() =>
                  setDraft((current) =>
                    removeLostReportPhoto({
                      draft: current,
                      photoId: photo.id,
                    }),
                  )
                }
                style={styles.photoTile}
              >
                <Image
                  accessibilityLabel={photo.alt}
                  contentFit="cover"
                  source={photo.thumbUri ?? photo.uri}
                  style={styles.photoImage}
                />
              </Pressable>
            ))}
            <Pressable
              accessibilityLabel="Agregar foto"
              accessibilityRole="button"
              disabled={!viewModel.photos.canAddPhoto}
              onPress={addPhoto}
              style={[
                styles.addPhotoTile,
                !viewModel.photos.canAddPhoto ? styles.disabledTile : null,
              ]}
            >
              <ReportCreationIcon
                color={shellColors.primary}
                name="plus"
                size={22}
              />
              <Text maxFontSizeMultiplier={1.1} style={styles.addPhotoText}>
                {viewModel.photos.countLabel}
              </Text>
            </Pressable>
          </View>
        </>
      )}
      <Text maxFontSizeMultiplier={1.2} style={styles.helpText}>
        {viewModel.photos.helpLabel}
      </Text>
      {viewModel.photos.error ? (
        <Text maxFontSizeMultiplier={1.2} style={styles.errorText}>
          {viewModel.photos.error}
        </Text>
      ) : null}
    </Section>
  );
}

function LocationPrivacySection({
  coordinates,
  error,
  onChooseLocation,
  setDraft,
  viewModel,
}: {
  coordinates?: { latitude: number; longitude: number };
  error?: string;
  onChooseLocation: () => void;
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  viewModel: LostReportCreationViewModel;
}) {
  return (
    <Section title="Ubicacion y privacidad">
      <ReportCreationLocationPreview
        accentColor={shellColors.primary}
        coordinates={coordinates}
        Icon={ReportCreationIcon}
        label={viewModel.location.mapPreviewLabel}
      />
      <InfoRow
        icon="location.fill"
        label="Ubicacion interna"
        value={viewModel.location.exactInternalLabel}
      />
      <InfoRow
        icon="circle.grid.2x2.fill"
        label={viewModel.location.publicPrecisionLabel}
        value={viewModel.location.approximatePublicLabel}
      />
      <ActionButton
        icon="map.fill"
        label={
          viewModel.location.hasExactLocation
            ? "Cambiar ubicacion"
            : "Elegir ubicacion"
        }
        onPress={onChooseLocation}
        variant="secondary"
      />
      <ToggleRow
        body={viewModel.location.toggleBody}
        isSelected={viewModel.location.showExactPinPublicly}
        label={viewModel.location.exactPinOptInLabel}
        onPress={() =>
          setDraft((current) => ({
            ...current,
            showExactPinPublicly: !current.showExactPinPublicly,
          }))
        }
      />
      <ReportCreationErrorText message={error} styles={styles} />
    </Section>
  );
}

function ContactOptionSection({
  setDraft,
  viewModel,
}: {
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  viewModel: LostReportCreationViewModel;
}) {
  return (
    <ReportCreationContactOptionSection
      accentColor={shellColors.primary}
      Icon={ReportCreationIcon}
      onChangeWhatsappPhone={(value) =>
        setDraft((current) => ({
          ...current,
          contact: {
            ...current.contact,
            whatsappPhone: value,
          },
        }))
      }
      onSelectOption={(option) =>
        setDraft((current) =>
          selectLostReportContactOption({
            draft: current,
            option,
          }),
        )
      }
      options={viewModel.contact.options}
      styles={styles}
      title="Contacto"
      whatsappField={viewModel.contact.whatsappField}
    />
  );
}

function ReviewPublishSection({
  publish,
  publishState,
  submitError,
  viewModel,
}: {
  publish: () => void;
  publishState: PublishState;
  submitError: string | null;
  viewModel: LostReportCreationViewModel;
}) {
  return (
    <ReportCreationReviewPublishSection
      activityIndicatorColor={shellColors.white}
      canPublish={viewModel.canPublish}
      Icon={ReportCreationIcon}
      onPublish={publish}
      publishActionLabel={viewModel.review.publishActionLabel}
      publishState={publishState}
      rows={viewModel.review.rows}
      styles={styles}
      submitError={submitError}
      validationErrors={viewModel.review.validationErrors}
    />
  );
}

function InlinePetForm({
  draft,
  setDraft,
  viewModel,
}: {
  draft: LostReportDraft;
  setDraft: React.Dispatch<React.SetStateAction<LostReportDraft>>;
  viewModel: LostReportCreationViewModel;
}) {
  return (
    <View style={styles.formStack}>
      <Field
        field={viewModel.petSelection.inlineForm.fields.name}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            inlinePet: { ...current.inlinePet, name: value },
          }))
        }
      />
      <ReportCreationInlinePetTypeRow
        onSelectType={(type) =>
          setDraft((current) => ({
            ...current,
            inlinePet: { ...current.inlinePet, type },
          }))
        }
        selectedType={draft.inlinePet.type}
        styles={styles}
        typeOptions={lostReportPetTypeOptions}
      />
      <Field
        field={viewModel.petSelection.inlineForm.fields.breed}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            inlinePet: { ...current.inlinePet, breed: value },
          }))
        }
      />
      <Field
        multiline
        field={viewModel.petSelection.inlineForm.fields.description}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            inlinePet: { ...current.inlinePet, description: value },
          }))
        }
      />
    </View>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <ReportCreationSection styles={styles} title={title}>
      {children}
    </ReportCreationSection>
  );
}

function Field({
  field,
  keyboardType,
  multiline,
  onChangeText,
}: {
  field: ReportCreationFieldViewModel;
  keyboardType?: "default" | "phone-pad";
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <ReportCreationField
      field={field}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholderTextColor={shellColors.muted}
      styles={styles}
    />
  );
}

function ProgressSteps({
  steps,
}: {
  steps: React.ComponentProps<typeof ReportCreationProgressSteps>["steps"];
}) {
  return <ReportCreationProgressSteps steps={steps} styles={styles} />;
}

function SegmentedChoice({
  onSelect,
  options,
  selectedValue,
}: {
  onSelect: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
  selectedValue: string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable
          accessibilityRole="button"
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={[
            styles.segment,
            selectedValue === option.value ? styles.segmentSelected : null,
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.1}
            style={[
              styles.segmentText,
              selectedValue === option.value
                ? styles.segmentTextSelected
                : null,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToggleRow({
  body,
  isSelected,
  label,
  onPress,
}: {
  body: string;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <ReportCreationToggleRow
      body={body}
      isSelected={isSelected}
      label={label}
      onPress={onPress}
      styles={styles}
    />
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <ReportCreationInfoRow
      accentColor={shellColors.primary}
      Icon={ReportCreationIcon}
      icon={icon}
      label={label}
      styles={styles}
      value={value}
    />
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  variant = "primary",
}: {
  disabled?: boolean;
  icon: string;
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <ReportCreationActionButton
      accentColor={shellColors.primary}
      disabled={disabled}
      Icon={ReportCreationIcon}
      icon={icon}
      label={label}
      onPress={onPress}
      primaryTextColor={shellColors.white}
      styles={styles}
      variant={variant}
    />
  );
}

const lostReportEditableStepIds: readonly ReportCreationJourneyStepId[] = [
  "photos",
  "details",
  "location",
  "contact",
  "review",
] as const;

const lostReportContinueStepIds: readonly ReportCreationJourneyStepId[] = [
  "photos",
  "details",
  "location",
  "contact",
] as const;

function isLostReportContinueStepId(
  stepId: ReportCreationJourneyStepId,
): boolean {
  return lostReportContinueStepIds.includes(stepId);
}

function getPreviousEditableStepId(stepId: ReportCreationJourneyStepId) {
  const currentIndex = lostReportEditableStepIds.indexOf(stepId);

  if (currentIndex <= 0) {
    return undefined;
  }

  return lostReportEditableStepIds[currentIndex - 1];
}

function isCurrentLostReportStepValid({
  draft,
  journey,
  petProfiles,
}: {
  draft: LostReportDraft;
  journey: ReportCreationJourney;
  petProfiles: readonly LostReportPetProfileOption[];
}) {
  const currentStepIndex = getJourneyStepIndex(journey, journey.currentStep.id);
  const inferredJourney = buildLostReportCreationViewModel({
    draft,
    petProfiles,
    validationDisplay: {},
  }).journey;
  const inferredStepIndex = getJourneyStepIndex(
    inferredJourney,
    inferredJourney.currentStep.id,
  );

  return inferredStepIndex > currentStepIndex;
}

function getJourneyStepIndex(
  journey: ReportCreationJourney,
  stepId: ReportCreationJourneyStepId,
) {
  return journey.steps.findIndex((step) => step.id === stepId);
}

function toLostReportJourneyInput(
  journey: ReportCreationJourney,
): LostReportCreationJourneyInput {
  return {
    completedStepIds: journey.steps
      .filter((step) => step.status === "completed")
      .map((step) => step.id),
    currentStepId: journey.currentStep.id,
  };
}

function createFallbackPhoto(index: number): LostReportPhoto {
  return {
    id: `lost-report-photo-${index + 1}`,
    mediaId: `lost-report-media-${index + 1}`,
    status: "ready",
    uri: `file:///lost-report-photo-${index + 1}.jpg`,
  };
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: shellColors.primarySoft,
    borderColor: shellColors.border,
  },
  actionButtonText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonTextPrimary: {
    color: shellColors.white,
  },
  addPhotoText: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  addPhotoTile: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: shellColors.primarySoft,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    justifyContent: "center",
    width: "31%",
  },
  bodyText: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  contactOption: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 36,
  },
  disabledButton: {
    backgroundColor: shellColors.muted,
    borderColor: shellColors.muted,
  },
  disabledTile: {
    opacity: 0.5,
  },
  errorText: {
    color: shellColors.lost,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  eyebrow: {
    color: shellColors.lost,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: shellColors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  formStack: {
    gap: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: shellColors.lost,
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  helpText: {
    color: shellColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 18,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  infoLabel: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  infoRow: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  input: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: shellColors.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemTitle: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  mapBlock: {
    backgroundColor: "rgba(20, 108, 90, 0.10)",
    borderRadius: 8,
    flex: 1,
    minHeight: 28,
  },
  mapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    opacity: 0.9,
  },
  mapLabel: {
    backgroundColor: shellColors.surface,
    borderRadius: 999,
    bottom: 12,
    color: shellColors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
  },
  mapPin: {
    alignItems: "center",
    backgroundColor: shellColors.lost,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    left: "48%",
    position: "absolute",
    top: "42%",
    width: 40,
  },
  mapPreview: {
    backgroundColor: "#E1EFF5",
    borderColor: shellColors.border,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 160,
    overflow: "hidden",
    padding: 10,
  },
  metaText: {
    color: shellColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionStack: {
    gap: 10,
  },
  permissionBox: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  petOption: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  petThumb: {
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 14,
    height: 56,
    width: 56,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoImage: {
    height: "100%",
    width: "100%",
  },
  photoTile: {
    aspectRatio: 1,
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 16,
    overflow: "hidden",
    width: "31%",
  },
  priorityDisclosure: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderCurve: "continuous",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  priorityText: {
    color: shellColors.primaryDark,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.86,
  },
  publishButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  publishText: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  reviewLabel: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  reviewList: {
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 16,
    overflow: "hidden",
  },
  reviewRow: {
    borderBottomColor: shellColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 12,
  },
  reviewValue: {
    color: shellColors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  sponsorAction: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  sponsorActionText: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  sponsorActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sponsorCategory: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sponsorCopy: {
    gap: 4,
  },
  sponsorDisclosure: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  sponsorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  sponsorIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sponsorLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sponsorName: {
    color: shellColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sponsorPill: {
    backgroundColor: "#FFF4DA",
    borderCurve: "continuous",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sponsorPillText: {
    color: "#8A5A12",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sponsorPlacement: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  sponsorReportAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sponsorReportText: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  section: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionTitle: {
    color: shellColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  segment: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  segmentSelected: {
    backgroundColor: shellColors.primary,
  },
  segmentText: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextSelected: {
    color: shellColors.white,
  },
  segmented: {
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 16,
    flexDirection: "row",
    padding: 4,
  },
  selectedBorder: {
    borderColor: shellColors.primary,
    borderWidth: 2,
  },
  selectedPill: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  selectedPillText: {
    color: shellColors.white,
  },
  stepDot: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepDotComplete: {
    backgroundColor: shellColors.primary,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    gap: 5,
  },
  stepLabel: {
    color: shellColors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  stepNumber: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  stepNumberComplete: {
    color: shellColors.white,
  },
  steps: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 10,
  },
  successHero: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 22,
  },
  successIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  switchOn: {
    backgroundColor: shellColors.primary,
  },
  switchThumb: {
    backgroundColor: shellColors.white,
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  switchTrack: {
    backgroundColor: shellColors.muted,
    borderRadius: 999,
    padding: 2,
    width: 44,
  },
  title: {
    color: shellColors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  toggleRow: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  typePill: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  typePillText: {
    color: shellColors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
