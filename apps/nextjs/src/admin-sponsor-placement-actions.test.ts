import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyAdminSponsorPlacementAction,
  buildAdminSponsorPlacementActionState,
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
        imageAssetId: "22222222-2222-4222-8222-222222222222",
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        sponsorAction: "create_sponsor_placement",
      }),
    );

    expect(result).toMatchObject({
      action: "create_sponsor_placement",
      ok: true,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clínica Veterinaria San Roque",
    });
    expect(api.createAdminSponsorPlacement).toHaveBeenCalledWith({
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      endsOn: "2026-07-31",
      imageAssetId: "22222222-2222-4222-8222-222222222222",
      imageUrl: "https://example.com/sponsor-banner.png",
      label: "Patrocinado",
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      logoUrl: "https://example.com/sponsor-logo.png",
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
        imageUrl: "https://example.com/sponsor-banner.png",
        logoUrl: "https://example.com/sponsor-logo.png",
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
        providerName: "Clínica Veterinaria San Roque",
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

  it("returns sponsor media URL errors without calling the API", async () => {
    const result = await applyAdminSponsorPlacementAction(
      sponsorFormData({
        imageUrl: "nota-url",
        sponsorAction: "create_sponsor_placement",
      }),
    );

    expect(result).toMatchObject({
      action: "create_sponsor_placement",
      ok: false,
    });
    expect(result.fieldErrors).toEqual([
      {
        field: "imageUrl",
        message: "Ingresa una URL válida.",
      },
    ]);
    expect(api.createAdminSponsorPlacement).not.toHaveBeenCalled();
  });

  it("keeps API sponsor overlap field errors attached to the submitted form", async () => {
    const overlapError = new Error("overlap") as Error & {
      cause: {
        fieldErrors: Record<string, string[]>;
      };
    };
    overlapError.cause = {
      fieldErrors: {
        startsOn: ["La ventana se cruza con otro patrocinio local activo."],
        surface: ["La superficie ya tiene un patrocinio local en esa ventana."],
      },
    };
    api.createAdminSponsorPlacement.mockRejectedValueOnce(overlapError);

    const result = await applyAdminSponsorPlacementAction(
      sponsorFormData({
        sponsorAction: "create_sponsor_placement",
      }),
    );

    expect(result).toMatchObject({
      action: "create_sponsor_placement",
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.fieldErrors).toEqual(
      expect.arrayContaining([
        {
          field: "startsOn",
          message: "La ventana se cruza con otro patrocinio local activo.",
        },
        {
          field: "surface",
          message: "La superficie ya tiene un patrocinio local en esa ventana.",
        },
      ]),
    );
    expect(result.submittedValues).toMatchObject({
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
    });
  });

  it("builds redirect feedback and notices for successful updates", () => {
    const result = {
      action: "update_sponsor_placement" as const,
      fieldErrors: [],
      ok: true,
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clínica Veterinaria San Roque",
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
      body: "Clínica Veterinaria San Roque: la superficie, fechas y disclosure quedaron actualizados.",
      title: "Patrocinio actualizado",
      tone: "success",
    });
  });

  it("keeps failed-submit values in action state without query-param field errors", async () => {
    const result = await applyAdminSponsorPlacementAction(
      sponsorFormData({
        endsOn: "2026-07-01",
        imageAssetId: "22222222-2222-4222-8222-222222222222",
        imageUrl: "nota-url",
        label: "Patrocinio manual",
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        sponsorAction: "create_sponsor_placement",
        startsOn: "2026-08-01",
      }),
    );

    const state = buildAdminSponsorPlacementActionState(result);
    const url = buildAdminSponsorPlacementRedirectUrl(result);

    expect(result.ok).toBe(false);
    expect(url).not.toContain("campos=");
    expect(url).not.toContain("imageUrl");
    expect(state.feedback).toMatchObject({
      action: "create_sponsor_placement",
      ok: false,
    });
    expect(state.feedback?.submittedValues).toMatchObject({
      endsOn: "2026-07-01",
      imageAssetId: "22222222-2222-4222-8222-222222222222",
      imageUrl: "nota-url",
      label: "Patrocinio manual",
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      startsOn: "2026-08-01",
    });
    expect(state.feedback?.fieldErrors).toEqual(
      expect.arrayContaining([
        {
          field: "imageUrl",
          message: "Ingresa una URL válida.",
        },
        {
          field: "endsOn",
          message:
            "La fecha final debe ser posterior o igual a la fecha inicial.",
        },
      ]),
    );
    expect(api.createAdminSponsorPlacement).not.toHaveBeenCalled();
  });
});

function sponsorFormData(overrides: Record<string, string>) {
  return formData({
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    endsOn: "2026-07-31",
    imageUrl: "https://example.com/sponsor-banner.png",
    label: "Patrocinado",
    logoUrl: "https://example.com/sponsor-logo.png",
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "Clínica Veterinaria San Roque",
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
