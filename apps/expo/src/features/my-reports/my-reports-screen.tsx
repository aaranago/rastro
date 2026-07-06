import type { LegendListRenderItemProps } from "@legendapp/list";
import type { Href } from "expo-router";
import type { ReportOutcome } from "@acme/validators";
import * as React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";

import type {
  MyReportCardViewModel,
  MyReportsFilter,
  MyReportsRepository,
  MyReportSummary,
} from "./my-reports";
import { AppStateScreen } from "../app-states";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import {
  buildMyReportCardViewModel,
  buildMyReportsViewModel,
  classifyMyReportFilter,
  getMyReportResolveOptions,
  myReportResolveOptions,
  myReportsDefaultFilter,
} from "./my-reports";

export type MyReportsSessionState =
  | { kind: "loading" }
  | { kind: "member"; memberId: string }
  | { kind: "visitor" };

export interface MyReportsScreenProps {
  initialManageReportId?: string;
  onOpenReport?: (href: string) => void;
  onRequestSignIn?: () => void;
  repository: MyReportsRepository;
  session: MyReportsSessionState;
}

type LoadState =
  | { kind: "error" }
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; reports: MyReportSummary[] };

type ManagementState =
  | { kind: "closed" }
  | {
      confirmation: ManagementConfirmation | null;
      kind: "open";
      pendingAction: ManagementAction | null;
      report: MyReportCardViewModel;
    };

type ManagementAction = "confirm-active" | "delete" | ReportOutcome;
type ManagementConfirmation =
  | { kind: "confirm-active" }
  | { kind: "delete" }
  | { kind: "resolve"; outcome: ReportOutcome };

export function MyReportsScreen({
  initialManageReportId,
  onOpenReport,
  onRequestSignIn,
  repository,
  session,
}: MyReportsScreenProps) {
  const router = useRouter();
  const [filter, setFilter] =
    React.useState<MyReportsFilter>(myReportsDefaultFilter);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [loadState, setLoadState] = React.useState<LoadState>({
    kind: "idle",
  });
  const [management, setManagement] = React.useState<ManagementState>({
    kind: "closed",
  });
  const initialManageKeyRef = React.useRef<string | null>(null);
  const memberKey = session.kind === "member" ? session.memberId : session.kind;
  const loadReports = React.useCallback(async () => {
    if (session.kind !== "member") {
      return;
    }

    setLoadState({ kind: "loading" });
    setFeedback(null);

    try {
      const reports = await repository.listReports();
      setLoadState({ kind: "ready", reports });
    } catch {
      setLoadState({ kind: "error" });
    }
  }, [repository, session.kind]);

  React.useEffect(() => {
    let isActive = true;

    if (session.kind !== "member") {
      setLoadState({ kind: "idle" });
      return;
    }

    setLoadState({ kind: "loading" });
    repository
      .listReports()
      .then((reports) => {
        if (isActive) {
          setLoadState({ kind: "ready", reports });
        }
      })
      .catch(() => {
        if (isActive) {
          setLoadState({ kind: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [memberKey, repository, session.kind]);

  const openReport = React.useCallback(
    (href: string) => {
      if (onOpenReport) {
        onOpenReport(href);
        return;
      }

      router.push(href as Href);
    },
    [onOpenReport, router],
  );
  const requestConfirmActive = React.useCallback(() => {
    if (management.kind !== "open") {
      return;
    }

    setManagement({
      ...management,
      confirmation: { kind: "confirm-active" },
    });
  }, [management]);
  const requestResolveReport = React.useCallback(
    (outcome: ReportOutcome) => {
      if (management.kind !== "open") {
        return;
      }

      setManagement({
        ...management,
        confirmation: { kind: "resolve", outcome },
      });
    },
    [management],
  );
  const requestDeleteReport = React.useCallback(() => {
    if (management.kind !== "open") {
      return;
    }

    setManagement({
      ...management,
      confirmation: { kind: "delete" },
    });
  }, [management]);
  const cancelManagementConfirmation = React.useCallback(() => {
    if (management.kind !== "open" || management.pendingAction) {
      return;
    }

    setManagement({
      ...management,
      confirmation: null,
    });
  }, [management]);
  const confirmActiveReport = React.useCallback(async () => {
    if (management.kind !== "open") {
      return;
    }

    setManagement({ ...management, pendingAction: "confirm-active" });

    try {
      await repository.confirmActive({
        id: management.report.id,
      });
      setManagement({ kind: "closed" });
      setFeedback("Reporte confirmado como activo.");
      await loadReports();
    } catch {
      setFeedback("No pudimos confirmar el reporte. Intenta de nuevo.");
      setManagement({ ...management, pendingAction: null });
    }
  }, [loadReports, management, repository]);
  const resolveReport = React.useCallback(
    async (outcome: ReportOutcome) => {
      if (management.kind !== "open") {
        return;
      }

      setManagement({ ...management, pendingAction: outcome });

      try {
        await repository.resolveReport({
          id: management.report.id,
          outcome,
        });
        setManagement({ kind: "closed" });
        setFeedback("Reporte cerrado y confirmado por Rastro.");
        await loadReports();
      } catch {
        setFeedback("No pudimos cerrar el reporte. Intenta de nuevo.");
        setManagement({ ...management, pendingAction: null });
      }
    },
    [loadReports, management, repository],
  );
  const deleteReport = React.useCallback(async () => {
    if (management.kind !== "open") {
      return;
    }

    setManagement({ ...management, pendingAction: "delete" });

    try {
      await repository.deleteReport({ id: management.report.id });
      setManagement({ kind: "closed" });
      setFeedback("Reporte retirado y confirmado por Rastro.");
      await loadReports();
    } catch {
      setFeedback("No pudimos retirar el reporte. Intenta de nuevo.");
      setManagement({ ...management, pendingAction: null });
    }
  }, [loadReports, management, repository]);
  const confirmManagementAction = React.useCallback(() => {
    if (management.kind !== "open" || !management.confirmation) {
      return;
    }

    if (management.confirmation.kind === "confirm-active") {
      void confirmActiveReport();
      return;
    }

    if (management.confirmation.kind === "delete") {
      void deleteReport();
      return;
    }

    void resolveReport(management.confirmation.outcome);
  }, [confirmActiveReport, deleteReport, management, resolveReport]);

  React.useEffect(() => {
    if (!initialManageReportId) {
      return;
    }

    if (loadState.kind !== "ready") {
      return;
    }

    const initialManageKey = `${memberKey}:${initialManageReportId}`;

    if (initialManageKeyRef.current === initialManageKey) {
      return;
    }

    const report = loadState.reports.find(
      (candidate) => candidate.id === initialManageReportId,
    );

    if (!report) {
      return;
    }

    const reportViewModel = buildMyReportCardViewModel(report);

    initialManageKeyRef.current = initialManageKey;
    setFilter(
      classifyMyReportFilter({
        availabilityState: reportViewModel.availabilityState,
      }),
    );
    setManagement({
      confirmation: null,
      kind: "open",
      pendingAction: null,
      report: reportViewModel,
    });
  }, [initialManageReportId, loadState, memberKey]);

  const renderReport = React.useCallback(
    ({ item: report }: LegendListRenderItemProps<MyReportCardViewModel>) => (
      <MyReportCard
        onManage={() => {
          setManagement({
            confirmation: null,
            kind: "open",
            pendingAction: null,
            report,
          });
        }}
        onOpen={() => {
          openReport(report.href);
        }}
        report={report}
      />
    ),
    [openReport],
  );

  if (session.kind === "loading") {
    return (
      <AppStateScreen
        descriptor={{
          body: "Estamos preparando tu perfil antes de mostrar tus reportes.",
          kind: "loading",
          progressLabel: "Cargando sesión",
          title: "Cargando Mis reportes",
        }}
      />
    );
  }

  if (session.kind === "visitor") {
    return (
      <AppStateScreen
        descriptor={{
          actions: [
            {
              iconName: "person.crop.circle.badge.checkmark",
              id: "sign-in",
              label: "Iniciar sesión",
            },
          ],
          body: "Inicia sesión para ver, compartir, cerrar o retirar tus reportes.",
          iconName: "person.crop.circle.badge.checkmark",
          kind: "empty",
          title: "Mis reportes es para miembros",
        }}
        onActionPress={(action) => {
          if (action.id === "sign-in") {
            onRequestSignIn?.();
          }
        }}
        testID="my-reports-visitor"
      />
    );
  }

  if (loadState.kind === "loading" || loadState.kind === "idle") {
    return (
      <AppStateScreen
        descriptor={{
          body: "Estamos cargando tus publicaciones y su estado más reciente.",
          kind: "loading",
          progressLabel: "Cargando reportes",
          title: "Cargando Mis reportes",
        }}
      />
    );
  }

  if (loadState.kind === "error") {
    return (
      <AppStateScreen
        descriptor={{
          actions: [
            {
              iconName: "arrow.clockwise",
              id: "retry",
              label: "Reintentar",
            },
          ],
          body: "No pudimos cargar tus reportes. Revisa la conexión e intenta de nuevo.",
          kind: "error",
          title: "No pudimos cargar Mis reportes",
        }}
        onActionPress={loadReports}
      />
    );
  }

  const viewModel = buildMyReportsViewModel({
    filter,
    reports: loadState.reports,
  });
  const header = (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <Text selectable style={styles.eyebrow}>
          Perfil
        </Text>
        <Text selectable style={styles.title}>
          Mis reportes
        </Text>
        <Text selectable style={styles.subtitle}>
          Gestiona tus publicaciones activas, en revisión, cerradas y retiradas.
        </Text>
      </View>

      <View style={styles.filterRow}>
        {viewModel.filters.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: option.value === filter }}
            key={option.value}
            onPress={() => {
              setFilter(option.value);
            }}
            style={[
              styles.filterButton,
              option.value === filter ? styles.filterButtonSelected : null,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                option.value === filter ? styles.filterTextSelected : null,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.filterCount,
                option.value === filter ? styles.filterCountSelected : null,
              ]}
            >
              {option.count}
            </Text>
          </Pressable>
        ))}
      </View>

      {feedback ? (
        <View style={styles.feedback}>
          <ShellIcon color={shellColors.found} name="checkmark.seal.fill" size={18} />
          <Text selectable style={styles.feedbackText}>
            {feedback}
          </Text>
        </View>
      ) : null}
    </View>
  );
  const emptyState = (
    <View style={styles.emptyPanel}>
      <ShellIcon color={shellColors.primary} name="tray.fill" size={24} />
      <Text selectable style={styles.emptyTitle}>
        {viewModel.emptyState.title}
      </Text>
      <Text selectable style={styles.emptyBody}>
        {viewModel.emptyState.body}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen} testID="my-reports-screen">
      <LegendList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={viewModel.reports}
        estimatedItemSize={190}
        ItemSeparatorComponent={MyReportCardSeparator}
        keyExtractor={myReportKeyExtractor}
        ListEmptyComponent={emptyState}
        ListHeaderComponent={header}
        renderItem={renderReport}
        scrollIndicatorInsets={{ bottom: 120 }}
        testID="my-reports-list"
      />

      {management.kind === "open" ? (
        <MyReportManagementSheet
          confirmation={management.confirmation}
          onCancelConfirmation={cancelManagementConfirmation}
          onClose={() => {
            if (!management.pendingAction) {
              setManagement({ kind: "closed" });
            }
          }}
          onConfirmAction={confirmManagementAction}
          onConfirmActive={requestConfirmActive}
          onDelete={requestDeleteReport}
          onResolve={requestResolveReport}
          pendingAction={management.pendingAction}
          report={management.report}
        />
      ) : null}
    </View>
  );
}

function myReportKeyExtractor(report: MyReportCardViewModel) {
  return report.id;
}

function MyReportCardSeparator() {
  return <View style={styles.reportSeparator} />;
}

function MyReportCard({
  onManage,
  onOpen,
  report,
}: {
  onManage: () => void;
  onOpen: () => void;
  report: MyReportCardViewModel;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumbnail}>
          {report.thumbnailUrl ? (
            <Image
              accessibilityLabel={`Foto de ${report.title}`}
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={report.thumbnailUrl}
              source={{ uri: report.thumbnailUrl }}
              style={styles.thumbnailImage}
              transition={120}
            />
          ) : (
            <ShellIcon color={shellColors.primary} name="pawprint.fill" size={24} />
          )}
        </View>
        <View style={styles.cardCopy}>
          <View style={styles.cardMetaRow}>
            <Text style={styles.typeLabel}>{report.typeLabel}</Text>
            <View style={[styles.statusPill, styles[`${report.statusTone}Pill`]]}>
              <Text style={[styles.statusText, styles[`${report.statusTone}Text`]]}>
                {report.availabilityLabel}
              </Text>
            </View>
          </View>
          <Text selectable style={styles.cardTitle}>
            {report.title}
          </Text>
          <Text selectable style={styles.cardSubtitle}>
            {report.petLabel}
          </Text>
          <Text selectable style={styles.cardDetail}>
            {report.locationLabel} · Actualizado {report.eventLabel}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {report.canOpenPublicDetail ? (
          <Pressable
            accessibilityLabel={`Ver ${report.title}`}
            accessibilityRole="button"
            onPress={onOpen}
            style={styles.secondaryAction}
          >
            <ShellIcon
              color={shellColors.primary}
              name="arrow.up.right"
              size={16}
            />
            <Text style={styles.secondaryActionText}>Ver</Text>
          </Pressable>
        ) : (
          <View
            accessibilityLabel={`${report.title} no está disponible públicamente`}
            accessibilityRole="text"
            style={[styles.secondaryAction, styles.secondaryUnavailableAction]}
          >
            <ShellIcon color={shellColors.muted} name="lock.fill" size={16} />
            <Text style={styles.secondaryUnavailableActionText}>No público</Text>
          </View>
        )}
        <Pressable
          accessibilityLabel={`Gestionar ${report.title}`}
          accessibilityRole="button"
          onPress={onManage}
          style={styles.primaryAction}
        >
          <ShellIcon color={shellColors.white} name="checkmark.seal.fill" size={16} />
          <Text style={styles.primaryActionText}>{report.primaryActionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MyReportManagementSheet({
  confirmation,
  onCancelConfirmation,
  onClose,
  onConfirmAction,
  onConfirmActive,
  onDelete,
  onResolve,
  pendingAction,
  report,
}: {
  confirmation: ManagementConfirmation | null;
  onCancelConfirmation: () => void;
  onClose: () => void;
  onConfirmAction: () => void;
  onConfirmActive: () => void;
  onDelete: () => void;
  onResolve: (outcome: ReportOutcome) => void;
  pendingAction: ManagementAction | null;
  report: MyReportCardViewModel;
}) {
  const isBusy = pendingAction !== null;
  const resolveOptions = getMyReportResolveOptions(report.type);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleGroup}>
              <Text selectable style={styles.sheetTitle}>
                Gestionar reporte
              </Text>
              <Text selectable style={styles.sheetBody}>
                El cambio se guardará en Rastro y luego actualizaremos esta lista.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onClose}
              style={styles.sheetClose}
            >
              <ShellIcon color={shellColors.muted} name="xmark" size={18} />
            </Pressable>
          </View>

          <Text selectable style={styles.sheetReportTitle}>
            {report.title}
          </Text>

          {confirmation ? (
            <ManagementConfirmationPanel
              confirmation={confirmation}
              isBusy={isBusy}
              onCancel={onCancelConfirmation}
              onConfirm={onConfirmAction}
            />
          ) : null}

          {!confirmation && report.canConfirmActive ? (
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onConfirmActive}
              style={styles.confirmActiveButton}
            >
              <View style={styles.outcomeCopy}>
                <Text style={styles.outcomeLabel}>Sigue activa</Text>
                <Text style={styles.outcomeBody}>
                  Mantener visible y actualizar la fecha de revisión.
                </Text>
              </View>
              <ShellIcon color={shellColors.primary} name="checkmark.seal.fill" size={16} />
            </Pressable>
          ) : null}

          {report.canResolve ? (
            <View style={styles.outcomeList}>
              {resolveOptions.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  key={option.value}
                  onPress={() => {
                    onResolve(option.value);
                  }}
                  style={styles.outcomeButton}
                >
                  <View style={styles.outcomeCopy}>
                    <Text style={styles.outcomeLabel}>{option.label}</Text>
                    <Text style={styles.outcomeBody}>{option.body}</Text>
                  </View>
                  {pendingAction === option.value ? (
                    <ActivityIndicator color={shellColors.primary} />
                  ) : (
                    <ShellIcon
                      color={shellColors.primary}
                      name="chevron.right"
                      size={16}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          ) : null}

          {!report.canResolve && !report.canDelete ? (
            <View style={styles.lockedNotice}>
              <ShellIcon
                color={shellColors.primary}
                name="lock.fill"
                size={18}
              />
              <Text selectable style={styles.lockedNoticeText}>
                Este reporte ya fue retirado. Puedes conservarlo como historial,
                pero no se puede volver a publicar desde aquí.
              </Text>
            </View>
          ) : null}

          {report.canDelete ? (
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onDelete}
              style={styles.deleteButton}
            >
              {pendingAction === "delete" ? (
                <ActivityIndicator color={shellColors.lost} />
              ) : (
                <ShellIcon
                  color={shellColors.lost}
                  name="trash.fill"
                  size={16}
                />
              )}
              <Text style={styles.deleteButtonText}>Retirar reporte</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function ManagementConfirmationPanel({
  confirmation,
  isBusy,
  onCancel,
  onConfirm,
}: {
  confirmation: ManagementConfirmation;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = getManagementConfirmationCopy(confirmation);

  return (
    <View style={styles.confirmationPanel}>
      <Text selectable style={styles.confirmationTitle}>
        {copy.title}
      </Text>
      <Text selectable style={styles.confirmationBody}>
        {copy.body}
      </Text>
      <View style={styles.confirmationActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onCancel}
          style={styles.confirmationSecondary}
        >
          <Text style={styles.confirmationSecondaryText}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onConfirm}
          style={styles.confirmationPrimary}
        >
          {isBusy ? (
            <ActivityIndicator color={shellColors.white} />
          ) : (
            <Text style={styles.confirmationPrimaryText}>{copy.actionLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function getManagementConfirmationCopy(confirmation: ManagementConfirmation) {
  if (confirmation.kind === "confirm-active") {
    return {
      actionLabel: "Confirmar",
      body: "Actualizaremos la fecha de revisión sin cerrar el reporte.",
      title: "¿Confirmar que sigue activa?",
    };
  }

  if (confirmation.kind === "delete") {
    return {
      actionLabel: "Retirar",
      body: "El reporte dejará de aparecer en búsquedas públicas. Puedes conservarlo como historial.",
      title: "¿Retirar este reporte?",
    };
  }

  const option = myReportResolveOptions.find(
    (candidate) => candidate.value === confirmation.outcome,
  );

  return {
    actionLabel: "Cerrar",
    body:
      option?.body ??
      "El reporte se cerrará con este resultado y dejaremos de mostrarlo como activo.",
    title: `¿Cerrar como ${option?.label ?? "resultado"}?`,
  };
}

const styles = StyleSheet.create({
  activePill: {
    backgroundColor: "#E4F4EB",
  },
  activeText: {
    color: shellColors.found,
  },
  card: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  cardCopy: {
    flex: 1,
    gap: 5,
  },
  cardDetail: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  cardMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cardSubtitle: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  cardTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  closedPill: {
    backgroundColor: shellColors.surfaceMuted,
  },
  closedText: {
    color: shellColors.muted,
  },
  confirmActiveButton: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderColor: "#B7D6D0",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    padding: 12,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmationBody: {
    color: shellColors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  confirmationPanel: {
    backgroundColor: shellColors.primarySoft,
    borderColor: "#B7D6D0",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  confirmationPrimary: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  confirmationPrimaryText: {
    color: shellColors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  confirmationSecondary: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  confirmationSecondaryText: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  confirmationTitle: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 140,
  },
  dangerPill: {
    backgroundColor: "#FDEAE7",
  },
  dangerText: {
    color: shellColors.lost,
  },
  deleteButton: {
    alignItems: "center",
    borderColor: "#F2B8B2",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: shellColors.lost,
    fontSize: 14,
    fontWeight: "900",
  },
  emptyBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyPanel: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 22,
  },
  emptyTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  eyebrow: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  feedback: {
    alignItems: "center",
    backgroundColor: "#E4F4EB",
    borderColor: "#A9D9BE",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  feedbackText: {
    color: shellColors.found,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  filterButton: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  filterButtonSelected: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  filterCount: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  filterCountSelected: {
    color: shellColors.white,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterText: {
    color: shellColors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  filterTextSelected: {
    color: shellColors.white,
  },
  header: {
    gap: 6,
  },
  listHeader: {
    gap: 14,
    marginBottom: 14,
  },
  lockedNotice: {
    alignItems: "flex-start",
    backgroundColor: shellColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  lockedNoticeText: {
    color: shellColors.primaryDark,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  modalBackdrop: {
    backgroundColor: "rgba(16, 24, 40, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  outcomeBody: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  outcomeButton: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    padding: 12,
  },
  outcomeCopy: {
    flex: 1,
    gap: 2,
  },
  outcomeLabel: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  outcomeList: {
    gap: 8,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderCurve: "continuous",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
  },
  primaryActionText: {
    color: shellColors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  reportSeparator: {
    height: 12,
  },
  reviewPill: {
    backgroundColor: "#FFF4CC",
  },
  reviewText: {
    color: "#6F5500",
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
  },
  secondaryActionText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryUnavailableAction: {
    backgroundColor: shellColors.surfaceMuted,
  },
  secondaryUnavailableActionText: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "900",
  },
  sheet: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  sheetBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetClose: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sheetHeader: {
    flexDirection: "row",
    gap: 12,
  },
  sheetReportTitle: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  sheetTitle: {
    color: shellColors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  sheetTitleGroup: {
    flex: 1,
    gap: 4,
  },
  statusPill: {
    borderCurve: "continuous",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  subtitle: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  thumbnail: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 16,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  thumbnailImage: {
    height: "100%",
    width: "100%",
  },
  title: {
    color: shellColors.text,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },
  typeLabel: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
