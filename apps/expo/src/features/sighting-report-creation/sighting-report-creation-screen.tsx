import type { ScrollView } from "react-native";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type {
  ReportCreationJourney,
  ReportCreationJourneyStepId,
  ReportCreationJourneyValidationResult,
} from "../report-creation/report-creation-journey";
import type {
  ReportCreationSponsorDeliveryInput,
  ReportCreationSuccessSponsorPlacement,
} from "../report-creation/report-creation-success-sponsors";
import type { ReportLocationDraft } from "../report-creation/report-location-draft";
import type {
  ReportMediaDraftSnapshot,
  ReportMediaStepController,
} from "../report-media";
import type { CreationDraftStore } from "../resilience/creation-drafts";
import type {
  DurableCreationDraftPersistence,
  DurableCreationDraftRecovery,
} from "../resilience/use-durable-creation-draft";
import type { ResourceProviderReportReceipt } from "../resources";
import type {
  PublishSightingReportInput,
  SightingReportCreationSession,
  SightingReportCreationVisitorAction,
  SightingReportDraft,
  SightingReportPhoto,
} from "./sighting-report-creation-types";
import type {
  SightingReportCreationJourneyInput,
  SightingReportCreationValidationDisplayInput,
} from "./sighting-report-creation-view-model";
import type { SightingReportPublishConfirmation } from "./sighting-report-publish-adapter";
import {
  advanceReportCreationJourney,
  retreatReportCreationJourney,
} from "../report-creation/report-creation-journey";
import { publishReportCreation } from "../report-creation/report-creation-publish";
import { ReportCreationSuccessSponsorStack } from "../report-creation/report-creation-success-sponsors";
import {
  ReportCreationActionButton,
  ReportCreationContactOptionSection,
  ReportCreationDetailsFieldsSection,
  ReportCreationDraftPersistenceAlert,
  ReportCreationDraftRecoveryPrompt,
  ReportCreationErrorText,
  ReportCreationInfoRow,
  ReportCreationLocationPreview,
  ReportCreationPetSnapshotSection,
  ReportCreationPhotoSection,
  ReportCreationProgressSteps,
  ReportCreationPublishConfirmationModal,
  ReportCreationReviewPublishSection,
  ReportCreationScreenFrame,
  ReportCreationSection,
  ReportCreationToggleRow,
  useReportCreationPetDraftUpdaters,
  useReportCreationPublishedResultActions,
} from "../report-creation/report-creation-ui";
import { ReportLocationPickerScreen } from "../report-location-picker";
import { reportMediaSnapshotToCreationPhotos } from "../report-media";
import { useDurableCreationDraft } from "../resilience/use-durable-creation-draft";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import { sightingReportCreationFixtures } from "./sighting-report-creation-fixtures";
import { sightingReportPetTypeOptions } from "./sighting-report-creation-types";
import {
  appendSightingReportPhoto,
  buildSightingReportCreationViewModel,
  createSightingReportDraft,
  ensureSightingReportDraftIdempotencyKey,
  removeSightingReportPhoto,
  selectSightingReportContactOption,
  toPublishSightingReportInput,
} from "./sighting-report-creation-view-model";

const errorAccent = "#D6453D";
const sightingAccent = shellColors.sighting;
const sightingAccentSoft = "#E6F0F7";

type PublishState = "confirming" | "editing" | "publishing" | "success";
type SightingReportCreationViewModel = ReturnType<
  typeof buildSightingReportCreationViewModel
>;

export interface SightingReportCreationScreenProps {
  draftScopeId?: string;
  draftStore?: CreationDraftStore;
  initialDraft?: SightingReportDraft;
  locationAdapter?: NearbyLocationAdapter;
  onChooseSightingLocation?: () => void;
  onClose?: () => void;
  onDraftPublished?: () => void;
  onOpenPublishedReport?: (
    confirmation: SightingReportPublishConfirmation,
  ) => void;
  onOpenSponsorPlacement?: (sponsorProviderId: string) => void;
  onPublishSightingReport?: (
    input: PublishSightingReportInput,
  ) =>
    | Promise<SightingReportPublishConfirmation | void>
    | SightingReportPublishConfirmation
    | void;
  onRecordSponsorPlacementDelivery?: (
    input: ReportCreationSponsorDeliveryInput,
  ) => void;
  onReportSponsorPlacement?: (
    sponsorProviderId: string,
  ) =>
    | Promise<ResourceProviderReportReceipt | void>
    | ResourceProviderReportReceipt
    | void;
  onRequestMemberSignIn?: (action: SightingReportCreationVisitorAction) => void;
  onSharePublishedReport?: (
    confirmation: SightingReportPublishConfirmation,
  ) => Promise<void> | void;
  pickSightingReportPhoto?: () =>
    | SightingReportPhoto
    | Promise<SightingReportPhoto | undefined>
    | undefined;
  renderReportMediaManager?: (props: {
    mediaDraftId: string;
    onControllerChange?: (controller: ReportMediaStepController | null) => void;
    onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
    photos: readonly SightingReportPhoto[];
  }) => React.ReactNode;
  session?: SightingReportCreationSession;
  successSponsorPlacements?: readonly ReportCreationSuccessSponsorPlacement[];
}

function SightingReportCreationIcon({
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

export function SightingReportCreationScreen({
  draftScopeId,
  draftStore,
  initialDraft,
  locationAdapter,
  onChooseSightingLocation,
  onClose,
  onDraftPublished,
  onOpenPublishedReport,
  onOpenSponsorPlacement,
  onPublishSightingReport,
  onRecordSponsorPlacementDelivery,
  onReportSponsorPlacement,
  onRequestMemberSignIn,
  onSharePublishedReport,
  pickSightingReportPhoto,
  renderReportMediaManager,
  session = { kind: "member", memberId: "member-preview" },
  successSponsorPlacements = [],
}: SightingReportCreationScreenProps) {
  const defaultDraft = React.useMemo(
    () => initialDraft ?? createSightingReportDraft(),
    [initialDraft],
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
    kind: "sighting-report",
    recoveryMode: "explicit",
    scopeId: draftScopeId,
    store: draftStore,
  });
  const inferredJourney = React.useMemo(
    () =>
      buildSightingReportCreationViewModel({
        draft,
        session,
        validationDisplay: {},
      }).journey,
    [draft, session],
  );
  const [journey, setJourney] =
    React.useState<SightingReportCreationJourneyInput>(() =>
      toSightingReportJourneyInput(inferredJourney),
    );
  const [validationDisplay, setValidationDisplay] =
    React.useState<SightingReportCreationValidationDisplayInput>({});
  const [legacyMediaDraftId] = React.useState(
    () => `sighting-report-${createReportCreationIdSuffix()}`,
  );
  const mediaDraftId = draft.idempotencyKey ?? legacyMediaDraftId;
  const journeyResetSource = hasLoaded
    ? `${restoredDraft?.savedAt ?? "fresh"}:${draftResetVersion}`
    : "loading";
  const journeyResetSourceRef = React.useRef<unknown>(journeyResetSource);

  React.useEffect(() => {
    if (draft.idempotencyKey) {
      return;
    }

    setDraft((current) =>
      current.idempotencyKey
        ? current
        : {
            ...current,
            idempotencyKey: mediaDraftId,
          },
    );
  }, [draft.idempotencyKey, mediaDraftId, setDraft]);

  React.useEffect(() => {
    if (journeyResetSourceRef.current === journeyResetSource) {
      return;
    }

    journeyResetSourceRef.current = journeyResetSource;
    setJourney(toSightingReportJourneyInput(inferredJourney));
    setValidationDisplay({});
  }, [inferredJourney, journeyResetSource]);

  const [publishState, setPublishState] =
    React.useState<PublishState>("editing");
  const [publishedReport, setPublishedReport] =
    React.useState<SightingReportPublishConfirmation | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isLocationPickerVisible, setLocationPickerVisible] =
    React.useState(false);
  const publishLockRef = React.useRef(false);
  const viewModel = React.useMemo(
    () =>
      buildSightingReportCreationViewModel({
        draft,
        journey,
        session,
        validationDisplay,
      }),
    [draft, journey, session, validationDisplay],
  );

  const addPhoto = React.useCallback(async () => {
    if (pickSightingReportPhoto) {
      const pickedPhoto = await pickSightingReportPhoto();

      if (!pickedPhoto) {
        return;
      }

      setDraft((current) =>
        appendSightingReportPhoto({
          draft: current,
          photo: pickedPhoto,
        }),
      );
      return;
    }

    const nextPhoto =
      sightingReportCreationFixtures.photoSamples[draft.photos.length] ??
      createFallbackPhoto(draft.photos.length);

    setDraft((current) =>
      appendSightingReportPhoto({
        draft: current,
        photo: nextPhoto,
      }),
    );
  }, [draft.photos.length, pickSightingReportPhoto, setDraft]);
  const openLocationPicker = React.useCallback(() => {
    if (onChooseSightingLocation) {
      onChooseSightingLocation();
      return;
    }

    if (locationAdapter) {
      setLocationPickerVisible(true);
    }
  }, [locationAdapter, onChooseSightingLocation]);
  const closeLocationPicker = React.useCallback(() => {
    setLocationPickerVisible(false);
  }, []);
  const confirmLocation = React.useCallback(
    (location: ReportLocationDraft) => {
      setDraft((current) => ({
        ...current,
        exactSightingLocation: location,
      }));
      setLocationPickerVisible(false);
    },
    [setDraft],
  );

  const requestPublishConfirmation = React.useCallback(() => {
    if (!viewModel.canPublish || publishState === "publishing") {
      return;
    }

    setSubmitError(null);
    setPublishState("confirming");
  }, [publishState, viewModel.canPublish]);

  const cancelPublishConfirmation = React.useCallback(() => {
    if (publishState === "publishing") {
      return;
    }

    setPublishState("editing");
  }, [publishState]);

  const confirmPublish = React.useCallback(async () => {
    if (!viewModel.canPublish || publishState === "publishing") {
      return;
    }

    setSubmitError(null);
    setPublishedReport(null);
    setPublishState("publishing");

    const publishDraft = ensureSightingReportDraftIdempotencyKey({ draft });
    if (publishDraft !== draft) {
      setDraft((current) =>
        current.idempotencyKey
          ? current
          : {
              ...current,
              idempotencyKey: publishDraft.idempotencyKey,
            },
      );
    }

    const result = await publishReportCreation<
      PublishSightingReportInput,
      SightingReportPublishConfirmation | void
    >({
      clearDraft,
      input: toPublishSightingReportInput({ draft: publishDraft }),
      publishHandler: onPublishSightingReport,
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
    onPublishSightingReport,
    publishState,
    setDraft,
    viewModel.canPublish,
  ]);

  if (viewModel.kind === "visitor") {
    return (
      <SightingReportVisitorHandoff
        onClose={onClose}
        onRequestMemberSignIn={onRequestMemberSignIn}
        viewModel={viewModel}
      />
    );
  }

  if (isLocationPickerVisible && locationAdapter) {
    return (
      <ReportLocationPickerScreen
        adapter={locationAdapter}
        initialDepartment={draft.exactSightingLocation?.department}
        initialMapCoordinate={draft.exactSightingLocation?.coordinates}
        onCancel={closeLocationPicker}
        onConfirm={confirmLocation}
      />
    );
  }

  if (publishState === "success") {
    return (
      <SightingReportCreationSuccess
        onClose={onClose}
        onOpenPublishedReport={onOpenPublishedReport}
        onOpenSponsorPlacement={onOpenSponsorPlacement}
        onRecordSponsorPlacementDelivery={onRecordSponsorPlacementDelivery}
        onReportSponsorPlacement={onReportSponsorPlacement}
        onSharePublishedReport={onSharePublishedReport}
        publishedReport={publishedReport}
        successSponsorPlacements={successSponsorPlacements}
        viewModel={viewModel}
      />
    );
  }

  return (
    <SightingReportCreationEditor
      addPhoto={addPhoto}
      confirmationOverlay={
        publishState === "confirming" || publishState === "publishing" ? (
          <ReportCreationPublishConfirmationModal
            activityIndicatorColor={shellColors.white}
            body="Al confirmar, Rastro creará un reporte público de avistamiento con la zona, hora y contacto que revisaste."
            canConfirm={viewModel.canPublish}
            Icon={SightingReportCreationIcon}
            onCancel={cancelPublishConfirmation}
            onConfirm={confirmPublish}
            publishState={toReportCreationPublishState(publishState)}
            rows={buildSightingReportPublishConfirmationRows(viewModel)}
            title="Confirmar publicación"
          />
        ) : null
      }
      draft={draft}
      draftPersistence={draftPersistence}
      draftRecovery={draftRecovery}
      mediaDraftId={mediaDraftId}
      onChooseSightingLocation={openLocationPicker}
      onClose={onClose}
      onDiscardRecoveredDraft={discardDraft}
      onResumeRecoveredDraft={resumeDraft}
      publish={requestPublishConfirmation}
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

function buildSightingReportPublishConfirmationRows(
  viewModel: SightingReportCreationViewModel,
) {
  return [
    {
      label: "Tipo",
      value: "Reporte de avistamiento",
    },
    {
      label: "Estado",
      value: "Público activo después de confirmar",
    },
    ...viewModel.review.rows,
  ];
}

function toReportCreationPublishState(
  publishState: PublishState,
): "editing" | "publishing" | "success" {
  return publishState === "publishing" || publishState === "success"
    ? publishState
    : "editing";
}

function SightingReportVisitorHandoff({
  onClose,
  onRequestMemberSignIn,
  viewModel,
}: {
  onClose?: () => void;
  onRequestMemberSignIn?: (action: SightingReportCreationVisitorAction) => void;
  viewModel: SightingReportCreationViewModel;
}) {
  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <CreationHeader
        eyebrow={viewModel.header.eyebrow}
        onClose={onClose}
        title={viewModel.title}
      />
      <View style={styles.section}>
        <SightingReportCreationIcon
          color={sightingAccent}
          name="person.crop.circle.badge.exclamationmark"
          size={30}
        />
        <Text maxFontSizeMultiplier={1.15} style={styles.sectionTitle}>
          {viewModel.visitorAction?.label}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.bodyText}>
          Rastro guardará esta acción para que puedas continuar como miembro.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={!viewModel.visitorAction}
          onPress={() => {
            if (viewModel.visitorAction) {
              onRequestMemberSignIn?.(viewModel.visitorAction);
            }
          }}
          style={styles.publishButton}
        >
          <SightingReportCreationIcon
            color={shellColors.white}
            name="person.fill.checkmark"
            size={20}
          />
          <Text maxFontSizeMultiplier={1.15} style={styles.publishText}>
            {viewModel.visitorAction?.label}
          </Text>
        </Pressable>
      </View>
    </ReportCreationScreenFrame>
  );
}

function SightingReportCreationSuccess({
  onClose,
  onOpenPublishedReport,
  onOpenSponsorPlacement,
  onRecordSponsorPlacementDelivery,
  onReportSponsorPlacement,
  onSharePublishedReport,
  publishedReport,
  successSponsorPlacements,
  viewModel,
}: {
  onClose?: () => void;
  onOpenPublishedReport?: (
    confirmation: SightingReportPublishConfirmation,
  ) => void;
  onOpenSponsorPlacement?: (sponsorProviderId: string) => void;
  onRecordSponsorPlacementDelivery?: (
    input: ReportCreationSponsorDeliveryInput,
  ) => void;
  onReportSponsorPlacement?: (
    sponsorProviderId: string,
  ) =>
    | Promise<ResourceProviderReportReceipt | void>
    | ResourceProviderReportReceipt
    | void;
  onSharePublishedReport?: (
    confirmation: SightingReportPublishConfirmation,
  ) => Promise<void> | void;
  publishedReport: SightingReportPublishConfirmation | null;
  successSponsorPlacements: readonly ReportCreationSuccessSponsorPlacement[];
  viewModel: SightingReportCreationViewModel;
}) {
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
          <SightingReportCreationIcon
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
      <ReportCreationSuccessSponsorStack
        deliveryContextId={publishedReport?.id}
        onOpen={onOpenSponsorPlacement}
        onRecordDelivery={onRecordSponsorPlacementDelivery}
        onReport={onReportSponsorPlacement}
        placements={successSponsorPlacements}
      />
      <View style={styles.buttonRow}>
        <ReportCreationActionButton
          accentColor={sightingAccent}
          disabled={!canSharePublishedResult}
          Icon={SightingReportCreationIcon}
          icon="square.and.arrow.up"
          label={viewModel.success.shareActionLabel}
          onPress={sharePublishedResult}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
        <ReportCreationActionButton
          accentColor={sightingAccent}
          Icon={SightingReportCreationIcon}
          icon="list.bullet.rectangle"
          label={viewModel.success.primaryActionLabel}
          onPress={openPublishedResult}
          primaryTextColor={shellColors.white}
          styles={styles}
        />
      </View>
    </ReportCreationScreenFrame>
  );
}

function SightingReportCreationEditor({
  addPhoto,
  confirmationOverlay,
  draft,
  draftPersistence,
  draftRecovery,
  mediaDraftId,
  onChooseSightingLocation,
  onClose,
  onDiscardRecoveredDraft,
  onResumeRecoveredDraft,
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
  confirmationOverlay?: React.ReactNode;
  draft: SightingReportDraft;
  draftPersistence: DurableCreationDraftPersistence;
  draftRecovery: DurableCreationDraftRecovery<"sighting-report">;
  mediaDraftId: string;
  onChooseSightingLocation?: () => void;
  onClose?: () => void;
  onDiscardRecoveredDraft: () => Promise<void>;
  onResumeRecoveredDraft: () => void;
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: SightingReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  setJourney: React.Dispatch<
    React.SetStateAction<SightingReportCreationJourneyInput>
  >;
  setValidationDisplay: React.Dispatch<
    React.SetStateAction<SightingReportCreationValidationDisplayInput>
  >;
  submitError: string | null;
  validationDisplay: SightingReportCreationValidationDisplayInput;
  viewModel: SightingReportCreationViewModel;
}) {
  const sightingPetDraft = useReportCreationPetDraftUpdaters(setDraft);
  const scrollViewRef =
    React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  const mediaControllerRef = React.useRef<ReportMediaStepController | null>(
    null,
  );
  const currentStepId = viewModel.journey.currentStep.id;
  const hasPreviousStep = hasPreviousEditableSightingStep(viewModel.journey);
  const showStepActions = isEditableSightingStepId(currentStepId);
  const canContinueCurrentStep = currentStepId !== "review";
  const locationValidationError =
    validationDisplay.attemptedStepId === "location"
      ? getSightingReportLocationValidationError(draft)
      : undefined;
  const scrollToActiveStep = React.useCallback(() => {
    scrollViewRef.current?.scrollTo({ animated: true, y: 0 });
  }, []);
  const continueToNextStep = React.useCallback(async () => {
    let draftForValidation = draft;

    if (currentStepId === "photos" && mediaControllerRef.current) {
      const uploadedSnapshot =
        await mediaControllerRef.current.uploadPendingImages();
      const uploadedPhotos =
        reportMediaSnapshotToCreationPhotos(uploadedSnapshot);

      draftForValidation = {
        ...draft,
        photos: uploadedPhotos,
      };
      setDraft((current) => ({
        ...current,
        photos: uploadedPhotos,
      }));
    }

    const result = advanceReportCreationJourney(viewModel.journey, {
      [currentStepId]: () =>
        validateCurrentSightingReportStep({
          draft: draftForValidation,
          journey: viewModel.journey,
        }),
    });

    if (!result.ok) {
      if (result.reason === "invalid-current-step") {
        setValidationDisplay({
          attemptedStepId: result.stepId,
        });
        scrollToActiveStep();
      }

      return;
    }

    setJourney(toSightingReportJourneyInput(result.journey));
    setValidationDisplay({});
    scrollToActiveStep();
  }, [
    currentStepId,
    draft,
    scrollToActiveStep,
    setDraft,
    setJourney,
    setValidationDisplay,
    viewModel.journey,
  ]);
  const goBack = React.useCallback(() => {
    const result = retreatReportCreationJourney(viewModel.journey);

    if (
      !result.ok ||
      !isEditableSightingStepId(result.journey.currentStep.id)
    ) {
      return;
    }

    setJourney(toSightingReportJourneyInput(result.journey));
    setValidationDisplay({});
    scrollToActiveStep();
  }, [scrollToActiveStep, setJourney, setValidationDisplay, viewModel.journey]);

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      footer={
        showStepActions ? (
          <SightingReportStepActions
            canContinue={canContinueCurrentStep}
            canGoBack={hasPreviousStep}
            onBack={goBack}
            onContinue={continueToNextStep}
          />
        ) : undefined
      }
      overlay={confirmationOverlay}
      scrollViewRef={scrollViewRef}
      style={styles.screen}
    >
      <CreationHeader
        eyebrow={viewModel.header.eyebrow}
        onClose={onClose}
        title={viewModel.title}
      />
      <ReportCreationProgressSteps
        steps={viewModel.journey.steps}
        styles={styles}
      />
      <ReportCreationDraftRecoveryPrompt
        draftRecovery={draftRecovery}
        onDiscardDraft={onDiscardRecoveredDraft}
        onResumeDraft={onResumeRecoveredDraft}
      />
      <ReportCreationDraftPersistenceAlert
        draftPersistence={draftPersistence}
      />
      <SightingReportCreationStepContent
        addPhoto={addPhoto}
        currentStepId={currentStepId}
        draft={draft}
        locationValidationError={locationValidationError}
        mediaDraftId={mediaDraftId}
        onChangePetBreed={sightingPetDraft.updatePetBreed}
        onChangePetDescription={sightingPetDraft.updatePetDescription}
        onChooseSightingLocation={onChooseSightingLocation}
        onSelectPetType={sightingPetDraft.updatePetType}
        publish={publish}
        publishState={publishState}
        renderReportMediaManager={renderReportMediaManager}
        onMediaControllerChange={(controller) => {
          mediaControllerRef.current = controller;
        }}
        setDraft={setDraft}
        submitError={submitError}
        viewModel={viewModel}
      />
    </ReportCreationScreenFrame>
  );
}

function SightingReportCreationStepContent({
  addPhoto,
  currentStepId,
  draft,
  locationValidationError,
  mediaDraftId,
  onChangePetBreed,
  onChangePetDescription,
  onChooseSightingLocation,
  onMediaControllerChange,
  onSelectPetType,
  publish,
  publishState,
  renderReportMediaManager,
  setDraft,
  submitError,
  viewModel,
}: {
  addPhoto: () => void;
  currentStepId: ReportCreationJourneyStepId;
  draft: SightingReportDraft;
  locationValidationError?: string;
  mediaDraftId: string;
  onChangePetBreed: (value: string) => void;
  onChangePetDescription: (value: string) => void;
  onChooseSightingLocation?: () => void;
  onMediaControllerChange?: (
    controller: ReportMediaStepController | null,
  ) => void;
  onSelectPetType: (value: SightingReportDraft["pet"]["type"]) => void;
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: SightingReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  submitError: string | null;
  viewModel: SightingReportCreationViewModel;
}) {
  switch (currentStepId) {
    case "photos":
      return (
        <SightingReportPhotosStep
          addPhoto={addPhoto}
          mediaDraftId={mediaDraftId}
          onMediaControllerChange={onMediaControllerChange}
          renderReportMediaManager={renderReportMediaManager}
          setDraft={setDraft}
          viewModel={viewModel}
        />
      );
    case "details":
      return (
        <SightingReportDetailsStep
          draft={draft}
          onChangePetBreed={onChangePetBreed}
          onChangePetDescription={onChangePetDescription}
          onSelectPetType={onSelectPetType}
          setDraft={setDraft}
          viewModel={viewModel}
        />
      );
    case "location":
      return (
        <LocationPrivacySection
          coordinates={draft.exactSightingLocation?.coordinates}
          onChooseSightingLocation={onChooseSightingLocation}
          setDraft={setDraft}
          validationError={locationValidationError}
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

function SightingReportPhotosStep({
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
  renderReportMediaManager?: SightingReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  viewModel: SightingReportCreationViewModel;
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

  if (renderedReportMediaManager) {
    return (
      <ReportCreationSection styles={styles} title="Fotos opcionales">
        {renderedReportMediaManager}
        {viewModel.photos.error ? (
          <Text maxFontSizeMultiplier={1.2} style={styles.errorText}>
            {viewModel.photos.error}
          </Text>
        ) : null}
      </ReportCreationSection>
    );
  }

  return (
    <ReportCreationPhotoSection
      accentColor={sightingAccent}
      addPhoto={addPhoto}
      addPhotoAccessibilityLabel="Agregar foto opcional"
      canAddPhoto={viewModel.photos.canAddPhoto}
      countLabel={viewModel.photos.countLabel}
      helpLabel={viewModel.photos.helpLabel}
      Icon={SightingReportCreationIcon}
      onRemovePhoto={(photoId) =>
        setDraft((current) =>
          removeSightingReportPhoto({
            draft: current,
            photoId,
          }),
        )
      }
      permissionBody={viewModel.photos.permissionBody}
      permissionTitle={viewModel.photos.permissionTitle}
      photos={viewModel.photos.items}
      styles={styles}
      title="Fotos opcionales"
    />
  );
}

function SightingReportDetailsStep({
  draft,
  onChangePetBreed,
  onChangePetDescription,
  onSelectPetType,
  setDraft,
  viewModel,
}: {
  draft: SightingReportDraft;
  onChangePetBreed: (value: string) => void;
  onChangePetDescription: (value: string) => void;
  onSelectPetType: (value: SightingReportDraft["pet"]["type"]) => void;
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  viewModel: SightingReportCreationViewModel;
}) {
  return (
    <>
      <ReportCreationPetSnapshotSection
        breedField={viewModel.pet.fields.breed}
        descriptionField={viewModel.pet.fields.description}
        onChangeBreed={onChangePetBreed}
        onChangeDescription={onChangePetDescription}
        onSelectType={onSelectPetType}
        placeholderTextColor={shellColors.muted}
        selectedType={draft.pet.type}
        styles={styles}
        title={viewModel.pet.title}
        typeOptions={sightingReportPetTypeOptions}
      />
      <ReportCreationDetailsFieldsSection
        fields={[
          {
            field: viewModel.sightingDetails.fields.observedAtLabel,
            input: "dateTime",
            key: "observedAtLabel" as const,
          },
          {
            field: viewModel.sightingDetails.fields.observedCondition,
            key: "observedCondition" as const,
          },
          {
            field: viewModel.sightingDetails.fields.direction,
            key: "direction" as const,
          },
          {
            field: viewModel.sightingDetails.fields.description,
            key: "description" as const,
            multiline: true,
          },
        ]}
        dateTimeAccentColor={sightingAccent}
        onChangeField={(key, value) =>
          setDraft((current) => ({
            ...current,
            sightingDetails: {
              ...current.sightingDetails,
              [key]: value,
            },
          }))
        }
        placeholderTextColor={shellColors.muted}
        styles={styles}
        title={viewModel.sightingDetails.title}
      />
    </>
  );
}

function CreationHeader({
  eyebrow,
  onClose,
  title,
}: {
  eyebrow: string;
  onClose?: () => void;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerIcon}>
        <SightingReportCreationIcon
          color={shellColors.white}
          name="eye.fill"
          size={24}
        />
      </View>
      <View style={styles.headerCopy}>
        <Text maxFontSizeMultiplier={1.15} style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>
          {title}
        </Text>
      </View>
      {onClose ? (
        <Pressable
          accessibilityLabel="Volver del avistamiento"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.iconButton}
        >
          <SightingReportCreationIcon
            color={shellColors.muted}
            name="xmark"
            size={18}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function LocationPrivacySection({
  coordinates,
  onChooseSightingLocation,
  setDraft,
  validationError,
  viewModel,
}: {
  coordinates?: { latitude: number; longitude: number };
  onChooseSightingLocation?: () => void;
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  validationError?: string;
  viewModel: SightingReportCreationViewModel;
}) {
  return (
    <ReportCreationSection styles={styles} title="Ubicación y privacidad">
      <ReportCreationLocationPreview
        accentColor={sightingAccent}
        coordinates={coordinates}
        Icon={SightingReportCreationIcon}
        label={viewModel.location.mapPreviewLabel}
      />
      <ReportCreationInfoRow
        accentColor={sightingAccent}
        Icon={SightingReportCreationIcon}
        icon="location.fill"
        label="Ubicación interna"
        styles={styles}
        value={viewModel.location.exactInternalLabel}
      />
      <ReportCreationInfoRow
        accentColor={sightingAccent}
        Icon={SightingReportCreationIcon}
        icon="circle.grid.2x2.fill"
        label={viewModel.location.publicPrecisionLabel}
        styles={styles}
        value={viewModel.location.approximatePublicLabel}
      />
      {onChooseSightingLocation ? (
        <ReportCreationActionButton
          accentColor={sightingAccent}
          Icon={SightingReportCreationIcon}
          icon="map.fill"
          label={
            viewModel.location.hasExactLocation
              ? "Cambiar ubicación"
              : "Elegir ubicación"
          }
          onPress={onChooseSightingLocation}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
      ) : null}
      <ReportCreationToggleRow
        body={viewModel.location.toggleBody}
        isSelected={viewModel.location.showExactPinPublicly}
        label={viewModel.location.exactPinOptInLabel}
        onPress={() =>
          setDraft((current) => ({
            ...current,
            showExactPinPublicly: !current.showExactPinPublicly,
          }))
        }
        styles={styles}
      />
      <ReportCreationErrorText
        maxFontSizeMultiplier={1.2}
        message={validationError}
        styles={styles}
      />
    </ReportCreationSection>
  );
}

function ContactOptionSection({
  setDraft,
  viewModel,
}: {
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  viewModel: SightingReportCreationViewModel;
}) {
  const contactError =
    viewModel.contact.whatsappField.visible &&
    viewModel.contact.whatsappField.error
      ? undefined
      : viewModel.contact.error;

  return (
    <>
      <ReportCreationContactOptionSection
        accentColor={sightingAccent}
        Icon={SightingReportCreationIcon}
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
            selectSightingReportContactOption({
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
      {contactError ? (
        <Text maxFontSizeMultiplier={1.2} selectable style={styles.errorText}>
          {contactError}
        </Text>
      ) : null}
    </>
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
  viewModel: SightingReportCreationViewModel;
}) {
  return (
    <ReportCreationReviewPublishSection
      activityIndicatorColor={shellColors.white}
      canPublish={viewModel.canPublish}
      Icon={SightingReportCreationIcon}
      onPublish={publish}
      publishActionLabel={viewModel.review.publishActionLabel}
      publishState={toReportCreationPublishState(publishState)}
      rows={viewModel.review.rows}
      styles={styles}
      submitError={submitError}
      validationErrors={viewModel.review.validationErrors}
    />
  );
}

function SightingReportStepActions({
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
        <ReportCreationActionButton
          accentColor={sightingAccent}
          Icon={SightingReportCreationIcon}
          icon="chevron.left"
          label="Atrás"
          onPress={onBack}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
      ) : null}
      {canContinue ? (
        <ReportCreationActionButton
          accentColor={sightingAccent}
          Icon={SightingReportCreationIcon}
          icon="arrow.right"
          label="Continuar"
          onPress={onContinue}
          primaryTextColor={shellColors.white}
          styles={styles}
        />
      ) : null}
    </View>
  );
}

function toSightingReportJourneyInput(
  journey: ReportCreationJourney,
): SightingReportCreationJourneyInput {
  return {
    completedStepIds: journey.steps
      .filter((step) => step.status === "completed")
      .map((step) => step.id),
    currentStepId: journey.currentStep.id,
  };
}

function validateCurrentSightingReportStep({
  draft,
  journey,
}: {
  draft: SightingReportDraft;
  journey: ReportCreationJourney;
}): ReportCreationJourneyValidationResult {
  const currentStepId = journey.currentStep.id;

  switch (currentStepId) {
    case "photos":
      return toSightingReportValidationResult([
        buildSightingReportCreationViewModel({
          draft,
          journey: toSightingReportJourneyInput(journey),
          validationDisplay: {
            attemptedStepId: currentStepId,
          },
        }).photos.error,
      ]);
    case "details": {
      const attemptedViewModel = buildSightingReportCreationViewModel({
        draft,
        journey: toSightingReportJourneyInput(journey),
        validationDisplay: {
          attemptedStepId: currentStepId,
        },
      });

      return toSightingReportValidationResult([
        attemptedViewModel.sightingDetails.fields.observedAtLabel.error,
        attemptedViewModel.sightingDetails.fields.observedCondition.error,
        attemptedViewModel.sightingDetails.fields.direction.error,
        attemptedViewModel.sightingDetails.fields.description.error,
        attemptedViewModel.pet.fields.description.error,
      ]);
    }
    case "location":
      return toSightingReportValidationResult([
        getSightingReportLocationValidationError(draft),
      ]);
    case "contact": {
      const attemptedViewModel = buildSightingReportCreationViewModel({
        draft,
        journey: toSightingReportJourneyInput(journey),
        validationDisplay: {
          attemptedStepId: currentStepId,
        },
      });

      return toSightingReportValidationResult([
        attemptedViewModel.contact.error,
        attemptedViewModel.contact.whatsappField.error,
      ]);
    }
    case "review": {
      const attemptedViewModel = buildSightingReportCreationViewModel({
        draft,
        journey: toSightingReportJourneyInput(journey),
        validationDisplay: {
          attemptedStepId: currentStepId,
        },
      });

      return attemptedViewModel.canPublish
        ? { ok: true }
        : toSightingReportValidationResult(
            attemptedViewModel.review.validationErrors,
          );
    }
    default:
      return { ok: true };
  }
}

function getSightingReportLocationValidationError(draft: SightingReportDraft) {
  return draft.exactSightingLocation
    ? undefined
    : "Selecciona dónde fue visto el animal.";
}

function toSightingReportValidationResult(
  errors: readonly (string | undefined)[],
): ReportCreationJourneyValidationResult {
  const visibleErrors = errors.filter(isSightingReportValidationError);

  return visibleErrors.length === 0
    ? { ok: true }
    : {
        errors: visibleErrors,
        ok: false,
      };
}

function isSightingReportValidationError(
  value: string | undefined,
): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasPreviousEditableSightingStep(journey: ReportCreationJourney) {
  const currentStepIndex = journey.steps.findIndex(
    (step) => step.id === journey.currentStep.id,
  );

  return journey.steps
    .slice(0, currentStepIndex)
    .some((step) => isEditableSightingStepId(step.id));
}

function isEditableSightingStepId(
  stepId: ReportCreationJourneyStepId,
): stepId is (typeof editableSightingStepIds)[number] {
  return (
    editableSightingStepIds as readonly ReportCreationJourneyStepId[]
  ).includes(stepId);
}

const editableSightingStepIds = [
  "photos",
  "details",
  "location",
  "contact",
  "review",
] as const satisfies readonly ReportCreationJourneyStepId[];

function createFallbackPhoto(index: number): SightingReportPhoto {
  return {
    alt: "Foto opcional de avistamiento",
    id: `sighting-report-photo-${index + 1}`,
    mediaId: `sighting-report-media-${index + 1}`,
    status: "ready",
    uri: `file:///sighting-report-photo-${index + 1}.jpg`,
  };
}

function createReportCreationIdSuffix() {
  const crypto = globalThis.crypto as
    | {
        randomUUID?: () => string;
      }
    | undefined;

  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: sightingAccent,
    borderColor: sightingAccent,
  },
  actionButtonSecondary: {
    backgroundColor: sightingAccentSoft,
    borderColor: shellColors.border,
  },
  actionButtonText: {
    color: sightingAccent,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonTextPrimary: {
    color: shellColors.white,
  },
  addPhotoText: {
    color: sightingAccent,
    fontSize: 12,
    fontWeight: "800",
  },
  addPhotoTile: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: sightingAccentSoft,
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
  confirmationPanel: {
    alignSelf: "stretch",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 16,
    overflow: "hidden",
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
    color: errorAccent,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  eyebrow: {
    color: sightingAccent,
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
    backgroundColor: sightingAccent,
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
    backgroundColor: "rgba(46, 109, 158, 0.12)",
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
    backgroundColor: sightingAccent,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    left: "48%",
    position: "absolute",
    top: "42%",
    width: 40,
  },
  mapPreview: {
    backgroundColor: "#EEF5FA",
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
    backgroundColor: sightingAccentSoft,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
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
  pressed: {
    opacity: 0.86,
  },
  publishButton: {
    alignItems: "center",
    backgroundColor: sightingAccent,
    borderColor: sightingAccent,
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
  selectedBorder: {
    borderColor: sightingAccent,
    borderWidth: 2,
  },
  selectedPill: {
    backgroundColor: sightingAccent,
    borderColor: sightingAccent,
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
    backgroundColor: sightingAccent,
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
    backgroundColor: sightingAccent,
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  switchOn: {
    backgroundColor: sightingAccent,
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
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
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
