import type { LegendListRenderItemProps } from "@legendapp/list";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LegendList } from "@legendapp/list";

import type {
  PetProfileDraft,
  PetProfilePhoto,
  PetProfilesSessionState,
  PetProfileSummary,
  PetProfileType,
} from "./pet-profile-types";
import type {
  MisMascotasViewModel,
  PetProfileCardViewModel,
  PetProfileDetailViewModel,
  PetProfileFormViewModel,
} from "./pet-profiles-view-model";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import { draftPhotoSamples, petProfileFixtures } from "./pet-profiles-fixtures";
import {
  buildMisMascotasViewModel,
  buildPetProfileFormViewModel,
  createPetProfileFromDraft,
  petProfilePhotoLimit,
} from "./pet-profiles-view-model";

const bottomInset = 140;

export interface MisMascotasScreenProps {
  initialProfiles?: readonly PetProfileSummary[];
  onOpenRelatedRecord?: (recordId: string) => void;
  onRequestAddPhoto?: (draft: PetProfileDraft) => PetProfilePhoto | void;
  onStartReportFromProfile?: (
    profileId: string,
    intent: "lost" | "found" | "sighting" | "adoption",
  ) => void;
  session: PetProfilesSessionState;
}

type FormMode = "create" | "edit";
type MemberMisMascotasViewModel = Extract<
  MisMascotasViewModel,
  { kind: "member" }
>;

interface MisMascotasController {
  addDraftPhoto: () => void;
  beginCreate: () => void;
  beginEdit: (profileId: string) => void;
  cancelForm: () => void;
  draft: PetProfileDraft;
  formViewModel?: PetProfileFormViewModel;
  onOpenRelatedRecord?: (recordId: string) => void;
  onStartReportFromProfile?: MisMascotasScreenProps["onStartReportFromProfile"];
  removeDraftPhoto: (photoId: string) => void;
  selectProfile: (profileId: string) => void;
  submitDraft: () => void;
  updateDraft: (draft: PetProfileDraft) => void;
  viewModel: MisMascotasViewModel;
}

export function MisMascotasScreen(props: MisMascotasScreenProps) {
  const controller = useMisMascotasController(props);

  if (controller.viewModel.kind === "visitor") {
    return <VisitorMisMascotasScreen viewModel={controller.viewModel} />;
  }

  return (
    <MemberMisMascotasScreen
      controller={controller}
      viewModel={controller.viewModel}
    />
  );
}

function useMisMascotasController({
  initialProfiles = petProfileFixtures.profiles,
  onOpenRelatedRecord,
  onRequestAddPhoto,
  onStartReportFromProfile,
  session,
}: MisMascotasScreenProps): MisMascotasController {
  const [profiles, setProfiles] = useState<PetProfileSummary[]>(() =>
    cloneProfiles(initialProfiles),
  );
  const [selectedProfileId, setSelectedProfileId] = useState(
    () => initialProfiles[0]?.id,
  );
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [draft, setDraft] = useState<PetProfileDraft>(createEmptyDraft);
  const viewModel = useMemo(
    () =>
      buildMisMascotasViewModel({
        profiles,
        selectedProfileId,
        session,
      }),
    [profiles, selectedProfileId, session],
  );
  const formViewModel = useMemo(
    () =>
      formMode
        ? buildPetProfileFormViewModel({
            draft,
            mode: formMode,
          })
        : undefined,
    [draft, formMode],
  );

  const beginCreate = useCallback(() => {
    setDraft(createEmptyDraft());
    setFormMode("create");
  }, []);

  const beginEdit = useCallback(
    (profileId: string) => {
      const profile = profiles.find((item) => item.id === profileId);

      if (!profile) {
        return;
      }

      setSelectedProfileId(profileId);
      setDraft(toDraft(profile));
      setFormMode("edit");
    },
    [profiles],
  );

  const cancelForm = useCallback(() => {
    setFormMode(null);
  }, []);

  const selectProfile = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
  }, []);

  const addDraftPhoto = useCallback(() => {
    if (!formViewModel?.canAddPhoto) {
      return;
    }

    if (onRequestAddPhoto) {
      const providedPhoto = onRequestAddPhoto(draft);

      if (!providedPhoto) {
        return;
      }

      setDraft((current) => appendDraftPhoto(current, providedPhoto));
      return;
    }

    setDraft((current) =>
      appendDraftPhoto(current, createLocalDraftPhoto(current.photos.length)),
    );
  }, [draft, formViewModel?.canAddPhoto, onRequestAddPhoto]);

  const removeDraftPhoto = useCallback((photoId: string) => {
    setDraft((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId),
    }));
  }, []);

  const submitDraft = useCallback(() => {
    if (session.kind !== "member" || !formMode) {
      return;
    }

    const currentForm = buildPetProfileFormViewModel({
      draft,
      mode: formMode,
    });

    if (!currentForm.canSubmit) {
      return;
    }

    const id = draft.id ?? `pet-${Date.now()}`;
    const nextProfile = {
      ...createPetProfileFromDraft({
        caretakerMemberId: session.memberId,
        draft,
        id,
      }),
      updatedAtLabel: "Guardado ahora",
    };

    setProfiles((current) => {
      if (formMode === "edit") {
        return current.map((profile) =>
          profile.id === id
            ? {
                ...nextProfile,
                relatedRecords: profile.relatedRecords,
              }
            : profile,
        );
      }

      return [nextProfile, ...current];
    });
    setSelectedProfileId(id);
    setFormMode(null);
  }, [draft, formMode, session]);

  return {
    addDraftPhoto,
    beginCreate,
    beginEdit,
    cancelForm,
    draft,
    formViewModel,
    onOpenRelatedRecord,
    onStartReportFromProfile,
    removeDraftPhoto,
    selectProfile,
    submitDraft,
    updateDraft: setDraft,
    viewModel,
  };
}

function VisitorMisMascotasScreen({
  viewModel,
}: {
  viewModel: Extract<MisMascotasViewModel, { kind: "visitor" }>;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <ScreenHeader
        body="Consulta como funcionan los perfiles reutilizables antes de iniciar sesion."
        title={viewModel.title}
      />
      <View style={styles.visitorPanel}>
        <View style={styles.largeIcon}>
          <ShellIcon
            color={shellColors.primary}
            name="pawprint.fill"
            size={34}
          />
        </View>
        <Text selectable style={styles.panelTitle}>
          {viewModel.explanationTitle}
        </Text>
        <Text selectable style={styles.panelBody}>
          {viewModel.explanationBody}
        </Text>
        <PrimaryButton disabled label={viewModel.createActionLabel} />
      </View>
      <PermissionNote />
    </ScrollView>
  );
}

function MemberMisMascotasScreen({
  controller,
  viewModel,
}: {
  controller: MisMascotasController;
  viewModel: MemberMisMascotasViewModel;
}) {
  const selectedProfileIdForList = viewModel.selectedProfile?.id;
  const renderPetProfileCard = useCallback(
    ({ item }: LegendListRenderItemProps<PetProfileCardViewModel>) => (
      <PetProfileCard
        id={item.id}
        isSelected={item.id === selectedProfileIdForList}
        onSelectProfile={controller.selectProfile}
        profile={item}
      />
    ),
    [controller.selectProfile, selectedProfileIdForList],
  );

  return (
    <LegendList
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      data={viewModel.cards}
      estimatedItemSize={116}
      ItemSeparatorComponent={PetProfileCardSeparator}
      keyExtractor={petProfileCardKeyExtractor}
      ListEmptyComponent={
        <MemberPetProfilesEmptyState
          onCreate={controller.beginCreate}
          viewModel={viewModel}
        />
      }
      ListFooterComponent={
        <MemberPetProfilesFooter
          draft={controller.draft}
          formViewModel={controller.formViewModel}
          onAddPhoto={controller.addDraftPhoto}
          onCancelForm={controller.cancelForm}
          onDraftChange={controller.updateDraft}
          onEdit={controller.beginEdit}
          onOpenRelatedRecord={controller.onOpenRelatedRecord}
          onRemovePhoto={controller.removeDraftPhoto}
          onStartReportFromProfile={controller.onStartReportFromProfile}
          onSubmit={controller.submitDraft}
          selectedProfile={viewModel.selectedProfile}
        />
      }
      ListHeaderComponent={
        <MemberPetProfilesHeader
          createActionLabel={viewModel.createActionLabel}
          onCreate={controller.beginCreate}
          subtitle={viewModel.subtitle}
          title={viewModel.title}
        />
      }
      renderItem={renderPetProfileCard}
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    />
  );
}

function MemberPetProfilesEmptyState({
  onCreate,
  viewModel,
}: {
  onCreate: () => void;
  viewModel: MemberMisMascotasViewModel;
}) {
  if (viewModel.state !== "empty") {
    return null;
  }

  return (
    <EmptyPetProfilesState
      body={
        viewModel.emptyState?.body ??
        "Guarda los datos de una mascota para reutilizarlos despues."
      }
      onCreate={onCreate}
      title={viewModel.emptyState?.title ?? "Aun no tienes mascotas"}
    />
  );
}

function MemberPetProfilesHeader({
  createActionLabel,
  onCreate,
  subtitle,
  title,
}: {
  createActionLabel: string;
  onCreate: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.listHeader}>
      <ScreenHeader title={title} body={subtitle} />
      <View style={styles.topActions}>
        <PrimaryButton
          iconName="plus"
          label={createActionLabel}
          onPress={onCreate}
        />
      </View>
    </View>
  );
}

function MemberPetProfilesFooter({
  draft,
  formViewModel,
  onAddPhoto,
  onCancelForm,
  onDraftChange,
  onEdit,
  onOpenRelatedRecord,
  onRemovePhoto,
  onStartReportFromProfile,
  onSubmit,
  selectedProfile,
}: {
  draft: PetProfileDraft;
  formViewModel?: PetProfileFormViewModel;
  onAddPhoto: () => void;
  onCancelForm: () => void;
  onDraftChange: (draft: PetProfileDraft) => void;
  onEdit: (profileId: string) => void;
  onOpenRelatedRecord?: (recordId: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onStartReportFromProfile?: (
    profileId: string,
    intent: "lost" | "found" | "sighting" | "adoption",
  ) => void;
  onSubmit: () => void;
  selectedProfile?: PetProfileDetailViewModel;
}) {
  return (
    <View style={styles.listFooter}>
      {selectedProfile ? (
        <PetProfileDetailSurface
          onEdit={onEdit}
          onOpenRelatedRecord={onOpenRelatedRecord}
          onStartReportFromProfile={onStartReportFromProfile}
          profile={selectedProfile}
        />
      ) : null}

      {formViewModel ? (
        <PetProfileFormSurface
          draft={draft}
          form={formViewModel}
          onAddPhoto={onAddPhoto}
          onCancel={onCancelForm}
          onDraftChange={onDraftChange}
          onRemovePhoto={onRemovePhoto}
          onSubmit={onSubmit}
        />
      ) : null}

      <PermissionNote />
    </View>
  );
}

function PetProfileCardSeparator() {
  return <View style={styles.cardSeparator} />;
}

function petProfileCardKeyExtractor(profile: PetProfileCardViewModel) {
  return profile.id;
}

function PetProfileCard({
  id,
  isSelected,
  onSelectProfile,
  profile,
}: {
  id: string;
  isSelected?: boolean;
  onSelectProfile: (profileId: string) => void;
  profile: PetProfileCardViewModel;
}) {
  const subtitle = formatProfileSubtitle(profile.typeLabel, profile.breedLabel);
  const handlePress = useCallback(() => {
    onSelectProfile(id);
  }, [id, onSelectProfile]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.petCard,
        isSelected ? styles.petCardSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <PetProfileThumbnail
        label={profile.name}
        size="card"
        uri={profile.thumbnailUri}
      />
      <View style={styles.petCardCopy}>
        <View style={styles.petCardTitleRow}>
          <Text selectable numberOfLines={1} style={styles.petCardName}>
            {profile.name}
          </Text>
          <CountBadge label={profile.photoCountLabel} />
        </View>
        <Text selectable numberOfLines={1} style={styles.petCardSubtitle}>
          {subtitle}
        </Text>
        <Text selectable numberOfLines={2} style={styles.petCardDescription}>
          {profile.description.trim() || "Sin descripcion agregada."}
        </Text>
        <Text selectable numberOfLines={1} style={styles.petCardMeta}>
          {profile.relatedSummaryLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function PetProfileDetailSurface({
  onEdit,
  onOpenRelatedRecord,
  onStartReportFromProfile,
  profile,
}: {
  onEdit: (profileId: string) => void;
  onOpenRelatedRecord?: (recordId: string) => void;
  onStartReportFromProfile?: (
    profileId: string,
    intent: "lost" | "found" | "sighting" | "adoption",
  ) => void;
  profile: PetProfileDetailViewModel;
}) {
  const subtitle = formatProfileSubtitle(profile.typeLabel, profile.breedLabel);
  const hasRelatedRecords = profile.relatedRecords.length > 0;

  return (
    <View style={styles.detailSurface}>
      <View style={styles.surfaceHeader}>
        <View style={styles.surfaceTitleGroup}>
          <Text selectable style={styles.surfaceEyebrow}>
            Perfil de mascota
          </Text>
          <Text selectable style={styles.surfaceTitle}>
            {profile.name}
          </Text>
          <Text selectable style={styles.surfaceSubtitle}>
            {subtitle}
          </Text>
        </View>
        <SecondaryButton
          iconName="square.and.pencil"
          label={profile.editActionLabel}
          onPress={() => onEdit(profile.id)}
        />
      </View>

      <ReadonlyPhotoStrip
        countLabel={profile.photoCountLabel}
        photos={profile.photos}
      />

      <View style={styles.infoBlock}>
        <Text selectable style={styles.sectionLabel}>
          Descripcion y marcas
        </Text>
        <Text selectable style={styles.infoBody}>
          {profile.description.trim() || "Sin descripcion agregada."}
        </Text>
      </View>

      <View style={styles.reuseBlock}>
        <Text selectable style={styles.sectionLabel}>
          Reutilizar en
        </Text>
        <View style={styles.reuseActions}>
          <SmallActionButton
            iconName="megaphone.fill"
            label="Perdida"
            onPress={() => onStartReportFromProfile?.(profile.id, "lost")}
          />
          <SmallActionButton
            iconName="checkmark.seal.fill"
            label="Encontrada"
            onPress={() => onStartReportFromProfile?.(profile.id, "found")}
          />
          <SmallActionButton
            iconName="eye.fill"
            label="Vista"
            onPress={() => onStartReportFromProfile?.(profile.id, "sighting")}
          />
          <SmallActionButton
            iconName="heart.fill"
            label="Adopcion"
            onPress={() => onStartReportFromProfile?.(profile.id, "adoption")}
          />
        </View>
      </View>

      <View style={styles.relatedBlock}>
        <View style={styles.relatedHeader}>
          <Text selectable style={styles.sectionLabel}>
            Reportes vinculados
          </Text>
          <Text selectable style={styles.relatedSummary}>
            {profile.relatedSummaryLabel}
          </Text>
        </View>
        {hasRelatedRecords ? (
          <View style={styles.relatedList}>
            {profile.relatedRecords.map((record) => (
              <Pressable
                accessibilityRole="button"
                key={record.id}
                onPress={() => onOpenRelatedRecord?.(record.id)}
                style={({ pressed }) => [
                  styles.relatedRow,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.relatedCopy}>
                  <Text selectable style={styles.relatedTitle}>
                    {record.title}
                  </Text>
                  <Text selectable style={styles.relatedMeta}>
                    {record.statusLabel} · {record.metaLabel}
                  </Text>
                </View>
                <ShellIcon
                  color={shellColors.muted}
                  name="chevron.right"
                  size={16}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.relatedEmpty}>
            <Text selectable style={styles.relatedEmptyText}>
              No tiene reportes activos todavia.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PetProfileFormSurface({
  draft,
  form,
  onAddPhoto,
  onCancel,
  onDraftChange,
  onRemovePhoto,
  onSubmit,
}: {
  draft: PetProfileDraft;
  form: PetProfileFormViewModel;
  onAddPhoto: () => void;
  onCancel: () => void;
  onDraftChange: (draft: PetProfileDraft) => void;
  onRemovePhoto: (photoId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.formSurface}>
      <View style={styles.surfaceHeader}>
        <View style={styles.surfaceTitleGroup}>
          <Text selectable style={styles.surfaceEyebrow}>
            {form.mode === "create" ? "Nuevo" : "Edicion"}
          </Text>
          <Text selectable style={styles.surfaceTitle}>
            {form.title}
          </Text>
        </View>
      </View>

      <LabeledInput
        error={form.fields.name.error}
        label={form.fields.name.label}
        onChangeText={(name) => onDraftChange({ ...draft, name })}
        placeholder={form.fields.name.placeholder}
        value={draft.name}
      />

      <View style={styles.fieldGroup}>
        <Text selectable style={styles.inputLabel}>
          Tipo
        </Text>
        <View style={styles.typeGrid}>
          {form.typeOptions.map((option) => (
            <TypeOptionButton
              key={option.value}
              option={option}
              onSelect={(type) => onDraftChange({ ...draft, type })}
            />
          ))}
        </View>
      </View>

      <LabeledInput
        label={form.fields.breed.label}
        onChangeText={(breed) => onDraftChange({ ...draft, breed })}
        placeholder={form.fields.breed.placeholder}
        value={draft.breed}
      />

      <LabeledInput
        label={form.fields.description.label}
        multiline
        onChangeText={(description) => onDraftChange({ ...draft, description })}
        placeholder={form.fields.description.placeholder}
        value={draft.description}
      />

      <EditablePhotoStrip
        addPhotoLabel={form.addPhotoLabel}
        canAddPhoto={form.canAddPhoto}
        countLabel={form.photoCountLabel}
        helpLabel={form.photoHelpLabel}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
        photos={form.photos}
      />

      <View style={styles.formActions}>
        <SecondaryButton label="Cancelar" onPress={onCancel} />
        <PrimaryButton
          disabled={!form.canSubmit}
          label={form.submitLabel}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

function ScreenHeader({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerIcon}>
        <ShellIcon color={shellColors.white} name="pawprint.fill" size={24} />
      </View>
      <View style={styles.headerCopy}>
        <Text selectable style={styles.screenTitle}>
          {title}
        </Text>
        <Text selectable style={styles.screenBody}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function EmptyPetProfilesState({
  body,
  onCreate,
  title,
}: {
  body: string;
  onCreate: () => void;
  title: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.largeIcon}>
        <ShellIcon color={shellColors.primary} name="pawprint" size={34} />
      </View>
      <Text selectable style={styles.panelTitle}>
        {title}
      </Text>
      <Text selectable style={styles.panelBody}>
        {body}
      </Text>
      <PrimaryButton iconName="plus" label="Crear ahora" onPress={onCreate} />
    </View>
  );
}

function PermissionNote() {
  return (
    <View style={styles.permissionNote}>
      <ShellIcon color={shellColors.sighting} name="camera.fill" size={20} />
      <Text selectable style={styles.permissionText}>
        Las fotos se piden solo cuando eliges agregarlas. Rastro prepara
        miniaturas y retira datos de ubicacion antes de subirlas.
      </Text>
    </View>
  );
}

function PetProfileThumbnail({
  label,
  size,
  uri,
}: {
  label: string;
  size: "card" | "photo";
  uri?: string;
}) {
  const hasImage = typeof uri === "string" && uri.length > 0;

  return (
    <View
      accessibilityLabel={label}
      style={size === "card" ? styles.cardThumb : styles.photoThumb}
    >
      {hasImage ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          recyclingKey={uri}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          transition={180}
        />
      ) : (
        <ShellIcon color={shellColors.primary} name="pawprint.fill" size={24} />
      )}
    </View>
  );
}

function ReadonlyPhotoStrip({
  countLabel,
  photos,
}: {
  countLabel: string;
  photos: readonly PetProfilePhoto[];
}) {
  return (
    <View style={styles.photoBlock}>
      <View style={styles.photoHeader}>
        <Text selectable style={styles.sectionLabel}>
          Fotos
        </Text>
        <CountBadge label={countLabel} />
      </View>
      {photos.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.photoStrip}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {photos.map((photo) => (
            <PetProfileThumbnail
              key={photo.id}
              label={photo.alt ?? "Foto de mascota"}
              size="photo"
              uri={photo.thumbUri ?? photo.uri}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noPhotoPanel}>
          <Text selectable style={styles.noPhotoText}>
            Sin fotos todavia.
          </Text>
        </View>
      )}
    </View>
  );
}

function EditablePhotoStrip({
  addPhotoLabel,
  canAddPhoto,
  countLabel,
  helpLabel,
  onAddPhoto,
  onRemovePhoto,
  photos,
}: {
  addPhotoLabel: string;
  canAddPhoto: boolean;
  countLabel: string;
  helpLabel: string;
  onAddPhoto: () => void;
  onRemovePhoto: (photoId: string) => void;
  photos: readonly PetProfilePhoto[];
}) {
  return (
    <View style={styles.photoBlock}>
      <View style={styles.photoHeader}>
        <Text selectable style={styles.sectionLabel}>
          Fotos
        </Text>
        <CountBadge label={countLabel} />
      </View>
      <Text selectable style={styles.photoHelp}>
        {helpLabel}
      </Text>
      <ScrollView
        contentContainerStyle={styles.photoStrip}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {photos.map((photo) => (
          <View key={photo.id} style={styles.editablePhoto}>
            <PetProfileThumbnail
              label={photo.alt ?? "Foto de mascota"}
              size="photo"
              uri={photo.thumbUri ?? photo.uri}
            />
            <Pressable
              accessibilityLabel="Quitar foto"
              accessibilityRole="button"
              onPress={() => onRemovePhoto(photo.id)}
              style={({ pressed }) => [
                styles.removePhotoButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <ShellIcon color={shellColors.white} name="xmark" size={12} />
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={!canAddPhoto}
          onPress={onAddPhoto}
          style={({ pressed }) => [
            styles.addPhotoButton,
            !canAddPhoto ? styles.disabledButton : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <ShellIcon
            color={canAddPhoto ? shellColors.primary : shellColors.muted}
            name="camera.fill"
            size={20}
          />
          <Text
            selectable
            style={
              canAddPhoto ? styles.addPhotoText : styles.addPhotoTextDisabled
            }
          >
            {addPhotoLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function TypeOptionButton({
  onSelect,
  option,
}: {
  onSelect: (type: PetProfileType) => void;
  option: PetProfileFormViewModel["typeOptions"][number];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onSelect(option.value)}
      style={({ pressed }) => [
        styles.typeOption,
        option.isSelected ? styles.typeOptionSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        selectable
        style={
          option.isSelected
            ? styles.typeOptionTextSelected
            : styles.typeOptionText
        }
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

function LabeledInput({
  error,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text selectable style={styles.inputLabel}>
        {label}
      </Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={shellColors.muted}
        style={[styles.input, multiline ? styles.multilineInput : null]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
      {error ? (
        <Text selectable style={styles.inputError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  disabled = false,
  iconName,
  label,
  onPress,
}: {
  disabled?: boolean;
  iconName?: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled ? styles.disabledButton : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {iconName ? (
        <ShellIcon
          color={disabled ? shellColors.muted : shellColors.white}
          name={iconName}
          size={18}
        />
      ) : null}
      <Text
        selectable
        style={
          disabled ? styles.primaryButtonTextDisabled : styles.primaryButtonText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  iconName,
  label,
  onPress,
}: {
  iconName?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed ? styles.pressed : null,
      ]}
    >
      {iconName ? (
        <ShellIcon color={shellColors.primary} name={iconName} size={17} />
      ) : null}
      <Text selectable style={styles.secondaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function SmallActionButton({
  iconName,
  label,
  onPress,
}: {
  iconName: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallActionButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <ShellIcon color={shellColors.primary} name={iconName} size={16} />
      <Text selectable style={styles.smallActionText}>
        {label}
      </Text>
    </Pressable>
  );
}

function CountBadge({ label }: { label: string }) {
  return (
    <View style={styles.countBadge}>
      <Text selectable style={styles.countBadgeText}>
        {label}
      </Text>
    </View>
  );
}

function createEmptyDraft(): PetProfileDraft {
  return {
    breed: "",
    description: "",
    name: "",
    photos: [],
    type: "Perro",
  };
}

function appendDraftPhoto(
  current: PetProfileDraft,
  nextPhoto: PetProfilePhoto,
): PetProfileDraft {
  if (current.photos.length >= petProfilePhotoLimit) {
    return current;
  }

  return {
    ...current,
    photos: [...current.photos, nextPhoto],
  };
}

function createLocalDraftPhoto(index: number): PetProfilePhoto {
  const sample = selectDraftPhotoSample(index);

  return {
    id: `draft-photo-${Date.now()}-${index}`,
    status: "draft",
    thumbUri: sample.thumbUri,
    uri: sample.uri,
  };
}

function selectDraftPhotoSample(index: number) {
  switch (index % draftPhotoSamples.length) {
    case 0:
      return draftPhotoSamples[0];
    case 1:
      return draftPhotoSamples[1];
    default:
      return draftPhotoSamples[2];
  }
}

function toDraft(profile: PetProfileSummary): PetProfileDraft {
  return {
    breed: profile.breed,
    description: profile.description,
    id: profile.id,
    name: profile.name,
    photos: [...profile.photos],
    type: profile.type,
  };
}

function cloneProfiles(profiles: readonly PetProfileSummary[]) {
  return profiles.map((profile) => ({
    ...profile,
    photos: [...profile.photos],
    relatedRecords: [...profile.relatedRecords],
  }));
}

function formatProfileSubtitle(typeLabel: string, breedLabel?: string) {
  return breedLabel ? `${typeLabel} · ${breedLabel}` : typeLabel;
}

const styles = StyleSheet.create({
  addPhotoButton: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderColor: "#A9D4C9",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 6,
    height: 96,
    justifyContent: "center",
    padding: 10,
    width: 104,
  },
  addPhotoText: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  addPhotoTextDisabled: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  cardSeparator: {
    height: 10,
  },
  cardThumb: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 22,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  listContent: {
    gap: 16,
    padding: 18,
    paddingBottom: bottomInset + 32,
  },
  countBadge: {
    alignSelf: "flex-start",
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: shellColors.primary,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  detailSurface: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  disabledButton: {
    opacity: 0.56,
  },
  editablePhoto: {
    position: "relative",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 22,
  },
  fieldGroup: {
    gap: 7,
  },
  formActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
  },
  formSurface: {
    backgroundColor: shellColors.surface,
    borderColor: "#A9D4C9",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  infoBlock: {
    gap: 7,
  },
  infoBody: {
    color: shellColors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: shellColors.text,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  inputError: {
    color: shellColors.lost,
    fontSize: 13,
    fontWeight: "800",
  },
  inputLabel: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  largeIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  listFooter: {
    gap: 16,
    paddingTop: 16,
  },
  listHeader: {
    gap: 16,
  },
  multilineInput: {
    minHeight: 96,
  },
  noPhotoPanel: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 18,
    minHeight: 74,
    justifyContent: "center",
    padding: 12,
  },
  noPhotoText: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  panelBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  panelTitle: {
    color: shellColors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  permissionNote: {
    alignItems: "center",
    backgroundColor: "#E1EFF5",
    borderColor: "#B6D4E4",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  permissionText: {
    color: shellColors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  petCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 104,
    padding: 12,
  },
  petCardCopy: {
    flex: 1,
    gap: 4,
  },
  petCardDescription: {
    color: shellColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  petCardMeta: {
    color: shellColors.sighting,
    fontSize: 13,
    fontWeight: "800",
  },
  petCardName: {
    color: shellColors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
  },
  petCardSelected: {
    borderColor: shellColors.primary,
    boxShadow: "0 10px 24px rgba(20, 108, 90, 0.12)",
  },
  petCardSubtitle: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  petCardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  photoBlock: {
    gap: 9,
  },
  photoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoHelp: {
    color: shellColors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  photoStrip: {
    gap: 10,
    paddingRight: 2,
  },
  photoThumb: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 18,
    height: 96,
    justifyContent: "center",
    overflow: "hidden",
    width: 96,
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: shellColors.white,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  primaryButtonTextDisabled: {
    color: shellColors.muted,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  relatedBlock: {
    gap: 9,
  },
  relatedCopy: {
    flex: 1,
    gap: 3,
  },
  relatedEmpty: {
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 16,
    padding: 12,
  },
  relatedEmptyText: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  relatedHeader: {
    gap: 4,
  },
  relatedList: {
    gap: 8,
  },
  relatedMeta: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  relatedRow: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    padding: 12,
  },
  relatedSummary: {
    color: shellColors.sighting,
    fontSize: 13,
    fontWeight: "800",
  },
  relatedTitle: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  removePhotoButton: {
    alignItems: "center",
    backgroundColor: shellColors.lost,
    borderColor: shellColors.surface,
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: -5,
    top: -5,
    width: 26,
  },
  reuseActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reuseBlock: {
    gap: 9,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  screenBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  screenTitle: {
    color: shellColors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: shellColors.primary,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  sectionLabel: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  smallActionButton: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderColor: "#A9D4C9",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  smallActionText: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  surfaceEyebrow: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  surfaceHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  surfaceSubtitle: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  surfaceTitle: {
    color: shellColors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  surfaceTitleGroup: {
    flex: 1,
    gap: 3,
  },
  topActions: {
    alignItems: "flex-start",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOption: {
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  typeOptionSelected: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  typeOptionText: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  typeOptionTextSelected: {
    color: shellColors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  visitorPanel: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 22,
  },
});
