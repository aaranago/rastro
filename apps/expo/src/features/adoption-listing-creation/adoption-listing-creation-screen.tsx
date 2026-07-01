import type { ScrollView } from "react-native";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PublishAdoptionListingInput } from "../adoption-listings/adoption-listings";
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
  AdoptionListingCreationSession,
  AdoptionListingDraft,
  AdoptionListingPetProfileOption,
  AdoptionListingPhoto,
} from "./adoption-listing-creation-types";
import type {
  AdoptionListingCreationJourneyInput,
  AdoptionListingCreationValidationDisplayInput,
} from "./adoption-listing-creation-view-model";
import {
  advanceReportCreationJourney,
  retreatReportCreationJourney,
} from "../report-creation/report-creation-journey";
import { publishReportCreation } from "../report-creation/report-creation-publish";
import {
  ReportCreationActionButton,
  ReportCreationContactOptionSection,
  ReportCreationDetailsFieldsSection,
  ReportCreationDraftPersistenceAlert,
  ReportCreationDraftRecoveryPrompt,
  ReportCreationErrorText,
  ReportCreationExistingPetProfileList,
  ReportCreationField,
  ReportCreationInfoRow,
  ReportCreationInlinePetTypeRow,
  ReportCreationLocationPreview,
  ReportCreationPhotoSection,
  ReportCreationProgressSteps,
  ReportCreationPublishConfirmationModal,
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
import { adoptionListingCreationFixtures } from "./adoption-listing-creation-fixtures";
import {
  adoptionListingPetTypeOptions,
  appendAdoptionListingPhoto,
  buildAdoptionListingCreationViewModel,
  createInitialAdoptionListingDraft,
  removeAdoptionListingPhoto,
  selectAdoptionListingContactOption,
  toPublishAdoptionListingInput,
} from "./adoption-listing-creation-view-model";

const adoptionAccent = shellColors.adoption;
const adoptionAccentSoft = "#F8E9EE";
const errorAccent = "#D6453D";
const listingPhotoLimit = 5;
const editableStepIds = [
  "photos",
  "details",
  "location",
  "contact",
  "review",
] as const satisfies readonly ReportCreationJourneyStepId[];

type PublishState = "confirming" | "editing" | "publishing" | "success";
export interface AdoptionListingPublishConfirmation {
  id: string;
  status: string;
}
type AdoptionEditableStepId = (typeof editableStepIds)[number];
type AdoptionListingCreationViewModel = ReturnType<
  typeof buildAdoptionListingCreationViewModel
>;

export interface AdoptionListingCreationScreenProps {
  draftScopeId?: string;
  draftStore?: CreationDraftStore;
  initialDraft?: AdoptionListingDraft;
  locationAdapter?: NearbyLocationAdapter;
  onChooseAdoptionLocation?: () => void;
  onClose?: () => void;
  onDraftPublished?: () => void;
  onOpenPublishedListing?: (
    confirmation: AdoptionListingPublishConfirmation,
  ) => void;
  onPublishAdoptionListing?: (
    input: PublishAdoptionListingInput,
  ) =>
    | AdoptionListingPublishConfirmation
    | Promise<AdoptionListingPublishConfirmation | void>
    | void;
  onSharePublishedListing?: (
    confirmation: AdoptionListingPublishConfirmation,
  ) => Promise<void> | void;
  petProfiles?: readonly AdoptionListingPetProfileOption[];
  pickAdoptionListingPhoto?: () =>
    | AdoptionListingPhoto
    | Promise<AdoptionListingPhoto | undefined>
    | undefined;
  renderReportMediaManager?: (props: {
    mediaDraftId: string;
    onControllerChange?: (controller: ReportMediaStepController | null) => void;
    onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
    photos: readonly AdoptionListingPhoto[];
  }) => React.ReactNode;
  session?: AdoptionListingCreationSession;
}

function AdoptionListingCreationIcon({
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

export function AdoptionListingCreationScreen({
  draftScopeId,
  draftStore,
  initialDraft,
  locationAdapter,
  onChooseAdoptionLocation,
  onClose,
  onDraftPublished,
  onOpenPublishedListing,
  onPublishAdoptionListing,
  onSharePublishedListing,
  petProfiles = [],
  pickAdoptionListingPhoto,
  renderReportMediaManager,
  session = { kind: "member", memberId: "member-preview" },
}: AdoptionListingCreationScreenProps) {
  const defaultDraft = React.useMemo(
    () => initialDraft ?? createInitialAdoptionListingDraft({ petProfiles }),
    [initialDraft, petProfiles],
  );
  const {
    clearDraft,
    discardDraft,
    draft,
    draftPersistence,
    draftRecovery,
    draftResetVersion,
    restoredDraft,
    resumeDraft,
    setDraft,
  } = useDurableCreationDraft({
    initialDraft: defaultDraft,
    kind: "adoption-listing",
    recoveryMode: "explicit",
    scopeId: draftScopeId,
    store: draftStore,
  });
  const [publishState, setPublishState] =
    React.useState<PublishState>("editing");
  const [publishedListing, setPublishedListing] =
    React.useState<AdoptionListingPublishConfirmation | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [journey, setJourney] =
    React.useState<AdoptionListingCreationJourneyInput>(() =>
      buildInitialAdoptionListingJourney({
        draft,
        petProfiles,
        session,
      }),
    );
  const [validationDisplay, setValidationDisplay] =
    React.useState<AdoptionListingCreationValidationDisplayInput>({});
  const mediaControllerRef = React.useRef<ReportMediaStepController | null>(
    null,
  );
  const draftResetToken = `${restoredDraft?.savedAt ?? "fresh"}:${draftResetVersion}`;
  const draftResetTokenRef = React.useRef(draftResetToken);

  React.useEffect(() => {
    if (draftResetTokenRef.current === draftResetToken) {
      return;
    }

    draftResetTokenRef.current = draftResetToken;
    setJourney(
      buildInitialAdoptionListingJourney({
        draft,
        petProfiles,
        session,
      }),
    );
    setValidationDisplay({});
  }, [draft, draftResetToken, petProfiles, session]);

  const publishLockRef = React.useRef(false);
  const viewModel = React.useMemo(
    () =>
      buildAdoptionListingCreationViewModel({
        draft,
        journey,
        petProfiles,
        session,
        validationDisplay,
      }),
    [draft, journey, petProfiles, session, validationDisplay],
  );

  const continueToNextStep = React.useCallback(async () => {
    let draftForValidation = draft;

    if (
      viewModel.journey.currentStep.id === "photos" &&
      mediaControllerRef.current
    ) {
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

    const validationResult = validateCurrentAdoptionListingStep({
      draft: draftForValidation,
      petProfiles,
      session,
      stepId: viewModel.journey.currentStep.id,
    });

    if (!validationResult.ok) {
      setValidationDisplay({
        attemptedStepId: viewModel.journey.currentStep.id,
      });
      return;
    }

    const transition = advanceReportCreationJourney(viewModel.journey);

    if (!transition.ok) {
      return;
    }

    setJourney(toAdoptionListingJourneyInput(transition.journey));
    setValidationDisplay({});
  }, [draft, petProfiles, session, setDraft, viewModel.journey]);

  const returnToPreviousStep = React.useCallback(() => {
    const transition = retreatReportCreationJourney(viewModel.journey);

    if (!transition.ok) {
      return;
    }

    setJourney(toAdoptionListingJourneyInput(transition.journey));
    setValidationDisplay({});
  }, [viewModel.journey]);

  const addPhoto = React.useCallback(async () => {
    if (pickAdoptionListingPhoto) {
      const pickedPhoto = await pickAdoptionListingPhoto();

      if (!pickedPhoto) {
        return;
      }

      setDraft((current) =>
        appendAdoptionListingPhoto({
          draft: current,
          photo: pickedPhoto,
        }),
      );
      return;
    }

    const nextPhoto =
      adoptionListingCreationFixtures.photoSamples[draft.photos.length] ??
      createFallbackPhoto(draft.photos.length);

    setDraft((current) =>
      appendAdoptionListingPhoto({
        draft: current,
        photo: nextPhoto,
      }),
    );
  }, [draft.photos.length, pickAdoptionListingPhoto, setDraft]);
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
    onChooseLocation: onChooseAdoptionLocation,
    setDraft,
  });

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
    setPublishedListing(null);
    setPublishState("publishing");

    const result = await publishReportCreation({
      clearDraft,
      input: toPublishAdoptionListingInput({ draft, petProfiles }),
      publishHandler: onPublishAdoptionListing,
      publishLock: publishLockRef,
    });

    if (result.ok) {
      setPublishedListing(result.confirmation ?? null);
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
    draft,
    clearDraft,
    onDraftPublished,
    onPublishAdoptionListing,
    petProfiles,
    publishState,
    viewModel.canPublish,
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
      <AdoptionListingCreationSuccess
        onClose={onClose}
        onOpenPublishedListing={onOpenPublishedListing}
        onSharePublishedListing={onSharePublishedListing}
        publishedListing={publishedListing}
        viewModel={viewModel}
      />
    );
  }

  return (
    <AdoptionListingCreationEditor
      addPhoto={addPhoto}
      confirmationOverlay={
        publishState === "confirming" || publishState === "publishing" ? (
          <ReportCreationPublishConfirmationModal
            activityIndicatorColor={shellColors.white}
            body="Al confirmar, Rastro enviara esta adopcion al backend. Si Review Mode esta activo quedara pendiente de revision; si no, se publicara."
            canConfirm={viewModel.canPublish}
            Icon={AdoptionListingCreationIcon}
            onCancel={cancelPublishConfirmation}
            onConfirm={confirmPublish}
            publishState={toReportCreationPublishState(publishState)}
            rows={buildAdoptionListingPublishConfirmationRows(viewModel)}
            title="Confirmar publicacion"
          />
        ) : null
      }
      draft={draft}
      draftPersistence={draftPersistence}
      draftRecovery={draftRecovery}
      onDiscardRecoveredDraft={discardDraft}
      onChooseLocation={openLocationPicker}
      onClose={onClose}
      onContinue={continueToNextStep}
      onMediaControllerChange={(controller) => {
        mediaControllerRef.current = controller;
      }}
      onPrevious={returnToPreviousStep}
      onResumeRecoveredDraft={resumeDraft}
      publish={requestPublishConfirmation}
      publishState={publishState}
      renderReportMediaManager={renderReportMediaManager}
      setDraft={setDraft}
      submitError={submitError}
      validationDisplay={validationDisplay}
      viewModel={viewModel}
    />
  );
}

function AdoptionListingCreationSuccess({
  onClose,
  onOpenPublishedListing,
  onSharePublishedListing,
  publishedListing,
  viewModel,
}: {
  onClose?: () => void;
  onOpenPublishedListing?: (
    confirmation: AdoptionListingPublishConfirmation,
  ) => void;
  onSharePublishedListing?: (
    confirmation: AdoptionListingPublishConfirmation,
  ) => Promise<void> | void;
  publishedListing: AdoptionListingPublishConfirmation | null;
  viewModel: AdoptionListingCreationViewModel;
}) {
  const { canSharePublishedResult, openPublishedResult, sharePublishedResult } =
    useReportCreationPublishedResultActions({
      onClose,
      onOpenPublishedResult: onOpenPublishedListing,
      onSharePublishedResult: onSharePublishedListing,
      publishedResult: publishedListing,
    });
  const successCopy = getAdoptionListingSuccessCopy({
    publishedListing,
    viewModel,
  });
  const canShare = canSharePublishedResult && successCopy.canShare;

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <View style={styles.successHero}>
        <View style={styles.successIcon}>
          <AdoptionListingCreationIcon
            color={shellColors.white}
            name="heart.fill"
            size={34}
          />
        </View>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>
          {successCopy.title}
        </Text>
        <Text maxFontSizeMultiplier={1.25} style={styles.bodyText}>
          {successCopy.body}
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <ReportCreationActionButton
          accentColor={adoptionAccent}
          disabled={!canShare}
          Icon={AdoptionListingCreationIcon}
          icon="square.and.arrow.up"
          label={successCopy.shareActionLabel}
          onPress={sharePublishedResult}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
        <ReportCreationActionButton
          accentColor={adoptionAccent}
          Icon={AdoptionListingCreationIcon}
          icon="heart.text.square.fill"
          label={successCopy.primaryActionLabel}
          onPress={openPublishedResult}
          primaryTextColor={shellColors.white}
          styles={styles}
        />
      </View>
    </ReportCreationScreenFrame>
  );
}

function getAdoptionListingSuccessCopy({
  publishedListing,
  viewModel,
}: {
  publishedListing: AdoptionListingPublishConfirmation | null;
  viewModel: AdoptionListingCreationViewModel;
}) {
  if (publishedListing?.status === "pending_review") {
    return {
      body: "Tu adopcion fue recibida y queda en Review Mode. El equipo la revisara antes de mostrarla publicamente.",
      canShare: false,
      primaryActionLabel: "Ver estado",
      shareActionLabel: "Compartir",
      title: "Adopcion enviada a revision",
    };
  }

  return {
    body: viewModel.success.body,
    canShare: true,
    primaryActionLabel: viewModel.success.primaryActionLabel,
    shareActionLabel: viewModel.success.shareActionLabel,
    title: viewModel.success.title,
  };
}

function buildAdoptionListingPublishConfirmationRows(
  viewModel: AdoptionListingCreationViewModel,
) {
  return [
    {
      label: "Tipo",
      value: "Adopcion",
    },
    {
      label: "Estado",
      value: "Publica o pendiente de revision por Review Mode",
    },
    {
      label: "Hora",
      value: "Se registrara al confirmar",
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

function AdoptionListingCreationEditor({
  addPhoto,
  confirmationOverlay,
  draft,
  draftPersistence,
  draftRecovery,
  onDiscardRecoveredDraft,
  onChooseLocation,
  onClose,
  onContinue,
  onMediaControllerChange,
  onPrevious,
  onResumeRecoveredDraft,
  publish,
  publishState,
  renderReportMediaManager,
  setDraft,
  submitError,
  validationDisplay,
  viewModel,
}: {
  addPhoto: () => void;
  confirmationOverlay?: React.ReactNode;
  draft: AdoptionListingDraft;
  draftPersistence: DurableCreationDraftPersistence;
  draftRecovery: DurableCreationDraftRecovery<"adoption-listing">;
  onDiscardRecoveredDraft: () => Promise<void>;
  onChooseLocation: () => void;
  onClose?: () => void;
  onContinue: () => Promise<void> | void;
  onMediaControllerChange?: (
    controller: ReportMediaStepController | null,
  ) => void;
  onPrevious: () => void;
  onResumeRecoveredDraft: () => void;
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: AdoptionListingCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  submitError: string | null;
  validationDisplay: AdoptionListingCreationValidationDisplayInput;
  viewModel: AdoptionListingCreationViewModel;
}) {
  const scrollViewRef = React.useRef<ScrollView>(null);
  const scrollToActiveStep = React.useCallback(() => {
    scrollViewRef.current?.scrollTo({ animated: true, y: 0 });
  }, []);
  const continueAndScroll = React.useCallback(async () => {
    await onContinue();
    scrollToActiveStep();
  }, [onContinue, scrollToActiveStep]);
  const previousAndScroll = React.useCallback(() => {
    onPrevious();
    scrollToActiveStep();
  }, [onPrevious, scrollToActiveStep]);

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      footer={
        shouldShowStepActions(viewModel.journey.currentStep.id) ? (
          <StepActions
            canContinue={viewModel.journey.currentStep.id !== "review"}
            canGoBack={hasPreviousEditableStep(
              viewModel.journey.currentStep.id,
            )}
            onContinue={continueAndScroll}
            onPrevious={previousAndScroll}
          />
        ) : undefined
      }
      overlay={confirmationOverlay}
      scrollViewRef={scrollViewRef}
      style={styles.screen}
    >
      <CreationHeader onClose={onClose} title={viewModel.title} />
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
      <CurrentStepContent
        addPhoto={addPhoto}
        draft={draft}
        onChooseLocation={onChooseLocation}
        onMediaControllerChange={onMediaControllerChange}
        publish={publish}
        publishState={publishState}
        renderReportMediaManager={renderReportMediaManager}
        setDraft={setDraft}
        submitError={submitError}
        validationDisplay={validationDisplay}
        viewModel={viewModel}
      />
    </ReportCreationScreenFrame>
  );
}

function CurrentStepContent({
  addPhoto,
  draft,
  onChooseLocation,
  onMediaControllerChange,
  publish,
  publishState,
  renderReportMediaManager,
  setDraft,
  submitError,
  validationDisplay,
  viewModel,
}: {
  addPhoto: () => void;
  draft: AdoptionListingDraft;
  onChooseLocation: () => void;
  onMediaControllerChange?: (
    controller: ReportMediaStepController | null,
  ) => void;
  publish: () => void;
  publishState: PublishState;
  renderReportMediaManager?: AdoptionListingCreationScreenProps["renderReportMediaManager"];
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  submitError: string | null;
  validationDisplay: AdoptionListingCreationValidationDisplayInput;
  viewModel: AdoptionListingCreationViewModel;
}) {
  if (viewModel.journey.currentStep.id === "photos") {
    const photoStepError = getAdoptionListingPhotoStepError({
      draft,
      validationDisplay,
      viewModel,
    });
    const renderedReportMediaManager = renderReportMediaManager?.({
      mediaDraftId: draft.id,
      onControllerChange: onMediaControllerChange,
      onSnapshotChange: (snapshot) =>
        setDraft((current) => ({
          ...current,
          photos: reportMediaSnapshotToCreationPhotos(snapshot),
        })),
      photos: draft.photos,
    });

    return (
      <>
        <PetProfileSection
          draft={draft}
          setDraft={setDraft}
          viewModel={viewModel}
        />
        {renderedReportMediaManager ? (
          <ReportCreationSection styles={styles} title="Fotos">
            {renderedReportMediaManager}
            {photoStepError ? (
              <Text maxFontSizeMultiplier={1.2} style={styles.errorText}>
                {photoStepError}
              </Text>
            ) : null}
          </ReportCreationSection>
        ) : (
          <ReportCreationPhotoSection
            accentColor={adoptionAccent}
            addPhoto={addPhoto}
            addPhotoAccessibilityLabel="Agregar foto"
            canAddPhoto={draft.photos.length < listingPhotoLimit}
            countLabel={formatAdoptionListingPhotoCount(draft.photos.length)}
            error={photoStepError}
            helpLabel={viewModel.photos.helpLabel}
            Icon={AdoptionListingCreationIcon}
            onRemovePhoto={(photoId) =>
              setDraft((current) =>
                removeAdoptionListingPhoto({
                  draft: current,
                  photoId,
                }),
              )
            }
            permissionBody={viewModel.photos.permissionBody}
            permissionTitle={viewModel.photos.permissionTitle}
            photos={draft.photos.slice(0, listingPhotoLimit)}
            styles={styles}
            title="Fotos"
          />
        )}
      </>
    );
  }

  if (viewModel.journey.currentStep.id === "details") {
    return (
      <ReportCreationDetailsFieldsSection
        fields={[
          {
            field: viewModel.adoptionDetails.fields.adoptionSummary,
            key: "adoptionSummary" as const,
            multiline: true,
          },
          {
            field: viewModel.adoptionDetails.fields.idealHome,
            key: "idealHome" as const,
            multiline: true,
          },
          {
            field: viewModel.adoptionDetails.fields.healthNotes,
            key: "healthNotes" as const,
            multiline: true,
          },
        ]}
        onChangeField={(key, value) =>
          setDraft((current) => ({
            ...current,
            adoptionDetails: {
              ...current.adoptionDetails,
              [key]: value,
            },
          }))
        }
        placeholderTextColor={shellColors.muted}
        styles={styles}
        title={viewModel.adoptionDetails.title}
      />
    );
  }

  if (viewModel.journey.currentStep.id === "location") {
    const locationError =
      validationDisplay.attemptedStepId === "location" && !draft.exactLocation
        ? "Selecciona la ubicacion interna."
        : undefined;

    return (
      <LocationPrivacySection
        coordinates={draft.exactLocation?.coordinates}
        error={locationError}
        onChooseLocation={onChooseLocation}
        setDraft={setDraft}
        viewModel={viewModel}
      />
    );
  }

  if (viewModel.journey.currentStep.id === "contact") {
    return <ContactOptionSection setDraft={setDraft} viewModel={viewModel} />;
  }

  if (viewModel.journey.currentStep.id === "review") {
    return (
      <>
        <VerificationSection viewModel={viewModel} />
        <ReportCreationReviewPublishSection
          activityIndicatorColor={shellColors.white}
          canPublish={viewModel.canPublish}
          Icon={AdoptionListingCreationIcon}
          onPublish={publish}
          publishActionLabel={viewModel.review.publishActionLabel}
          publishState={toReportCreationPublishState(publishState)}
          rows={viewModel.review.rows}
          styles={styles}
          submitError={submitError}
          validationErrors={viewModel.review.validationErrors}
        />
      </>
    );
  }

  return null;
}

function StepActions({
  canContinue,
  canGoBack,
  onContinue,
  onPrevious,
}: {
  canContinue: boolean;
  canGoBack: boolean;
  onContinue: () => void;
  onPrevious: () => void;
}) {
  return (
    <View style={styles.buttonRow}>
      {canGoBack ? (
        <ReportCreationActionButton
          accentColor={adoptionAccent}
          Icon={AdoptionListingCreationIcon}
          icon="chevron.left"
          label="Atrás"
          onPress={onPrevious}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
      ) : null}
      {canContinue ? (
        <ReportCreationActionButton
          accentColor={adoptionAccent}
          Icon={AdoptionListingCreationIcon}
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

function buildInitialAdoptionListingJourney({
  draft,
  petProfiles,
  session,
}: {
  draft: AdoptionListingDraft;
  petProfiles: readonly AdoptionListingPetProfileOption[];
  session: AdoptionListingCreationSession;
}): AdoptionListingCreationJourneyInput {
  const inferredViewModel = buildAdoptionListingCreationViewModel({
    draft,
    petProfiles,
    session,
    validationDisplay: {},
  });

  if (draft.photos.length === 0) {
    return {
      completedStepIds: ["chooseType"],
      currentStepId: "photos",
    };
  }

  return toAdoptionListingJourneyInput(inferredViewModel.journey);
}

function validateCurrentAdoptionListingStep({
  draft,
  petProfiles,
  session,
  stepId,
}: {
  draft: AdoptionListingDraft;
  petProfiles: readonly AdoptionListingPetProfileOption[];
  session: AdoptionListingCreationSession;
  stepId: ReportCreationJourneyStepId;
}) {
  const attemptedViewModel = buildAdoptionListingCreationViewModel({
    draft,
    journey: {
      completedStepIds: [],
      currentStepId: stepId,
    },
    petProfiles,
    session,
    validationDisplay: {
      attemptedStepId: stepId,
    },
  });
  const errors: string[] = [];

  if (stepId === "photos") {
    if (!attemptedViewModel.selectedPet) {
      errors.push("Elige o crea la mascota para la adopcion.");
    }

    if (!hasReadyAdoptionListingPhoto(draft)) {
      errors.push("Agrega al menos una foto.");
    }

    const inlineNameError =
      attemptedViewModel.petSelection.inlineForm.fields.name.error;

    if (inlineNameError) {
      errors.push(inlineNameError);
    }
  }

  if (stepId === "details") {
    const detailsErrors = Object.values(
      attemptedViewModel.adoptionDetails.fields,
    )
      .map((field) => field.error)
      .filter(isDefinedString);

    errors.push(...detailsErrors);
  }

  if (stepId === "location" && !attemptedViewModel.location.hasExactLocation) {
    errors.push("Selecciona la ubicacion interna.");
  }

  if (stepId === "contact") {
    errors.push(
      ...[
        attemptedViewModel.contact.error,
        attemptedViewModel.contact.whatsappField.error,
      ].filter(isDefinedString),
    );
  }

  return errors.length > 0
    ? {
        errors,
        ok: false as const,
      }
    : {
        ok: true as const,
      };
}

function getAdoptionListingPhotoStepError({
  draft,
  validationDisplay,
  viewModel,
}: {
  draft: AdoptionListingDraft;
  validationDisplay: AdoptionListingCreationValidationDisplayInput;
  viewModel: AdoptionListingCreationViewModel;
}) {
  if (
    validationDisplay.attemptedStepId === "photos" &&
    !hasReadyAdoptionListingPhoto(draft)
  ) {
    return "Agrega al menos una foto.";
  }

  return viewModel.photos.error;
}

function hasReadyAdoptionListingPhoto(draft: AdoptionListingDraft) {
  return draft.photos.some(
    (photo) => photo.status === "ready" && Boolean(photo.mediaId),
  );
}

function formatAdoptionListingPhotoCount(count: number) {
  return `${Math.min(count, listingPhotoLimit)}/${listingPhotoLimit} fotos`;
}

function isDefinedString(value: string | undefined): value is string {
  return value !== undefined;
}

function shouldShowStepActions(stepId: ReportCreationJourneyStepId) {
  return isAdoptionEditableStepId(stepId);
}

function hasPreviousEditableStep(stepId: ReportCreationJourneyStepId) {
  const stepIndex = editableStepIds.indexOf(stepId as AdoptionEditableStepId);

  return stepIndex > 0;
}

function isAdoptionEditableStepId(
  stepId: ReportCreationJourneyStepId,
): stepId is AdoptionEditableStepId {
  return editableStepIds.includes(stepId as AdoptionEditableStepId);
}

function toAdoptionListingJourneyInput(
  journey: ReportCreationJourney,
): AdoptionListingCreationJourneyInput {
  return {
    completedStepIds: journey.steps
      .filter((step) => step.status === "completed")
      .map((step) => step.id),
    currentStepId: journey.currentStep.id,
  };
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
        <AdoptionListingCreationIcon
          color={shellColors.white}
          name="heart.fill"
          size={24}
        />
      </View>
      <View style={styles.headerCopy}>
        <Text maxFontSizeMultiplier={1.15} style={styles.eyebrow}>
          Adopcion
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>
          {title}
        </Text>
      </View>
      {onClose ? (
        <Pressable
          accessibilityLabel="Volver de adopcion"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.iconButton}
        >
          <AdoptionListingCreationIcon
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
  draft: AdoptionListingDraft;
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  viewModel: AdoptionListingCreationViewModel;
}) {
  return (
    <ReportCreationSection styles={styles} title="Mascota">
      <View style={styles.segmented}>
        <SegmentButton
          isSelected={draft.petSelectionMode === "existing"}
          label="Usar perfil"
          onPress={() =>
            setDraft((current) => ({
              ...current,
              petSelectionMode: "existing",
            }))
          }
        />
        <SegmentButton
          isSelected={draft.petSelectionMode === "inline-create"}
          label="Crear aqui"
          onPress={() =>
            setDraft((current) => ({
              ...current,
              petSelectionMode: "inline-create",
            }))
          }
        />
      </View>
      {draft.petSelectionMode === "existing" ? (
        <ExistingPetProfileList setDraft={setDraft} viewModel={viewModel} />
      ) : (
        <InlinePetForm
          draft={draft}
          setDraft={setDraft}
          viewModel={viewModel}
        />
      )}
    </ReportCreationSection>
  );
}

function ExistingPetProfileList({
  setDraft,
  viewModel,
}: {
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  viewModel: AdoptionListingCreationViewModel;
}) {
  return (
    <ReportCreationExistingPetProfileList
      accentColor={adoptionAccent}
      Icon={AdoptionListingCreationIcon}
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

function InlinePetForm({
  draft,
  setDraft,
  viewModel,
}: {
  draft: AdoptionListingDraft;
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  viewModel: AdoptionListingCreationViewModel;
}) {
  const inline = viewModel.petSelection.inlineForm;

  return (
    <View style={styles.formStack}>
      <Field
        field={inline.fields.name}
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
        typeOptions={adoptionListingPetTypeOptions}
      />
      <Field
        field={inline.fields.breed}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            inlinePet: { ...current.inlinePet, breed: value },
          }))
        }
      />
      <Field
        multiline
        field={inline.fields.description}
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
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  viewModel: AdoptionListingCreationViewModel;
}) {
  return (
    <ReportCreationSection styles={styles} title="Ubicacion y privacidad">
      <ReportCreationLocationPreview
        accentColor={adoptionAccent}
        coordinates={coordinates}
        Icon={AdoptionListingCreationIcon}
        label={viewModel.location.mapPreviewLabel}
      />
      <ReportCreationInfoRow
        accentColor={adoptionAccent}
        Icon={AdoptionListingCreationIcon}
        icon="location.fill"
        label="Ubicacion interna"
        styles={styles}
        value={viewModel.location.exactInternalLabel}
      />
      <ReportCreationInfoRow
        accentColor={adoptionAccent}
        Icon={AdoptionListingCreationIcon}
        icon="circle.grid.2x2.fill"
        label={viewModel.location.publicPrecisionLabel}
        styles={styles}
        value={viewModel.location.approximatePublicLabel}
      />
      <ReportCreationActionButton
        accentColor={adoptionAccent}
        Icon={AdoptionListingCreationIcon}
        icon="map.fill"
        label={
          viewModel.location.hasExactLocation
            ? "Cambiar ubicacion"
            : "Elegir ubicacion"
        }
        onPress={onChooseLocation}
        primaryTextColor={shellColors.white}
        styles={styles}
        variant="secondary"
      />
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
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  viewModel: AdoptionListingCreationViewModel;
}) {
  return (
    <ReportCreationContactOptionSection
      accentColor={adoptionAccent}
      Icon={AdoptionListingCreationIcon}
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
          selectAdoptionListingContactOption({
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

function VerificationSection({
  viewModel,
}: {
  viewModel: AdoptionListingCreationViewModel;
}) {
  return (
    <ReportCreationSection styles={styles} title="Verificacion">
      <ReportCreationInfoRow
        accentColor={adoptionAccent}
        Icon={AdoptionListingCreationIcon}
        icon={
          viewModel.verificationBadge.visible
            ? "checkmark.seal.fill"
            : "info.circle.fill"
        }
        label="Insignia"
        styles={styles}
        value={viewModel.verificationBadge.label ?? "No requerida"}
      />
    </ReportCreationSection>
  );
}

function Field({
  field,
  multiline,
  onChangeText,
}: {
  field: ReportCreationFieldViewModel;
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <ReportCreationField
      field={field}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholderTextColor={shellColors.muted}
      styles={styles}
    />
  );
}

function SegmentButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.segmentButton, isSelected ? styles.selectedPill : null]}
    >
      <Text
        maxFontSizeMultiplier={1.1}
        style={[
          styles.segmentText,
          isSelected ? styles.selectedPillText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createFallbackPhoto(index: number): AdoptionListingPhoto {
  return {
    alt: "Foto para adopcion",
    id: `adoption-listing-photo-${index + 1}`,
    mediaId: `adoption-listing-media-${index + 1}`,
    status: "ready",
    uri: `file:///adoption-listing-photo-${index + 1}.jpg`,
  };
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: adoptionAccent,
    borderColor: adoptionAccent,
  },
  actionButtonSecondary: {
    backgroundColor: adoptionAccentSoft,
    borderColor: shellColors.border,
  },
  actionButtonText: {
    color: adoptionAccent,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonTextPrimary: {
    color: shellColors.white,
  },
  addPhotoText: {
    color: adoptionAccent,
    fontSize: 12,
    fontWeight: "800",
  },
  addPhotoTile: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: adoptionAccentSoft,
    borderColor: shellColors.border,
    borderCurve: "continuous",
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
    borderCurve: "continuous",
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
    color: adoptionAccent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
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
    backgroundColor: adoptionAccent,
    borderCurve: "continuous",
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
    borderCurve: "continuous",
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
    borderCurve: "continuous",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  input: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
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
    backgroundColor: "rgba(157, 79, 102, 0.12)",
    borderCurve: "continuous",
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
    borderCurve: "continuous",
    borderRadius: 999,
    bottom: 12,
    color: adoptionAccent,
    fontSize: 12,
    fontWeight: "800",
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
  },
  mapPin: {
    alignItems: "center",
    backgroundColor: adoptionAccent,
    borderCurve: "continuous",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    left: "48%",
    position: "absolute",
    top: "42%",
    width: 40,
  },
  mapPreview: {
    backgroundColor: adoptionAccentSoft,
    borderColor: shellColors.border,
    borderCurve: "continuous",
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
    backgroundColor: adoptionAccentSoft,
    borderColor: shellColors.border,
    borderCurve: "continuous",
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
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  petThumb: {
    backgroundColor: shellColors.surfaceMuted,
    borderCurve: "continuous",
    borderRadius: 14,
    height: 54,
    width: 54,
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
    borderCurve: "continuous",
    borderRadius: 16,
    overflow: "hidden",
    width: "31%",
  },
  pressed: {
    opacity: 0.86,
  },
  publishButton: {
    alignItems: "center",
    backgroundColor: adoptionAccent,
    borderColor: adoptionAccent,
    borderCurve: "continuous",
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
    borderCurve: "continuous",
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
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionTitle: {
    color: shellColors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  segmentButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentText: {
    color: adoptionAccent,
    fontSize: 14,
    fontWeight: "800",
  },
  segmented: {
    backgroundColor: adoptionAccentSoft,
    borderCurve: "continuous",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  selectedBorder: {
    borderColor: adoptionAccent,
    borderWidth: 2,
  },
  selectedPill: {
    backgroundColor: adoptionAccent,
  },
  selectedPillText: {
    color: shellColors.white,
  },
  stepDot: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderCurve: "continuous",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepDotComplete: {
    backgroundColor: adoptionAccent,
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
    textAlign: "center",
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
    flexDirection: "row",
    gap: 8,
  },
  successHero: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  successIcon: {
    alignItems: "center",
    backgroundColor: adoptionAccent,
    borderCurve: "continuous",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  switchOn: {
    backgroundColor: adoptionAccent,
  },
  switchThumb: {
    backgroundColor: shellColors.white,
    borderCurve: "continuous",
    borderRadius: 999,
    height: 22,
    width: 22,
  },
  switchThumbOn: {
    marginLeft: 24,
  },
  switchTrack: {
    backgroundColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    padding: 3,
    width: 52,
  },
  title: {
    color: shellColors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  toggleRow: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderCurve: "continuous",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  typePill: {
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  typePillText: {
    color: adoptionAccent,
    fontSize: 13,
    fontWeight: "800",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
