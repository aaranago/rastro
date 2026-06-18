import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { PublishAdoptionListingInput } from "../adoption-listings/adoption-listings";
import type { ReportCreationFieldViewModel } from "../report-creation/report-creation-ui";
import type {
  AdoptionListingCreationSession,
  AdoptionListingDraft,
  AdoptionListingPetProfileOption,
  AdoptionListingPhoto,
} from "./adoption-listing-creation-types";
import {
  ReportCreationActionButton,
  ReportCreationContactOptionSection,
  ReportCreationDetailsFieldsSection,
  ReportCreationEditorScrollView,
  ReportCreationExistingPetProfileList,
  ReportCreationField,
  ReportCreationInfoRow,
  ReportCreationInlinePetTypeRow,
  ReportCreationPhotoSection,
  ReportCreationProgressSteps,
  ReportCreationReviewPublishSection,
  ReportCreationSection,
  ReportCreationToggleRow,
} from "../report-creation/report-creation-ui";
import { shellColors } from "../shell/shell-theme";
import { adoptionListingCreationFixtures } from "./adoption-listing-creation-fixtures";
import {
  adoptionListingPetTypeOptions,
  appendAdoptionListingPhoto,
  buildAdoptionListingCreationViewModel,
  createAdoptionListingDraft,
  createInitialAdoptionListingDraft,
  removeAdoptionListingPhoto,
  selectAdoptionListingContactOption,
  toPublishAdoptionListingInput,
} from "./adoption-listing-creation-view-model";

const adoptionAccent = shellColors.adoption;
const adoptionAccentSoft = "#F8E9EE";
const bottomInset = 36;
const errorAccent = "#D6453D";
const mapPreviewBlocks = Array.from({ length: 12 }, (_, index) => index);

type PublishState = "editing" | "publishing" | "success";
type AdoptionListingCreationViewModel = ReturnType<
  typeof buildAdoptionListingCreationViewModel
>;

export interface AdoptionListingCreationScreenProps {
  initialDraft?: AdoptionListingDraft;
  onClose?: () => void;
  onPublishAdoptionListing?: (
    input: PublishAdoptionListingInput,
  ) => Promise<void> | void;
  petProfiles?: readonly AdoptionListingPetProfileOption[];
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
  return (
    <Image
      contentFit="contain"
      source={`sf:${name}`}
      style={{ height: size, width: size }}
      tintColor={color}
    />
  );
}

export function AdoptionListingCreationScreen({
  initialDraft,
  onClose,
  onPublishAdoptionListing,
  petProfiles = adoptionListingCreationFixtures.petProfiles,
  session = { kind: "member", memberId: "member-preview" },
}: AdoptionListingCreationScreenProps) {
  const [draft, setDraft] = React.useState<AdoptionListingDraft>(
    () =>
      initialDraft ??
      createAdoptionListingDraft({
        ...createInitialAdoptionListingDraft({ petProfiles }),
        exactLocation: adoptionListingCreationFixtures.defaultLocation,
      }),
  );
  const [publishState, setPublishState] =
    React.useState<PublishState>("editing");
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const viewModel = React.useMemo(
    () =>
      buildAdoptionListingCreationViewModel({
        draft,
        petProfiles,
        session,
      }),
    [draft, petProfiles, session],
  );

  const addPhoto = React.useCallback(() => {
    const nextPhoto =
      adoptionListingCreationFixtures.photoSamples[draft.photos.length] ??
      createFallbackPhoto(draft.photos.length);

    setDraft((current) =>
      appendAdoptionListingPhoto({
        draft: current,
        photo: nextPhoto,
      }),
    );
  }, [draft.photos.length]);

  const publish = React.useCallback(async () => {
    if (!viewModel.canPublish || publishState === "publishing") {
      return;
    }

    setSubmitError(null);
    setPublishState("publishing");

    try {
      await onPublishAdoptionListing?.(
        toPublishAdoptionListingInput({ draft, petProfiles }),
      );
      setPublishState("success");
    } catch {
      setSubmitError("No pudimos publicar. Tu informacion sigue aqui.");
      setPublishState("editing");
    }
  }, [
    draft,
    onPublishAdoptionListing,
    petProfiles,
    publishState,
    viewModel.canPublish,
  ]);

  if (publishState === "success") {
    return (
      <AdoptionListingCreationSuccess onClose={onClose} viewModel={viewModel} />
    );
  }

  return (
    <AdoptionListingCreationEditor
      addPhoto={addPhoto}
      draft={draft}
      onClose={onClose}
      publish={publish}
      publishState={publishState}
      setDraft={setDraft}
      submitError={submitError}
      viewModel={viewModel}
    />
  );
}

function AdoptionListingCreationSuccess({
  onClose,
  viewModel,
}: {
  onClose?: () => void;
  viewModel: AdoptionListingCreationViewModel;
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
          <AdoptionListingCreationIcon
            color={shellColors.white}
            name="heart.fill"
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
          accentColor={adoptionAccent}
          Icon={AdoptionListingCreationIcon}
          icon="square.and.arrow.up"
          label={viewModel.success.shareActionLabel}
          primaryTextColor={shellColors.white}
          styles={styles}
          variant="secondary"
        />
        <ReportCreationActionButton
          accentColor={adoptionAccent}
          Icon={AdoptionListingCreationIcon}
          icon="heart.text.square.fill"
          label={viewModel.success.primaryActionLabel}
          onPress={onClose}
          primaryTextColor={shellColors.white}
          styles={styles}
        />
      </View>
    </ScrollView>
  );
}

function AdoptionListingCreationEditor({
  addPhoto,
  draft,
  onClose,
  publish,
  publishState,
  setDraft,
  submitError,
  viewModel,
}: {
  addPhoto: () => void;
  draft: AdoptionListingDraft;
  onClose?: () => void;
  publish: () => void;
  publishState: PublishState;
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  submitError: string | null;
  viewModel: AdoptionListingCreationViewModel;
}) {
  return (
    <ReportCreationEditorScrollView bottomInset={bottomInset} styles={styles}>
      <CreationHeader onClose={onClose} title={viewModel.title} />
      <ReportCreationProgressSteps steps={viewModel.steps} styles={styles} />
      <PetProfileSection
        draft={draft}
        setDraft={setDraft}
        viewModel={viewModel}
      />
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
      <ReportCreationPhotoSection
        accentColor={adoptionAccent}
        addPhoto={addPhoto}
        addPhotoAccessibilityLabel="Agregar foto"
        canAddPhoto={viewModel.photos.canAddPhoto}
        countLabel={viewModel.photos.countLabel}
        error={viewModel.photos.error}
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
        photos={viewModel.photos.items}
        styles={styles}
        title="Fotos"
      />
      <LocationPrivacySection setDraft={setDraft} viewModel={viewModel} />
      <ContactOptionSection setDraft={setDraft} viewModel={viewModel} />
      <VerificationSection viewModel={viewModel} />
      <ReportCreationReviewPublishSection
        activityIndicatorColor={shellColors.white}
        canPublish={viewModel.canPublish}
        Icon={AdoptionListingCreationIcon}
        onPublish={publish}
        publishActionLabel={viewModel.review.publishActionLabel}
        publishState={publishState}
        rows={viewModel.review.rows}
        styles={styles}
        submitError={submitError}
        validationErrors={viewModel.review.validationErrors}
      />
    </ReportCreationEditorScrollView>
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
          accessibilityLabel="Cerrar adopcion"
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
        <InlinePetForm draft={draft} setDraft={setDraft} />
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
}: {
  draft: AdoptionListingDraft;
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
}) {
  const inline = buildAdoptionListingCreationViewModel({
    draft,
    petProfiles: [],
  }).petSelection.inlineForm;

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
  setDraft,
  viewModel,
}: {
  setDraft: React.Dispatch<React.SetStateAction<AdoptionListingDraft>>;
  viewModel: AdoptionListingCreationViewModel;
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
          <AdoptionListingCreationIcon
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
