import type { DimensionValue } from "react-native";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { MaterialCommunityIconName } from "../icons/safe-material-community-icon";
import type {
  AcceptedEditedReportImage,
  ReportMediaDraft,
  ReportMediaDraftItem,
  ReportMediaDraftItemStatus,
  ReportMediaDraftSnapshot,
  SelectedLocalReportImage,
} from "./report-media-draft";
import { SafeMaterialCommunityIcon } from "../icons/safe-material-community-icon";

export type ReportMediaSourceFeedback =
  | {
      canAskAgain?: boolean;
      message?: string;
      status: "denied";
    }
  | {
      message: string;
      status: "unavailable";
    };

export type ReportMediaLibrarySourceResult =
  | readonly SelectedLocalReportImage[]
  | ReportMediaSourceFeedback;

export type ReportMediaCameraSourceResult =
  | SelectedLocalReportImage
  | ReportMediaSourceFeedback
  | undefined;

export interface ReportMediaSourceAdapter {
  captureWithCamera(): Promise<ReportMediaCameraSourceResult>;
  selectFromLibrary(): Promise<ReportMediaLibrarySourceResult>;
}

export interface ReportMediaEditAdapter {
  editImage(
    item: ReportMediaDraftItem,
    options?: ReportMediaEditOptions,
  ): Promise<AcceptedEditedReportImage | undefined>;
}

export interface ReportMediaEditOptions {
  crop?: {
    height: number;
    originX: number;
    originY: number;
    width: number;
  };
  rotateBeforeCrop?: boolean;
  rotateDegrees?: number;
}

export type ReportMediaManagerDraftBridge = Pick<
  ReportMediaDraft,
  | "acceptEditedImage"
  | "getSnapshot"
  | "moveImage"
  | "removeImage"
  | "retryUpload"
  | "selectLocalImage"
  | "setPrimaryImage"
  | "uploadImage"
>;

export interface ReportMediaStepController {
  getSnapshot(): ReportMediaDraftSnapshot;
  uploadPendingImages(): Promise<ReportMediaDraftSnapshot>;
}

export interface ReportMediaManagerLabels {
  cameraButton: string;
  libraryButton: string;
  title: string;
}

export interface ReportMediaManagerProps {
  draft: ReportMediaManagerDraftBridge;
  editAdapter?: ReportMediaEditAdapter;
  labels?: Partial<ReportMediaManagerLabels>;
  maxItems?: number;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  snapshot: ReportMediaDraftSnapshot;
  sourceAdapter: ReportMediaSourceAdapter;
}

const defaultLabels = {
  cameraButton: "Tomar foto",
  libraryButton: "Biblioteca",
  title: "Fotos",
} satisfies ReportMediaManagerLabels;

export function ReportMediaManager({
  draft,
  editAdapter,
  labels,
  maxItems = 5,
  onSnapshotChange,
  snapshot,
  sourceAdapter,
}: ReportMediaManagerProps) {
  const [sourceFeedback, setSourceFeedback] =
    React.useState<ReportMediaSourceFeedback | null>(null);
  const [editingLocalId, setEditingLocalId] = React.useState<string | null>(
    null,
  );
  const resolvedLabels = { ...defaultLabels, ...labels };
  const overallProgressLabel = `Progreso total ${formatReportMediaProgress(snapshot.overallProgress)}`;
  const overallProgressPercent = Math.round(
    clampProgress(snapshot.overallProgress) * 100,
  );
  const isOverallUploadBusy = snapshot.items.some((item) =>
    isReportMediaUploadBusy(item.status),
  );
  const canAddMoreMedia = snapshot.items.length < maxItems;
  const mediaLimitFeedback = `Puedes subir hasta ${maxItems} fotos por reporte.`;
  const editDraftItem = React.useCallback(
    (item: ReportMediaDraftItem, removeOnCancel: boolean) => {
      if (!editAdapter) {
        return Promise.resolve(false);
      }

      return editDraftItemAndEmitSnapshot({
        draft,
        editAdapter,
        item,
        onEditingLocalIdChange: setEditingLocalId,
        onSnapshotChange,
        removeOnCancel,
      });
    },
    [draft, editAdapter, onSnapshotChange],
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text maxFontSizeMultiplier={1.15} style={styles.title}>
          {resolvedLabels.title}
        </Text>
        <Text
          accessibilityLabel={`Progreso total de fotos ${formatReportMediaProgress(snapshot.overallProgress)}`}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: isOverallUploadBusy }}
          accessibilityValue={{
            max: 100,
            min: 0,
            now: overallProgressPercent,
            text: formatReportMediaProgress(snapshot.overallProgress),
          }}
          maxFontSizeMultiplier={1.1}
          style={styles.progressText}
        >
          {overallProgressLabel}
        </Text>
      </View>
      <View style={styles.sourceActions}>
        <Pressable
          accessibilityLabel={
            canAddMoreMedia
              ? "Agregar desde biblioteca"
              : "Limite de fotos alcanzado"
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAddMoreMedia }}
          disabled={!canAddMoreMedia}
          onPress={async () => {
            const sourceResult = await sourceAdapter.selectFromLibrary();

            if (isReportMediaSourceFeedback(sourceResult)) {
              setSourceFeedback(sourceResult);
              return;
            }

            setSourceFeedback(null);
            const selectedItems = sourceResult
              .slice(0, Math.max(maxItems - snapshot.items.length, 0))
              .map((image) => draft.selectLocalImage(image));

            if (selectedItems.length > 0) {
              onSnapshotChange(draft.getSnapshot());
              for (const selectedItem of selectedItems) {
                await editDraftItem(selectedItem, true);
              }
            }
          }}
          style={[
            styles.sourceButton,
            !canAddMoreMedia ? styles.disabledAction : null,
          ]}
        >
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonIcon}>
            +
          </Text>
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonText}>
            {resolvedLabels.libraryButton}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={
            canAddMoreMedia ? "Agregar con camara" : "Limite de fotos alcanzado"
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAddMoreMedia }}
          disabled={!canAddMoreMedia}
          onPress={async () => {
            const sourceResult = await sourceAdapter.captureWithCamera();

            if (isReportMediaSourceFeedback(sourceResult)) {
              setSourceFeedback(sourceResult);
              return;
            }

            setSourceFeedback(null);

            if (sourceResult) {
              const selectedItem = draft.selectLocalImage(sourceResult);
              onSnapshotChange(draft.getSnapshot());
              await editDraftItem(selectedItem, true);
            }
          }}
          style={[
            styles.sourceButton,
            !canAddMoreMedia ? styles.disabledAction : null,
          ]}
        >
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonIcon}>
            +
          </Text>
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonText}>
            {resolvedLabels.cameraButton}
          </Text>
        </Pressable>
      </View>
      {!canAddMoreMedia ? (
        <Text maxFontSizeMultiplier={1.15} style={styles.limitText}>
          {mediaLimitFeedback}
        </Text>
      ) : null}
      {sourceFeedback ? renderReportMediaSourceFeedback(sourceFeedback) : null}
      <View style={styles.grid}>
        {snapshot.items.map((item, index) => (
          <ReportMediaTile
            draft={draft}
            editAdapter={editAdapter}
            index={index}
            isEditing={editingLocalId === item.localId}
            isPrimary={snapshot.primaryLocalId === item.localId}
            item={item}
            itemCount={snapshot.items.length}
            key={item.localId}
            onEdit={async (localId) => {
              const draftItem = draft
                .getSnapshot()
                .items.find((snapshotItem) => snapshotItem.localId === localId);

              if (draftItem) {
                await editDraftItem(draftItem, false);
              }
            }}
            onSnapshotChange={onSnapshotChange}
          />
        ))}
      </View>
    </View>
  );
}

function isReportMediaSourceFeedback(
  result: ReportMediaCameraSourceResult | ReportMediaLibrarySourceResult,
): result is ReportMediaSourceFeedback {
  if (!result) {
    return false;
  }

  return (
    !Array.isArray(result) && !("originalUri" in result) && "status" in result
  );
}

function renderReportMediaSourceFeedback(feedback: ReportMediaSourceFeedback) {
  const message =
    feedback.message ??
    ("canAskAgain" in feedback && feedback.canAskAgain === false
      ? "Activa el permiso de fotos o camara desde Ajustes para adjuntar imagenes."
      : "Necesitamos permiso para abrir tus fotos o camara.");

  return (
    <View
      accessibilityLabel={message}
      accessibilityRole="alert"
      style={styles.feedbackBanner}
    >
      <Text maxFontSizeMultiplier={1.15} style={styles.feedbackText}>
        {message}
      </Text>
    </View>
  );
}

function ReportMediaTile({
  draft,
  editAdapter,
  index,
  isEditing,
  isPrimary,
  item,
  itemCount,
  onEdit,
  onSnapshotChange,
}: {
  draft: ReportMediaManagerDraftBridge;
  editAdapter?: ReportMediaEditAdapter;
  index: number;
  isEditing: boolean;
  isPrimary: boolean;
  item: ReportMediaDraftItem;
  itemCount: number;
  onEdit: (localId: string) => Promise<void> | void;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
}) {
  const photoNumber = index + 1;
  const photoLabel = `Foto ${photoNumber}`;
  const progressLabel = formatReportMediaProgress(item.progress);
  const statusLabel = getReportMediaStatusLabel(item.status);
  const uploadAccessibilityStatusLabel =
    getReportMediaUploadAccessibilityStatusLabel(item.status);
  const actionContext = `${photoLabel.toLowerCase()} de ${itemCount}, ${
    isPrimary ? "portada" : "sin portada"
  }, ${uploadAccessibilityStatusLabel}`;
  const coverActionAccessibilityLabel = `Usar ${photoLabel.toLowerCase()} de ${itemCount} como portada, ${uploadAccessibilityStatusLabel}`;
  const tileAccessibilityLabel = `${photoLabel} de ${itemCount}, ${
    isPrimary ? "portada" : "sin portada"
  }, ${uploadAccessibilityStatusLabel}, progreso ${progressLabel}`;
  const isUploadBusy = isReportMediaUploadBusy(item.status);
  const isInteractionBusy = isUploadBusy || isEditing;
  const canEditLocalImage = hasEditableLocalImageUri(item);

  return (
    <View style={styles.tile}>
      <View style={styles.thumbnailFrame}>
        <Image
          accessibilityLabel={tileAccessibilityLabel}
          contentFit="cover"
          source={{ uri: item.uploadUri }}
          style={styles.thumbnailImage}
        />
        <ReportMediaCoverBadge isVisible={isPrimary} />
      </View>
      <View style={styles.tileBody}>
        <View style={styles.tileHeader}>
          <Text maxFontSizeMultiplier={1.1} style={styles.tileTitle}>
            {photoLabel}
          </Text>
        </View>
        <Text maxFontSizeMultiplier={1.1} style={styles.statusText}>
          {statusLabel}
        </Text>
        <ReportMediaTileProgress
          isUploadBusy={isUploadBusy}
          photoNumber={photoNumber}
          progress={item.progress}
          progressLabel={progressLabel}
        />
        <Text maxFontSizeMultiplier={1.1} style={styles.progressText}>
          {progressLabel}
        </Text>
        <ReportMediaTileToolbar
          actionContext={actionContext}
          canEditLocalImage={canEditLocalImage}
          coverActionAccessibilityLabel={coverActionAccessibilityLabel}
          draft={draft}
          editAdapter={editAdapter}
          index={index}
          isInteractionBusy={isInteractionBusy}
          isPrimary={isPrimary}
          item={item}
          itemCount={itemCount}
          onEdit={onEdit}
          onSnapshotChange={onSnapshotChange}
        />
        <ReportMediaRetryAction
          actionContext={actionContext}
          draft={draft}
          item={item}
          onSnapshotChange={onSnapshotChange}
        />
        <ReportMediaTileError message={item.errorMessage} />
      </View>
    </View>
  );
}

function ReportMediaCoverBadge({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.coverBadge}>
      <SafeMaterialCommunityIcon color="#FFFFFF" name="star" size={13} />
      <Text maxFontSizeMultiplier={1.05} style={styles.coverBadgeText}>
        Portada
      </Text>
    </View>
  );
}

function ReportMediaTileProgress({
  isUploadBusy,
  photoNumber,
  progress,
  progressLabel,
}: {
  isUploadBusy: boolean;
  photoNumber: number;
  progress: number;
  progressLabel: string;
}) {
  return (
    <View
      accessibilityLabel={`Progreso de foto ${photoNumber} ${progressLabel}`}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: isUploadBusy }}
      accessibilityValue={{
        max: 100,
        min: 0,
        now: Math.round(progress * 100),
      }}
      style={styles.progressTrack}
    >
      <View
        style={[
          styles.progressFill,
          { width: progressLabel as DimensionValue },
        ]}
      />
    </View>
  );
}

function ReportMediaTileToolbar({
  actionContext,
  canEditLocalImage,
  coverActionAccessibilityLabel,
  draft,
  editAdapter,
  index,
  isInteractionBusy,
  isPrimary,
  item,
  itemCount,
  onEdit,
  onSnapshotChange,
}: {
  actionContext: string;
  canEditLocalImage: boolean;
  coverActionAccessibilityLabel: string;
  draft: ReportMediaManagerDraftBridge;
  editAdapter?: ReportMediaEditAdapter;
  index: number;
  isInteractionBusy: boolean;
  isPrimary: boolean;
  item: ReportMediaDraftItem;
  itemCount: number;
  onEdit: (localId: string) => Promise<void> | void;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
}) {
  return (
    <View style={styles.tileToolbar}>
      {!isPrimary ? (
        <TileIconAction
          accessibilityLabel={coverActionAccessibilityLabel}
          disabled={isInteractionBusy}
          iconName="star-outline"
          onPress={() => {
            onSnapshotChange(draft.setPrimaryImage(item.localId));
          }}
        />
      ) : null}
      {editAdapter ? (
        <TileIconAction
          accessibilityLabel={`Editar ${actionContext}`}
          disabled={isInteractionBusy || !canEditLocalImage}
          iconName="pencil-outline"
          onPress={() => {
            void onEdit(item.localId);
          }}
        />
      ) : null}
      {index > 0 ? (
        <TileIconAction
          accessibilityLabel={`Mover ${actionContext} arriba`}
          disabled={isInteractionBusy}
          iconName="arrow-up"
          onPress={() => {
            onSnapshotChange(draft.moveImage(item.localId, index - 1));
          }}
        />
      ) : null}
      {index < itemCount - 1 ? (
        <TileIconAction
          accessibilityLabel={`Mover ${actionContext} abajo`}
          disabled={isInteractionBusy}
          iconName="arrow-down"
          onPress={() => {
            onSnapshotChange(draft.moveImage(item.localId, index + 1));
          }}
        />
      ) : null}
      <TileIconAction
        accessibilityLabel={`Quitar ${actionContext}`}
        danger
        disabled={isInteractionBusy}
        iconName="trash-can-outline"
        onPress={() => {
          onSnapshotChange(draft.removeImage(item.localId));
        }}
      />
    </View>
  );
}

function ReportMediaRetryAction({
  actionContext,
  draft,
  item,
  onSnapshotChange,
}: {
  actionContext: string;
  draft: ReportMediaManagerDraftBridge;
  item: ReportMediaDraftItem;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
}) {
  if (item.status !== "failed" || !item.retryable) {
    return null;
  }

  return (
    <View style={styles.retryRow}>
      <CompactAction
        accessibilityLabel={`Reintentar ${actionContext}`}
        label="Reintentar subida"
        onPress={async () => {
          await uploadDraftItemAndEmitSnapshot({
            draft,
            onSnapshotChange,
            upload: () => draft.retryUpload(item.localId),
          });
        }}
        primary
      />
    </View>
  );
}

function ReportMediaTileError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <Text
      accessibilityLiveRegion="polite"
      maxFontSizeMultiplier={1.15}
      selectable
      style={styles.tileErrorText}
    >
      {message}
    </Text>
  );
}

type ReportMediaIconName = MaterialCommunityIconName;

function TileIconAction({
  accessibilityLabel,
  danger = false,
  disabled = false,
  iconName,
  onPress,
}: {
  accessibilityLabel: string;
  danger?: boolean;
  disabled?: boolean;
  iconName: ReportMediaIconName;
  onPress: () => Promise<void> | void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.iconAction,
        danger ? styles.iconActionDanger : null,
        disabled ? styles.disabledAction : null,
      ]}
    >
      <SafeMaterialCommunityIcon
        color={danger ? "#A33A2A" : "#146C5A"}
        name={iconName}
        size={21}
      />
    </Pressable>
  );
}

async function editDraftItemAndEmitSnapshot({
  draft,
  editAdapter,
  item,
  onEditingLocalIdChange,
  onSnapshotChange,
  removeOnCancel,
}: {
  draft: ReportMediaManagerDraftBridge;
  editAdapter: ReportMediaEditAdapter;
  item: ReportMediaDraftItem;
  onEditingLocalIdChange: (localId: string | null) => void;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  removeOnCancel: boolean;
}): Promise<boolean> {
  let editedImage: AcceptedEditedReportImage | undefined;

  onEditingLocalIdChange(item.localId);

  try {
    editedImage = await editAdapter.editImage(item);
  } catch {
    if (removeOnCancel) {
      onSnapshotChange(draft.removeImage(item.localId));
    }

    onEditingLocalIdChange(null);
    return false;
  }

  if (!editedImage) {
    if (removeOnCancel) {
      onSnapshotChange(draft.removeImage(item.localId));
    }

    onEditingLocalIdChange(null);
    return false;
  }

  draft.acceptEditedImage(editedImage);
  onSnapshotChange(draft.getSnapshot());
  onEditingLocalIdChange(null);
  return true;
}

export async function uploadPendingReportMediaDraftItems({
  draft,
  onSnapshotChange,
}: {
  draft: ReportMediaManagerDraftBridge;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
}) {
  const pendingItems = draft
    .getSnapshot()
    .items.filter((item) => item.status === "selected");

  for (const item of pendingItems) {
    await uploadDraftItemAndEmitSnapshot({
      draft,
      onSnapshotChange,
      upload: () => draft.uploadImage(item.localId),
    });
  }

  const finalSnapshot = draft.getSnapshot();
  onSnapshotChange(finalSnapshot);
  return finalSnapshot;
}

async function uploadDraftItemAndEmitSnapshot({
  draft,
  onSnapshotChange,
  upload,
}: {
  draft: ReportMediaManagerDraftBridge;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  upload: () => Promise<ReportMediaDraftItem>;
}) {
  let isSettled = false;
  const uploadPromise = upload();
  const progressInterval = setInterval(() => {
    if (!isSettled) {
      onSnapshotChange(draft.getSnapshot());
    }
  }, 250);

  onSnapshotChange(draft.getSnapshot());

  try {
    await uploadPromise;
  } finally {
    isSettled = true;
    clearInterval(progressInterval);
    onSnapshotChange(draft.getSnapshot());
  }
}

function CompactAction({
  accessibilityLabel,
  danger = false,
  disabled = false,
  label,
  onPress,
  primary = false,
}: {
  accessibilityLabel: string;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => Promise<void> | void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.compactAction,
        primary ? styles.compactActionPrimary : null,
        danger ? styles.compactActionDanger : null,
        disabled ? styles.disabledAction : null,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.05}
        style={[
          styles.compactActionText,
          primary ? styles.compactActionTextPrimary : null,
          danger ? styles.compactActionTextDanger : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatReportMediaProgress(progress: number): `${number}%` {
  return `${Math.round(clampProgress(progress) * 100)}%`;
}

function getReportMediaStatusLabel(status: ReportMediaDraftItemStatus) {
  switch (status) {
    case "authorizing":
      return "Preparando subida";
    case "failed":
      return "Error al subir";
    case "ready":
      return "Lista";
    case "selected":
      return "Se subira al continuar";
    case "uploading":
      return "Subiendo";
  }
}

function getReportMediaUploadAccessibilityStatusLabel(
  status: ReportMediaDraftItemStatus,
) {
  switch (status) {
    case "authorizing":
      return "preparando subida";
    case "failed":
      return "error al subir";
    case "ready":
      return "subida";
    case "selected":
      return "pendiente de subir al continuar";
    case "uploading":
      return "subiendo";
  }
}

function isReportMediaUploadBusy(status: ReportMediaDraftItemStatus) {
  return status === "authorizing" || status === "uploading";
}

function hasEditableLocalImageUri(item: ReportMediaDraftItem) {
  return item.uploadUri.trim().length > 0 || item.originalUri.trim().length > 0;
}

function clampProgress(progress: number) {
  if (progress < 0) {
    return 0;
  }

  if (progress > 1) {
    return 1;
  }

  return progress;
}

const styles = StyleSheet.create({
  compactAction: {
    alignItems: "center",
    backgroundColor: "#F5F7F6",
    borderColor: "#DDE5E1",
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  compactActionDanger: {
    backgroundColor: "#FFF2EF",
    borderColor: "#F0B7AA",
  },
  compactActionPrimary: {
    backgroundColor: "#146C5A",
    borderColor: "#146C5A",
  },
  compactActionText: {
    color: "#146C5A",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  compactActionTextDanger: {
    color: "#A33A2A",
  },
  compactActionTextPrimary: {
    color: "#FFFFFF",
  },
  disabledAction: {
    opacity: 0.45,
  },
  grid: {
    gap: 10,
  },
  feedbackBanner: {
    backgroundColor: "#FFF4D7",
    borderColor: "#E8C35D",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feedbackText: {
    color: "#614A00",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  header: {
    gap: 4,
  },
  iconAction: {
    alignItems: "center",
    backgroundColor: "#F5F7F6",
    borderColor: "#DDE5E1",
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconActionDanger: {
    backgroundColor: "#FFF2EF",
    borderColor: "#F0B7AA",
  },
  limitText: {
    color: "#66756E",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  coverBadge: {
    alignItems: "center",
    backgroundColor: "#146C5A",
    borderColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 6,
    flexDirection: "row",
    gap: 3,
    left: 6,
    maxWidth: 86,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: "absolute",
  },
  coverBadgeText: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
  progressFill: {
    backgroundColor: "#146C5A",
    borderCurve: "continuous",
    borderRadius: 999,
    height: "100%",
  },
  progressText: {
    color: "#66756E",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  progressTrack: {
    backgroundColor: "#E7EEE9",
    borderCurve: "continuous",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  section: {
    gap: 12,
  },
  sourceActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sourceButton: {
    alignItems: "center",
    backgroundColor: "#EDF8F4",
    borderColor: "#C9DFD6",
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sourceButtonIcon: {
    color: "#146C5A",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  sourceButtonText: {
    color: "#146C5A",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  statusText: {
    color: "#394842",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  retryRow: {
    alignItems: "flex-start",
  },
  thumbnailFrame: {
    backgroundColor: "#E7EEE9",
    borderColor: "#DDE5E1",
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    height: 96,
    overflow: "hidden",
    position: "relative",
    width: 96,
  },
  thumbnailImage: {
    height: "100%",
    width: "100%",
  },
  tile: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE5E1",
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    padding: 8,
  },
  tileBody: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  tileHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tileToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tileTitle: {
    color: "#17201C",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  tileErrorText: {
    color: "#A33A2A",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  title: {
    color: "#17201C",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
});
