import { describe, expect, it } from "vitest";

import type { NearbySearchLocation } from "../nearby/nearby-types";
import type { NearbyLostReportsViewModel } from "../nearby/nearby-view-model";
import type { MemberSession } from "../pet-profiles/pet-profiles";
import { createInMemoryLostPetReportRepository } from "../lost-reports/lost-reports";
import { createNearbyLostReportRepositoryAdapter } from "../nearby/nearby-lost-report-repository-adapter";
import { buildNearbyLostReportsViewModel } from "../nearby/nearby-view-model";
import { createInMemoryTrustSafetyRepository } from "../trust-safety";
import { createInMemorySightingReportRepository } from "./sighting-reports";

const member: MemberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
};
const sightingReportIds = {
  first: "44444444-4444-4444-8444-000000000001",
} as const;

describe("Sighting Report public detail and nearby search", () => {
  it("publishes a no-photo Sighting Report and exposes public detail plus nearby summaries", async () => {
    const reports = createInMemorySightingReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const published = await reports.publishSightingReport(member, {
      contactOption: {
        kind: "both",
        phoneNumber: "  +591 71234567 ",
      },
      direction: "Iba hacia la avenida 20 de Octubre.",
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      observedAt: "2026-06-18T10:15:00.000Z",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      photos: [],
      sightingDescription:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
    });

    expect(published).toMatchObject({
      contactOption: {
        kind: "both",
        phoneNumber: "+591 71234567",
      },
      direction: "Iba hacia la avenida 20 de Octubre.",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      photos: [],
      publicLocation: {
        kind: "approximate",
        label: "Sopocachi",
      },
      status: "active",
    });

    const detail = await reports.getPublicSightingReport(
      { kind: "visitor" },
      published.id,
    );

    expect(detail).toMatchObject({
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
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
      direction: {
        label: "Direccion",
        value: "Iba hacia la avenida 20 de Octubre.",
      },
      kind: "sighting-report",
      observedAt: {
        label: "Vista",
        value: "2026-06-18T10:15:00.000Z",
      },
      observedCondition: {
        label: "Condicion observada",
        value: "Asustado, caminando rapido, sin heridas visibles.",
      },
      publicLocation: {
        label: "Sopocachi",
        privacyNote: "Zona aproximada compartida por seguridad.",
        type: "approximate",
      },
      reportLabel: "Reporte de avistamiento",
      shareTarget: {
        appDeepLink: `rastro://reportes/avistamientos/${sightingReportIds.first}`,
        path: `/reportes/avistamientos/${sightingReportIds.first}`,
        title: "Avistamiento de mascota: Perro",
        webUrl: `https://rastro.bo/reportes/avistamientos/${sightingReportIds.first}`,
      },
      statusLabel: "Reporte activo",
      title: "Perro visto",
    });
    expect(detail?.publicLocation).not.toHaveProperty("coordinates");

    const result = await reports.searchActiveSightingReports(
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
      direction: "Iba hacia la avenida 20 de Octubre.",
      distanceMeters: 0,
      id: sightingReportIds.first,
      locationCellLabel: "Sopocachi",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      photoUrl: undefined,
      publicLocation: {
        kind: "approximate",
        label: "Sopocachi",
      },
      sightingDescription:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
      title: "Perro visto",
    });
    expect(result.reports[0]?.publicLocation).not.toHaveProperty("latitude");
    expect(result.reports[0]?.publicLocation).not.toHaveProperty("longitude");
  });

  it("creates a pending admin-review item when a Sighting Report is reported", async () => {
    const trustSafety = createInMemoryTrustSafetyRepository({
      now: () => "2026-06-18T13:10:00.000Z",
    });
    const reports = createInMemorySightingReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
      trustSafety,
    });
    const published = await reports.publishSightingReport(member, {
      contactOption: { kind: "in-app-chat" },
      direction: "Iba hacia la avenida 20 de Octubre.",
      exactLocation: {
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      observedAt: "2026-06-18T10:15:00.000Z",
      observedCondition: "Asustado, caminando rapido.",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas y collar verde.",
        type: "Perro",
      },
      photos: [],
      sightingDescription: "Paso por la esquina de la plaza.",
    });

    const receipt = await reports.reportSightingReport(
      {
        displayName: "Diego",
        kind: "member",
        memberId: "member-diego",
      },
      {
        detail: "La descripcion acusa a otra persona sin evidencia.",
        reason: "offensive_content",
        reportId: published.id,
      },
    );

    expect(receipt).toMatchObject({
      reviewItem: {
        createdAt: "2026-06-18T13:10:00.000Z",
        detail: "La descripcion acusa a otra persona sin evidencia.",
        reason: "offensive_content",
        reporterMemberId: "member-diego",
        status: "pending",
        targetId: published.id,
        targetType: "sighting_report",
      },
      status: "pending_admin_review",
    });
  });

  it("includes published Sighting Reports in visitor nearby browse with sighting-specific labels", async () => {
    const lostReports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const sightingReports = createInMemorySightingReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const adapter = createNearbyLostReportRepositoryAdapter({
      repository: lostReports,
      sightingReports,
    });
    const location: NearbySearchLocation = {
      coordinates: { latitude: -16.5103, longitude: -68.1299 },
      countryCode: "BO",
      label: "Sopocachi, La Paz",
      locationCellLabel: "Sopocachi",
      manualLocationKind: "place",
      source: "manual",
    };

    await sightingReports.publishSightingReport(member, {
      contactOption: { kind: "in-app-chat" },
      direction: "Iba hacia la avenida 20 de Octubre.",
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      observedAt: "2026-06-18T10:15:00.000Z",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      photos: [],
      sightingDescription:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
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
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]).toMatchObject({
      eventAtLabel: "Hace 2 h",
      priorityLabel: "Avistamiento",
      publicLocationLabel: "Sopocachi · zona aproximada",
      reportKind: "sighting-report",
      subtitle: "Mestizo • Asustado, caminando rapido, sin heridas visibles.",
      summary:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
      title: "Perro visto",
    });
    expect(viewModel.cards[0]?.summary).not.toMatch(/encontrad|asegurad/i);
  });
});

describe("Sighting Report lifecycle", () => {
  it("lets the reporting caretaker close a sighting as unable to locate and keeps it readable without active-search urgency", async () => {
    const reports = createInMemorySightingReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const published = await reports.publishSightingReport(member, {
      contactOption: { kind: "in-app-chat" },
      direction: "Iba hacia la avenida 20 de Octubre.",
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      observedAt: "2026-06-18T10:15:00.000Z",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      photos: [],
      sightingDescription:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
    });

    const closed = await reports.updateSightingReportLifecycle(
      member,
      published.id,
      {
        outcome: "unable-to-locate",
      },
    );

    expect(closed).toMatchObject({
      outcome: "unable-to-locate",
      status: "closed",
    });

    const detail = await reports.getPublicSightingReport(
      { kind: "visitor" },
      published.id,
    );

    expect(detail).toMatchObject({
      lifecycle: {
        outcome: "unable-to-locate",
        outcomeLabel: "No se pudo ubicar",
        status: "closed",
        statusLabel: "Reporte cerrado",
        urgency: "reduced",
      },
      outcomeLabel: "No se pudo ubicar",
      statusLabel: "Reporte cerrado",
      title: "Perro visto",
    });

    const activeSearch = await reports.searchActiveSightingReports(
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
