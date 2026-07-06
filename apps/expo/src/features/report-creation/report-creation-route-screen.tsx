import type { Href, Router } from "expo-router";
import * as React from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { ReportType } from "@acme/validators";

import type { ReportIntent } from "../../i18n";
import type { AdoptionListingPublishConfirmation } from "../adoption-listing-creation/adoption-listing-creation-screen";
import type { FoundReportPublishConfirmation } from "../found-report-creation/found-report-creation-screen";
import type { LostReportPublishConfirmation } from "../lost-report-creation/lost-report-creation-screen";
import type { LostReportSuccessLocalSponsorPlacement } from "../lost-report-creation/lost-report-creation-view-model";
import type {
  NearbyPublicReportKind,
  PublicReportShareTarget,
} from "../nearby/nearby-types";
import type {
  NativeReportMediaEditAdapter,
  NativeReportMediaSourceAdapter,
  ReportMediaDraftItem,
  ReportMediaDraftSnapshot,
  ReportMediaEditAdapter,
  ReportMediaSourceAdapter,
  ReportMediaStepController,
} from "../report-media";
import type { ShellMemberCreationSession } from "../shell/shell-model";
import type { SightingReportPublishConfirmation } from "../sighting-report-creation/sighting-report-publish-adapter";
import type { ReportCreationSponsorDeliveryInput } from "./report-creation-success-sponsors";
import { trpcClient } from "../../utils/api";
import { AdoptionListingCreationScreen } from "../adoption-listing-creation/adoption-listing-creation-screen";
import { createInitialAdoptionListingDraft } from "../adoption-listing-creation/adoption-listing-creation-view-model";
import { createApiAdoptionListingPublishHandler } from "../adoption-listing-creation/adoption-listing-publish-adapter";
import { AppStateScreen } from "../app-states";
import { FoundReportCreationScreen } from "../found-report-creation/found-report-creation-screen";
import { createApiFoundReportPublishHandler } from "../found-report-creation/found-report-publish-adapter";
import { LostReportCreationScreen } from "../lost-report-creation/lost-report-creation-screen";
import {
  createInitialLostReportDraft,
  toLostReportSuccessLocalSponsorPlacementFromProvider,
} from "../lost-report-creation/lost-report-creation-view-model";
import { createApiLostReportPublishHandler } from "../lost-report-creation/lost-report-publish-adapter";
import { expoNearbyLocationAdapter } from "../nearby/nearby-expo-location-adapter";
import { buildNearbyReportRouteTarget } from "../nearby/nearby-navigation";
import { shareNearbyLostReport } from "../nearby/nearby-share";
import { createApiPetProfileRepository } from "../pet-profiles/api-pet-profile-repository";
import {
  createApiReportMediaUploadSessionClient,
  createNativeReportMediaEditAdapter,
  createNativeReportMediaSourceAdapter,
  createNativeReportMediaUploadTransport,
  createReportMediaDraft,
  reportMediaCreationPhotosToHydratedReadyMedia,
  ReportMediaManager,
  uploadPendingReportMediaDraftItems,
} from "../report-media";
import { createCreationDraftStore } from "../resilience/creation-drafts";
import { createExpoSecureStoreKeyValueStorage } from "../resilience/storage";
import { buildResourceProviderProfileHref } from "../resources";
import { createApiResourcesAdapter } from "../resources/resources-api-adapter";
import { toShellMemberCreationSession } from "../shell/shell-model";
import { useRastroShell } from "../shell/shell-provider";
import { SightingReportCreationScreen } from "../sighting-report-creation/sighting-report-creation-screen";
import { createApiSightingReportPublishHandler } from "../sighting-report-creation/sighting-report-publish-adapter";
import { buildReportCreationHref } from "./report-creation-routes";

function useReportCreationRouteClose({ router }: { router: Router }) {
  const requestClose = React.useCallback(() => {
    dismissReportCreationRoute(router);
  }, [router]);

  return {
    requestClose,
  };
}

export function ReportCreationRouteScreen({
  intent,
}: {
  intent: ReportIntent;
}) {
  const { model, requestAuthPrompt, session } = useRastroShell();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    petProfileId?: string | string[];
    profileId?: string | string[];
  }>();
  const selectedPetProfileId =
    normalizeRouteParam(routeParams.petProfileId) ??
    normalizeRouteParam(routeParams.profileId);
  const reportMediaDraftCacheRef = React.useRef<ReportMediaDraftCache>(
    new Map(),
  );
  const clearReportMediaDraftCache = React.useCallback(() => {
    reportMediaDraftCacheRef.current.clear();
  }, []);
  const { requestClose: closeRoute } = useReportCreationRouteClose({ router });
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
  const petProfileRepository = React.useMemo(
    () => createApiPetProfileRepository({ client: trpcClient }),
    [],
  );
  const petProfileLoadState = useReportCreationPetProfiles({
    intent,
    memberSession: memberCreationSession,
    repository: petProfileRepository,
  });
  const sponsorResourcesAdapter = React.useMemo(
    () => createApiResourcesAdapter({ client: trpcClient }),
    [],
  );
  const [successSponsorPlacements, setSuccessSponsorPlacements] =
    React.useState<LostReportSuccessLocalSponsorPlacement[]>([]);
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

  React.useEffect(() => {
    if (!sponsorResourcesAdapter.getActiveSponsorPlacements) {
      setSuccessSponsorPlacements([]);
      return;
    }

    let isCurrent = true;

    Promise.all([
      sponsorResourcesAdapter.getActiveSponsorPlacements({
        limit: 3,
        surface: "report_success",
      }),
      sponsorResourcesAdapter.getActiveSponsorPlacements({
        limit: 3,
        surface: "contextual_care_resources",
      }),
    ])
      .then(([reportSuccess, contextualCare]) => {
        if (!isCurrent) {
          return;
        }

        setSuccessSponsorPlacements(
          [
            ...reportSuccess.providers.flatMap((provider) => {
              const placement =
                toLostReportSuccessLocalSponsorPlacementFromProvider({
                  provider,
                  surface: "report_success",
                });

              return placement ? [placement] : [];
            }),
            ...contextualCare.providers.flatMap((provider) => {
              const placement =
                toLostReportSuccessLocalSponsorPlacementFromProvider({
                  provider,
                  surface: "contextual_care_resources",
                });

              return placement ? [placement] : [];
            }),
          ].slice(0, 4),
        );
      })
      .catch(() => {
        if (isCurrent) {
          setSuccessSponsorPlacements([]);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [sponsorResourcesAdapter]);
  const reportMediaReportType = getReportMediaReportType(intent);
  const renderReportMediaManager = React.useCallback(
    ({
      mediaDraftId,
      onControllerChange,
      onSnapshotChange,
      photos,
    }: ReportMediaManagerRenderProps) => (
      <ReportCreationRouteMediaManager
        draftCache={reportMediaDraftCacheRef.current}
        key={`${reportMediaReportType}:${mediaDraftId}`}
        mediaDraftId={mediaDraftId}
        onControllerChange={onControllerChange}
        onSnapshotChange={onSnapshotChange}
        photos={photos}
        reportType={reportMediaReportType}
      />
    ),
    [reportMediaReportType],
  );
  const requestMemberSignIn = React.useCallback(() => {
    const returnTo = buildReportCreationReturnTo({
      intent,
      profileId: selectedPetProfileId,
    });

    requestAuthPrompt({
      returnTo,
      sourceHref: `rastro://auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    });
  }, [intent, requestAuthPrompt, selectedPetProfileId]);
  const markDraftPublished = clearReportMediaDraftCache;
  const handleOpenSponsorPlacement = React.useCallback(
    (sponsorProviderId: string) => {
      openHrefAfterClosingReportCreationRoute(
        router,
        buildResourceProviderProfileHref(sponsorProviderId),
      );
    },
    [router],
  );
  const handleReportSponsorPlacement = React.useCallback(
    (sponsorProviderId: string) => {
      return sponsorResourcesAdapter.reportProvider({
        detail: "Reporte enviado desde una colocación patrocinada.",
        providerId: sponsorProviderId,
        reason: "other",
      });
    },
    [sponsorResourcesAdapter],
  );
  const handleRecordSponsorPlacementDelivery = React.useCallback(
    (input: ReportCreationSponsorDeliveryInput) => {
      void sponsorResourcesAdapter
        .recordSponsorDelivery?.(input)
        .catch(() => undefined);
    },
    [sponsorResourcesAdapter],
  );
  const openPublishedLostReport = React.useCallback(
    (confirmation: LostReportPublishConfirmation) => {
      openHrefAfterClosingReportCreationRoute(
        router,
        buildCreatedReportHref({
          id: confirmation.id,
          reportKind: "lost-pet-report",
        }),
      );
    },
    [router],
  );
  const openPublishedFoundReport = React.useCallback(
    (confirmation: FoundReportPublishConfirmation) => {
      openHrefAfterClosingReportCreationRoute(
        router,
        buildCreatedReportHref({
          id: confirmation.id,
          reportKind: "found-pet-report",
        }),
      );
    },
    [router],
  );
  const openPublishedSightingReport = React.useCallback(
    (confirmation: SightingReportPublishConfirmation) => {
      openHrefAfterClosingReportCreationRoute(
        router,
        buildCreatedReportHref({
          id: confirmation.id,
          reportKind: "sighting-report",
        }),
      );
    },
    [router],
  );
  const openPublishedAdoptionListing = React.useCallback(
    (confirmation: AdoptionListingPublishConfirmation) => {
      openHrefAfterClosingReportCreationRoute(
        router,
        buildCreatedReportHref({
          id: confirmation.id,
          reportKind: "adoption-listing",
        }),
      );
    },
    [router],
  );
  const sharePublishedLostReport = React.useCallback(
    (confirmation: LostReportPublishConfirmation) =>
      shareCreatedReport({
        id: confirmation.id,
        reportKind: "lost-pet-report",
      }),
    [],
  );
  const sharePublishedFoundReport = React.useCallback(
    (confirmation: FoundReportPublishConfirmation) =>
      shareCreatedReport({
        id: confirmation.id,
        reportKind: "found-pet-report",
      }),
    [],
  );
  const sharePublishedSightingReport = React.useCallback(
    (confirmation: SightingReportPublishConfirmation) =>
      shareCreatedReport({
        id: confirmation.id,
        reportKind: "sighting-report",
      }),
    [],
  );
  const sharePublishedAdoptionListing = React.useCallback(
    (confirmation: AdoptionListingPublishConfirmation) =>
      shareCreatedReport({
        id: confirmation.id,
        reportKind: "adoption-listing",
      }),
    [],
  );

  if (model.session.kind === "loading") {
    return <AppStateScreen descriptor={model.appStates.states.loading} />;
  }

  if (session.kind === "visitor" && isMemberRequiredReportIntent(intent)) {
    return (
      <AppStateScreen
        descriptor={createMemberRequiredReportState(intent)}
        onActionPress={(action) => {
          if (action.id === "sign-in") {
            requestMemberSignIn();
          }
        }}
        testID="report-creation-member-required"
      />
    );
  }

  const petProfileLoadNotice =
    petProfileLoadState.status === "loading" ? (
      <PetProfileLoadLoadingNotice />
    ) : petProfileLoadState.status === "error" ? (
      <PetProfileLoadFallbackNotice onRetry={petProfileLoadState.retry} />
    ) : undefined;
  const petProfiles =
    petProfileLoadState.status === "ready" ? petProfileLoadState.profiles : [];
  const existingSelectedPetProfileId =
    petProfileLoadState.status === "ready"
      ? getExistingPetProfileId({
          petProfiles,
          profileId: selectedPetProfileId,
        })
      : undefined;
  const lostInitialDraft = createSelectedLostReportInitialDraft({
    petProfiles,
    profileId: existingSelectedPetProfileId,
  });
  const adoptionInitialDraft = createSelectedAdoptionListingInitialDraft({
    petProfiles,
    profileId: existingSelectedPetProfileId,
  });
  let creationScreen: React.ReactNode;

  if (intent === "lost") {
    creationScreen = (
      <LostReportCreationScreen
        draftScopeId={draftScopeId}
        draftStore={draftStore}
        locationAdapter={expoNearbyLocationAdapter}
        onClose={closeRoute}
        onDraftPublished={markDraftPublished}
        onOpenPublishedReport={openPublishedLostReport}
        onOpenSponsorPlacement={handleOpenSponsorPlacement}
        onPublishLostReport={publishLostReport}
        onRecordSponsorPlacementDelivery={handleRecordSponsorPlacementDelivery}
        onReportSponsorPlacement={handleReportSponsorPlacement}
        onSharePublishedReport={sharePublishedLostReport}
        initialDraft={lostInitialDraft}
        petProfileLoadNotice={petProfileLoadNotice}
        petProfiles={petProfiles}
        renderReportMediaManager={renderReportMediaManager}
        successSponsorPlacements={successSponsorPlacements}
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
        onOpenPublishedReport={openPublishedFoundReport}
        onOpenSponsorPlacement={handleOpenSponsorPlacement}
        onPublishFoundReport={publishFoundReport}
        onRecordSponsorPlacementDelivery={handleRecordSponsorPlacementDelivery}
        onReportSponsorPlacement={handleReportSponsorPlacement}
        onRequestMemberSignIn={requestMemberSignIn}
        onSharePublishedReport={sharePublishedFoundReport}
        renderReportMediaManager={renderReportMediaManager}
        session={creationSession}
        successSponsorPlacements={successSponsorPlacements}
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
        onOpenPublishedReport={openPublishedSightingReport}
        onOpenSponsorPlacement={handleOpenSponsorPlacement}
        onPublishSightingReport={publishSightingReport}
        onRecordSponsorPlacementDelivery={handleRecordSponsorPlacementDelivery}
        onReportSponsorPlacement={handleReportSponsorPlacement}
        onRequestMemberSignIn={requestMemberSignIn}
        onSharePublishedReport={sharePublishedSightingReport}
        renderReportMediaManager={renderReportMediaManager}
        session={creationSession}
        successSponsorPlacements={successSponsorPlacements}
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
        onOpenPublishedListing={openPublishedAdoptionListing}
        onOpenSponsorPlacement={handleOpenSponsorPlacement}
        onPublishAdoptionListing={publishAdoptionListing}
        onRecordSponsorPlacementDelivery={handleRecordSponsorPlacementDelivery}
        onReportSponsorPlacement={handleReportSponsorPlacement}
        onSharePublishedListing={sharePublishedAdoptionListing}
        initialDraft={adoptionInitialDraft}
        petProfileLoadNotice={petProfileLoadNotice}
        petProfiles={petProfiles}
        renderReportMediaManager={renderReportMediaManager}
        session={creationSession}
        successSponsorPlacements={successSponsorPlacements}
      />
    );
  }

  return creationScreen;
}

function buildReportCreationReturnTo({
  intent,
  profileId,
}: {
  intent: ReportIntent;
  profileId?: string;
}) {
  const href = buildReportCreationHref(intent) as string;

  return profileId
    ? `${href}?petProfileId=${encodeURIComponent(profileId)}`
    : href;
}

function normalizeRouteParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue;
}

function getExistingPetProfileId({
  petProfiles,
  profileId,
}: {
  petProfiles: readonly { id: string }[];
  profileId?: string;
}) {
  if (!profileId) {
    return undefined;
  }

  return petProfiles.some((profile) => profile.id === profileId)
    ? profileId
    : undefined;
}

function createSelectedLostReportInitialDraft({
  petProfiles,
  profileId,
}: {
  petProfiles: Parameters<
    typeof createInitialLostReportDraft
  >[0]["petProfiles"];
  profileId?: string;
}) {
  if (!profileId) {
    return undefined;
  }

  return createInitialLostReportDraft({
    petProfiles,
    selectedPetProfileId: profileId,
  });
}

function createSelectedAdoptionListingInitialDraft({
  petProfiles,
  profileId,
}: {
  petProfiles: Parameters<
    typeof createInitialAdoptionListingDraft
  >[0]["petProfiles"];
  profileId?: string;
}) {
  if (!profileId) {
    return undefined;
  }

  return createInitialAdoptionListingDraft({
    petProfiles,
    selectedPetProfileId: profileId,
  });
}

function isMemberRequiredReportIntent(intent: ReportIntent) {
  return intent === "lost" || intent === "adoption";
}

function createMemberRequiredReportState(intent: ReportIntent) {
  const reportLabel =
    intent === "adoption" ? "dar en adopción" : "reportar una pérdida";

  return {
    actions: [
      {
        iconName: "person.crop.circle.badge.plus",
        id: "sign-in",
        label: "Iniciar sesión",
      },
    ],
    body: `Inicia sesión o crea una cuenta para ${reportLabel}. Así podemos guardar el borrador, reutilizar tus mascotas y mantener un contacto seguro.`,
    iconName: "lock.fill",
    kind: "empty" as const,
    title: "Inicia sesión para continuar",
    tone: "info" as const,
  };
}

function PetProfileLoadFallbackNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.petProfileNotice}
    >
      <View style={styles.petProfileNoticeCopy}>
        <Text selectable style={styles.petProfileNoticeTitle}>
          No pudimos cargar tus mascotas guardadas
        </Text>
        <Text selectable style={styles.petProfileNoticeBody}>
          Puedes continuar creando una mascota nueva y reintentar si quieres
          reutilizar sus datos.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.petProfileNoticeAction}
      >
        <Text style={styles.petProfileNoticeActionText}>
          Reintentar mascotas
        </Text>
      </Pressable>
    </View>
  );
}

function PetProfileLoadLoadingNotice() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.petProfileNotice}>
      <View style={styles.petProfileNoticeCopy}>
        <Text selectable style={styles.petProfileNoticeTitle}>
          Estamos cargando tus mascotas guardadas
        </Text>
        <Text selectable style={styles.petProfileNoticeBody}>
          Puedes continuar creando una mascota nueva. Si elegiste una mascota
          guardada, espera a que termine la carga antes de reutilizar sus datos.
        </Text>
      </View>
    </View>
  );
}

type ReportCreationPetProfilesState =
  | {
      key: string;
      profiles: Awaited<
        ReturnType<
          ReturnType<typeof createApiPetProfileRepository>["listPetProfiles"]
        >
      >;
      status: "ready";
    }
  | {
      key: string;
      retry: () => void;
      status: "error";
    }
  | {
      key: string;
      status: "loading";
    };

function useReportCreationPetProfiles({
  intent,
  memberSession,
  repository,
}: {
  intent: ReportIntent;
  memberSession: ShellMemberCreationSession | null;
  repository: ReturnType<typeof createApiPetProfileRepository>;
}): ReportCreationPetProfilesState {
  const [retryVersion, setRetryVersion] = React.useState(0);
  const requiredKey = getRequiredPetProfileLoadKey(intent, memberSession);
  const [state, setState] = React.useState<ReportCreationPetProfilesState>(
    () =>
      requiredKey
        ? { key: requiredKey, status: "loading" }
        : { key: "not-required", profiles: [], status: "ready" },
  );
  const retry = React.useCallback(() => {
    setRetryVersion((current) => current + 1);
  }, []);

  React.useEffect(() => {
    if (!requiredKey || !memberSession) {
      setState({ key: "not-required", profiles: [], status: "ready" });
      return;
    }

    const requestState = { isActive: true };

    setState({ key: requiredKey, status: "loading" });
    void repository
      .listPetProfiles(memberSession)
      .then((profiles) => {
        if (requestState.isActive) {
          setState({ key: requiredKey, profiles, status: "ready" });
        }
      })
      .catch(() => {
        if (requestState.isActive) {
          setState({ key: requiredKey, retry, status: "error" });
        }
      });

    return () => {
      requestState.isActive = false;
    };
  }, [memberSession, repository, requiredKey, retry, retryVersion]);

  if (!requiredKey) {
    return state.status === "ready" && state.key === "not-required"
      ? state
      : { key: "not-required", profiles: [], status: "ready" };
  }

  return state.key === requiredKey
    ? state
    : { key: requiredKey, status: "loading" };
}

function getRequiredPetProfileLoadKey(
  intent: ReportIntent,
  memberSession: ShellMemberCreationSession | null,
) {
  if (!memberSession || (intent !== "lost" && intent !== "adoption")) {
    return null;
  }

  return `${intent}:${memberSession.memberId}`;
}

interface ReportMediaManagerRenderProps {
  mediaDraftId: string;
  onControllerChange?: (controller: ReportMediaStepController | null) => void;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  photos: readonly unknown[];
}

type ReportMediaDraftCache = Map<
  string,
  ReturnType<typeof createReportMediaDraft>
>;

const styles = StyleSheet.create({
  petProfileNotice: {
    alignItems: "flex-start",
    backgroundColor: "#F8FBF7",
    borderColor: "#BFD7C2",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  petProfileNoticeAction: {
    backgroundColor: "#1F6B44",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  petProfileNoticeActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  petProfileNoticeBody: {
    color: "#365146",
    fontSize: 13,
    lineHeight: 19,
  },
  petProfileNoticeCopy: {
    gap: 4,
  },
  petProfileNoticeTitle: {
    color: "#173526",
    fontSize: 14,
    fontWeight: "800",
  },
});

function ReportCreationRouteMediaManager({
  draftCache,
  mediaDraftId,
  onControllerChange,
  onSnapshotChange,
  photos,
  reportType,
}: {
  draftCache: ReportMediaDraftCache;
  mediaDraftId: string;
  onControllerChange?: (controller: ReportMediaStepController | null) => void;
  onSnapshotChange: (snapshot: ReportMediaDraftSnapshot) => void;
  photos: readonly unknown[];
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
  const hydratedReadyMedia = React.useMemo(
    () => reportMediaCreationPhotosToHydratedReadyMedia(photos),
    [photos],
  );
  const reportMediaDraft = React.useMemo(() => {
    const cacheKey = `${reportType}:${mediaDraftId}`;
    const cachedDraft = draftCache.get(cacheKey);

    if (cachedDraft) {
      if (
        cachedDraft.getSnapshot().items.length === 0 &&
        hydratedReadyMedia.length > 0
      ) {
        cachedDraft.hydrateReadyMedia(hydratedReadyMedia);
      }

      return cachedDraft;
    }

    const createdDraft = createReportMediaDraft({
      draftId: mediaDraftId,
      reportType,
      uploadSessions: reportMediaUploadSessions,
      uploadTransport: reportMediaUploadTransport,
    });

    if (hydratedReadyMedia.length > 0) {
      createdDraft.hydrateReadyMedia(hydratedReadyMedia);
    }

    draftCache.set(cacheKey, createdDraft);
    return createdDraft;
  }, [
    draftCache,
    hydratedReadyMedia,
    mediaDraftId,
    reportMediaUploadSessions,
    reportMediaUploadTransport,
    reportType,
  ]);
  const [reportMediaSnapshot, setReportMediaSnapshot] = React.useState(() =>
    reportMediaDraft.getSnapshot(),
  );
  const emitSnapshot = React.useCallback(
    (snapshot: ReportMediaDraftSnapshot) => {
      setReportMediaSnapshot(snapshot);
      onSnapshotChange(snapshot);
    },
    [onSnapshotChange],
  );
  const reportMediaController = React.useMemo<ReportMediaStepController>(
    () => ({
      getSnapshot: () => reportMediaDraft.getSnapshot(),
      uploadPendingImages: () =>
        uploadPendingReportMediaDraftItems({
          draft: reportMediaDraft,
          onSnapshotChange: emitSnapshot,
        }),
    }),
    [emitSnapshot, reportMediaDraft],
  );

  React.useEffect(() => {
    onControllerChange?.(reportMediaController);

    return () => {
      onControllerChange?.(null);
    };
  }, [onControllerChange, reportMediaController]);

  return (
    <ReportMediaManager
      draft={reportMediaDraft}
      editAdapter={reportMediaEditAdapter}
      onSnapshotChange={emitSnapshot}
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

const publicWebBaseUrl = "https://rastro.bo";

function buildCreatedReportHref({
  id,
  reportKind,
}: {
  id: string;
  reportKind: NearbyPublicReportKind;
}) {
  return buildNearbyReportRouteTarget({ id, reportKind }).href as Href;
}

async function shareCreatedReport({
  id,
  reportKind,
}: {
  id: string;
  reportKind: NearbyPublicReportKind;
}) {
  await shareNearbyLostReport(
    {
      reportKind,
      shareTarget: buildCreatedReportShareTarget({ id, reportKind }),
    },
    Share,
  );
}

function buildCreatedReportShareTarget({
  id,
  reportKind,
}: {
  id: string;
  reportKind: NearbyPublicReportKind;
}): PublicReportShareTarget {
  const path = buildNearbyReportRouteTarget({ id, reportKind }).href;
  const webUrl = `${publicWebBaseUrl}${path}`;
  const appDeepLink = `rastro://${path.replace(/^\//, "")}`;

  switch (reportKind) {
    case "adoption-listing":
      return {
        appDeepLink,
        message: `Conoce esta mascota en adopción en Rastro: ${webUrl}`,
        path,
        title: "Mascota en adopción en Rastro",
        webUrl,
      };
    case "found-pet-report":
      return {
        appDeepLink,
        message: `Ayuda a reunir a esta mascota en Rastro: ${webUrl}`,
        path,
        title: "Mascota encontrada en Rastro",
        webUrl,
      };
    case "sighting-report":
      return {
        appDeepLink,
        message: `Ayuda a ubicar este avistamiento en Rastro: ${webUrl}`,
        path,
        title: "Avistamiento en Rastro",
        webUrl,
      };
    case "lost-pet-report":
      return {
        appDeepLink,
        message: `Ayuda a encontrar esta mascota en Rastro: ${webUrl}`,
        path,
        title: "Mascota perdida en Rastro",
        webUrl,
      };
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
        rotateBeforeCrop: options?.rotateBeforeCrop,
        rotateDegrees: options?.rotateDegrees,
        sourceUri: getEditableReportMediaSourceUri(item),
      }),
  };
}

function getEditableReportMediaSourceUri(item: ReportMediaDraftItem) {
  return item.uploadUri.trim().length > 0 ? item.uploadUri : item.originalUri;
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
