import type { DimensionValue } from "react-native";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type {
  AcceptedEditedReportImage,
  ReportMediaDraft,
  ReportMediaDraftItem,
  ReportMediaDraftItemStatus,
  ReportMediaDraftSnapshot,
  SelectedLocalReportImage,
} from "./report-media-draft";

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

export interface ReportMediaManagerLabels {
  cameraButton: string;
  libraryButton: string;
  title: string;
}

export interface ReportMediaManagerProps {
  draft: ReportMediaManagerDraftBridge;
  editAdapter?: ReportMediaEditAdapter;
  labels?: Partial<ReportMediaManagerLabels>;
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
  onSnapshotChange,
  snapshot,
  sourceAdapter,
}: ReportMediaManagerProps) {
  const [sourceFeedback, setSourceFeedback] =
    React.useState<ReportMediaSourceFeedback | null>(null);
  const resolvedLabels = { ...defaultLabels, ...labels };
  const overallProgressLabel = `Progreso total ${formatReportMediaProgress(snapshot.overallProgress)}`;
  const overallProgressPercent = Math.round(
    clampProgress(snapshot.overallProgress) * 100,
  );
  const isOverallUploadBusy = snapshot.items.some((item) =>
    isReportMediaUploadBusy(item.status),
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
          accessibilityLabel="Agregar desde biblioteca"
          accessibilityRole="button"
          onPress={async () => {
            const sourceResult = await sourceAdapter.selectFromLibrary();

            if (isReportMediaSourceFeedback(sourceResult)) {
              setSourceFeedback(sourceResult);
              return;
            }

            setSourceFeedback(null);
            const selectedItems: ReportMediaDraftItem[] = [];

            for (const image of sourceResult) {
              selectedItems.push(draft.selectLocalImage(image));
            }

            onSnapshotChange(draft.getSnapshot());

            for (const item of selectedItems) {
              await uploadDraftItemAndEmitSnapshot({
                draft,
                localId: item.localId,
                onSnapshotChange,
              });
            }
          }}
          style={styles.sourceButton}
        >
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonIcon}>
            +
          </Text>
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonText}>
            {resolvedLabels.libraryButton}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Agregar con camara"
          accessibilityRole="button"
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

              await uploadDraftItemAndEmitSnapshot({
                draft,
                localId: selectedItem.localId,
                onSnapshotChange,
              });
            }
          }}
          style={styles.sourceButton}
        >
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonIcon}>
            +
          </Text>
          <Text maxFontSizeMultiplier={1.1} style={styles.sourceButtonText}>
            {resolvedLabels.cameraButton}
          </Text>
        </Pressable>
      </View>
      {sourceFeedback ? renderReportMediaSourceFeedback(sourceFeedback) : null}
      <View style={styles.grid}>
        {snapshot.items.map((item, index) => (
          <ReportMediaTile
            draft={draft}
            editAdapter={editAdapter}
            index={index}
            isPrimary={snapshot.primaryLocalId === item.localId}
            item={item}
            itemCount={snapshot.items.length}
            key={item.localId}
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
  isPrimary,
  item,
  itemCount,
  onSnapshotChange,
}: {
  draft: ReportMediaManagerDraftBridge;
  editAdapter?: ReportMediaEditAdapter;
  index: number;
  isPrimary: boolean;
  item: ReportMediaDraftItem;
  itemCount: number;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
}) {
  const photoNumber = index + 1;
  const photoLabel = `Foto ${photoNumber}`;
  const progressLabel = formatReportMediaProgress(item.progress);
  const statusLabel = getReportMediaStatusLabel(item.status);
  const uploadAccessibilityStatusLabel =
    getReportMediaUploadAccessibilityStatusLabel(item.status);
  const actionContext = `${photoLabel.toLowerCase()} de ${itemCount}, ${
    isPrimary ? "principal" : "no principal"
  }, ${uploadAccessibilityStatusLabel}`;
  const tileAccessibilityLabel = `${photoLabel} de ${itemCount}, ${
    isPrimary ? "principal" : "no principal"
  }, ${uploadAccessibilityStatusLabel}, progreso ${progressLabel}`;
  const isUploadBusy = isReportMediaUploadBusy(item.status);
  const canEditLocalImage = hasEditableLocalImageUri(item);

  return (
    <View
      accessible
      accessibilityLabel={tileAccessibilityLabel}
      style={styles.tile}
    >
      <Image
        accessibilityLabel={photoLabel}
        contentFit="cover"
        source={{ uri: item.uploadUri }}
        style={styles.image}
      />
      <View style={styles.tileBody}>
        <View style={styles.tileHeader}>
          <Text maxFontSizeMultiplier={1.1} style={styles.tileTitle}>
            {photoLabel}
          </Text>
          {isPrimary ? (
            <Text maxFontSizeMultiplier={1.1} style={styles.primaryPill}>
              Principal
            </Text>
          ) : null}
        </View>
        <Text maxFontSizeMultiplier={1.1} style={styles.statusText}>
          {statusLabel}
        </Text>
        <View
          accessibilityLabel={`Progreso de foto ${photoNumber} ${progressLabel}`}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: isUploadBusy }}
          accessibilityValue={{
            max: 100,
            min: 0,
            now: Math.round(item.progress * 100),
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
        <Text maxFontSizeMultiplier={1.1} style={styles.progressText}>
          {progressLabel}
        </Text>
        <View style={styles.tileActions}>
          <CompactAction
            accessibilityLabel={`Quitar ${actionContext}`}
            label="Quitar"
            onPress={() => {
              onSnapshotChange(draft.removeImage(item.localId));
            }}
          />
          {!isPrimary ? (
            <CompactAction
              accessibilityLabel={`Hacer principal ${actionContext}`}
              label="Principal"
              onPress={() => {
                onSnapshotChange(draft.setPrimaryImage(item.localId));
              }}
            />
          ) : null}
          {index > 0 ? (
            <CompactAction
              accessibilityLabel={`Mover ${actionContext} arriba`}
              label="Arriba"
              onPress={() => {
                onSnapshotChange(draft.moveImage(item.localId, index - 1));
              }}
            />
          ) : null}
          {index < itemCount - 1 ? (
            <CompactAction
              accessibilityLabel={`Mover ${actionContext} abajo`}
              label="Abajo"
              onPress={() => {
                onSnapshotChange(draft.moveImage(item.localId, index + 1));
              }}
            />
          ) : null}
          {editAdapter ? (
            <>
              <CompactAction
                accessibilityLabel={`Recortar ${actionContext}`}
                disabled={isUploadBusy || !canEditLocalImage}
                label="Recortar"
                onPress={() =>
                  editDraftItemAndUpload({
                    draft,
                    editAdapter,
                    item,
                    onSnapshotChange,
                    options: createCenteredSquareCrop(item),
                  })
                }
              />
              <CompactAction
                accessibilityLabel={`Girar ${actionContext}`}
                disabled={isUploadBusy || !canEditLocalImage}
                label="Girar"
                onPress={() =>
                  editDraftItemAndUpload({
                    draft,
                    editAdapter,
                    item,
                    onSnapshotChange,
                    options: { rotateDegrees: 90 },
                  })
                }
              />
            </>
          ) : null}
          {item.status === "failed" && item.retryable ? (
            <CompactAction
              accessibilityLabel={`Reintentar ${actionContext}`}
              label="Reintentar"
              onPress={async () => {
                await draft.retryUpload(item.localId);
                onSnapshotChange(draft.getSnapshot());
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function createCenteredSquareCrop(
  item: ReportMediaDraftItem,
): ReportMediaEditOptions {
  const size = Math.min(item.width, item.height);

  return {
    crop: {
      height: size,
      originX: Math.max(0, Math.floor((item.width - size) / 2)),
      originY: Math.max(0, Math.floor((item.height - size) / 2)),
      width: size,
    },
  };
}

async function editDraftItemAndUpload({
  draft,
  editAdapter,
  item,
  onSnapshotChange,
  options,
}: {
  draft: ReportMediaManagerDraftBridge;
  editAdapter: ReportMediaEditAdapter;
  item: ReportMediaDraftItem;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  options: ReportMediaEditOptions;
}) {
  const editedImage = await editAdapter.editImage(item, options);

  if (!editedImage) {
    return;
  }

  const editedItem = draft.acceptEditedImage(editedImage);
  onSnapshotChange(draft.getSnapshot());

  await uploadDraftItemAndEmitSnapshot({
    draft,
    localId: editedItem.localId,
    onSnapshotChange,
  });
}

async function uploadDraftItemAndEmitSnapshot({
  draft,
  localId,
  onSnapshotChange,
}: {
  draft: ReportMediaManagerDraftBridge;
  localId: string;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
}) {
  let isSettled = false;
  const uploadPromise = draft.uploadImage(localId);
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
  disabled = false,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  onPress: () => Promise<void> | void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={styles.compactAction}
    >
      <Text maxFontSizeMultiplier={1.05} style={styles.compactActionText}>
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
      return "Seleccionada";
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
      return "seleccionada";
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
    minHeight: 32,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  compactActionText: {
    color: "#146C5A",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
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
  image: {
    backgroundColor: "#E7EEE9",
    height: 88,
    width: 88,
  },
  primaryPill: {
    backgroundColor: "#DDF2EA",
    borderCurve: "continuous",
    borderRadius: 8,
    color: "#146C5A",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  tile: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE5E1",
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
    padding: 8,
  },
  tileActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
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
  tileTitle: {
    color: "#17201C",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  title: {
    color: "#17201C",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
});
