import type { Href, Router } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import type { ReportType } from "@acme/validators";

import type { ReportIntent } from "../../i18n";
import type {
  NativeReportMediaEditAdapter,
  NativeReportMediaSourceAdapter,
  ReportMediaDraftItem,
  ReportMediaDraftSnapshot,
  ReportMediaEditAdapter,
  ReportMediaSourceAdapter,
} from "../report-media";
import { trpcClient } from "../../utils/api";
import { AdoptionListingCreationScreen } from "../adoption-listing-creation/adoption-listing-creation-screen";
import { createApiAdoptionListingPublishHandler } from "../adoption-listing-creation/adoption-listing-publish-adapter";
import { AppStateScreen } from "../app-states";
import { FoundReportCreationScreen } from "../found-report-creation/found-report-creation-screen";
import { createApiFoundReportPublishHandler } from "../found-report-creation/found-report-publish-adapter";
import { LostReportCreationScreen } from "../lost-report-creation/lost-report-creation-screen";
import { createApiLostReportPublishHandler } from "../lost-report-creation/lost-report-publish-adapter";
import { expoNearbyLocationAdapter } from "../nearby/nearby-expo-location-adapter";
import {
  createApiReportMediaUploadSessionClient,
  createNativeReportMediaEditAdapter,
  createNativeReportMediaSourceAdapter,
  createNativeReportMediaUploadTransport,
  createReportMediaDraft,
  ReportMediaManager,
} from "../report-media";
import { createCreationDraftStore } from "../resilience/creation-drafts";
import { createExpoSecureStoreKeyValueStorage } from "../resilience/storage";
import {
  buildResourceProviderProfileHref,
  createStaticResourcesAdapter,
} from "../resources";
import { toShellMemberCreationSession } from "../shell/shell-model";
import { useRastroShell } from "../shell/shell-provider";
import { shellColors } from "../shell/shell-theme";
import { SightingReportCreationScreen } from "../sighting-report-creation/sighting-report-creation-screen";
import { createApiSightingReportPublishHandler } from "../sighting-report-creation/sighting-report-publish-adapter";
import { buildReportCreationHref } from "./report-creation-routes";

function useReportCreationRouteClose({
  hasUnsavedChanges,
  navigation,
  router,
}: {
  hasUnsavedChanges: boolean;
  navigation: ReportCreationRouteNavigation;
  router: Router;
}) {
  const [isDiscardConfirmationVisible, setDiscardConfirmationVisible] =
    React.useState(false);
  const [pendingNativeAction, setPendingNativeAction] =
    React.useState<ReportCreationRouteNavigationAction | null>(null);
  React.useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      setPendingNativeAction(event.data?.action ?? null);
      setDiscardConfirmationVisible(true);
    });
  }, [hasUnsavedChanges, navigation]);

  const requestClose = React.useCallback(() => {
    if (hasUnsavedChanges) {
      setDiscardConfirmationVisible(true);
      return;
    }

    dismissReportCreationRoute(router);
  }, [hasUnsavedChanges, router]);
  const keepEditing = React.useCallback(() => {
    setPendingNativeAction(null);
    setDiscardConfirmationVisible(false);
  }, []);
  const discardDraft = React.useCallback(() => {
    const nativeAction = pendingNativeAction;

    setPendingNativeAction(null);
    setDiscardConfirmationVisible(false);
    if (nativeAction !== null && navigation.dispatch) {
      navigation.dispatch(nativeAction);
      return;
    }

    dismissReportCreationRoute(router);
  }, [navigation, pendingNativeAction, router]);

  return {
    discardDraft,
    isDiscardConfirmationVisible,
    keepEditing,
    requestClose,
  };
}

export function ReportCreationRouteScreen({
  intent,
}: {
  intent: ReportIntent;
}) {
  const { model, requestAuthPrompt, session } = useRastroShell();
  const navigation = useNavigation<ReportCreationRouteNavigation>();
  const router = useRouter();
  const [hasCompletedPublish, setHasCompletedPublish] = React.useState(false);
  const hasUnsavedChanges = hasRouteLevelUnsavedChanges({
    hasCompletedPublish,
    intent,
    sessionKind: session.kind,
  });
  const {
    discardDraft,
    isDiscardConfirmationVisible,
    keepEditing,
    requestClose: closeRoute,
  } = useReportCreationRouteClose({
    hasUnsavedChanges,
    navigation,
    router,
  });
  const secureStorage = React.useMemo(
    () => createExpoSecureStoreKeyValueStorage(),
    [],
  );
  const draftStore = React.useMemo(
    () =>
      createCreationDraftStore({
        storage: secureStorage,
      }),
    [secureStorage],
  );
  const draftScopeId = session.kind === "member" ? session.id : undefined;
  const memberCreationSession = toShellMemberCreationSession(session);
  const creationSession =
    memberCreationSession ?? ({ kind: "visitor" } as const);
  const sponsorResourcesAdapter = React.useMemo(
    () => createStaticResourcesAdapter(),
    [],
  );
  const publishSightingReport = React.useMemo(
    () => createApiSightingReportPublishHandler({ client: trpcClient }),
    [],
  );
  const publishLostReport = React.useMemo(
    () => createApiLostReportPublishHandler({ client: trpcClient }),
    [],
  );
  const publishFoundReport = React.useMemo(
    () => createApiFoundReportPublishHandler({ client: trpcClient }),
    [],
  );
  const publishAdoptionListing = React.useMemo(
    () => createApiAdoptionListingPublishHandler({ client: trpcClient }),
    [],
  );
  const reportMediaReportType = getReportMediaReportType(intent);
  const renderReportMediaManager = React.useCallback(
    ({ mediaDraftId, onSnapshotChange }: ReportMediaManagerRenderProps) => (
      <ReportCreationRouteMediaManager
        key={`${reportMediaReportType}:${mediaDraftId}`}
        mediaDraftId={mediaDraftId}
        onSnapshotChange={onSnapshotChange}
        reportType={reportMediaReportType}
      />
    ),
    [reportMediaReportType],
  );
  const requestMemberSignIn = React.useCallback(() => {
    const returnTo = buildReportCreationHref(intent) as string;

    requestAuthPrompt({
      returnTo,
      sourceHref: `rastro://auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    });
  }, [intent, requestAuthPrompt]);
  const markDraftPublished = React.useCallback(() => {
    setHasCompletedPublish(true);
  }, []);
  const handleOpenSponsorPlacement = React.useCallback(
    (sponsorPlacementId: string) => {
      openHrefAfterClosingReportCreationRoute(
        router,
        buildResourceProviderProfileHref(sponsorPlacementId),
      );
    },
    [router],
  );
  const handleReportSponsorPlacement = React.useCallback(
    (sponsorPlacementId: string) => {
      void sponsorResourcesAdapter.reportProvider({
        detail: "Reporte enviado desde una colocacion patrocinada.",
        providerId: sponsorPlacementId,
        reason: "other",
      });
    },
    [sponsorResourcesAdapter],
  );

  React.useEffect(() => {
    if (model.session.kind === "loading") {
      return;
    }

    if (session.kind === "visitor" && intent === "lost") {
      dismissReportCreationRoute(router);
    }
  }, [intent, model.session.kind, router, session.kind]);

  if (model.session.kind === "loading") {
    return <AppStateScreen descriptor={model.appStates.states.loading} />;
  }

  if (session.kind === "visitor" && intent === "lost") {
    return null;
  }

  let creationScreen: React.ReactNode;

  if (intent === "lost") {
    creationScreen = (
      <LostReportCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        locationAdapter={expoNearbyLocationAdapter}
        onClose={closeRoute}
        onDraftPublished={markDraftPublished}
        onOpenSponsorPlacement={handleOpenSponsorPlacement}
        onPublishLostReport={publishLostReport}
        onReportSponsorPlacement={handleReportSponsorPlacement}
        renderReportMediaManager={renderReportMediaManager}
      />
    );
  } else if (intent === "found") {
    creationScreen = (
      <FoundReportCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        locationAdapter={expoNearbyLocationAdapter}
        onClose={closeRoute}
        onDraftPublished={markDraftPublished}
        onPublishFoundReport={publishFoundReport}
        onRequestMemberSignIn={requestMemberSignIn}
        renderReportMediaManager={renderReportMediaManager}
        session={creationSession}
      />
    );
  } else if (intent === "sighting") {
    creationScreen = (
      <SightingReportCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        locationAdapter={expoNearbyLocationAdapter}
        onClose={closeRoute}
        onDraftPublished={markDraftPublished}
        onPublishSightingReport={publishSightingReport}
        onRequestMemberSignIn={requestMemberSignIn}
        renderReportMediaManager={renderReportMediaManager}
        session={creationSession}
      />
    );
  } else {
    creationScreen = (
      <AdoptionListingCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        locationAdapter={expoNearbyLocationAdapter}
        onClose={closeRoute}
        onDraftPublished={markDraftPublished}
        onPublishAdoptionListing={publishAdoptionListing}
        renderReportMediaManager={renderReportMediaManager}
        session={creationSession}
      />
    );
  }

  return (
    <>
      {creationScreen}
      {isDiscardConfirmationVisible ? (
        <ReportCreationDiscardConfirmation
          onDiscard={discardDraft}
          onKeepEditing={keepEditing}
        />
      ) : null}
    </>
  );
}

interface ReportMediaManagerRenderProps {
  mediaDraftId: string;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  photos: readonly unknown[];
}

function ReportCreationRouteMediaManager({
  mediaDraftId,
  onSnapshotChange,
  reportType,
}: {
  mediaDraftId: string;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  reportType: ReportType;
}) {
  const reportMediaUploadSessions = React.useMemo(
    () => createApiReportMediaUploadSessionClient({ client: trpcClient }),
    [],
  );
  const reportMediaUploadTransport = React.useMemo(
    () => createNativeReportMediaUploadTransport(),
    [],
  );
  const nativeReportMediaSourceAdapter = React.useMemo(
    () => createNativeReportMediaSourceAdapter(),
    [],
  );
  const nativeReportMediaEditAdapter = React.useMemo(
    () => createNativeReportMediaEditAdapter(),
    [],
  );
  const reportMediaSourceAdapter = React.useMemo(
    () => createReportMediaManagerSourceAdapter(nativeReportMediaSourceAdapter),
    [nativeReportMediaSourceAdapter],
  );
  const reportMediaEditAdapter = React.useMemo(
    () => createReportMediaManagerEditAdapter(nativeReportMediaEditAdapter),
    [nativeReportMediaEditAdapter],
  );
  const reportMediaDraft = React.useMemo(
    () =>
      createReportMediaDraft({
        draftId: mediaDraftId,
        reportType,
        uploadSessions: reportMediaUploadSessions,
        uploadTransport: reportMediaUploadTransport,
      }),
    [
      mediaDraftId,
      reportMediaUploadSessions,
      reportMediaUploadTransport,
      reportType,
    ],
  );
  const [reportMediaSnapshot, setReportMediaSnapshot] = React.useState(() =>
    reportMediaDraft.getSnapshot(),
  );

  return (
    <ReportMediaManager
      draft={reportMediaDraft}
      editAdapter={reportMediaEditAdapter}
      onSnapshotChange={(snapshot) => {
        setReportMediaSnapshot(snapshot);
        onSnapshotChange(snapshot);
      }}
      snapshot={reportMediaSnapshot}
      sourceAdapter={reportMediaSourceAdapter}
    />
  );
}

function getReportMediaReportType(intent: ReportIntent): ReportType {
  switch (intent) {
    case "lost":
      return "lost_pet";
    case "found":
      return "found_pet";
    case "sighting":
      return "sighting";
    case "adoption":
      return "adoption";
  }
}

function createReportMediaManagerSourceAdapter(
  nativeAdapter: NativeReportMediaSourceAdapter,
): ReportMediaSourceAdapter {
  return {
    async captureWithCamera() {
      const result = await nativeAdapter.launchCamera();

      switch (result.status) {
        case "canceled":
          return undefined;
        case "denied":
          return {
            canAskAgain: result.canAskAgain,
            status: "denied",
          };
        case "selected":
          return result.images[0];
        case "unavailable":
          return {
            message: result.message,
            status: "unavailable",
          };
      }
    },
    async selectFromLibrary() {
      const result = await nativeAdapter.pickImagesFromLibrary();

      switch (result.status) {
        case "canceled":
          return [];
        case "denied":
          return {
            canAskAgain: result.canAskAgain,
            status: "denied",
          };
        case "selected":
          return result.images;
        case "unavailable":
          return {
            message: result.message,
            status: "unavailable",
          };
      }
    },
  };
}

function createReportMediaManagerEditAdapter(
  nativeAdapter: NativeReportMediaEditAdapter,
): ReportMediaEditAdapter {
  return {
    editImage: (item, options) =>
      nativeAdapter.editImage({
        crop: options?.crop,
        export: {
          mimeType: getEditableReportMediaMimeType(item),
        },
        localId: item.localId,
        rotateDegrees: options?.rotateDegrees,
        sourceUri: item.originalUri,
      }),
  };
}

function getEditableReportMediaMimeType(
  item: ReportMediaDraftItem,
): "image/jpeg" | "image/png" | "image/webp" {
  switch (item.mimeType) {
    case "image/png":
      return item.mimeType;
    case "image/webp":
      return item.mimeType;
    default:
      return "image/jpeg";
  }
}

function hasRouteLevelUnsavedChanges({
  hasCompletedPublish,
  intent,
  sessionKind,
}: {
  hasCompletedPublish: boolean;
  intent: ReportIntent;
  sessionKind: "member" | "visitor";
}) {
  if (hasCompletedPublish) {
    return false;
  }

  return !(
    sessionKind === "visitor" &&
    (intent === "found" || intent === "sighting")
  );
}

interface ReportCreationRouteBeforeRemoveEvent {
  data?: {
    action?: ReportCreationRouteNavigationAction;
  };
  preventDefault: () => void;
}

type ReportCreationRouteNavigationAction = Record<string, unknown>;

interface ReportCreationRouteNavigation {
  addListener: (
    eventName: "beforeRemove",
    listener: (event: ReportCreationRouteBeforeRemoveEvent) => void,
  ) => () => void;
  dispatch?: (action: ReportCreationRouteNavigationAction) => void;
}

function ReportCreationDiscardConfirmation({
  onDiscard,
  onKeepEditing,
}: {
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  return (
    <View
      accessibilityLabel="Confirmar descarte de borrador"
      accessibilityRole="alert"
      style={styles.discardBackdrop}
    >
      <View style={styles.discardPanel}>
        <Text maxFontSizeMultiplier={1.2} style={styles.discardTitle}>
          Descartar borrador
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.discardBody}>
          Si sales ahora, perderas los cambios de este reporte.
        </Text>
        <View style={styles.discardActions}>
          <Pressable
            accessibilityLabel="Seguir editando"
            accessibilityRole="button"
            onPress={onKeepEditing}
            style={[styles.discardButton, styles.keepEditingButton]}
          >
            <Text style={[styles.discardButtonText, styles.keepEditingText]}>
              Seguir editando
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Descartar borrador"
            accessibilityRole="button"
            onPress={onDiscard}
            style={[styles.discardButton, styles.discardDraftButton]}
          >
            <Text style={[styles.discardButtonText, styles.discardDraftText]}>
              Descartar borrador
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function dismissReportCreationRoute(router: Router) {
  if (router.canGoBack()) {
    router.dismiss();
    return;
  }

  router.replace("/(tabs)/(nearby)" as Href);
}

function openHrefAfterClosingReportCreationRoute(router: Router, href: Href) {
  if (router.canGoBack()) {
    router.dismiss();
    router.push(href);
    return;
  }

  router.replace(href);
}

const styles = StyleSheet.create({
  discardActions: {
    gap: 10,
  },
  discardBackdrop: {
    backgroundColor: "rgba(23, 32, 28, 0.44)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 20,
    position: "absolute",
    right: 0,
    top: 0,
  },
  discardBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  discardButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  discardButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  discardDraftButton: {
    backgroundColor: shellColors.lost,
    borderColor: shellColors.lost,
  },
  discardDraftText: {
    color: shellColors.white,
  },
  discardPanel: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  discardTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  keepEditingButton: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
  },
  keepEditingText: {
    color: shellColors.primary,
  },
});
