import type { ViewToken } from "react-native";
import * as React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { ResourceProviderReportReceipt } from "../resources";
import type { LocalSponsorPlacementSurface } from "../resources/resource-types";
import { createSponsorDeliverySessionId } from "../resources/sponsor-delivery-session";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";

const sponsorImpressionViewabilityConfig = {
  itemVisiblePercentThreshold: 60,
  minimumViewTime: 600,
};

export interface ReportCreationSuccessSponsorPlacement {
  actionLabel: string;
  body: string;
  categoryLabel: string;
  deliveryToken?: string;
  eligibleSurfaces: readonly LocalSponsorPlacementSurface[];
  id: string;
  imageUrl?: string;
  logoUrl?: string;
  name: string;
  paidDisclosure: string;
  recoveryPriorityDisclosure: string;
  reportActionLabel: string;
  sponsorLabel: string;
  surface: LocalSponsorPlacementSurface;
  title: string;
}

export interface ReportCreationSponsorDeliveryInput {
  deliveryToken: string;
  eventType: "impression" | "open";
  idempotencyKey: string;
  providerId: string;
  source: string;
  surface: LocalSponsorPlacementSurface;
}

export function ReportCreationSuccessSponsorStack({
  deliveryContextId,
  onOpen,
  onRecordDelivery,
  onReport,
  placements,
}: {
  deliveryContextId?: string;
  onOpen?: (sponsorProviderId: string) => void;
  onRecordDelivery?: (input: ReportCreationSponsorDeliveryInput) => void;
  onReport?: (
    sponsorProviderId: string,
  ) =>
    | Promise<ResourceProviderReportReceipt | void>
    | ResourceProviderReportReceipt
    | void;
  placements: readonly ReportCreationSuccessSponsorPlacement[];
}) {
  const recordedImpressionsRef = React.useRef<Set<string> | null>(new Set());
  const deliverySessionIdRef = React.useRef(createSponsorDeliverySessionId());
  const deliveryKeyPrefix = deliveryContextId
    ? `report-success:${deliveryContextId}`
    : `report-success:draft:${deliverySessionIdRef.current}`;

  const recordSponsorImpression = React.useCallback(
    (placement: ReportCreationSuccessSponsorPlacement) => {
      if (!onRecordDelivery) {
        return;
      }

      recordedImpressionsRef.current ??= new Set();
      const key = `${deliveryKeyPrefix}:${placement.id}:${placement.surface}:impression`;

      if (recordedImpressionsRef.current.has(key)) {
        return;
      }

      if (!placement.deliveryToken) {
        return;
      }

      recordedImpressionsRef.current.add(key);
      onRecordDelivery({
        deliveryToken: placement.deliveryToken,
        eventType: "impression",
        idempotencyKey: `${deliveryKeyPrefix}:${placement.id}:${placement.surface}:impression`,
        providerId: placement.id,
        source: "report-success-sponsor-card",
        surface: placement.surface,
      });
    },
    [deliveryKeyPrefix, onRecordDelivery],
  );
  const handleViewableSponsorItemsChanged = React.useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken<ReportCreationSuccessSponsorPlacement>[];
    }) => {
      for (const viewableItem of viewableItems) {
        if (viewableItem.isViewable) {
          recordSponsorImpression(viewableItem.item);
        }
      }
    },
    [recordSponsorImpression],
  );

  if (placements.length === 0) {
    return null;
  }

  return (
    <View style={styles.stack} testID="report-success-sponsor-stack">
      <FlatList
        contentContainerStyle={styles.listContent}
        data={placements}
        horizontal
        keyExtractor={(placement) =>
          `${placement.surface}:${placement.id}:${placement.deliveryToken ?? placement.title}`
        }
        onViewableItemsChanged={handleViewableSponsorItemsChanged}
        renderItem={({ item: placement }) => (
          <ReportCreationSuccessSponsorCard
            deliveryKeyPrefix={deliveryKeyPrefix}
            onOpen={onOpen}
            onRecordDelivery={onRecordDelivery}
            onReport={onReport}
            placement={placement}
          />
        )}
        showsHorizontalScrollIndicator={false}
        testID="report-success-sponsor-list"
        viewabilityConfig={sponsorImpressionViewabilityConfig}
      />
    </View>
  );
}

function ReportCreationSuccessSponsorCard({
  deliveryKeyPrefix,
  onOpen,
  onRecordDelivery,
  onReport,
  placement,
}: {
  deliveryKeyPrefix: string;
  onOpen?: (sponsorProviderId: string) => void;
  onRecordDelivery?: (input: ReportCreationSponsorDeliveryInput) => void;
  onReport?: (
    sponsorProviderId: string,
  ) =>
    | Promise<ResourceProviderReportReceipt | void>
    | ResourceProviderReportReceipt
    | void;
  placement: ReportCreationSuccessSponsorPlacement;
}) {
  const [reportState, setReportState] =
    React.useState<SponsorPlacementReportState>({ kind: "idle" });
  const openPlacement = React.useCallback(() => {
    if (placement.deliveryToken) {
      onRecordDelivery?.({
        deliveryToken: placement.deliveryToken,
        eventType: "open",
        idempotencyKey: `${deliveryKeyPrefix}:${placement.id}:${placement.surface}:open`,
        providerId: placement.id,
        source: "report-success-sponsor-card",
        surface: placement.surface,
      });
    }
    onOpen?.(placement.id);
  }, [
    onOpen,
    onRecordDelivery,
    deliveryKeyPrefix,
    placement.deliveryToken,
    placement.id,
    placement.surface,
  ]);
  const reportPlacement = React.useCallback(async () => {
    if (reportState.kind === "reporting") {
      return;
    }

    if (!onReport) {
      setReportState({
        kind: "error",
        message:
          "No pudimos confirmar el reporte del proveedor. Intenta de nuevo.",
      });
      return;
    }

    setReportState({
      kind: "reporting",
      message: "Enviando reporte a moderación.",
    });

    try {
      const receipt = await onReport(placement.id);

      if (!receipt) {
        setReportState({
          kind: "error",
          message:
            "No pudimos confirmar el reporte del proveedor. Intenta de nuevo.",
        });
        return;
      }

      setReportState({
        kind: "reported",
        message: getSponsorPlacementReportReceiptMessage(receipt),
      });
    } catch (error) {
      setReportState({
        kind: "error",
        message: getSponsorPlacementReportFailureMessage(error),
      });
    }
  }, [onReport, placement.id, reportState.kind]);

  return (
    <View style={styles.card} testID="report-success-sponsor-card">
      <View style={styles.header}>
        <View style={styles.icon}>
          <ShellIcon
            color={shellColors.primary}
            name="cross.case.fill"
            size={22}
          />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.labelRow}>
            <View style={styles.pill}>
              <Text maxFontSizeMultiplier={1.1} style={styles.pillText}>
                {placement.sponsorLabel}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.1} style={styles.disclosure}>
              {placement.paidDisclosure}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.15} style={styles.title}>
            {placement.title}
          </Text>
        </View>
      </View>
      {placement.logoUrl || placement.imageUrl ? (
        <View style={styles.mediaRow} testID="report-success-sponsor-media">
          {placement.logoUrl ? (
            <Image
              accessibilityLabel={`Logo de ${placement.name}`}
              contentFit="cover"
              source={{ uri: placement.logoUrl }}
              style={styles.logo}
            />
          ) : null}
          {placement.imageUrl ? (
            <Image
              accessibilityLabel={`Imagen de ${placement.name}`}
              contentFit="cover"
              source={{ uri: placement.imageUrl }}
              style={styles.banner}
            />
          ) : null}
        </View>
      ) : null}
      <Text maxFontSizeMultiplier={1.15} style={styles.name}>
        {placement.name}
      </Text>
      <Text maxFontSizeMultiplier={1.1} style={styles.category}>
        {placement.categoryLabel}
      </Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.body}>
        {placement.body}
      </Text>
      <View style={styles.priorityDisclosure}>
        <ShellIcon
          color={shellColors.primaryDark}
          name="info.circle.fill"
          size={16}
        />
        <Text maxFontSizeMultiplier={1.15} style={styles.priorityText}>
          {placement.recoveryPriorityDisclosure}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`${placement.actionLabel}: ${placement.name}`}
          accessibilityRole="button"
          onPress={openPlacement}
          testID="report-success-sponsor-open"
          style={styles.action}
        >
          <ShellIcon
            color={shellColors.primary}
            name="arrow.up.right"
            size={14}
          />
          <Text maxFontSizeMultiplier={1.1} style={styles.actionText}>
            {placement.actionLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${placement.reportActionLabel} ${placement.name}`}
          accessibilityRole="button"
          accessibilityState={{
            busy: reportState.kind === "reporting",
            disabled: reportState.kind === "reporting",
          }}
          disabled={reportState.kind === "reporting"}
          onPress={reportPlacement}
          testID="report-success-sponsor-report"
          style={styles.reportAction}
        >
          <Text maxFontSizeMultiplier={1.1} style={styles.reportText}>
            {reportState.kind === "reporting"
              ? "Enviando"
              : placement.reportActionLabel}
          </Text>
        </Pressable>
      </View>
      {reportState.kind === "idle" ? null : (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.feedback,
            reportState.kind === "error" ? styles.feedbackError : null,
          ]}
        >
          <Text maxFontSizeMultiplier={1.1} style={styles.feedbackText}>
            {reportState.message}
          </Text>
        </View>
      )}
    </View>
  );
}

type SponsorPlacementReportState =
  | { kind: "idle" }
  | { kind: "reporting"; message: string }
  | { kind: "reported"; message: string }
  | { kind: "error"; message: string };

export function getSponsorPlacementReportReceiptMessage(
  receipt: ResourceProviderReportReceipt,
) {
  if (receipt.status === "already_reported") {
    return "Ya recibimos tu reporte sobre este proveedor. Moderación lo mantiene en revisión.";
  }

  return "Reporte enviado. Moderación revisará este proveedor con la información recibida.";
}

export function getSponsorPlacementReportFailureMessage(error: unknown) {
  const code = getSponsorPlacementReportErrorCode(error);
  const message = getSponsorPlacementReportErrorMessage(error).toLowerCase();

  if (code === "UNAUTHORIZED") {
    return "Inicia sesión para reportar este proveedor.";
  }

  if (
    code === "PRECONDITION_FAILED" &&
    (message.includes("suspend") || message.includes("suspendido"))
  ) {
    return "Tu cuenta está suspendida y no puede reportar proveedores.";
  }

  if (code === "BAD_REQUEST") {
    return "No pudimos enviar el reporte porque el proveedor o el detalle no pasó validación.";
  }

  if (code === "NOT_FOUND") {
    return "No encontramos este proveedor para reportarlo.";
  }

  return "No pudimos enviar el reporte del proveedor. Intenta de nuevo.";
}

function getSponsorPlacementReportErrorCode(error: unknown) {
  if (!isRecord(error)) {
    return undefined;
  }

  if (typeof error.code === "string") {
    return error.code;
  }

  if (isRecord(error.data) && typeof error.data.code === "string") {
    return error.data.code;
  }

  return getSponsorPlacementReportErrorCode(error.cause);
}

function getSponsorPlacementReportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionText: {
    color: shellColors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  banner: {
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 14,
    flex: 1,
    height: 72,
    minWidth: 140,
  },
  body: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  card: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    width: 286,
  },
  category: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  disclosure: {
    color: shellColors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  feedback: {
    backgroundColor: shellColors.primarySoft,
    borderRadius: 14,
    padding: 10,
  },
  feedbackError: {
    backgroundColor: "#FCE4E2",
  },
  feedbackText: {
    color: shellColors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  header: {
    flexDirection: "row",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  icon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listContent: {
    gap: 12,
    paddingRight: 2,
  },
  logo: {
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 14,
    height: 72,
    width: 72,
  },
  mediaRow: {
    flexDirection: "row",
    gap: 10,
  },
  name: {
    color: shellColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  pill: {
    backgroundColor: shellColors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    color: shellColors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  priorityDisclosure: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  priorityText: {
    color: shellColors.primaryDark,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  reportAction: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reportText: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "900",
  },
  stack: {
    gap: 12,
  },
  title: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
});
