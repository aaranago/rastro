import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyAdminResourceProviderAction,
  buildAdminResourceProviderActionState,
  buildAdminResourceProviderMutationNotice,
  buildAdminResourceProviderRedirectUrl,
  buildAdminResourceProviderWorkflowFeedback,
} from "./admin-resource-provider-actions";

const api = vi.hoisted(() => ({
  attachAdminResourceProviderSponsor: vi.fn(),
  createAdminResourceProvider: vi.fn(),
  deleteAdminResourceProvider: vi.fn(),
  detachAdminResourceProviderSponsor: vi.fn(),
  updateAdminResourceProvider: vi.fn(),
  updateAdminResourceProviderVerification: vi.fn(),
}));

vi.mock("./admin-resource-provider-api-adapter", () => api);

describe("admin resource provider actions", () => {
  beforeEach(() => {
    api.attachAdminResourceProviderSponsor.mockReset();
    api.createAdminResourceProvider.mockReset();
    api.deleteAdminResourceProvider.mockReset();
    api.detachAdminResourceProviderSponsor.mockReset();
    api.updateAdminResourceProvider.mockReset();
    api.updateAdminResourceProviderVerification.mockReset();
  });

  it("returns create field errors without calling the API", async () => {
    const result = await applyAdminResourceProviderAction(
      formData({
        resourceAction: "create_provider",
        name: "",
      }),
    );

    expect(result).toMatchObject({
      action: "create_provider",
      ok: false,
      workflow: "create",
    });
    expect(result.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "contactOptions" }),
      ]),
    );
    expect(api.createAdminResourceProvider).not.toHaveBeenCalled();
  });

  it("returns update route-level errors when the API rejects", async () => {
    api.updateAdminResourceProvider.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    const result = await applyAdminResourceProviderAction(
      validUpdateFormData({
        description:
          "Veterinaria local con atencion general, urgencias y orientacion.",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "update_provider_details",
      }),
    );

    expect(result).toEqual({
      action: "update_provider_details",
      fieldErrors: [],
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clínica Veterinaria San Roque",
      submittedValues: result.submittedValues,
      workflow: "edit",
    });
    expect(result.submittedValues).toMatchObject({
      description:
        "Veterinaria local con atencion general, urgencias y orientacion.",
    });
    expect(api.updateAdminResourceProvider).toHaveBeenCalledTimes(1);
  });

  it("returns verification field errors without calling the API", async () => {
    const result = await applyAdminResourceProviderAction(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "update_verification",
        verificationStatus: "maybe",
      }),
    );

    expect(result).toMatchObject({
      action: "update_verification",
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clínica Veterinaria San Roque",
      workflow: "verification",
    });
    expect(result.fieldErrors).toEqual([
      {
        field: "verificationStatus",
        message: "Selecciona un estado de verificación válido.",
      },
    ]);
    expect(api.updateAdminResourceProviderVerification).not.toHaveBeenCalled();
  });

  it("forwards sponsor media URL fallbacks when attaching a placement", async () => {
    api.attachAdminResourceProviderSponsor.mockResolvedValueOnce({});

    const result = await applyAdminResourceProviderAction(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "attach_sponsor",
        sponsorSurface: "resources_directory",
        sponsorLabel: "Patrocinado",
        sponsorDisclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        logoUrl: "https://example.com/sponsor-logo.png",
        imageAssetId: "22222222-2222-4222-8222-222222222222",
        imageUrl: "https://example.com/sponsor-banner.png",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
      }),
    );

    expect(result).toMatchObject({
      action: "attach_sponsor",
      ok: true,
      workflow: "sponsor",
    });
    expect(api.attachAdminResourceProviderSponsor).toHaveBeenCalledWith({
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

  it("returns sponsor attach field errors without calling the API", async () => {
    const result = await applyAdminResourceProviderAction(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "attach_sponsor",
        sponsorSurface: "resources_directory",
        startsOn: "2026-08-01",
        endsOn: "2026-07-01",
      }),
    );

    expect(result).toMatchObject({
      action: "attach_sponsor",
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clínica Veterinaria San Roque",
      workflow: "sponsor",
    });
    expect(result.fieldErrors).toEqual([
      {
        field: "endsOn",
        message:
          "La fecha final debe ser posterior o igual a la fecha inicial.",
      },
    ]);
    expect(api.attachAdminResourceProviderSponsor).not.toHaveBeenCalled();
  });

  it("keeps API sponsor overlap field errors on provider sponsor actions", async () => {
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
    api.attachAdminResourceProviderSponsor.mockRejectedValueOnce(overlapError);

    const result = await applyAdminResourceProviderAction(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "attach_sponsor",
        sponsorSurface: "resources_directory",
        sponsorLabel: "Patrocinado",
        sponsorDisclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
      }),
    );

    expect(result).toMatchObject({
      action: "attach_sponsor",
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      workflow: "sponsor",
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
      sponsorSurface: "resources_directory",
    });
  });

  it("returns sponsor detach field errors without calling the API", async () => {
    const result = await applyAdminResourceProviderAction(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "detach_sponsor",
      }),
    );

    expect(result).toMatchObject({
      action: "detach_sponsor",
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clínica Veterinaria San Roque",
      workflow: "sponsor",
    });
    expect(result.fieldErrors).toEqual([
      {
        field: "placementId",
        message: "Este campo es obligatorio.",
      },
    ]);
    expect(api.detachAdminResourceProviderSponsor).not.toHaveBeenCalled();
  });

  it("returns archive confirmation errors without calling the API", async () => {
    const result = await applyAdminResourceProviderAction(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "archive_provider",
      }),
    );

    expect(result).toMatchObject({
      action: "archive_provider",
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clínica Veterinaria San Roque",
      workflow: "archive",
    });
    expect(result.fieldErrors).toEqual([
      {
        field: "archiveConfirmation",
        message: "Confirma que quieres archivar este proveedor.",
      },
    ]);
    expect(api.deleteAdminResourceProvider).not.toHaveBeenCalled();
  });

  it("builds provider-specific success notices from redirect feedback", async () => {
    api.updateAdminResourceProviderVerification.mockResolvedValueOnce({});

    const result = await applyAdminResourceProviderAction(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clínica Veterinaria San Roque",
        resourceAction: "update_verification",
        verificationStatus: "verified",
        verificationNote: "Identidad revisada por Rastro.",
      }),
    );
    const url = buildAdminResourceProviderRedirectUrl(result);
    const feedback = buildAdminResourceProviderWorkflowFeedback(
      Object.fromEntries(new URL(`https://rastro.test${url}`).searchParams),
    );

    expect(result.ok).toBe(true);
    expect(feedback).toMatchObject({
      action: "update_verification",
      ok: true,
      providerName: "Clínica Veterinaria San Roque",
      workflow: "verification",
    });
    expect(buildAdminResourceProviderMutationNotice(feedback)).toEqual({
      body: "Clínica Veterinaria San Roque: la verificación de identidad fue actualizada con su nota.",
      title: "Verificación actualizada",
      tone: "success",
    });
  });

  it("keeps failed-submit values in action state without query-param field errors", async () => {
    const result = await applyAdminResourceProviderAction(
      formData({
        resourceAction: "create_provider",
        name: "Clínica incompleta",
        category: "veterinary",
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        photoAssetId: "22222222-2222-4222-8222-222222222222",
        "contactOptions.0.kind": "whatsapp",
        "contactOptions.0.label": "WhatsApp",
        "socialLinks.0.url": "https://instagram.example.com/incompleta",
      }),
    );

    const state = buildAdminResourceProviderActionState(result);
    const url = buildAdminResourceProviderRedirectUrl(result);

    expect(result.ok).toBe(false);
    expect(url).not.toContain("campos=");
    expect(url).not.toContain("contactOptions");
    expect(state.feedback).toMatchObject({
      action: "create_provider",
      ok: false,
      submittedValues: {
        "contactOptions.0.kind": "whatsapp",
        "contactOptions.0.label": "WhatsApp",
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        "socialLinks.0.url": "https://instagram.example.com/incompleta",
        name: "Clínica incompleta",
        photoAssetId: "22222222-2222-4222-8222-222222222222",
      },
      workflow: "create",
    });
    expect(state.feedback?.fieldErrors).toEqual(
      expect.arrayContaining([
        {
          field: "contactOptions.0.value",
          message: "Este campo es obligatorio.",
        },
        {
          field: "socialLinks.0.label",
          message: "Este campo es obligatorio.",
        },
      ]),
    );
    expect(api.createAdminResourceProvider).not.toHaveBeenCalled();
  });
});

function validUpdateFormData(overrides: Record<string, string>) {
  return formData({
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "Clínica Veterinaria San Roque",
    name: "Clínica Veterinaria San Roque",
    category: "veterinary",
    description: "Veterinaria local con atencion general y urgencias.",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    department: "La Paz",
    city: "La Paz",
    approximateLocationLabel: "Sopocachi, La Paz",
    locationCell: "bo-lpb-sopocachi",
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    "contactOptions.0.kind": "phone",
    "contactOptions.0.label": "Llamar",
    "contactOptions.0.value": "+591 2 222 1111",
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
