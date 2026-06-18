import { describe, expect, it } from "vitest";

import type { NearbySearchLocation } from "../nearby/nearby-types";
import type { NearbyLostReportsViewModel } from "../nearby/nearby-view-model";
import type { MemberSession } from "../pet-profiles/pet-profiles";
import { createInMemoryLostPetReportRepository } from "../lost-reports/lost-reports";
import { createNearbyLostReportRepositoryAdapter } from "../nearby/nearby-lost-report-repository-adapter";
import { buildNearbyLostReportsViewModel } from "../nearby/nearby-view-model";
import { createInMemoryFoundPetReportRepository } from "./found-reports";

const member: MemberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
};

const otherMember: MemberSession = {
  displayName: "Diego",
  kind: "member",
  memberId: "member-diego",
};

describe("Found Pet Report public detail", () => {
  it("lets a visitor read a published Found Pet Report without exposing exact coordinates by default", async () => {
    const reports = createInMemoryFoundPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const published = await reports.publishFoundPetReport(member, {
      condition: "Seguro, con sed y sin heridas visibles.",
      contactOption: {
        kind: "both",
        phoneNumber: "  +591 71234567 ",
      },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      foundAt: "2026-06-18T09:20:00.000Z",
      foundDescription:
        "Estaba esperando cerca de la puerta. Tiene collar verde sin placa.",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      photos: [{ id: "found-photo-1", uri: "file:///found-dog.heic" }],
    });

    const detail = await reports.getPublicFoundPetReport(
      { kind: "visitor" },
      published.id,
    );

    expect(detail).toMatchObject({
      condition: {
        label: "Condicion",
        value: "Seguro, con sed y sin heridas visibles.",
      },
      contactOptions: [
        {
          kind: "in-app-chat",
          label: "Enviar mensaje en Rastro",
        },
        {
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
          phoneNumber: "+591 71234567",
        },
      ],
      description:
        "Estaba esperando cerca de la puerta. Tiene collar verde sin placa.",
      foundAt: {
        label: "Encontrada",
        value: "2026-06-18T09:20:00.000Z",
      },
      kind: "found-pet-report",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      publicLocation: {
        label: "Sopocachi",
        privacyNote: "Zona aproximada compartida por seguridad.",
        type: "approximate",
      },
      reportLabel: "Reporte de mascota encontrada",
      shareTarget: {
        appDeepLink: "rastro://reportes/encontrados/found-report-1",
        path: "/reportes/encontrados/found-report-1",
        title: "Mascota encontrada: Perro",
        webUrl: "https://rastro.bo/reportes/encontrados/found-report-1",
      },
      statusLabel: "Reporte activo",
      title: "Perro encontrado",
    });
    expect(detail?.publicLocation).not.toHaveProperty("coordinates");
    expect(detail?.photos).toHaveLength(1);
    expect(detail?.photos[0]).toMatchObject({
      exif: {
        locationStripped: true,
        stripped: true,
      },
      status: "ready",
      uri: "file:///found-dog.heic#rastro-compressed",
    });
  });
});

describe("Found Pet Report nearby browsing", () => {
  it("includes published Found Pet Reports in visitor nearby browse with found-specific public labels", async () => {
    const lostReports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const foundReports = createInMemoryFoundPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const adapter = createNearbyLostReportRepositoryAdapter({
      foundReports,
      repository: lostReports,
    });
    const location: NearbySearchLocation = {
      coordinates: { latitude: -16.5103, longitude: -68.1299 },
      countryCode: "BO",
      label: "Sopocachi, La Paz",
      locationCellLabel: "Sopocachi",
      manualLocationKind: "place",
      source: "manual",
    };

    await lostReports.publishLostPetReport(member, {
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T11:30:00.000Z",
      lastSeenDescription: "Collar rojo, visto cerca de la plaza.",
      petProfile: {
        kind: "inline",
        profile: {
          breed: "Mestizo",
          description: "Patas blancas y collar rojo.",
          name: "Toby",
          photos: [{ id: "pet-photo-1", uri: "file:///toby.heic" }],
          type: "Perro",
        },
      },
      photos: [{ id: "lost-photo-1", uri: "file:///toby-lost.heic" }],
    });

    await foundReports.publishFoundPetReport(member, {
      condition: "Seguro, con sed y sin heridas visibles.",
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      foundAt: "2026-06-18T10:15:00.000Z",
      foundDescription: "Estaba esperando cerca de la puerta.",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas y collar verde.",
        type: "Perro",
      },
      photos: [{ id: "found-photo-1", uri: "file:///found-dog.heic" }],
    });

    const result = await adapter.searchLostPetReports({
      location,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.accessPolicy.requiresSignIn).toBe(false);
    expect(result.searchBoundary).toMatchObject({
      engine: "rastro-postgis-radius",
      owner: "rastro",
      publicLocationPrecision: "location-cell",
      radiusKm: 5,
    });

    const lostCard = viewModel.cards.find(
      (card) => card.reportKind === "lost-pet-report",
    );
    const foundCard = viewModel.cards.find(
      (card) => card.reportKind === "found-pet-report",
    );

    expect(lostCard).toMatchObject({
      priorityLabel: "Perdido",
      title: "Toby",
    });
    expect(foundCard).toMatchObject({
      eventAtLabel: "Hace 2 h",
      photoUrl: "file:///found-dog.heic#rastro-thumbnail",
      priorityLabel: "Encontrada",
      publicLocationLabel: "Sopocachi · zona aproximada",
      subtitle: "Mestizo • Seguro, con sed y sin heridas visibles.",
      summary: "Estaba esperando cerca de la puerta.",
      title: "Perro encontrado",
    });

    const foundSummary = result.reports.find(
      (report) => report.reportKind === "found-pet-report",
    );

    expect(foundSummary).toMatchObject({
      condition: "Seguro, con sed y sin heridas visibles.",
      foundAtLabel: "Hace 2 h",
      foundSummary: "Estaba esperando cerca de la puerta.",
      publicLocation: { kind: "approximate" },
      reportKind: "found-pet-report",
    });
    expect(foundSummary?.publicLocation).not.toHaveProperty("latitude");
    expect(foundSummary?.publicLocation).not.toHaveProperty("longitude");
  });
});

describe("Found Pet Report lifecycle", () => {
  it("only lets the reporting caretaker close an owned report and removes it from active search while keeping public detail readable", async () => {
    const reports = createInMemoryFoundPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const published = await reports.publishFoundPetReport(member, {
      condition: "Seguro, con sed y sin heridas visibles.",
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      foundAt: "2026-06-18T09:20:00.000Z",
      foundDescription:
        "Estaba esperando cerca de la puerta. Tiene collar verde sin placa.",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      photos: [{ id: "found-photo-1", uri: "file:///found-dog.heic" }],
    });

    await expect(
      reports.updateFoundPetReportLifecycle(otherMember, published.id, {
        outcome: "transferred-to-shelter",
      }),
    ).rejects.toMatchObject({
      code: "found_report_not_found",
    });

    const closed = await reports.updateFoundPetReportLifecycle(
      member,
      published.id,
      {
        outcome: "transferred-to-shelter",
      },
    );

    expect(closed).toMatchObject({
      outcome: "transferred-to-shelter",
      status: "closed",
    });

    await expect(
      reports.updateFoundPetReportLifecycle({ kind: "visitor" }, published.id, {
        outcome: "inactive",
      }),
    ).rejects.toMatchObject({
      code: "visitor_cannot_manage_found_report",
    });

    const detail = await reports.getPublicFoundPetReport(
      { kind: "visitor" },
      published.id,
    );

    expect(detail).toMatchObject({
      lifecycle: {
        outcome: "transferred-to-shelter",
        outcomeLabel: "Trasladada a refugio",
        status: "closed",
        statusLabel: "Reporte cerrado",
        urgency: "reduced",
      },
      outcomeLabel: "Trasladada a refugio",
      statusLabel: "Reporte cerrado",
      title: "Perro encontrado",
    });

    const activeSearch = await reports.searchActiveFoundPetReports(
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

function assertNearbyViewModelKind<
  K extends NearbyLostReportsViewModel["kind"],
>(
  viewModel: NearbyLostReportsViewModel,
  kind: K,
): asserts viewModel is Extract<NearbyLostReportsViewModel, { kind: K }> {
  expect(viewModel.kind).toBe(kind);
}
