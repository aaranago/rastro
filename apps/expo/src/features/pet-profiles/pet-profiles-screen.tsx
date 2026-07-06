import type { LegendListRenderItemProps } from "@legendapp/list";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LegendList } from "@legendapp/list";

import type { CreationDraftStore } from "../resilience/creation-drafts";
import type { DurableCreationDraftPersistence } from "../resilience/use-durable-creation-draft";
import type { PetProfileReportCreationIntent } from "./pet-profile-navigation";
import type {
  PetProfileDraft,
  PetProfilePhoto,
  PetProfileRelatedRecord,
  PetProfilesSessionState,
  PetProfileSummary,
  PetProfileType,
} from "./pet-profile-types";
import type {
  CreatePetProfileInput,
  PetProfileRepository,
} from "./pet-profiles";
import type {
  MisMascotasViewModel,
  PetProfileCardViewModel,
  PetProfileDetailViewModel,
  PetProfileFormViewModel,
} from "./pet-profiles-view-model";
import { ReportCreationDraftPersistenceAlert } from "../report-creation/report-creation-ui";
import { useDurableCreationDraft } from "../resilience/use-durable-creation-draft";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import { draftPhotoSamples, petProfileFixtures } from "./pet-profiles-fixtures";
import {
  buildMisMascotasViewModel,
  buildPetProfileFormViewModel,
  createPetProfileFromDraft,
  isPetProfileType,
  petProfilePhotoLimit,
} from "./pet-profiles-view-model";

const bottomInset = 140;

export interface MisMascotasScreenProps {
  draftScopeId?: string;
  draftStore?: CreationDraftStore;
  initialProfiles?: readonly PetProfileSummary[];
  onOpenRelatedRecord?: (record: PetProfileRelatedRecord) => void;
  onRequestSignIn?: () => void;
  onRequestAddPhoto?: (
    draft: PetProfileDraft,
  ) => PetProfilePhoto | Promise<PetProfilePhoto | void> | void;
  onStartReportFromProfile?: (
    profileId: string,
    intent: PetProfileReportCreationIntent,
  ) => void;
  repository?: PetProfileRepository;
  session: PetProfilesSessionState;
}

type FormMode = "create" | "edit";
type MemberMisMascotasViewModel = Extract<
  MisMascotasViewModel,
  { kind: "member" }
>;
type MemberPetProfilesSession = Extract<
  PetProfilesSessionState,
  { kind: "member" }
>;
type PetProfileDraftSetter = Dispatch<SetStateAction<PetProfileDraft>>;
type CommitPetProfileToScreen = (
  nextProfile: PetProfileSummary,
  mode: FormMode,
) => void;

interface MisMascotasController {
  addDraftPhoto: () => void;
  beginCreate: () => void;
  beginEdit: (profileId: string) => void;
  cancelForm: () => void;
  draft: PetProfileDraft;
  draftPersistence: DurableCreationDraftPersistence;
  formViewModel?: PetProfileFormViewModel;
  isLoadingProfiles: boolean;
  isSavingProfile: boolean;
  onOpenRelatedRecord?: MisMascotasScreenProps["onOpenRelatedRecord"];
  onStartReportFromProfile?: MisMascotasScreenProps["onStartReportFromProfile"];
  photoPickerError?: string;
  profileLoadError?: string;
  profileSaveError?: string;
  retryProfiles: () => void;
  removeDraftPhoto: (photoId: string) => void;
  selectProfile: (profileId: string) => void;
  submitDraft: () => void;
  updateDraft: (draft: PetProfileDraft) => void;
  viewModel: MisMascotasViewModel;
}

export function MisMascotasScreen(props: MisMascotasScreenProps) {
  const controller = useMisMascotasController(props);

  if (controller.viewModel.kind === "visitor") {
    return (
      <VisitorMisMascotasScreen
        onRequestSignIn={props.onRequestSignIn}
        viewModel={controller.viewModel}
      />
    );
  }

  return (
    <MemberMisMascotasScreen
      controller={controller}
      viewModel={controller.viewModel}
    />
  );
}

function useMisMascotasController({
  draftScopeId,
  draftStore,
  initialProfiles = petProfileFixtures.profiles,
  onOpenRelatedRecord,
  onRequestAddPhoto,
  onStartReportFromProfile,
  repository,
  session,
}: MisMascotasScreenProps): MisMascotasController {
  const {
    isLoadingProfiles,
    profileLoadError,
    profiles,
    retryProfiles,
    selectedProfileId,
    setProfiles,
    setSelectedProfileId,
  } = usePetProfilesDataSource({
    initialProfiles,
    repository,
    session,
  });
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [photoPickerError, setPhotoPickerError] = useState<
    string | undefined
  >();
  const [profileSaveError, setProfileSaveError] = useState<
    string | undefined
  >();
  const [isNameValidationVisible, setIsNameValidationVisible] = useState(false);
  const emptyDraft = useMemo(() => createEmptyDraft(), []);
  const { clearDraft, draft, draftPersistence, restoredDraft, setDraft } =
    useDurableCreationDraft({
      initialDraft: emptyDraft,
      kind: "pet-profile",
      scopeId: draftScopeId,
      store: draftStore,
    });
  const activeFormMode = resolveActivePetProfileFormMode(
    formMode,
    restoredDraft?.draft,
  );
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
      activeFormMode
        ? hidePendingPetProfileValidation({
            form: buildPetProfileFormViewModel({
              draft,
              mode: activeFormMode,
            }),
            isNameValidationVisible,
          })
        : undefined,
    [activeFormMode, draft, isNameValidationVisible],
  );

  const beginCreate = useCallback(() => {
    setDraft(createEmptyDraft());
    setFormMode("create");
    setIsNameValidationVisible(false);
    setPhotoPickerError(undefined);
    setProfileSaveError(undefined);
  }, [setDraft]);

  const beginEdit = useCallback(
    (profileId: string) => {
      const profile = profiles.find((item) => item.id === profileId);

      if (!profile) {
        return;
      }

      setSelectedProfileId(profileId);
      setDraft(toDraft(profile));
      setFormMode("edit");
      setIsNameValidationVisible(false);
      setPhotoPickerError(undefined);
      setProfileSaveError(undefined);
    },
    [profiles, setDraft, setSelectedProfileId],
  );

  const cancelForm = useCallback(() => {
    void clearDraft();
    setFormMode(null);
    setIsNameValidationVisible(false);
  }, [clearDraft]);

  const selectProfile = useCallback(
    (profileId: string) => {
      setSelectedProfileId(profileId);
    },
    [setSelectedProfileId],
  );

  const removeDraftPhoto = useCallback(
    (photoId: string) => {
      setDraft((current) => ({
        ...current,
        photos: current.photos.filter((photo) => photo.id !== photoId),
      }));
    },
    [setDraft],
  );

  const commitProfileToScreen = useCallback(
    (nextProfile: PetProfileSummary, mode: FormMode) => {
      setProfiles((current) =>
        upsertProfileForScreen(current, nextProfile, mode),
      );
      setSelectedProfileId(nextProfile.id);
      setFormMode(null);
      setIsNameValidationVisible(false);
    },
    [setProfiles, setSelectedProfileId],
  );
  const addDraftPhoto = usePetProfilePhotoAction({
    canAddPhoto: Boolean(formViewModel?.canAddPhoto),
    draft,
    onRequestAddPhoto,
    setDraft,
    setPhotoPickerError,
  });
  const submitPersistedDraft = usePetProfileSubmitAction({
    activeFormMode,
    clearDraft,
    commitProfileToScreen,
    draft,
    repository,
    session,
    setIsSavingProfile,
    setProfileSaveError,
  });
  const submitDraft = useCallback(() => {
    setIsNameValidationVisible(true);
    submitPersistedDraft();
  }, [submitPersistedDraft]);
  const updateDraft = useCallback(
    (nextDraft: PetProfileDraft) => {
      if (hasPetProfileNameChanged(draft, nextDraft)) {
        setIsNameValidationVisible(true);
      }

      setDraft(nextDraft);
    },
    [draft, setDraft],
  );

  return {
    addDraftPhoto,
    beginCreate,
    beginEdit,
    cancelForm,
    draft,
    draftPersistence,
    formViewModel,
    isLoadingProfiles,
    isSavingProfile,
    onOpenRelatedRecord,
    onStartReportFromProfile,
    photoPickerError,
    profileLoadError,
    profileSaveError,
    retryProfiles,
    removeDraftPhoto,
    selectProfile,
    submitDraft,
    updateDraft,
    viewModel,
  };
}

function hidePendingPetProfileValidation({
  form,
  isNameValidationVisible,
}: {
  form: PetProfileFormViewModel;
  isNameValidationVisible: boolean;
}): PetProfileFormViewModel {
  if (isNameValidationVisible || !form.fields.name.error) {
    return form;
  }

  return {
    ...form,
    fields: {
      ...form.fields,
      name: {
        ...form.fields.name,
        error: undefined,
      },
    },
  };
}

function hasPetProfileNameChanged(
  currentDraft: PetProfileDraft,
  nextDraft: PetProfileDraft,
) {
  return currentDraft.name !== nextDraft.name;
}

function resolveActivePetProfileFormMode(
  formMode: FormMode | null,
  restoredDraft?: PetProfileDraft,
): FormMode | null {
  if (formMode || !restoredDraft) {
    return formMode;
  }

  return restoredDraft.id === undefined ? "create" : "edit";
}

function usePetProfilePhotoAction({
  canAddPhoto,
  draft,
  onRequestAddPhoto,
  setDraft,
  setPhotoPickerError,
}: {
  canAddPhoto: boolean;
  draft: PetProfileDraft;
  onRequestAddPhoto: MisMascotasScreenProps["onRequestAddPhoto"];
  setDraft: PetProfileDraftSetter;
  setPhotoPickerError: (message: string | undefined) => void;
}) {
  return useCallback(() => {
    if (!canAddPhoto) {
      return;
    }

    setPhotoPickerError(undefined);

    if (onRequestAddPhoto) {
      void requestAndAppendDraftPhoto({
        draft,
        onRequestAddPhoto,
        setDraft,
        setPhotoPickerError,
      });
      return;
    }

    setDraft((current) =>
      appendDraftPhoto(current, createLocalDraftPhoto(current.photos.length)),
    );
  }, [canAddPhoto, draft, onRequestAddPhoto, setDraft, setPhotoPickerError]);
}

function usePetProfileSubmitAction({
  activeFormMode,
  clearDraft,
  commitProfileToScreen,
  draft,
  repository,
  session,
  setIsSavingProfile,
  setProfileSaveError,
}: {
  activeFormMode: FormMode | null;
  clearDraft: () => Promise<void>;
  commitProfileToScreen: CommitPetProfileToScreen;
  draft: PetProfileDraft;
  repository?: PetProfileRepository;
  session: PetProfilesSessionState;
  setIsSavingProfile: (isSaving: boolean) => void;
  setProfileSaveError: (message: string | undefined) => void;
}) {
  return useCallback(() => {
    if (session.kind !== "member" || !activeFormMode) {
      return;
    }

    const input = buildSubmittablePetProfileInput({
      draft,
      mode: activeFormMode,
    });

    if (!input) {
      return;
    }

    if (!repository) {
      const nextProfile = createLocalScreenProfile(session, draft);

      commitProfileToScreen(nextProfile, activeFormMode);
      void clearDraft();
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveError(undefined);
    void saveRepositoryPetProfile({
      clearDraft,
      commitProfileToScreen,
      draft,
      input,
      mode: activeFormMode,
      repository,
      session,
      setIsSavingProfile,
      setProfileSaveError,
    });
  }, [
    activeFormMode,
    clearDraft,
    commitProfileToScreen,
    draft,
    repository,
    session,
    setIsSavingProfile,
    setProfileSaveError,
  ]);
}

function usePetProfilesDataSource({
  initialProfiles,
  repository,
  session,
}: {
  initialProfiles: readonly PetProfileSummary[];
  repository?: PetProfileRepository;
  session: PetProfilesSessionState;
}) {
  const [profiles, setProfiles] = useState<PetProfileSummary[]>(() =>
    repository ? [] : cloneProfiles(initialProfiles),
  );
  const [selectedProfileId, setSelectedProfileId] = useState(() =>
    repository ? undefined : initialProfiles[0]?.id,
  );
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(
    () => repository !== undefined && session.kind === "member",
  );
  const [profileLoadError, setProfileLoadError] = useState<
    string | undefined
  >();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const memberSessionKey =
    session.kind === "member" ? session.memberId : "visitor";
  const retryProfiles = useCallback(() => {
    setLoadAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!repository || session.kind !== "member") {
      return;
    }

    const requestState = { isActive: true };

    void (async () => {
      await Promise.resolve();

      if (!isPetProfileRequestActive(requestState)) {
        return;
      }

      setIsLoadingProfiles(true);
      setProfileLoadError(undefined);

      try {
        const nextProfiles = await repository.listPetProfiles(session);

        if (!isPetProfileRequestActive(requestState)) {
          return;
        }

        setProfiles(cloneProfiles(nextProfiles));
        setSelectedProfileId((current) =>
          getNextSelectedProfileId(current, nextProfiles),
        );
      } catch {
        if (isPetProfileRequestActive(requestState)) {
          setProfileLoadError("No pudimos cargar tus mascotas.");
        }
      } finally {
        if (isPetProfileRequestActive(requestState)) {
          setIsLoadingProfiles(false);
        }
      }
    })();

    return () => {
      requestState.isActive = false;
    };
  }, [loadAttempt, memberSessionKey, repository, session]);

  return {
    isLoadingProfiles,
    profileLoadError,
    profiles,
    retryProfiles,
    selectedProfileId,
    setProfiles,
    setSelectedProfileId,
  };
}

function VisitorMisMascotasScreen({
  onRequestSignIn,
  viewModel,
}: {
  onRequestSignIn?: () => void;
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
        body="Consulta cómo funcionan los perfiles reutilizables antes de iniciar sesión."
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
        <PrimaryButton
          disabled={!onRequestSignIn}
          label={viewModel.createActionLabel}
          onPress={onRequestSignIn}
        />
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
  const firstPetFormViewModel =
    viewModel.state === "empty" && controller.formViewModel?.mode === "create"
      ? controller.formViewModel
      : undefined;
  const isListEmpty = viewModel.cards.length === 0;
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
        firstPetFormViewModel ? (
          <PetProfileFormSurface
            draft={controller.draft}
            draftPersistence={controller.draftPersistence}
            form={firstPetFormViewModel}
            isSaving={controller.isSavingProfile}
            onAddPhoto={controller.addDraftPhoto}
            onCancel={controller.cancelForm}
            onDraftChange={controller.updateDraft}
            onRemovePhoto={controller.removeDraftPhoto}
            onSubmit={controller.submitDraft}
            photoPickerError={controller.photoPickerError}
          />
        ) : (
          <MemberPetProfilesEmptyState
            isLoadingProfiles={controller.isLoadingProfiles}
            onCreate={controller.beginCreate}
            onRetry={controller.retryProfiles}
            profileLoadError={controller.profileLoadError}
            viewModel={viewModel}
          />
        )
      }
      ListFooterComponent={
        <MemberPetProfilesFooter
          draft={controller.draft}
          draftPersistence={controller.draftPersistence}
          formViewModel={
            firstPetFormViewModel ? undefined : controller.formViewModel
          }
          isSavingProfile={controller.isSavingProfile}
          onAddPhoto={controller.addDraftPhoto}
          onCancelForm={controller.cancelForm}
          onDraftChange={controller.updateDraft}
          onEdit={controller.beginEdit}
          onOpenRelatedRecord={controller.onOpenRelatedRecord}
          onRemovePhoto={controller.removeDraftPhoto}
          onStartReportFromProfile={controller.onStartReportFromProfile}
          onSubmit={controller.submitDraft}
          photoPickerError={controller.photoPickerError}
          selectedProfile={viewModel.selectedProfile}
        />
      }
      ListHeaderComponent={
        <MemberPetProfilesHeader
          createActionLabel={viewModel.createActionLabel}
          hideCreateAction={Boolean(controller.formViewModel) || isListEmpty}
          isLoadingProfiles={controller.isLoadingProfiles && !isListEmpty}
          onCreate={controller.beginCreate}
          profileLoadError={
            isListEmpty ? undefined : controller.profileLoadError
          }
          profileSaveError={controller.profileSaveError}
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
  isLoadingProfiles,
  onCreate,
  onRetry,
  profileLoadError,
  viewModel,
}: {
  isLoadingProfiles: boolean;
  onCreate: () => void;
  onRetry: () => void;
  profileLoadError?: string;
  viewModel: MemberMisMascotasViewModel;
}) {
  if (isLoadingProfiles) {
    return <PetProfilesLoadingState />;
  }

  if (profileLoadError) {
    return (
      <PetProfilesLoadErrorState message={profileLoadError} onRetry={onRetry} />
    );
  }

  if (viewModel.state !== "empty") {
    return null;
  }

  return (
    <EmptyPetProfilesState
      body={
        viewModel.emptyState?.body ??
        "Guarda los datos de una mascota para reutilizarlos después."
      }
      onCreate={onCreate}
      title={viewModel.emptyState?.title ?? "Aún no tienes mascotas"}
    />
  );
}

function PetProfilesLoadingState() {
  return (
    <View style={styles.emptyState}>
      <ActivityIndicator color={shellColors.primary} size="large" />
      <Text selectable style={styles.panelTitle}>
        Cargando tus mascotas
      </Text>
      <Text selectable style={styles.panelBody}>
        Estamos revisando tus perfiles guardados antes de mostrar opciones de
        creación.
      </Text>
    </View>
  );
}

function PetProfilesLoadErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.largeIcon}>
        <ShellIcon
          color={shellColors.lost}
          name="exclamationmark.triangle.fill"
          size={34}
        />
      </View>
      <Text selectable style={styles.panelTitle}>
        No pudimos cargar tus mascotas
      </Text>
      <Text selectable style={styles.panelBody}>
        {message} Reintenta antes de crear para evitar duplicar perfiles.
      </Text>
      <PrimaryButton
        iconName="arrow.clockwise"
        label="Reintentar"
        onPress={onRetry}
      />
    </View>
  );
}

function MemberPetProfilesHeader({
  createActionLabel,
  hideCreateAction,
  isLoadingProfiles,
  onCreate,
  profileLoadError,
  profileSaveError,
  subtitle,
  title,
}: {
  createActionLabel: string;
  hideCreateAction?: boolean;
  isLoadingProfiles: boolean;
  onCreate: () => void;
  profileLoadError?: string;
  profileSaveError?: string;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.listHeader}>
      <ScreenHeader title={title} body={subtitle} />
      {!hideCreateAction ? (
        <View style={styles.topActions}>
          <PrimaryButton
            iconName="plus"
            label={createActionLabel}
            onPress={onCreate}
          />
        </View>
      ) : null}
      {isLoadingProfiles ? (
        <View style={styles.inlineStatus}>
          <ActivityIndicator color={shellColors.primary} size="small" />
          <Text selectable style={styles.inlineStatusText}>
            Cargando tus mascotas guardadas
          </Text>
        </View>
      ) : null}
      {profileLoadError ? (
        <Text selectable style={styles.inlineError}>
          {profileLoadError}
        </Text>
      ) : null}
      {profileSaveError ? (
        <Text selectable style={styles.inlineError}>
          {profileSaveError}
        </Text>
      ) : null}
    </View>
  );
}

function MemberPetProfilesFooter({
  draft,
  draftPersistence,
  formViewModel,
  isSavingProfile,
  onAddPhoto,
  onCancelForm,
  onDraftChange,
  onEdit,
  onOpenRelatedRecord,
  onRemovePhoto,
  onStartReportFromProfile,
  onSubmit,
  photoPickerError,
  selectedProfile,
}: {
  draft: PetProfileDraft;
  draftPersistence: DurableCreationDraftPersistence;
  formViewModel?: PetProfileFormViewModel;
  isSavingProfile: boolean;
  onAddPhoto: () => void;
  onCancelForm: () => void;
  onDraftChange: (draft: PetProfileDraft) => void;
  onEdit: (profileId: string) => void;
  onOpenRelatedRecord?: MisMascotasScreenProps["onOpenRelatedRecord"];
  onRemovePhoto: (photoId: string) => void;
  onStartReportFromProfile?: (
    profileId: string,
    intent: PetProfileReportCreationIntent,
  ) => void;
  onSubmit: () => void;
  photoPickerError?: string;
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
          draftPersistence={draftPersistence}
          form={formViewModel}
          isSaving={isSavingProfile}
          onAddPhoto={onAddPhoto}
          onCancel={onCancelForm}
          onDraftChange={onDraftChange}
          onRemovePhoto={onRemovePhoto}
          onSubmit={onSubmit}
          photoPickerError={photoPickerError}
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
          {profile.description.trim() || "Sin descripción agregada."}
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
  onOpenRelatedRecord?: MisMascotasScreenProps["onOpenRelatedRecord"];
  onStartReportFromProfile?: (
    profileId: string,
    intent: PetProfileReportCreationIntent,
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
          Descripción y marcas
        </Text>
        <Text selectable style={styles.infoBody}>
          {profile.description.trim() || "Sin descripción agregada."}
        </Text>
      </View>

      <View style={styles.reuseBlock}>
        <Text selectable style={styles.sectionLabel}>
          Reutilizar en
        </Text>
        <View style={styles.reuseActions}>
          <SmallActionButton
            iconName="megaphone.fill"
            label="Pérdida"
            onPress={() => onStartReportFromProfile?.(profile.id, "lost")}
          />
          <SmallActionButton
            iconName="heart.fill"
            label="Adopción"
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
                onPress={() => onOpenRelatedRecord?.(record)}
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
              No tiene reportes activos todavía.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PetProfileFormSurface({
  draft,
  draftPersistence,
  form,
  isSaving,
  onAddPhoto,
  onCancel,
  onDraftChange,
  onRemovePhoto,
  onSubmit,
  photoPickerError,
}: {
  draft: PetProfileDraft;
  draftPersistence: DurableCreationDraftPersistence;
  form: PetProfileFormViewModel;
  isSaving: boolean;
  onAddPhoto: () => void;
  onCancel: () => void;
  onDraftChange: (draft: PetProfileDraft) => void;
  onRemovePhoto: (photoId: string) => void;
  onSubmit: () => void;
  photoPickerError?: string;
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
      <ReportCreationDraftPersistenceAlert
        draftPersistence={draftPersistence}
      />

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
      {photoPickerError ? (
        <Text selectable style={styles.inlineError}>
          {photoPickerError}
        </Text>
      ) : null}

      <View style={styles.formActions}>
        <SecondaryButton label="Cancelar" onPress={onCancel} />
        <PrimaryButton
          disabled={isSaving}
          label={isSaving ? "Guardando" : form.submitLabel}
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
        Las fotos se piden solo cuando eliges agregarlas. Úsalas como referencia
        visual para reconocer mejor a tu mascota.
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
            Sin fotos todavía.
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

function buildSubmittablePetProfileInput({
  draft,
  mode,
}: {
  draft: PetProfileDraft;
  mode: FormMode;
}): CreatePetProfileInput | null {
  const currentForm = buildPetProfileFormViewModel({
    draft,
    mode,
  });

  if (!currentForm.canSubmit || !isPetProfileType(draft.type)) {
    return null;
  }

  return {
    breed: draft.breed,
    description: draft.description,
    name: draft.name,
    photos: toPetProfilePhotoSources(draft.photos),
    type: draft.type,
  };
}

function createLocalScreenProfile(
  session: MemberPetProfilesSession,
  draft: PetProfileDraft,
): PetProfileSummary {
  return {
    ...createPetProfileFromDraft({
      caretakerMemberId: session.memberId,
      draft,
      id: draft.id ?? `pet-${Date.now()}`,
    }),
    updatedAtLabel: "Guardado ahora",
  };
}

async function savePetProfile({
  draft,
  input,
  mode,
  repository,
  session,
}: {
  draft: PetProfileDraft;
  input: CreatePetProfileInput;
  mode: FormMode;
  repository: PetProfileRepository;
  session: MemberPetProfilesSession;
}): Promise<PetProfileSummary> {
  const savedProfile =
    mode === "edit" && draft.id
      ? await repository.updatePetProfile(session, draft.id, input)
      : await repository.createPetProfile(session, input);

  return {
    ...savedProfile,
    updatedAtLabel: "Guardado ahora",
  };
}

async function requestAndAppendDraftPhoto({
  draft,
  onRequestAddPhoto,
  setDraft,
  setPhotoPickerError,
}: {
  draft: PetProfileDraft;
  onRequestAddPhoto: NonNullable<MisMascotasScreenProps["onRequestAddPhoto"]>;
  setDraft: PetProfileDraftSetter;
  setPhotoPickerError: (message: string | undefined) => void;
}) {
  try {
    const providedPhoto = await onRequestAddPhoto(draft);

    if (providedPhoto) {
      setDraft((current) => appendDraftPhoto(current, providedPhoto));
    }
  } catch (error) {
    setPhotoPickerError(formatPhotoPickerError(error));
  }
}

async function saveRepositoryPetProfile({
  clearDraft,
  commitProfileToScreen,
  draft,
  input,
  mode,
  repository,
  session,
  setIsSavingProfile,
  setProfileSaveError,
}: {
  clearDraft: () => Promise<void>;
  commitProfileToScreen: CommitPetProfileToScreen;
  draft: PetProfileDraft;
  input: CreatePetProfileInput;
  mode: FormMode;
  repository: PetProfileRepository;
  session: MemberPetProfilesSession;
  setIsSavingProfile: (isSaving: boolean) => void;
  setProfileSaveError: (message: string | undefined) => void;
}) {
  try {
    const savedProfile = await savePetProfile({
      draft,
      input,
      mode,
      repository,
      session,
    });

    commitProfileToScreen(savedProfile, mode);
    await clearDraft();
  } catch {
    setProfileSaveError("No pudimos guardar esta mascota.");
  } finally {
    setIsSavingProfile(false);
  }
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

function getNextSelectedProfileId(
  current: string | undefined,
  profiles: readonly PetProfileSummary[],
) {
  return current && profiles.some((profile) => profile.id === current)
    ? current
    : profiles[0]?.id;
}

function isPetProfileRequestActive(requestState: { isActive: boolean }) {
  return requestState.isActive;
}

function toPetProfilePhotoSources(photos: readonly PetProfilePhoto[]) {
  return photos.flatMap((photo) => {
    const uri = photo.sourceUri ?? photo.uri ?? photo.thumbUri;

    if (!uri) {
      return [];
    }

    return [
      {
        height: photo.height,
        id: photo.id,
        mimeType: photo.mimeType,
        uri,
        width: photo.width,
      },
    ];
  });
}

function formatPhotoPickerError(error: unknown) {
  if (
    error instanceof Error &&
    /network|fetch|offline|internet|conex/i.test(error.message)
  ) {
    return "No pudimos abrir tus fotos. Revisa tu conexión e inténtalo de nuevo.";
  }

  return "No pudimos abrir tus fotos. Intenta de nuevo.";
}

function upsertProfileForScreen(
  current: readonly PetProfileSummary[],
  nextProfile: PetProfileSummary,
  mode: FormMode,
) {
  if (mode === "edit") {
    return current.map((profile) =>
      profile.id === nextProfile.id
        ? {
            ...nextProfile,
            relatedRecords: nextProfile.relatedRecords.length
              ? nextProfile.relatedRecords
              : profile.relatedRecords,
          }
        : profile,
    );
  }

  return [nextProfile, ...current];
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
  inlineError: {
    color: shellColors.lost,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  inlineStatus: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inlineStatusText: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
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
