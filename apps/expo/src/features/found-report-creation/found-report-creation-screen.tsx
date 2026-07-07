import type { ScrollView } from "react-native";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type {
  ReportCreationJourney,
  ReportCreationJourneyStepId,
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
  FoundReportCreationSession,
  FoundReportCreationVisitorAction,
  FoundReportDraft,
  FoundReportPhoto,
  PublishFoundPetReportInput,
} from "./found-report-creation-types";
import { createReportCreationJourney } from "../report-creation/report-creation-journey";
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
import { foundReportCreationFixtures } from "./found-report-creation-fixtures";
import { foundReportPetTypeOptions } from "./found-report-creation-types";
import {
  appendFoundReportPhoto,
  buildFoundReportCreationViewModel,
  createFoundReportDraft,
  removeFoundReportPhoto,
  selectFoundReportContactOption,
  toPublishFoundPetReportInput,
} from "./found-report-creation-view-model";

const errorAccent = "#D6453D";
const foundAccent = shellColors.found;
const foundAccentSoft = "#E2F4EA";
const foundReportEditorStepIds = [
  "photos",
  "details",
  "location",
  "contact",
  "review",
] as const satisfies readonly ReportCreationJourneyStepId[];

type PublishState = "confirming" | "editing" | "publishing" | "success";
export interface FoundReportPublishConfirmation {
  id: string;
  status: string;
}
type FoundReportEditorStepId = (typeof foundReportEditorStepIds)[number];
type FoundReportCreationViewModel = ReturnType<
  typeof buildFoundReportCreationViewModel
>;

export interface FoundReportCreationScreenProps {
  draftScopeId?: string;
  draftStore?: CreationDraftStore;
  initialDraft?: FoundReportDraft;
  locationAdapter?: NearbyLocationAdapter;
  onChooseFoundLocation?: () => void;
  onClose?: () => void;
  onDraftPublished?: () => void;
  onOpenPublishedReport?: (
    confirmation: FoundReportPublishConfirmation,
  ) => void;
  onOpenSponsorPlacement?: (sponsorProviderId: string) => void;
  onPublishFoundReport?: (
    input: PublishFoundPetReportInput,
  ) =>
    | FoundReportPublishConfirmation
    | Promise<FoundReportPublishConfirmation | void>
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
  onRequestMemberSignIn?: (action: FoundReportCreationVisitorAction) => void;
  onSharePublishedReport?: (
    confirmation: FoundReportPublishConfirmation,
  ) => Promise<void> | void;
  pickFoundReportPhoto?: () =>
    | FoundReportPhoto
    | Promise<FoundReportPhoto | undefined>
    | undefined;
  renderReportMediaManager?: (props: {
    mediaDraftId: string;
    onControllerChange?: (controller: ReportMediaStepController | null) => void;
    onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
    photos: readonly FoundReportPhoto[];
  }) => React.ReactNode;
  session?: FoundReportCreationSession;
  successSponsorPlacements?: readonly ReportCreationSuccessSponsorPlacement[];
}

function FoundReportCreationIcon({
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

export function FoundReportCreationScreen({
  draftScopeId,
  draftStore,
  initialDraft,
  locationAdapter,
  onChooseFoundLocation,
  onClose,
  onDraftPublished,
  onOpenPublishedReport,
  onOpenSponsorPlacement,
  onPublishFoundReport,
  onRecordSponsorPlacementDelivery,
  onReportSponsorPlacement,
  onRequestMemberSignIn,
  onSharePublishedReport,
  pickFoundReportPhoto,
  renderReportMediaManager,
  session = { kind: "member", memberId: "member-preview" },
  successSponsorPlacements = [],
}: FoundReportCreationScreenProps) {
  const defaultDraft = React.useMemo(
    () => initialDraft ?? createFoundReportDraft(),
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
    kind: "found-report",
    recoveryMode: "explicit",
    scopeId: draftScopeId,
    store: draftStore,
  });
  const [publishState, setPublishState] =
    React.useState<PublishState>("editing");
  const [publishedReport, setPublishedReport] =
    React.useState<FoundReportPublishConfirmation | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isLocationPickerVisible, setLocationPickerVisible] =
    React.useState(false);
  const publishLockRef = React.useRef(false);
  const quietViewModel = React.useMemo(
    () =>
      buildFoundReportCreationViewModel({
        draft,
        session,
        validationDisplay: {},
      }),
    [draft, session],
  );

  const addPhoto = React.useCallback(async () => {
    if (pickFoundReportPhoto) {
      const pickedPhoto = await pickFoundReportPhoto();

      if (!pickedPhoto) {
        return;
      }

      setDraft((current) =>
        appendFoundReportPhoto({
          draft: current,
          photo: pickedPhoto,
        }),
      );
      return;
    }

    const nextPhoto =
      foundReportCreationFixtures.photoSamples[draft.photos.length] ??
      createFallbackPhoto(draft.photos.length);

    setDraft((current) =>
      appendFoundReportPhoto({
        draft: current,
        photo: nextPhoto,
      }),
    );
  }, [draft.photos.length, pickFoundReportPhoto, setDraft]);
  const openLocationPicker = React.useCallback(() => {
    if (onChooseFoundLocation) {
      onChooseFoundLocation();
      return;
    }

    if (locationAdapter) {
      setLocationPickerVisible(true);
    }
  }, [locationAdapter, onChooseFoundLocation]);
  const closeLocationPicker = React.useCallback(() => {
    setLocationPickerVisible(false);
  }, []);
  const confirmLocation = React.useCallback(
    (location: ReportLocationDraft) => {
      setDraft((current) => ({
        ...current,
        exactFoundLocation: location,
      }));
      setLocationPickerVisible(false);
    },
    [setDraft],
  );

  const requestPublishConfirmation = React.useCallback(() => {
    if (!quietViewModel.canPublish || publishState === "publishing") {
      return;
    }

    setSubmitError(null);
    setPublishState("confirming");
  }, [publishState, quietViewModel.canPublish]);

  const cancelPublishConfirmation = React.useCallback(() => {
    if (publishState === "publishing") {
      return;
    }

    setPublishState("editing");
  }, [publishState]);

  const confirmPublish = React.useCallback(async () => {
    if (!quietViewModel.canPublish || publishState === "publishing") {
      return;
    }

    setSubmitError(null);
    setPublishedReport(null);
    setPublishState("publishing");

    const result = await publishReportCreation({
      clearDraft,
      input: toPublishFoundPetReportInput({ draft }),
      publishHandler: onPublishFoundReport,
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
    onPublishFoundReport,
    publishState,
    quietViewModel.canPublish,
  ]);

  if (quietViewModel.kind === "visitor") {
    return (
      <FoundReportVisitorHandoff
        onClose={onClose}
        onRequestMemberSignIn={onRequestMemberSignIn}
        viewModel={quietViewModel}
      />
    );
  }

  if (isLocationPickerVisible && locationAdapter) {
    return (
      <ReportLocationPickerScreen
        adapter={locationAdapter}
        initialDepartment={draft.exactFoundLocation?.department}
        initialMapCoordinate={draft.exactFoundLocation?.coordinates}
        onCancel={closeLocationPicker}
        onConfirm={confirmLocation}
      />
    );
  }

  if (publishState === "success") {
    return (
      <FoundReportCreationSuccess
        onClose={onClose}
        onOpenPublishedReport={onOpenPublishedReport}
        onOpenSponsorPlacement={onOpenSponsorPlacement}
        onRecordSponsorPlacementDelivery={onRecordSponsorPlacementDelivery}
        onReportSponsorPlacement={onReportSponsorPlacement}
        onSharePublishedReport={onSharePublishedReport}
        publishedReport={publishedReport}
        successSponsorPlacements={successSponsorPlacements}
        viewModel={quietViewModel}
      />
    );
  }

  return (
    <FoundReportCreationEditor
      addPhoto={addPhoto}
      confirmationOverlay={
        publishState === "confirming" || publishState === "publishing" ? (
          <ReportCreationPublishConfirmationModal
            activityIndicatorColor={shellColors.white}
            body="Al confirmar, Rastro creará un reporte público de mascota encontrada con la zona y contacto que revisaste."
            canConfirm={quietViewModel.canPublish}
            Icon={FoundReportCreationIcon}
            onCancel={cancelPublishConfirmation}
            onConfirm={confirmPublish}
            publishState={toReportCreationPublishState(publishState)}
            rows={buildFoundReportPublishConfirmationRows(quietViewModel)}
            title="Confirmar publicación"
          />
        ) : null
      }
      draft={draft}
      draftPersistence={draftPersistence}
      draftRecovery={draftRecovery}
      onChooseFoundLocation={openLocationPicker}
      onClose={onClose}
      onDiscardRecoveredDraft={discardDraft}
      onResumeRecoveredDraft={resumeDraft}
      publish={requestPublishConfirmation}
      publishState={publishState}
      renderReportMediaManager={renderReportMediaManager}
      restoredDraftResetToken={
        hasLoaded
          ? `${restoredDraft?.savedAt ?? "fresh"}:${draftResetVersion}`
          : "loading"
      }
      session={session}
      setDraft={setDraft}
      submitError={submitError}
    />
  );
}

function buildFoundReportPublishConfirmationRows(
  viewModel: FoundReportCreationViewModel,
) {
  return [
    {
      label: "Tipo",
      value: "Reporte de mascota encontrada",
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

function FoundReportVisitorHandoff({
  onClose,
  onRequestMemberSignIn,
  viewModel,
}: {
  onClose?: () => void;
  onRequestMemberSignIn?: (action: FoundReportCreationVisitorAction) => void;
  viewModel: FoundReportCreationViewModel;
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
        <FoundReportCreationIcon
          color={foundAccent}
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
          <FoundReportCreationIcon
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

function FoundReportCreationSuccess({
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
    confirmation: FoundReportPublishConfirmation,
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
    confirmation: FoundReportPublishConfirmation,
  ) => Promise<void> | void;
  publishedReport: FoundReportPublishConfirmation | null;
  successSponsorPlacements: readonly ReportCreationSuccessSponsorPlacement[];
  viewModel: FoundReportCreationViewModel;
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
          <FoundReportCreationIcon
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
          accentColor={foundAccent}
          disabled={!canSharePublishedResult}
          Icon={FoundReportCreationIcon}
          icon="square.and.arrow.up"
          label={viewModel.success.shareActionLabel}
          onPress={sharePublishedResult}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
        <ReportCreationActionButton
          accentColor={foundAccent}
          Icon={FoundReportCreationIcon}
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

function FoundReportCreationEditor({
  addPhoto,
  confirmationOverlay,
  draft,
  draftPersistence,
  draftRecovery,
  onChooseFoundLocation,
  onClose,
  onDiscardRecoveredDraft,
  onResumeRecoveredDraft,
  publish,
  publishState,
  renderReportMediaManager,
  restoredDraftResetToken,
  session,
  setDraft,
  submitError,
}: {
  addPhoto: () => void;
  confirmationOverlay?: React.ReactNode;
  draft: FoundReportDraft;
  draftPersistence: DurableCreationDraftPersistence;
  draftRecovery: DurableCreationDraftRecovery<"found-report">;
  onChooseFoundLocation?: () => void;
  onClose?: () => void;
  onDiscardRecoveredDraft: () => Promise<void>;
  onResumeRecoveredDraft: () => void;
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: FoundReportCreationScreenProps["renderReportMediaManager"];
  restoredDraftResetToken?: string;
  session: FoundReportCreationSession;
  setDraft: React.Dispatch<React.SetStateAction<FoundReportDraft>>;
  submitError: string | null;
}) {
  const foundPetDraft = useReportCreationPetDraftUpdaters(setDraft);
  const scrollRef = React.useRef<React.ElementRef<typeof ScrollView>>(null);
  const mediaControllerRef = React.useRef<ReportMediaStepController | null>(
    null,
  );
  const inferredViewModel = React.useMemo(
    () =>
      buildFoundReportCreationViewModel({
        draft,
        session,
        validationDisplay: {},
      }),
    [draft, session],
  );
  const [journey, setJourney] = React.useState<ReportCreationJourney>(
    () => inferredViewModel.journey,
  );
  const [validationDisplay, setValidationDisplay] = React.useState<{
    attemptedStepId?: ReportCreationJourneyStepId;
  }>({});
  const lastRestoredDraftResetTokenRef = React.useRef(restoredDraftResetToken);

  React.useEffect(() => {
    if (lastRestoredDraftResetTokenRef.current === restoredDraftResetToken) {
      return;
    }

    lastRestoredDraftResetTokenRef.current = restoredDraftResetToken;
    setJourney(inferredViewModel.journey);
    setValidationDisplay({});
  }, [inferredViewModel.journey, restoredDraftResetToken]);

  const viewModel = React.useMemo(
    () =>
      buildFoundReportCreationViewModel({
        draft,
        journey: toFoundReportJourneyInput(journey),
        session,
        validationDisplay,
      }),
    [draft, journey, session, validationDisplay],
  );
  const currentStepId = viewModel.journey.currentStep.id;
  const currentEditorStepId = isFoundReportEditorStepId(currentStepId)
    ? currentStepId
    : undefined;
  const previousEditableStep = currentEditorStepId
    ? getPreviousFoundReportEditableStep(viewModel.journey)
    : undefined;
  const locationError =
    validationDisplay.attemptedStepId === "location" &&
    !draft.exactFoundLocation
      ? "Selecciona dónde fue encontrada."
      : undefined;

  const continueToNextStep = React.useCallback(async () => {
    if (
      !currentEditorStepId ||
      currentEditorStepId === "review" ||
      !canRenderFoundReportStepActions(currentEditorStepId)
    ) {
      return;
    }

    let draftForValidation = draft;

    if (currentEditorStepId === "photos" && mediaControllerRef.current) {
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

    const errors = validateFoundReportCurrentStep({
      draft: draftForValidation,
      stepId: currentEditorStepId,
    });

    if (errors.length > 0) {
      setValidationDisplay({ attemptedStepId: currentEditorStepId });
      scrollRef.current?.scrollTo({ animated: true, y: 0 });
      return;
    }

    setJourney((current) => advanceFoundReportJourney(current));
    setValidationDisplay({});
  }, [currentEditorStepId, draft, setDraft]);

  const goBack = React.useCallback(() => {
    setJourney((current) => retreatFoundReportJourney(current));
    setValidationDisplay({});
  }, []);

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      footer={
        currentEditorStepId ? (
          <FoundReportStepActions
            canContinue={canRenderFoundReportStepActions(currentEditorStepId)}
            canGoBack={Boolean(previousEditableStep)}
            onBack={goBack}
            onContinue={continueToNextStep}
          />
        ) : undefined
      }
      overlay={confirmationOverlay}
      scrollViewRef={scrollRef}
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
      <FoundReportCreationStepContent
        addPhoto={addPhoto}
        currentStepId={currentStepId}
        draft={draft}
        locationError={locationError}
        onChangePetBreed={foundPetDraft.updatePetBreed}
        onChangePetDescription={foundPetDraft.updatePetDescription}
        onChooseFoundLocation={onChooseFoundLocation}
        onSelectPetType={foundPetDraft.updatePetType}
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

function FoundReportCreationStepContent({
  addPhoto,
  currentStepId,
  draft,
  locationError,
  onChangePetBreed,
  onChangePetDescription,
  onChooseFoundLocation,
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
  draft: FoundReportDraft;
  locationError?: string;
  onChangePetBreed: (value: string) => void;
  onChangePetDescription: (value: string) => void;
  onChooseFoundLocation?: () => void;
  onMediaControllerChange?: (
    controller: ReportMediaStepController | null,
  ) => void;
  onSelectPetType: (value: FoundReportDraft["pet"]["type"]) => void;
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: FoundReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<FoundReportDraft>>;
  submitError: string | null;
  viewModel: FoundReportCreationViewModel;
}) {
  switch (currentStepId) {
    case "photos":
      return (
        <FoundReportPhotosStep
          addPhoto={addPhoto}
          draft={draft}
          onMediaControllerChange={onMediaControllerChange}
          renderReportMediaManager={renderReportMediaManager}
          setDraft={setDraft}
          viewModel={viewModel}
        />
      );
    case "details":
      return (
        <FoundReportDetailsStep
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
          coordinates={draft.exactFoundLocation?.coordinates}
          error={locationError}
          onChooseFoundLocation={onChooseFoundLocation}
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

function FoundReportPhotosStep({
  addPhoto,
  draft,
  onMediaControllerChange,
  renderReportMediaManager,
  setDraft,
  viewModel,
}: {
  addPhoto: () => void;
  draft: FoundReportDraft;
  onMediaControllerChange?: (
    controller: ReportMediaStepController | null,
  ) => void;
  renderReportMediaManager?: FoundReportCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<FoundReportDraft>>;
  viewModel: FoundReportCreationViewModel;
}) {
  const renderedReportMediaManager = renderReportMediaManager?.({
    mediaDraftId: draft.idempotencyKey,
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
      <ReportCreationSection styles={styles} title="Fotos">
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
      accentColor={foundAccent}
      addPhoto={addPhoto}
      addPhotoAccessibilityLabel="Agregar foto"
      canAddPhoto={viewModel.photos.canAddPhoto}
      countLabel={viewModel.photos.countLabel}
      error={viewModel.photos.error}
      helpLabel={viewModel.photos.helpLabel}
      Icon={FoundReportCreationIcon}
      onRemovePhoto={(photoId) =>
        setDraft((current) =>
          removeFoundReportPhoto({
            draft: current,
            photoId,
          }),
        )
      }
      permissionBody={viewModel.photos.permissionBody}
      permissionTitle={viewModel.photos.permissionTitle}
      photos={viewModel.photos.items}
      styles={styles}
      title="Fotos"
    />
  );
}

function FoundReportDetailsStep({
  draft,
  onChangePetBreed,
  onChangePetDescription,
  onSelectPetType,
  setDraft,
  viewModel,
}: {
  draft: FoundReportDraft;
  onChangePetBreed: (value: string) => void;
  onChangePetDescription: (value: string) => void;
  onSelectPetType: (value: FoundReportDraft["pet"]["type"]) => void;
  setDraft: React.Dispatch<React.SetStateAction<FoundReportDraft>>;
  viewModel: FoundReportCreationViewModel;
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
        typeOptions={foundReportPetTypeOptions}
      />
      <ReportCreationDetailsFieldsSection
        fields={[
          {
            field: viewModel.foundDetails.fields.foundAtLabel,
            input: "dateTime",
            key: "foundAtLabel" as const,
          },
          {
            field: viewModel.foundDetails.fields.condition,
            key: "condition" as const,
          },
          {
            field: viewModel.foundDetails.fields.description,
            key: "description" as const,
            multiline: true,
          },
        ]}
        dateTimeAccentColor={foundAccent}
        onChangeField={(key, value) =>
          setDraft((current) => ({
            ...current,
            foundDetails: {
              ...current.foundDetails,
              [key]: value,
            },
          }))
        }
        placeholderTextColor={shellColors.muted}
        styles={styles}
        title={viewModel.foundDetails.title}
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
        <FoundReportCreationIcon
          color={shellColors.white}
          name="hands.sparkles.fill"
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
          accessibilityLabel="Volver del reporte encontrado"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onClose}
          pressRetentionOffset={18}
          style={styles.iconButton}
          testID="report-creation-close-button"
        >
          <FoundReportCreationIcon
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
  error,
  onChooseFoundLocation,
  setDraft,
  viewModel,
}: {
  coordinates?: { latitude: number; longitude: number };
  error?: string;
  onChooseFoundLocation?: () => void;
  setDraft: React.Dispatch<React.SetStateAction<FoundReportDraft>>;
  viewModel: FoundReportCreationViewModel;
}) {
  return (
    <ReportCreationSection styles={styles} title="Ubicación y privacidad">
      <ReportCreationLocationPreview
        accentColor={foundAccent}
        coordinates={coordinates}
        Icon={FoundReportCreationIcon}
        label={viewModel.location.mapPreviewLabel}
      />
      <ReportCreationInfoRow
        accentColor={foundAccent}
        Icon={FoundReportCreationIcon}
        icon="location.fill"
        label="Ubicación interna"
        styles={styles}
        value={viewModel.location.exactInternalLabel}
      />
      <ReportCreationInfoRow
        accentColor={foundAccent}
        Icon={FoundReportCreationIcon}
        icon="circle.grid.2x2.fill"
        label={viewModel.location.publicPrecisionLabel}
        styles={styles}
        value={viewModel.location.approximatePublicLabel}
      />
      {onChooseFoundLocation ? (
        <ReportCreationActionButton
          accentColor={foundAccent}
          Icon={FoundReportCreationIcon}
          icon="map.fill"
          label={
            viewModel.location.hasExactLocation
              ? "Cambiar ubicación"
              : "Elegir ubicación"
          }
          onPress={onChooseFoundLocation}
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
      <ReportCreationErrorText message={error} styles={styles} />
    </ReportCreationSection>
  );
}

function ContactOptionSection({
  setDraft,
  viewModel,
}: {
  setDraft: React.Dispatch<React.SetStateAction<FoundReportDraft>>;
  viewModel: FoundReportCreationViewModel;
}) {
  return (
    <ReportCreationContactOptionSection
      accentColor={foundAccent}
      Icon={FoundReportCreationIcon}
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
          selectFoundReportContactOption({
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
  viewModel: FoundReportCreationViewModel;
}) {
  return (
    <ReportCreationReviewPublishSection
      activityIndicatorColor={shellColors.white}
      canPublish={viewModel.canPublish}
      Icon={FoundReportCreationIcon}
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

function FoundReportStepActions({
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
          accentColor={foundAccent}
          Icon={FoundReportCreationIcon}
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
          accentColor={foundAccent}
          Icon={FoundReportCreationIcon}
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

function toFoundReportJourneyInput(journey: ReportCreationJourney) {
  return {
    completedStepIds: journey.steps
      .filter((step) => step.status === "completed")
      .map((step) => step.id),
    currentStepId: journey.currentStep.id,
  };
}

function getPreviousFoundReportEditableStep(journey: ReportCreationJourney) {
  const currentIndex = getFoundReportCurrentStepIndex(journey);
  const previousStep = journey.steps[currentIndex - 1];

  if (!previousStep || !isFoundReportEditorStepId(previousStep.id)) {
    return undefined;
  }

  return previousStep;
}

function advanceFoundReportJourney(journey: ReportCreationJourney) {
  const currentIndex = getFoundReportCurrentStepIndex(journey);
  const nextStep = journey.steps[currentIndex + 1];

  if (!nextStep) {
    return journey;
  }

  return createReportCreationJourney({
    completedStepIds: [
      ...toFoundReportJourneyInput(journey).completedStepIds,
      journey.currentStep.id,
    ],
    currentStepId: nextStep.id,
    reportType: "found",
  });
}

function retreatFoundReportJourney(journey: ReportCreationJourney) {
  const currentIndex = getFoundReportCurrentStepIndex(journey);
  const previousStep = journey.steps[currentIndex - 1];

  if (!previousStep || !isFoundReportEditorStepId(previousStep.id)) {
    return journey;
  }

  return createReportCreationJourney({
    completedStepIds: toFoundReportJourneyInput(
      journey,
    ).completedStepIds.filter((stepId) => stepId !== previousStep.id),
    currentStepId: previousStep.id,
    reportType: "found",
  });
}

function validateFoundReportCurrentStep({
  draft,
  stepId,
}: {
  draft: FoundReportDraft;
  stepId: FoundReportEditorStepId;
}) {
  return foundReportStepValidators[stepId](draft);
}

type FoundReportStepValidator = (draft: FoundReportDraft) => string[];

const foundReportStepValidators = {
  contact: validateFoundReportContactStep,
  details: validateFoundReportDetailsStep,
  location: validateFoundReportLocationStep,
  photos: validateFoundReportPhotosStep,
  review: validateFoundReportReviewStep,
} satisfies Record<FoundReportEditorStepId, FoundReportStepValidator>;

function validateFoundReportPhotosStep(draft: FoundReportDraft) {
  return draft.photos.length === 0 ? ["Agrega al menos una foto."] : [];
}

function validateFoundReportDetailsStep(draft: FoundReportDraft) {
  const errors: string[] = [];

  if (draft.pet.description.trim().length === 0) {
    errors.push("Agrega señas visibles de la mascota encontrada.");
  }

  if (draft.foundDetails.foundAtLabel.trim().length === 0) {
    errors.push("Indica cuándo fue encontrada.");
  }

  if (draft.foundDetails.condition.trim().length === 0) {
    errors.push("Describe la condición de la mascota encontrada.");
  }

  const foundDescriptionLength = draft.foundDetails.description.trim().length;
  if (foundDescriptionLength === 0) {
    errors.push("Agrega una descripción de la mascota encontrada.");
  } else if (foundDescriptionLength < 10) {
    errors.push("Escribe una descripción de al menos 10 caracteres.");
  }

  return errors;
}

function validateFoundReportLocationStep(draft: FoundReportDraft) {
  return draft.exactFoundLocation ? [] : ["Selecciona dónde fue encontrada."];
}

function validateFoundReportContactStep(draft: FoundReportDraft) {
  if (!draft.contact.inAppChatEnabled && !draft.contact.whatsappEnabled) {
    return ["Elige chat, WhatsApp o ambos."];
  }

  if (
    draft.contact.whatsappEnabled &&
    draft.contact.whatsappPhone.trim().length === 0
  ) {
    return ["Ingresa un número para WhatsApp."];
  }

  return [];
}

function validateFoundReportReviewStep() {
  return [];
}

function getFoundReportCurrentStepIndex(journey: ReportCreationJourney) {
  return journey.steps.findIndex((step) => step.id === journey.currentStep.id);
}

function isFoundReportEditorStepId(
  stepId: ReportCreationJourneyStepId,
): stepId is FoundReportEditorStepId {
  return foundReportEditorStepIds.some(
    (editorStepId) => editorStepId === stepId,
  );
}

function canRenderFoundReportStepActions(stepId: FoundReportEditorStepId) {
  return stepId !== "review";
}

function createFallbackPhoto(index: number): FoundReportPhoto {
  return {
    alt: "Foto de mascota encontrada",
    id: `found-report-photo-${index + 1}`,
    mediaId: `found-report-media-${index + 1}`,
    status: "ready",
    uri: `file:///found-report-photo-${index + 1}.jpg`,
  };
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
    backgroundColor: foundAccent,
    borderColor: foundAccent,
  },
  actionButtonSecondary: {
    backgroundColor: foundAccentSoft,
    borderColor: shellColors.border,
  },
  actionButtonText: {
    color: foundAccent,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonTextPrimary: {
    color: shellColors.white,
  },
  addPhotoText: {
    color: foundAccent,
    fontSize: 12,
    fontWeight: "800",
  },
  addPhotoTile: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: foundAccentSoft,
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
    color: errorAccent,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  eyebrow: {
    color: foundAccent,
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
    backgroundColor: foundAccent,
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
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    position: "relative",
    width: 48,
    zIndex: 2,
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
    backgroundColor: "rgba(29, 122, 82, 0.12)",
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
    backgroundColor: foundAccent,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    left: "48%",
    position: "absolute",
    top: "42%",
    width: 40,
  },
  mapPreview: {
    backgroundColor: "#EAF3EE",
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
    backgroundColor: foundAccentSoft,
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
    backgroundColor: foundAccent,
    borderColor: foundAccent,
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
    borderColor: foundAccent,
    borderWidth: 2,
  },
  selectedPill: {
    backgroundColor: foundAccent,
    borderColor: foundAccent,
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
    backgroundColor: foundAccent,
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
    backgroundColor: foundAccent,
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  switchOn: {
    backgroundColor: foundAccent,
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
