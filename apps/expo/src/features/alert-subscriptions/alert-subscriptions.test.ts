import { describe, expect, it } from "vitest";

import type { CreatePetProfileInput } from "../pet-profiles/pet-profiles";
import type {
  AlertSubscriptionLocationSnapshot,
  AlertSubscriptionsMemberSession,
} from "./alert-subscriptions";
import { createInMemoryLostPetReportRepository } from "../lost-reports/lost-reports";
import { createInMemoryAlertSubscriptionRepository } from "./alert-subscriptions";

const member: AlertSubscriptionsMemberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
};

const caretaker: AlertSubscriptionsMemberSession = {
  displayName: "Andres",
  kind: "member",
  memberId: "member-andres",
};

const petProfileInput: CreatePetProfileInput = {
  breed: "Mestizo",
  description: "Patas blancas y collar rojo.",
  name: "Toby",
  photos: [{ id: "pet-photo-1", uri: "file:///toby-profile.heic" }],
  type: "Perro",
};

const currentLocation: AlertSubscriptionLocationSnapshot = {
  coordinates: {
    latitude: -16.5103,
    longitude: -68.1299,
  },
  countryCode: "BO",
  detectedAt: "2026-06-18T12:00:00.000Z",
  label: "Ubicación actual en Sopocachi",
  locationCellLabel: "Sopocachi",
  source: "current",
};

const lastDetectedLocation: AlertSubscriptionLocationSnapshot = {
  coordinates: {
    latitude: -17.3895,
    longitude: -66.1568,
  },
  countryCode: "BO",
  detectedAt: "2026-06-18T08:00:00.000Z",
  label: "Última ubicación detectada en Cochabamba",
  locationCellLabel: "Queru Queru",
  source: "last",
};
const lostReportIds = {
  first: "11111111-1111-4111-8111-000000000001",
} as const;

describe("Alert Subscription preferences", () => {
  it("lets a member enable and disable an Alert Subscription with a Dynamic Alert Area and Alert Radius", async () => {
    const repository = createInMemoryAlertSubscriptionRepository({
      now: () => "2026-06-18T12:05:00.000Z",
    });

    const enabled = await repository.enableAlertSubscription(member, {
      currentLocation,
      lastDetectedLocation,
      radiusKm: 10,
      reason: "manual-refresh",
    });

    expect(enabled).toMatchObject({
      dynamicAlertArea: {
        location: {
          label: "Ubicación actual en Sopocachi",
          source: "current",
        },
        reason: "manual-refresh",
      },
      enabled: true,
      memberId: member.memberId,
      radiusKm: 10,
    });

    const disabled = await repository.disableAlertSubscription(member);

    expect(disabled).toMatchObject({
      enabled: false,
      memberId: member.memberId,
      radiusKm: 10,
    });
  });

  it("records app-open, foreground, and manual refresh location updates without continuous tracking", async () => {
    const repository = createInMemoryAlertSubscriptionRepository({
      now: () => "2026-06-18T12:05:00.000Z",
    });

    const enabled = await repository.enableAlertSubscription(member, {
      lastDetectedLocation,
      radiusKm: 5,
      reason: "app-open",
    });

    expect(enabled.dynamicAlertArea).toMatchObject({
      location: {
        label: "Última ubicación detectada en Cochabamba",
        source: "last",
      },
      reason: "app-open",
    });
    expect(enabled.locationUpdatePolicy).toEqual({
      allowedReasons: ["app-open", "foreground", "manual-refresh"],
      alwaysOnSocket: false,
      continuousPolling: false,
      locationWatcher: false,
    });

    const foregroundUpdate = await repository.recordAlertAreaLocation(member, {
      currentLocation,
      lastDetectedLocation,
      reason: "foreground",
    });

    expect(foregroundUpdate.dynamicAlertArea).toMatchObject({
      location: {
        label: "Ubicación actual en Sopocachi",
        source: "current",
      },
      reason: "foreground",
    });

    const manualRefresh = await repository.recordAlertAreaLocation(member, {
      lastDetectedLocation,
      reason: "manual-refresh",
    });

    expect(manualRefresh.dynamicAlertArea).toMatchObject({
      location: {
        label: "Última ubicación detectada en Cochabamba",
        source: "last",
      },
      reason: "manual-refresh",
    });
  });

  it("matches notifications only for new nearby active Lost Pet Reports", async () => {
    const alertSubscriptions = createInMemoryAlertSubscriptionRepository({
      now: () => "2026-06-18T12:10:00.000Z",
    });
    const lostReports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    await alertSubscriptions.enableAlertSubscription(member, {
      currentLocation,
      lastDetectedLocation,
      radiusKm: 5,
      reason: "foreground",
    });

    const nearbyActive = await lostReports.publishLostPetReport(caretaker, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T11:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza con collar rojo.",
      petProfile: {
        kind: "inline",
        profile: petProfileInput,
      },
      photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
    });

    await lostReports.publishLostPetReport(caretaker, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Calle 21 de Calacoto",
        countryCode: "BO",
        latitude: -16.583,
        locationCellLabel: "Calacoto",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T11:30:00.000Z",
      lastSeenDescription: "Se alejo durante una visita familiar.",
      petProfile: {
        kind: "inline",
        profile: {
          ...petProfileInput,
          name: "Nina",
        },
      },
      photos: [{ id: "report-photo-2", uri: "file:///nina-lost.heic" }],
    });

    const nearbyClosed = await lostReports.publishLostPetReport(caretaker, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Mercado Sopocachi, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T11:50:00.000Z",
      lastSeenDescription: "Ya fue reunida con su familia.",
      petProfile: {
        kind: "inline",
        profile: {
          ...petProfileInput,
          name: "Luna",
          type: "Gato",
        },
      },
      photos: [{ id: "report-photo-3", uri: "file:///luna-lost.heic" }],
    });

    await lostReports.updateLostPetReportLifecycle(caretaker, nearbyClosed.id, {
      outcome: "reunited",
    });

    const firstMatch = await alertSubscriptions.matchNewLostPetReportAlerts(
      member,
      {
        lostReports,
      },
    );

    expect(firstMatch).toEqual([
      {
        body: "Toby fue reportada cerca de Sopocachi.",
        deepLink: `rastro://reportes/perdidos/${lostReportIds.first}`,
        memberId: member.memberId,
        reportId: nearbyActive.id,
        title: "Mascota perdida cerca de ti",
        webUrl: `https://rastro.bo/reportes/perdidos/${lostReportIds.first}`,
      },
    ]);

    await expect(
      alertSubscriptions.matchNewLostPetReportAlerts(member, {
        lostReports,
      }),
    ).resolves.toEqual([]);
  });

  it("models background moving alerts as explicit opt-in without starting background tracking", async () => {
    const repository = createInMemoryAlertSubscriptionRepository({
      now: () => "2026-06-18T12:20:00.000Z",
    });

    const enabled = await repository.enableAlertSubscription(member, {
      currentLocation,
      movingAlerts: {
        enabled: true,
        permissionState: "foreground-only",
      },
      radiusKm: 20,
      reason: "manual-refresh",
    });

    expect(enabled.movingAlerts).toEqual({
      backgroundTracking: "not-started",
      enabled: true,
      label: "Alertas mientras me muevo",
      permissionState: "foreground-only",
      status: "needs-background-permission",
    });

    const permissionGranted = await repository.updateMovingAlertsPreference(
      member,
      {
        enabled: true,
        permissionState: "background-granted",
      },
    );

    expect(permissionGranted.movingAlerts).toEqual({
      backgroundTracking: "not-started",
      enabled: true,
      label: "Alertas mientras me muevo",
      permissionState: "background-granted",
      status: "ready",
    });

    const disabled = await repository.updateMovingAlertsPreference(member, {
      enabled: false,
      permissionState: "background-granted",
    });

    expect(disabled.movingAlerts).toEqual({
      backgroundTracking: "not-started",
      enabled: false,
      label: "Alertas mientras me muevo",
      permissionState: "background-granted",
      status: "off",
    });
  });
});
