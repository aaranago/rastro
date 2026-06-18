import { describe, expect, it } from "vitest";

import type {
  CreatePetProfileInput,
  MemberSession,
} from "../pet-profiles/pet-profiles";
import {
  createInMemoryPetProfileRepository,
  createLocalPetProfileMediaAdapter,
} from "../pet-profiles/pet-profiles";
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
