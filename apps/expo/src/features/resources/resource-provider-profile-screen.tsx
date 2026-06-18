import type { Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import type {
  ResourceContactOption,
  ResourceProviderProfile as ResourceProviderProfileData,
} from "./resource-types";
import type { ResourcesAdapter } from "./static-resources-adapter";
import { ResourceProviderProfile } from "./resource-provider-profile";
import { resourcesColors, resourcesShadow } from "./resources-theme";
import { createStaticResourcesAdapter } from "./static-resources-adapter";

const defaultResourcesAdapter = createStaticResourcesAdapter();
const bottomInset = 36;

type ProfileLoadState =
  | {
      kind: "loading";
      providerId?: string;
    }
  | {
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
  const resolvedProviderId = useMemo(
    () => normalizeProviderId(providerId),
    [providerId],
  );
  const [loadState, setLoadState] = useState<ProfileLoadState>({
    kind: "loading",
  });
  const [reportState, setReportState] = useState<ReportState>({
    kind: "idle",
  });
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!resolvedProviderId) {
      return;
    }

    let isCurrent = true;

    adapter
      .getProviderProfile(resolvedProviderId)
      .then((profile) => {
        if (!isCurrent) {
          return;
        }

        setLoadState(
          profile
            ? { kind: "ready", profile, providerId: resolvedProviderId }
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
    setReportState({ kind: "idle" });
    setLoadState({ kind: "loading", providerId: resolvedProviderId });
    setReloadVersion((current) => current + 1);
  }, [resolvedProviderId]);

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

  const handleReportProvider = useCallback(
    (nextProviderId: string) => {
      if (reportState.kind === "reporting") {
        return;
      }

      setReportState({ kind: "reporting" });
      adapter
        .reportProvider({
          detail: "Reporte enviado desde el perfil de Recursos.",
          providerId: nextProviderId,
          reason: "other",
        })
        .then(() => {
          setReportState({ kind: "reported" });
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
    },
    [adapter, reportState.kind],
  );

  const currentLoadState = getCurrentLoadState(loadState, resolvedProviderId);

  if (currentLoadState.kind === "loading") {
    return (
      <ResourceProviderProfileStateScreen
        body="Estamos cargando datos de contacto, horario y señales de confianza."
        iconName="hourglass"
        title="Cargando proveedor"
      />
    );
  }

  if (currentLoadState.kind === "missing") {
    return (
      <ResourceProviderProfileStateScreen
        actionLabel="Reintentar"
        body="Puede que este proveedor ya no esté disponible en Recursos."
        iconName="questionmark.circle.fill"
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
        iconName="exclamationmark.triangle.fill"
        onAction={handleRetry}
        title="No pudimos abrir el perfil"
      />
    );
  }

  return (
    <ResourceProviderProfile
      onContactAction={handleContactAction}
      onOpenLink={handleOpenLink}
      onReportProvider={handleReportProvider}
      profile={currentLoadState.profile}
      reportFeedback={buildReportFeedback(reportState)}
    />
  );
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
  iconName: string;
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
          <Image
            source={`sf:${iconName}`}
            style={styles.stateIconImage}
            tintColor={resourcesColors.primary}
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

function buildReportFeedback(reportState: ReportState) {
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

  return undefined;
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
