import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdminResourceProviderProfile } from "./admin-resource-provider-admin-model";
import { buildAdminResourceProviderListViewModel } from "./admin-resource-provider-admin-model";
import { AdminResourcesDashboard } from "./admin-resources-dashboard";
import {
  buildForbiddenAdminResourcesDashboardProps,
  toAdminResourcesDashboardProps,
} from "./admin-resources-dashboard-adapter";

const forbiddenTerms = new RegExp(
  [
    ["Resource", "Provider"].join(" "),
    ["Verification", "Badge"].join(" "),
  ].join("|"),
  "i",
);
const marketplaceTerms = /marketplace|seller|comprar|vender/i;

describe("AdminResourcesDashboard", () => {
  it("renders dense provider management controls with Spanish Bolivia copy", () => {
    const viewModel = buildAdminResourceProviderListViewModel([
      providerProfile(),
    ]);

    const html = renderToStaticMarkup(
      <AdminResourcesDashboard
        {...toAdminResourcesDashboardProps(viewModel, viewModel.metrics, {
          displayName: "Admin Rastro",
          role: "admin",
        })}
      />,
    );

    expect(html).toContain("Gestión de proveedores de recursos");
    expect(html).toContain("Administración de recursos");
    expect(html).not.toContain("modelo administrativo temporal");
    expect(html).not.toContain("no confirma publicacion");
    expect(html).toContain("Clinica Veterinaria San Roque");
    expect(html).toContain("Sopocachi");
    expect(html).toContain("Registrar proveedor");
    expect(html).toContain("Latitud exacta");
    expect(html).toContain("Ubicación avanzada y privacidad");
    expect(html).toContain("Opciones de contacto");
    expect(html).toContain("Logo URL");
    expect(html).toContain("Redes sociales");
    expect(html).toContain("Enlaces externos");
    expect(html).toContain("Plaza Abaroa, La Paz");
    expect(html).toContain("Guardar detalles");
    expect(html).not.toContain("Falta contrato API para actualizar detalles");
    expect(html).toContain("Guardar identidad");
    expect(html).toContain("Adjuntar patrocinio local");
    expect(html).toContain("Retirar por ID");
    expect(html).toContain("22222222-2222-4222-8222-222222222222");
    expect(html).toContain("Identidad revisada por Rastro.");
    expect(html).toContain("Archivar proveedor");
    expect(html).not.toContain("Falta contrato API para archivar o eliminar");
    expect(html).toContain("Métricas por departamento");
    expect(html).toContain("Métricas por ciudad");
    expect(html).toContain("No cambia la prioridad de recuperación");
    expect(html).toContain("No activa notificaciones push");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("renders restricted access without mutation controls for non-admin viewers", () => {
    const html = renderToStaticMarkup(
      <AdminResourcesDashboard
        {...buildForbiddenAdminResourcesDashboardProps(
          {
            displayName: "Ana miembro",
            role: "member",
          },
          {
            body: "Esta superficie esta disponible solo para administradores de Rastro.",
            locale: "es-BO",
            title: "Acceso restringido",
          },
        )}
      />,
    );

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("solo para administradores");
    expect(html).toContain("Ana miembro");
    expect(html).not.toContain("Registrar proveedor");
    expect(html).not.toContain("Guardar identidad");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("renders empty states for providers and metrics", () => {
    const viewModel = buildAdminResourceProviderListViewModel([]);

    const html = renderToStaticMarkup(
      <AdminResourcesDashboard
        {...toAdminResourcesDashboardProps(viewModel, viewModel.metrics, {
          displayName: "Admin Rastro",
          role: "admin",
        })}
      />,
    );

    expect(html).toContain("Todavía no hay proveedores registrados.");
    expect(html).toContain(
      "Sin métricas disponibles hasta registrar proveedores.",
    );
  });
});

function providerProfile(): AdminResourceProviderProfile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    addressLabel: "Plaza Abaroa, La Paz",
    categoryId: "veterinary",
    city: "La Paz",
    description: "Veterinaria local con atencion general y urgencias.",
    department: "La Paz",
    approximateLocationLabel: "Sopocachi, La Paz",
    approximateLocation: {
      latitude: -16.51051,
      longitude: -68.124602,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    isVerified: true,
    sponsorPlacement: {
      kind: "Local Sponsor Placement",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      eligibleSurfaces: ["resources_directory"],
      safetyPolicy: {
        recoveryPriority: {
          label: "Recovery Priority",
          canAffect: false,
        },
        pushNotifications: {
          eligible: false,
        },
      },
    },
    emergencyAvailable: true,
    isOpenNow: true,
    contactOptions: [
      {
        kind: "phone",
        label: "Llamar",
        value: "+591 2 222 1111",
      },
    ],
    sponsorPlacements: [
      {
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        endsOn: "2026-07-31",
        isActive: true,
        label: "Patrocinado",
        placementId: "22222222-2222-4222-8222-222222222222",
        startsOn: "2026-07-01",
        surface: "resources_directory",
      },
    ],
    verificationNote: "Identidad revisada por Rastro.",
  };
}
