import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { CreationDraftStore } from "../resilience/creation-drafts";
import type {
  PublishSightingReportInput,
  SightingReportCreationSession,
  SightingReportCreationVisitorAction,
  SightingReportDraft,
  SightingReportPhoto,
} from "./sighting-report-creation-types";
import {
  ReportCreationActionButton,
  ReportCreationContactOptionSection,
  ReportCreationDetailsFieldsSection,
  ReportCreationEditorScrollView,
  ReportCreationInfoRow,
  ReportCreationPetSnapshotSection,
  ReportCreationPhotoSection,
  ReportCreationProgressSteps,
  ReportCreationReviewPublishSection,
  ReportCreationSection,
  ReportCreationToggleRow,
  useReportCreationPetDraftUpdaters,
} from "../report-creation/report-creation-ui";
import { useDurableCreationDraft } from "../resilience/use-durable-creation-draft";
import { shellColors } from "../shell/shell-theme";
import { sightingReportCreationFixtures } from "./sighting-report-creation-fixtures";
import { sightingReportPetTypeOptions } from "./sighting-report-creation-types";
import {
  appendSightingReportPhoto,
  buildSightingReportCreationViewModel,
  createSightingReportDraft,
  removeSightingReportPhoto,
  selectSightingReportContactOption,
  toPublishSightingReportInput,
} from "./sighting-report-creation-view-model";

const bottomInset = 36;
const errorAccent = "#D6453D";
const sightingAccent = shellColors.sighting;
const sightingAccentSoft = "#E6F0F7";
const mapPreviewBlocks = Array.from({ length: 12 }, (_, index) => index);

type PublishState = "editing" | "publishing" | "success";
type SightingReportCreationViewModel = ReturnType<
  typeof buildSightingReportCreationViewModel
>;

export interface SightingReportCreationScreenProps {
  draftScopeId?: string;
  draftStore?: CreationDraftStore;
  initialDraft?: SightingReportDraft;
  onChooseSightingLocation?: () => void;
  onClose?: () => void;
  onPublishSightingReport?: (
    input: PublishSightingReportInput,
  ) => Promise<void> | void;
  onRequestMemberSignIn?: (action: SightingReportCreationVisitorAction) => void;
  session?: SightingReportCreationSession;
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
  return (
    <Image
      contentFit="contain"
      source={`sf:${name}`}
      style={{ height: size, width: size }}
      tintColor={color}
    />
  );
}

export function SightingReportCreationScreen({
  draftScopeId,
  draftStore,
  initialDraft,
  onChooseSightingLocation,
  onClose,
  onPublishSightingReport,
  onRequestMemberSignIn,
  session = { kind: "member", memberId: "member-preview" },
}: SightingReportCreationScreenProps) {
  const defaultDraft = React.useMemo(
    () =>
      initialDraft ??
      createSightingReportDraft({
        exactSightingLocation: sightingReportCreationFixtures.defaultLocation,
      }),
    [initialDraft],
  );
  const { clearDraft, draft, setDraft } = useDurableCreationDraft({
    initialDraft: defaultDraft,
    kind: "sighting-report",
    scopeId: draftScopeId,
    store: draftStore,
  });
  const [publishState, setPublishState] =
    React.useState<PublishState>("editing");
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const viewModel = React.useMemo(
    () =>
      buildSightingReportCreationViewModel({
        draft,
        session,
      }),
    [draft, session],
  );

  const addPhoto = React.useCallback(() => {
    const nextPhoto =
      sightingReportCreationFixtures.photoSamples[draft.photos.length] ??
      createFallbackPhoto(draft.photos.length);

    setDraft((current) =>
      appendSightingReportPhoto({
        draft: current,
        photo: nextPhoto,
      }),
    );
  }, [draft.photos.length, setDraft]);

  const publish = React.useCallback(async () => {
    if (!viewModel.canPublish || publishState === "publishing") {
      return;
    }

    setSubmitError(null);
    setPublishState("publishing");

    try {
      await onPublishSightingReport?.(toPublishSightingReportInput({ draft }));
      await clearDraft();
      setPublishState("success");
    } catch {
      setSubmitError("No pudimos publicar. Tu informacion sigue aqui.");
      setPublishState("editing");
    }
  }, [
    clearDraft,
    draft,
    onPublishSightingReport,
    publishState,
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

  if (publishState === "success") {
    return (
      <SightingReportCreationSuccess onClose={onClose} viewModel={viewModel} />
    );
  }

  return (
    <SightingReportCreationEditor
      addPhoto={addPhoto}
      draft={draft}
      onChooseSightingLocation={onChooseSightingLocation}
      onClose={onClose}
      publish={publish}
      publishState={publishState}
      setDraft={setDraft}
      submitError={submitError}
      viewModel={viewModel}
    />
  );
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
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
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
          Rastro guardara esta accion para que puedas continuar como miembro.
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
    </ScrollView>
  );
}

function SightingReportCreationSuccess({
  onClose,
  viewModel,
}: {
  onClose?: () => void;
  viewModel: SightingReportCreationViewModel;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
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
      <View style={styles.buttonRow}>
        <ReportCreationActionButton
          accentColor={sightingAccent}
          Icon={SightingReportCreationIcon}
          icon="square.and.arrow.up"
          label={viewModel.success.shareActionLabel}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
        <ReportCreationActionButton
          accentColor={sightingAccent}
          Icon={SightingReportCreationIcon}
          icon="list.bullet.rectangle"
          label={viewModel.success.primaryActionLabel}
          onPress={onClose}
          primaryTextColor={shellColors.white}
          styles={styles}
        />
      </View>
    </ScrollView>
  );
}

function SightingReportCreationEditor({
  addPhoto,
  draft,
  onChooseSightingLocation,
  onClose,
  publish,
  publishState,
  setDraft,
  submitError,
  viewModel,
}: {
  addPhoto: () => void;
  draft: SightingReportDraft;
  onChooseSightingLocation?: () => void;
  onClose?: () => void;
  publish: () => void;
  publishState: PublishState;
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  submitError: string | null;
  viewModel: SightingReportCreationViewModel;
}) {
  const sightingPetDraft = useReportCreationPetDraftUpdaters(setDraft);

  return (
    <ReportCreationEditorScrollView bottomInset={bottomInset} styles={styles}>
      <CreationHeader
        eyebrow={viewModel.header.eyebrow}
        onClose={onClose}
        title={viewModel.title}
      />
      <ReportCreationProgressSteps steps={viewModel.steps} styles={styles} />
      <ReportCreationPetSnapshotSection
        breedField={viewModel.pet.fields.breed}
        descriptionField={viewModel.pet.fields.description}
        onChangeBreed={sightingPetDraft.updatePetBreed}
        onChangeDescription={sightingPetDraft.updatePetDescription}
        onSelectType={sightingPetDraft.updatePetType}
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
      <LocationPrivacySection
        onChooseSightingLocation={onChooseSightingLocation}
        setDraft={setDraft}
        viewModel={viewModel}
      />
      <ContactOptionSection setDraft={setDraft} viewModel={viewModel} />
      <ReviewPublishSection
        publish={publish}
        publishState={publishState}
        submitError={submitError}
        viewModel={viewModel}
      />
    </ReportCreationEditorScrollView>
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
          accessibilityLabel="Cerrar avistamiento"
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
  onChooseSightingLocation,
  setDraft,
  viewModel,
}: {
  onChooseSightingLocation?: () => void;
  setDraft: React.Dispatch<React.SetStateAction<SightingReportDraft>>;
  viewModel: SightingReportCreationViewModel;
}) {
  return (
    <ReportCreationSection styles={styles} title="Ubicacion y privacidad">
      <View style={styles.mapPreview}>
        <View style={styles.mapGrid}>
          {mapPreviewBlocks.map((index) => (
            <View key={index} style={styles.mapBlock} />
          ))}
        </View>
        <View style={styles.mapPin}>
          <SightingReportCreationIcon
            color={shellColors.white}
            name="mappin"
            size={22}
          />
        </View>
        <Text maxFontSizeMultiplier={1.15} style={styles.mapLabel}>
          {viewModel.location.mapPreviewLabel}
        </Text>
      </View>
      <ReportCreationInfoRow
        accentColor={sightingAccent}
        Icon={SightingReportCreationIcon}
        icon="location.fill"
        label="Ubicacion interna"
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
              ? "Cambiar ubicacion"
              : "Elegir ubicacion"
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
  return (
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
      publishState={publishState}
      rows={viewModel.review.rows}
      styles={styles}
      submitError={submitError}
      validationErrors={viewModel.review.validationErrors}
    />
  );
}

function createFallbackPhoto(index: number): SightingReportPhoto {
  return {
    alt: "Foto opcional de avistamiento",
    id: `sighting-report-photo-${index + 1}`,
    status: "ready",
    uri: `file:///sighting-report-photo-${index + 1}.jpg`,
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
