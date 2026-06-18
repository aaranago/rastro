import { describe, expect, it } from "vitest";

import type {
  CreatePetProfileInput,
  MemberSession,
} from "../pet-profiles/pet-profiles";
import {
  createInMemoryPetProfileRepository,
  createLocalPetProfileMediaAdapter,
} from "../pet-profiles/pet-profiles";
import { createInMemoryTrustSafetyRepository } from "../trust-safety";
import { createInMemoryLostPetReportRepository } from "./lost-reports";

const member: MemberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
};

const petProfileInput: CreatePetProfileInput = {
  breed: "Mestizo",
  description: "Patas blancas y collar rojo.",
  name: "Toby",
  photos: [{ id: "pet-photo-1", uri: "file:///toby-profile.heic" }],
  type: "Perro",
};

describe("Lost Pet Report publishing", () => {
  it("lets a member publish a Lost Pet Report from an existing Pet Profile with approximate public location by default", async () => {
    const petProfiles = createInMemoryPetProfileRepository({
      mediaAdapter: createLocalPetProfileMediaAdapter(),
      now: () => "2026-06-18T10:00:00.000Z",
    });
    const toby = await petProfiles.createPetProfile(member, petProfileInput);
    const reports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T10:30:00.000Z",
      petProfiles,
    });

    const published = await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza con collar rojo.",
      petProfile: {
        kind: "existing",
        petProfileId: toby.id,
      },
      photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
    });

    expect(published).toMatchObject({
      caretakerMemberId: member.memberId,
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      outcome: "still-missing",
      petName: "Toby",
      petProfileId: toby.id,
      publicLocation: {
        kind: "approximate",
        label: "Sopocachi",
      },
      status: "active",
    });
    expect(published.photos).toHaveLength(1);
    expect(published.photos[0]).toMatchObject({
      exif: {
        locationStripped: true,
        stripped: true,
      },
      status: "ready",
      uri: "file:///toby-lost.heic#rastro-compressed",
    });
  });

  it("can create an inline Pet Profile while publishing and exposes an exact public pin only when opted in", async () => {
    const petProfiles = createInMemoryPetProfileRepository({
      now: () => "2026-06-18T11:00:00.000Z",
    });
    const reports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T11:15:00.000Z",
      petProfiles,
    });

    const published = await reports.publishLostPetReport(member, {
      contactOption: {
        kind: "both",
        phoneNumber: "  +591 70123456 ",
      },
      exactLocation: {
        addressLabel: "Calle 21 de Calacoto",
        countryCode: "BO",
        latitude: -16.5406,
        locationCellLabel: "Calacoto",
        longitude: -68.0772,
      },
      lastSeenAt: "2026-06-18T10:50:00.000Z",
      lastSeenDescription: "Salio por la puerta principal.",
      petProfile: {
        kind: "inline",
        profile: {
          breed: "Siames",
          description: "Mancha blanca en el pecho.",
          name: "Luna",
          photos: [{ id: "inline-photo-1", uri: "file:///luna.heic" }],
          type: "Gato",
        },
      },
      photos: [{ id: "report-photo-1", uri: "file:///luna-lost.heic" }],
      showExactPublicLocation: true,
    });

    expect(published).toMatchObject({
      contactOption: {
        kind: "both",
        phoneNumber: "+591 70123456",
      },
      petName: "Luna",
      publicLocation: {
        addressLabel: "Calle 21 de Calacoto",
        kind: "exact",
        latitude: -16.5406,
        longitude: -68.0772,
      },
    });
    expect(
      await petProfiles.getPetProfile(member, published.petProfileId),
    ).toMatchObject({
      name: "Luna",
      type: "Gato",
    });
  });

  it("blocks visitors from publishing Lost Pet Reports", async () => {
    const reports = createInMemoryLostPetReportRepository();

    await expect(
      reports.publishLostPetReport(
        { kind: "visitor" },
        {
          contactOption: { kind: "in-app-chat" },
          exactLocation: {
            countryCode: "BO",
            latitude: -16.5103,
            locationCellLabel: "Sopocachi",
            longitude: -68.1299,
          },
          lastSeenAt: "2026-06-18T09:45:00.000Z",
          lastSeenDescription: "Se escapo cerca de la plaza.",
          petProfile: {
            kind: "inline",
            profile: petProfileInput,
          },
          photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
        },
      ),
    ).rejects.toMatchObject({
      code: "visitor_cannot_publish_lost_report",
    });
  });

  it("creates a pending admin-review item when a Lost Pet Report is reported", async () => {
    const trustSafety = createInMemoryTrustSafetyRepository({
      now: () => "2026-06-18T13:00:00.000Z",
    });
    const reports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
      trustSafety,
    });
    const published = await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza.",
      petProfile: {
        kind: "inline",
        profile: petProfileInput,
      },
      photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
    });

    const receipt = await reports.reportLostPetReport(
      {
        displayName: "Diego",
        kind: "member",
        memberId: "member-diego",
      },
      {
        detail: "La ubicacion parece incorrecta.",
        reason: "incorrect_location",
        reportId: published.id,
      },
    );

    expect(receipt).toMatchObject({
      reviewItem: {
        createdAt: "2026-06-18T13:00:00.000Z",
        detail: "La ubicacion parece incorrecta.",
        reason: "incorrect_location",
        reporterMemberId: "member-diego",
        status: "pending",
        targetId: published.id,
        targetType: "lost_pet_report",
      },
      status: "pending_admin_review",
    });
    await expect(trustSafety.listAdminReviewItems()).resolves.toEqual([
      receipt.reviewItem,
    ]);
  });

  it("requires a report photo and a WhatsApp number when WhatsApp is selected", async () => {
    const reports = createInMemoryLostPetReportRepository();
    const requiredInput = {
      contactOption: { kind: "whatsapp", phoneNumber: "" } as const,
      exactLocation: {
        countryCode: "BO" as const,
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza.",
      petProfile: {
        kind: "inline",
        profile: petProfileInput,
      } as const,
      photos: [] as const,
    };

    await expect(
      reports.publishLostPetReport(member, requiredInput),
    ).rejects.toMatchObject({
      code: "lost_report_photo_required",
    });

    await expect(
      reports.publishLostPetReport(member, {
        ...requiredInput,
        photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
      }),
    ).rejects.toMatchObject({
      code: "whatsapp_phone_required",
    });
  });

  it("allows WhatsApp as the only Contact Option when a phone number is provided", async () => {
    const reports = createInMemoryLostPetReportRepository();

    const published = await reports.publishLostPetReport(member, {
      contactOption: {
        kind: "whatsapp",
        phoneNumber: "  +591 71234567 ",
      },
      exactLocation: {
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza.",
      petProfile: {
        kind: "inline",
        profile: petProfileInput,
      },
      photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
    });

    expect(published.contactOption).toEqual({
      kind: "whatsapp",
      phoneNumber: "+591 71234567",
    });
  });
});

describe("Lost Pet Report browsing", () => {
  it("lets a visitor browse active Lost Pet Reports within a 5 km Alert Radius with approximate public summaries", async () => {
    const reports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza con collar rojo.",
      petProfile: {
        kind: "inline",
        profile: petProfileInput,
      },
      photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
    });

    await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Calle 21 de Calacoto",
        countryCode: "BO",
        latitude: -16.583,
        locationCellLabel: "Calacoto",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se alejo durante una visita familiar.",
      petProfile: {
        kind: "inline",
        profile: {
          ...petProfileInput,
          name: "Luna",
          type: "Gato",
        },
      },
      photos: [{ id: "report-photo-2", uri: "file:///luna-lost.heic" }],
    });

    const result = await reports.searchActiveLostPetReports(
      { kind: "visitor" },
      {
        location: {
          coordinates: {
            latitude: -16.5103,
            longitude: -68.1299,
          },
          countryCode: "BO",
          label: "Sopocachi, La Paz",
          locationCellLabel: "Sopocachi",
          source: "manual",
        },
        radiusKm: 5,
        strategy: "postgis_radius",
      },
    );

    expect(result).toMatchObject({
      radiusMeters: 5000,
      searchStrategy: "postgis_radius",
    });
    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]).toMatchObject({
      distanceMeters: 0,
      id: "lost-report-1",
      locationCellLabel: "Sopocachi",
      petName: "Toby",
      publicLocation: {
        kind: "approximate",
        label: "Sopocachi",
        locationCellLabel: "Sopocachi",
      },
    });
    expect(result.reports[0]?.shareTarget).toEqual({
      appDeepLink: "rastro://reportes/perdidos/lost-report-1",
      message:
        "Ayuda a encontrar a Toby en Rastro: https://rastro.bo/reportes/perdidos/lost-report-1",
      path: "/reportes/perdidos/lost-report-1",
      title: "Mascota perdida: Toby",
      webUrl: "https://rastro.bo/reportes/perdidos/lost-report-1",
    });
    expect(result.reports[0]?.publicLocation).not.toHaveProperty("latitude");
    expect(result.reports[0]?.publicLocation).not.toHaveProperty("longitude");
  });

  it("lets a member browse a 10 km Alert Radius with urgent reports ranked before nearer standard reports", async () => {
    const reports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-16T09:00:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza con collar rojo.",
      petProfile: {
        kind: "inline",
        profile: petProfileInput,
      },
      photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
    });

    await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Calle 21 de Calacoto",
        countryCode: "BO",
        latitude: -16.583,
        locationCellLabel: "Calacoto",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T11:30:00.000Z",
      lastSeenDescription: "Puede acercarse si le hablan con calma.",
      petProfile: {
        kind: "inline",
        profile: {
          ...petProfileInput,
          name: "Nina",
        },
      },
      photos: [{ id: "report-photo-2", uri: "file:///nina-lost.heic" }],
      showExactPublicLocation: true,
    });

    const result = await reports.searchActiveLostPetReports(member, {
      location: {
        coordinates: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        countryCode: "BO",
        label: "Ubicacion actual en La Paz",
        locationCellLabel: "Sopocachi",
        source: "current",
      },
      radiusKm: 10,
      strategy: "postgis_radius",
    });

    expect(result.reports.map((report) => report.petName)).toEqual([
      "Nina",
      "Toby",
    ]);
    expect(result.reports.map((report) => report.alertPriority)).toEqual([
      "urgent",
      "standard",
    ]);
    expect(result.reports[0]?.publicLocation).toMatchObject({
      addressLabel: "Calle 21 de Calacoto",
      kind: "exact",
      latitude: -16.583,
      longitude: -68.1299,
    });
    expect(result.reports[1]?.publicLocation).toMatchObject({
      kind: "approximate",
      locationCellLabel: "Sopocachi",
    });
  });

  it("uses a last detected Bolivia location as the radius-search input", async () => {
    const reports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Queru Queru, Cochabamba",
        countryCode: "BO",
        latitude: -17.3895,
        locationCellLabel: "Queru Queru",
        longitude: -66.1568,
      },
      lastSeenAt: "2026-06-18T10:30:00.000Z",
      lastSeenDescription: "Salio por el jardin y no regreso.",
      petProfile: {
        kind: "inline",
        profile: {
          ...petProfileInput,
          name: "Coco",
        },
      },
      photos: [{ id: "report-photo-1", uri: "file:///coco-lost.heic" }],
    });

    const result = await reports.searchActiveLostPetReports(
      { kind: "visitor" },
      {
        location: {
          coordinates: {
            latitude: -17.3895,
            longitude: -66.1568,
          },
          countryCode: "BO",
          label: "Ultima ubicacion detectada en Cochabamba",
          locationCellLabel: "Queru Queru",
          source: "last",
        },
        radiusKm: 5,
        strategy: "postgis_radius",
      },
    );

    expect(result.query.location.source).toBe("last");
    expect(result.reports.map((report) => report.petName)).toEqual(["Coco"]);
  });
});

describe("Lost Pet Report lifecycle", () => {
  it("lets the caretaker close an owned report and keeps the closed detail readable without active-search urgency", async () => {
    const reports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const published = await reports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza con collar rojo.",
      petProfile: {
        kind: "inline",
        profile: petProfileInput,
      },
      photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
    });

    const closed = await reports.updateLostPetReportLifecycle(
      member,
      published.id,
      {
        outcome: "reunited",
      },
    );

    expect(closed).toMatchObject({
      outcome: "reunited",
      status: "closed",
      updatedAt: "2026-06-18T12:00:00.000Z",
    });

    const detail = await reports.getPublicLostPetReport(
      { kind: "visitor" },
      published.id,
    );

    expect(detail).toMatchObject({
      lifecycle: {
        outcome: "reunited",
        outcomeLabel: "Reunida",
        status: "closed",
        statusLabel: "Reporte cerrado",
        urgency: "reduced",
      },
      outcomeLabel: "Reunida",
      statusLabel: "Reporte cerrado",
      title: "Toby",
    });

    const activeSearch = await reports.searchActiveLostPetReports(
      { kind: "visitor" },
      {
        location: {
          coordinates: {
            latitude: -16.5103,
            longitude: -68.1299,
          },
          countryCode: "BO",
          label: "Sopocachi, La Paz",
          locationCellLabel: "Sopocachi",
          source: "manual",
        },
        radiusKm: 5,
        strategy: "postgis_radius",
      },
    );

    expect(activeSearch.reports).toEqual([]);
  });
});
