import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type {
  ResourceContactOption,
  ResourceProviderProfile as ResourceProviderProfileData,
  ResourceReportReason,
} from "./resource-types";
import type { ResourcesAdapter } from "./static-resources-adapter";
import { trustSafetyReportReasonOptions } from "../trust-safety";
import { ResourceProviderProfile } from "./resource-provider-profile";
import { defaultApiResourcesAdapter } from "./resources-default-api-adapter";
import { resourcesColors, resourcesShadow } from "./resources-theme";

const defaultResourcesAdapter = defaultApiResourcesAdapter;
const bottomInset = 36;

type ProfileStateIconName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

type ProfileLoadState =
  | {
      kind: "loading";
      providerId?: string;
    }
  | {
      isOffline?: boolean;
      isStale?: boolean;
      kind: "ready";
      profile: ResourceProviderProfileData;
      providerId: string;
    }
  | {
      kind: "missing";
      providerId?: string;
    }
  | {
      kind: "error";
      message: string;
      providerId: string;
    };

type ReportState =
  | {
      kind: "idle";
    }
  | {
      kind: "reporting";
    }
  | {
      kind: "reported";
    }
  | {
      kind: "error";
      message: string;
    };

interface ProviderReportDraft {
  detail: string;
  providerId: string;
  reason: ResourceReportReason;
}

const providerReportReasonOptions = trustSafetyReportReasonOptions.filter(
  (option) => option.value !== "stolen_pet_concern",
);

export interface ResourceProviderProfileScreenProps {
  adapter?: ResourcesAdapter;
  providerId?: string | string[];
}

export function buildResourceProviderProfileHref(providerId: string): Href {
  return `/proveedores/${encodeURIComponent(providerId.trim())}` as Href;
}

export function ResourceProviderProfileScreen({
  adapter = defaultResourcesAdapter,
  providerId,
}: ResourceProviderProfileScreenProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const profileBottomInset = Math.max(safeAreaInsets.bottom + 168, 188);
  const resolvedProviderId = useMemo(
    () => normalizeProviderId(providerId),
    [providerId],
  );
  const [loadState, setLoadState] = useState<ProfileLoadState>({
    kind: "loading",
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const reportWorkflow = useProviderReportWorkflow(adapter);

  useEffect(() => {
    if (!resolvedProviderId) {
      return;
    }

    let isCurrent = true;

    loadProviderProfile({ adapter, providerId: resolvedProviderId })
      .then((result) => {
        if (!isCurrent) {
          return;
        }

        setLoadState(
          result.profile
            ? {
                isOffline: result.isOffline,
                isStale: result.isStale,
                kind: "ready",
                profile: result.profile,
                providerId: resolvedProviderId,
              }
            : { kind: "missing", providerId: resolvedProviderId },
        );
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setLoadState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "No pudimos cargar el perfil del proveedor.",
          providerId: resolvedProviderId,
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [adapter, reloadVersion, resolvedProviderId]);

  const handleRetry = useCallback(() => {
    reportWorkflow.resetReportState();
    setLoadState({ kind: "loading", providerId: resolvedProviderId });
    setReloadVersion((current) => current + 1);
  }, [reportWorkflow, resolvedProviderId]);

  const handleContactAction = useCallback(
    (action: {
      providerId: string;
      kind: ResourceContactOption["kind"];
      label: string;
      value: string;
    }) => {
      const url = buildContactUrl(action);

      if (url) {
        void Linking.openURL(url);
      }
    },
    [],
  );

  const handleOpenLink = useCallback(
    ({ url }: { providerId: string; label: string; url: string }) => {
      void Linking.openURL(url);
    },
    [],
  );

  const currentLoadState = getCurrentLoadState(loadState, resolvedProviderId);

  if (currentLoadState.kind === "loading") {
    return (
      <ResourceProviderProfileStateScreen
        body="Estamos cargando datos de contacto, horario y señales de confianza."
        iconName="timer-sand"
        title="Cargando proveedor"
      />
    );
  }

  if (currentLoadState.kind === "missing") {
    return (
      <ResourceProviderProfileStateScreen
        actionLabel="Reintentar"
        body="Puede que este proveedor ya no esté disponible en Recursos."
        iconName="help-circle"
        onAction={handleRetry}
        title="No encontramos este proveedor"
      />
    );
  }

  if (currentLoadState.kind === "error") {
    return (
      <ResourceProviderProfileStateScreen
        actionLabel="Reintentar"
        body={currentLoadState.message}
        iconName="alert"
        onAction={handleRetry}
        title="No pudimos abrir el perfil"
      />
    );
  }

  return (
    <>
      <ResourceProviderProfile
        bottomInset={profileBottomInset}
        onContactAction={handleContactAction}
        onOpenLink={handleOpenLink}
        onReportProvider={reportWorkflow.openReportProvider}
        profile={currentLoadState.profile}
        reportFeedback={buildReportFeedback(
          reportWorkflow.reportState,
          currentLoadState,
        )}
      />
      <ProviderReportConfirmationModal
        canSubmit={reportWorkflow.canSubmit}
        detail={reportWorkflow.detail}
        errorMessage={reportWorkflow.errorMessage}
        isSubmitting={reportWorkflow.reportState.kind === "reporting"}
        onCancel={reportWorkflow.closeReportProvider}
        onChangeDetail={reportWorkflow.changeReportDetail}
        onChangeReason={reportWorkflow.changeReportReason}
        onSubmit={reportWorkflow.submitReportProvider}
        providerName={currentLoadState.profile.name}
        reasonLabel={reportWorkflow.reasonLabel}
        selectedReason={reportWorkflow.selectedReason}
        visible={reportWorkflow.isVisible}
      />
    </>
  );
}

function useProviderReportWorkflow(adapter: ResourcesAdapter) {
  const [reportState, setReportState] = useState<ReportState>({ kind: "idle" });
  const [reportDraft, setReportDraft] = useState<ProviderReportDraft | null>(
    null,
  );

  const openReportProvider = useCallback(
    (providerId: string) => {
      if (reportState.kind === "reporting") {
        return;
      }

      setReportDraft({
        detail: "",
        providerId,
        reason: "incorrect_location",
      });
    },
    [reportState.kind],
  );

  const closeReportProvider = useCallback(() => {
    if (reportState.kind !== "reporting") {
      setReportDraft(null);
    }
  }, [reportState.kind]);

  const changeReportReason = useCallback((reason: ResourceReportReason) => {
    setReportDraft((current) => (current ? { ...current, reason } : current));
  }, []);

  const changeReportDetail = useCallback((detail: string) => {
    setReportDraft((current) => (current ? { ...current, detail } : current));
  }, []);

  const submitReportProvider = useCallback(() => {
    if (!reportDraft || reportState.kind === "reporting") {
      return;
    }

    const reasonLabel = getProviderReportReasonLabel(reportDraft.reason);
    const detail =
      reportDraft.detail.trim() ||
      `Reporte de proveedor: ${reasonLabel.toLowerCase()}.`;

    setReportState({ kind: "reporting" });
    adapter
      .reportProvider({
        detail,
        providerId: reportDraft.providerId,
        reason: reportDraft.reason,
      })
      .then(() => {
        setReportState({ kind: "reported" });
        setReportDraft(null);
      })
      .catch((error: unknown) => {
        setReportState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "No pudimos enviar el reporte.",
        });
      });
  }, [adapter, reportDraft, reportState.kind]);

  const resetReportState = useCallback(() => {
    setReportState({ kind: "idle" });
    setReportDraft(null);
  }, []);

  const selectedReason = reportDraft?.reason ?? "incorrect_location";

  return useMemo(
    () => ({
      canSubmit: reportDraft !== null && reportState.kind !== "reporting",
      changeReportDetail,
      changeReportReason,
      closeReportProvider,
      detail: reportDraft?.detail ?? "",
      errorMessage:
        reportState.kind === "error" ? reportState.message : undefined,
      isVisible: reportDraft !== null,
      openReportProvider,
      reasonLabel: getProviderReportReasonLabel(selectedReason),
      reportState,
      resetReportState,
      selectedReason,
      submitReportProvider,
    }),
    [
      changeReportDetail,
      changeReportReason,
      closeReportProvider,
      openReportProvider,
      reportDraft,
      reportState,
      resetReportState,
      selectedReason,
      submitReportProvider,
    ],
  );
}

async function loadProviderProfile({
  adapter,
  providerId,
}: {
  adapter: ResourcesAdapter;
  providerId: string;
}) {
  if (adapter.getProviderProfileDetail !== undefined) {
    return adapter.getProviderProfileDetail(providerId);
  }

  return {
    profile: await adapter.getProviderProfile(providerId),
    providerId,
  };
}

function getCurrentLoadState(
  loadState: ProfileLoadState,
  providerId: string | undefined,
): ProfileLoadState {
  if (!providerId) {
    return { kind: "missing" };
  }

  if (loadState.providerId === providerId) {
    return loadState;
  }

  return {
    kind: "loading",
    providerId,
  };
}

function ResourceProviderProfileStateScreen({
  actionLabel,
  body,
  iconName,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  iconName: ProfileStateIconName;
  onAction?: () => void;
  title: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.stateContent}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.stateRoot}
    >
      <View style={styles.statePanel}>
        <View style={styles.stateIcon}>
          <MaterialCommunityIcons
            color={resourcesColors.primary}
            name={iconName}
            size={30}
          />
        </View>
        <Text selectable style={styles.stateTitle}>
          {title}
        </Text>
        <Text selectable style={styles.stateBody}>
          {body}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => [
              styles.stateAction,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text selectable style={styles.stateActionText}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function ProviderReportConfirmationModal({
  canSubmit,
  detail,
  errorMessage,
  isSubmitting,
  onCancel,
  onChangeDetail,
  onChangeReason,
  onSubmit,
  providerName,
  reasonLabel,
  selectedReason,
  visible,
}: {
  canSubmit: boolean;
  detail: string;
  errorMessage?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onChangeDetail: (detail: string) => void;
  onChangeReason: (reason: ResourceReportReason) => void;
  onSubmit: () => void;
  providerName: string;
  reasonLabel: string;
  selectedReason: ResourceReportReason;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View
        style={[
          styles.reportModalBackdrop,
          {
            paddingBottom: Math.max(insets.bottom + 84, 104),
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
            paddingTop: Math.max(insets.top, 12),
          },
        ]}
        testID="resource-provider-report-modal"
      >
        <Pressable
          accessibilityLabel="Cerrar reporte de proveedor"
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onCancel}
          testID="resource-provider-report-backdrop"
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityLabel={`Reportar ${providerName}`}
          accessibilityViewIsModal
          style={styles.reportSheet}
        >
          <View style={styles.reportSheetHeader}>
            <View style={styles.reportSheetTitleGroup}>
              <Text selectable style={styles.reportSheetTitle}>
                Reportar proveedor
              </Text>
              <Text selectable style={styles.reportSheetBody}>
                Elige el motivo antes de enviarlo a moderación.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onCancel}
              testID="resource-provider-report-close"
              style={({ pressed }) => [
                styles.reportSheetClose,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.reportSheetCloseText}>x</Text>
            </Pressable>
          </View>

          <View style={styles.reportReasonGrid}>
            {providerReportReasonOptions.map((option) => {
              const isSelected = selectedReason === option.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option.value}
                  onPress={() => onChangeReason(option.value)}
                  testID={`resource-provider-report-reason-${option.value}`}
                  style={({ pressed }) => [
                    styles.reportReasonButton,
                    isSelected ? styles.reportReasonButtonSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.1}
                    numberOfLines={1}
                    style={[
                      styles.reportReasonText,
                      isSelected ? styles.reportReasonTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.reportDetailField}>
            <Text selectable style={styles.reportDetailLabel}>
              Detalle opcional
            </Text>
            <TextInput
              accessibilityLabel="Detalle del reporte"
              editable={!isSubmitting}
              maxLength={500}
              multiline
              onChangeText={onChangeDetail}
              placeholder={`Ej. ${reasonLabel.toLowerCase()} en ${providerName}`}
              placeholderTextColor={resourcesColors.muted}
              style={styles.reportDetailInput}
              testID="resource-provider-report-detail"
              value={detail}
            />
          </View>

          {errorMessage ? (
            <Text
              accessibilityRole="alert"
              selectable
              style={styles.reportSheetError}
            >
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.reportSheetActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onCancel}
              testID="resource-provider-report-cancel"
              style={({ pressed }) => [
                styles.reportSheetButton,
                styles.reportSheetSecondaryButton,
                isSubmitting ? styles.reportSheetButtonDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.reportSheetSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={onSubmit}
              testID="resource-provider-report-submit"
              style={({ pressed }) => [
                styles.reportSheetButton,
                styles.reportSheetPrimaryButton,
                !canSubmit ? styles.reportSheetButtonDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={resourcesColors.surface} />
              ) : (
                <Text style={styles.reportSheetPrimaryText}>Enviar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildReportFeedback(
  reportState: ReportState,
  loadState: Extract<ProfileLoadState, { kind: "ready" }>,
) {
  if (reportState.kind === "reporting") {
    return {
      body: "Estamos enviando el reporte para revisión.",
      title: "Reportando perfil",
      tone: "info" as const,
    };
  }

  if (reportState.kind === "reported") {
    return {
      body: "Gracias. El equipo de Rastro revisará este perfil.",
      title: "Reporte enviado",
      tone: "success" as const,
    };
  }

  if (reportState.kind === "error") {
    return {
      body: reportState.message,
      title: "No pudimos reportar",
      tone: "error" as const,
    };
  }

  if (loadState.isOffline === true && loadState.isStale === true) {
    return {
      body: "Sin conexion. Mostrando el perfil guardado; puede estar desactualizado.",
      title: "Datos guardados",
      tone: "info" as const,
    };
  }

  return undefined;
}

function getProviderReportReasonLabel(reason: ResourceReportReason) {
  return (
    providerReportReasonOptions.find((option) => option.value === reason)
      ?.label ?? "Otro motivo"
  );
}

function buildContactUrl(action: {
  kind: ResourceContactOption["kind"];
  value: string;
}) {
  if (action.kind === "phone") {
    const phone = action.value.replace(/[^\d+]/g, "");

    return phone.length > 0 ? `tel:${phone}` : undefined;
  }

  if (action.kind === "whatsapp") {
    if (/^https?:\/\//i.test(action.value)) {
      return action.value;
    }

    const phone = action.value.replace(/\D/g, "");

    return phone.length > 0 ? `https://wa.me/${phone}` : undefined;
  }

  if (action.kind === "email") {
    return `mailto:${action.value.trim()}`;
  }

  return action.value;
}

function normalizeProviderId(providerId: string | string[] | undefined) {
  const value = Array.isArray(providerId) ? providerId[0] : providerId;
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : undefined;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  reportDetailField: {
    gap: 7,
  },
  reportDetailInput: {
    backgroundColor: resourcesColors.surfaceMuted,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    color: resourcesColors.text,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  reportDetailLabel: {
    color: resourcesColors.primary,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  reportModalBackdrop: {
    backgroundColor: "rgba(23, 32, 28, 0.42)",
    flex: 1,
    justifyContent: "center",
  },
  reportReasonButton: {
    alignItems: "center",
    backgroundColor: resourcesColors.surfaceMuted,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reportReasonButtonSelected: {
    backgroundColor: resourcesColors.primary,
    borderColor: resourcesColors.primary,
  },
  reportReasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reportReasonText: {
    color: resourcesColors.primary,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  reportReasonTextSelected: {
    color: resourcesColors.surface,
  },
  reportSheet: {
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    boxShadow: resourcesShadow.soft,
    gap: 14,
    maxHeight: "86%",
    padding: 16,
  },
  reportSheetActions: {
    flexDirection: "row",
    gap: 10,
  },
  reportSheetBody: {
    color: resourcesColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  reportSheetButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  reportSheetButtonDisabled: {
    opacity: 0.62,
  },
  reportSheetClose: {
    alignItems: "center",
    backgroundColor: resourcesColors.surfaceMuted,
    borderCurve: "continuous",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  reportSheetCloseText: {
    color: resourcesColors.muted,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  reportSheetError: {
    color: resourcesColors.error,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  reportSheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  reportSheetPrimaryButton: {
    backgroundColor: resourcesColors.primary,
  },
  reportSheetPrimaryText: {
    color: resourcesColors.surface,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  reportSheetSecondaryButton: {
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderWidth: 1,
  },
  reportSheetSecondaryText: {
    color: resourcesColors.primary,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  reportSheetTitle: {
    color: resourcesColors.text,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 26,
  },
  reportSheetTitleGroup: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  stateAction: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: resourcesColors.primary,
    borderCurve: "continuous",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stateActionText: {
    color: resourcesColors.surface,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  stateBody: {
    color: resourcesColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  stateContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 40,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: resourcesColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  stateIconImage: {
    height: 34,
    width: 34,
  },
  statePanel: {
    alignItems: "center",
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    boxShadow: resourcesShadow.soft,
    gap: 14,
    padding: 20,
  },
  stateRoot: {
    backgroundColor: resourcesColors.background,
    flex: 1,
  },
  stateTitle: {
    color: resourcesColors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    textAlign: "center",
  },
});
