import { describe, expect, it } from "vitest";

import type { AlertSubscriptionNativeLocationSnapshot } from "./alert-subscription-native-adapter";
import {
  buildAlertSubscriptionSettingsViewModel,
  toAlertSubscriptionLocationSnapshot,
} from "./alert-subscription-settings-view-model";
import { createInMemoryAlertSubscriptionRepository } from "./alert-subscriptions";

const member = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
} as const;

const currentNativeLocation = {
  coordinates: {
    accuracyMeters: 30,
    capturedAt: "2026-06-18T12:00:00.000Z",
    latitude: -16.5103,
    longitude: -68.1299,
  },
  kind: "available",
  permission: {
    granted: true,
    precision: "precise",
    status: "granted",
  },
  source: "current",
} satisfies AlertSubscriptionNativeLocationSnapshot;

describe("Alert Subscription settings view model", () => {
  it("keeps visitors in a signed-out Spanish state", () => {
    const viewModel = buildAlertSubscriptionSettingsViewModel({
      session: { kind: "visitor" },
      subscription: null,
    });

    expect(viewModel).toMatchObject({
      action: {
        id: "sign-in",
        label: "Iniciar sesion",
      },
      canManage: false,
      statusLabel: "Sesion requerida",
      title: "Alertas cercanas",
    });
    expect(viewModel.body).toContain("Inicia sesion");
  });

  it("shows enabled member alerts with radius, Dynamic Alert Area, and battery policy copy", async () => {
    const repository = createInMemoryAlertSubscriptionRepository({
      now: () => "2026-06-18T12:05:00.000Z",
    });
    const location = toAlertSubscriptionLocationSnapshot(currentNativeLocation);

    if (!location) {
      throw new Error("Expected native location to map to an alert area.");
    }

    const subscription = await repository.enableAlertSubscription(member, {
      currentLocation: location,
      movingAlerts: {
        enabled: true,
        permissionState: "foreground-only",
      },
      radiusKm: 10,
      reason: "manual-refresh",
    });

    const viewModel = buildAlertSubscriptionSettingsViewModel({
      session: member,
      subscription,
    });

    expect(viewModel).toMatchObject({
      action: {
        id: "pause-alerts",
        label: "Pausar alertas",
      },
      area: {
        label: "Ubicacion actual en Bolivia",
        meta: "Bolivia · zona aproximada",
        sourceLabel: "Ubicacion actual",
      },
      enabled: true,
      movingAlerts: {
        enabled: true,
        statusLabel: "Necesita permiso",
      },
      statusLabel: "Alertas activas",
    });
    expect(viewModel.radiusOptions).toEqual([
      { isSelected: false, label: "5 km", value: 5 },
      { isSelected: true, label: "10 km", value: 10 },
      { isSelected: false, label: "20 km", value: 20 },
    ]);
    expect(viewModel.locationPolicyRows).toEqual(
      expect.arrayContaining([
        "No usamos GPS continuo ni sockets siempre activos.",
        "Los reportes cerrados no generan alertas.",
      ]),
    );
  });

  it("maps native current and last-detected snapshots into Bolivia alert locations", () => {
    expect(toAlertSubscriptionLocationSnapshot(currentNativeLocation)).toEqual({
      coordinates: {
        latitude: -16.5103,
        longitude: -68.1299,
      },
      countryCode: "BO",
      detectedAt: "2026-06-18T12:00:00.000Z",
      label: "Ubicacion actual en Bolivia",
      locationCellLabel: "Bolivia",
      source: "current",
    });

    expect(
      toAlertSubscriptionLocationSnapshot({
        ...currentNativeLocation,
        source: "last-detected",
      }),
    ).toMatchObject({
      label: "Ultima ubicacion detectada en Bolivia",
      source: "last",
    });
  });
});
