import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyAdminSponsorPlacementAction,
  buildAdminSponsorPlacementFeedback,
  buildAdminSponsorPlacementNotice,
  buildAdminSponsorPlacementRedirectUrl,
} from "./admin-sponsor-placement-actions";

const api = vi.hoisted(() => ({
  createAdminSponsorPlacement: vi.fn(),
  detachAdminSponsorPlacement: vi.fn(),
  updateAdminSponsorPlacement: vi.fn(),
}));

vi.mock("./admin-sponsor-placement-api-adapter", () => api);

describe("admin sponsor placement actions", () => {
  beforeEach(() => {
    api.createAdminSponsorPlacement.mockReset();
    api.detachAdminSponsorPlacement.mockReset();
    api.updateAdminSponsorPlacement.mockReset();
  });

  it("creates sponsor placements through the API", async () => {
    api.createAdminSponsorPlacement.mockResolvedValueOnce({});

    const result = await applyAdminSponsorPlacementAction(
      sponsorFormData({
        sponsorAction: "create_sponsor_placement",
      }),
    );

    expect(result).toMatchObject({
      action: "create_sponsor_placement",
      ok: true,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clinica Veterinaria San Roque",
    });
    expect(api.createAdminSponsorPlacement).toHaveBeenCalledWith({
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      endsOn: "2026-07-31",
      label: "Patrocinado",
      providerId: "11111111-1111-4111-8111-111111111111",
      startsOn: "2026-07-01",
      surface: "resources_directory",
    });
  });

  it("updates sponsor placements through the API", async () => {
    api.updateAdminSponsorPlacement.mockResolvedValueOnce({});

    const result = await applyAdminSponsorPlacementAction(
      sponsorFormData({
        placementId: "22222222-2222-4222-8222-222222222222",
        sponsorAction: "update_sponsor_placement",
        surface: "provider_details",
      }),
    );

    expect(result).toMatchObject({
      action: "update_sponsor_placement",
      ok: true,
      placementId: "22222222-2222-4222-8222-222222222222",
    });
    expect(api.updateAdminSponsorPlacement).toHaveBeenCalledWith(
      expect.objectContaining({
        placementId: "22222222-2222-4222-8222-222222222222",
        surface: "provider_details",
      }),
    );
  });

  it("detaches sponsor placements through the API", async () => {
    api.detachAdminSponsorPlacement.mockResolvedValueOnce({});

    const result = await applyAdminSponsorPlacementAction(
      formData({
        placementId: "22222222-2222-4222-8222-222222222222",
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clinica Veterinaria San Roque",
        sponsorAction: "detach_sponsor_placement",
      }),
    );

    expect(result.ok).toBe(true);
    expect(api.detachAdminSponsorPlacement).toHaveBeenCalledWith({
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("returns validation errors for invalid date windows without calling the API", async () => {
    const result = await applyAdminSponsorPlacementAction(
      sponsorFormData({
        endsOn: "2026-07-01",
        sponsorAction: "create_sponsor_placement",
        startsOn: "2026-08-01",
      }),
    );

    expect(result).toMatchObject({
      action: "create_sponsor_placement",
      ok: false,
    });
    expect(result.fieldErrors).toEqual([
      {
        field: "endsOn",
        message:
          "La fecha final debe ser posterior o igual a la fecha inicial.",
      },
    ]);
    expect(api.createAdminSponsorPlacement).not.toHaveBeenCalled();
  });

  it("builds redirect feedback and notices for successful updates", () => {
    const result = {
      action: "update_sponsor_placement" as const,
      fieldErrors: [],
      ok: true,
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clinica Veterinaria San Roque",
    };
    const url = buildAdminSponsorPlacementRedirectUrl(result);
    const feedback = buildAdminSponsorPlacementFeedback(
      Object.fromEntries(new URL(`https://rastro.test${url}`).searchParams),
    );

    expect(feedback).toMatchObject({
      action: "update_sponsor_placement",
      ok: true,
      placementId: "22222222-2222-4222-8222-222222222222",
    });
    expect(buildAdminSponsorPlacementNotice(feedback)).toEqual({
      body: "Clinica Veterinaria San Roque: la superficie, fechas y disclosure quedaron actualizados.",
      title: "Patrocinio actualizado",
      tone: "success",
    });
  });
});

function sponsorFormData(overrides: Record<string, string>) {
  return formData({
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    endsOn: "2026-07-31",
    label: "Patrocinado",
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "Clinica Veterinaria San Roque",
    startsOn: "2026-07-01",
    surface: "resources_directory",
    ...overrides,
  });
}

function formData(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}
