import type * as React from "react";
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
  it("renders an empty provider queue with the create workflow closed", () => {
    const html = renderDashboard([]);

    expect(html).toContain("Cola de proveedores");
    expect(html).toContain("0 proveedores en cola");
    expect(html).toContain("Todavía no hay proveedores registrados.");
    expect(html).toContain("Cola vacía");
    expect(html).toContain("Registrar proveedor");
    expect(html).toContain(
      "Sin métricas disponibles hasta registrar proveedores.",
    );
    expect(getProviderQueueItemCount(html)).toBe(0);
    expect(html).not.toMatch(createWorkflowOpenPattern);
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("renders a read-first one-provider queue with closed admin workflows", () => {
    const html = renderDashboard([providerProfile()]);

    expect(html).toContain("Gestión de proveedores de recursos");
    expect(html).toContain("Administración de recursos");
    expect(html).toContain("Cola de proveedores");
    expect(html).toContain("1 proveedor en cola");
    expect(html).not.toContain("modelo administrativo temporal");
    expect(html).not.toContain("no confirma publicacion");
    expect(html).toContain("Clinica Veterinaria San Roque");
    expect(html).toContain("Clinica veterinaria");
    expect(html).toContain("Sopocachi");
    expect(html).toContain("La Paz");
    expect(html).toContain("1 patrocinio activo");
    expect(html).toContain("Abierto");
    expect(html).toContain("Urgencias");
    expect(html).toContain("Actualizado");
    expect(html).toContain("Registrar proveedor");
    expect(html).toContain("Editar detalles");
    expect(html).toContain("Verificación");
    expect(html).toContain("Patrocinio");
    expect(html).toContain("Archivar");
    expect(html).not.toContain("Latitud exacta");
    expect(html).not.toContain("Ubicación y privacidad");
    expect(html).not.toContain("Opciones de contacto");
    expect(html).not.toContain("Logo URL");
    expect(html).not.toContain("Redes sociales");
    expect(html).not.toContain("Enlaces externos");
    expect(html).not.toContain("Plaza Abaroa, La Paz");
    expect(html).not.toContain("Guardar detalles");
    expect(html).not.toContain("Falta contrato API para actualizar detalles");
    expect(html).not.toContain("Guardar verificación");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toContain("Retirar por ID");
    expect(html).not.toContain("22222222-2222-4222-8222-222222222222");
    expect(html).toContain("Identidad revisada por Rastro.");
    expect(html).not.toContain("Archivar proveedor");
    expect(html).not.toContain("Falta contrato API para archivar o eliminar");
    expect(html).toContain("Métricas por departamento");
    expect(html).toContain("Métricas por ciudad");
    expect(html).not.toContain("No cambia la prioridad de recuperación");
    expect(html).not.toContain("No activa notificaciones push");
    expect(getProviderQueueItemCount(html)).toBe(1);
    expect(html).not.toMatch(createWorkflowOpenPattern);
    expect(html).not.toMatch(providerWorkflowOpenPattern);
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("reopens the sponsor workflow with field-level date errors", () => {
    const html = renderDashboard([providerProfile()], {
      action: "attach_sponsor",
      fieldErrors: [
        {
          field: "endsOn",
          message:
            "La fecha final debe ser posterior o igual a la fecha inicial.",
        },
      ],
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clinica Veterinaria San Roque",
      workflow: "sponsor",
    });

    expect(html).toMatch(
      /data-workflow-trigger="sponsor"[^>]+aria-expanded="true"/,
    );
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toContain(
      "La fecha final debe ser posterior o igual a la fecha inicial.",
    );
    expect(html).not.toContain("Retirar por ID");
  });

  it("reopens archive confirmation with destructive confirmation error", () => {
    const html = renderDashboard([providerProfile()], {
      action: "archive_provider",
      fieldErrors: [
        {
          field: "archiveConfirmation",
          message: "Confirma que quieres archivar este proveedor.",
        },
      ],
      ok: false,
      providerId: "11111111-1111-4111-8111-111111111111",
      providerName: "Clinica Veterinaria San Roque",
      workflow: "archive",
    });

    expect(html).toMatch(
      /data-workflow-trigger="archive"[^>]+aria-expanded="true"/,
    );
    expect(html).not.toContain("Confirmo que quiero archivar este proveedor.");
    expect(html).not.toContain("Confirma que quieres archivar este proveedor.");
  });

  it("renders many providers as separate read-first queue items", () => {
    const html = renderDashboard([
      providerProfile(),
      providerProfile({
        id: "22222222-2222-4222-8222-222222222222",
        city: "Cochabamba",
        department: "Cochabamba",
        name: "Patitas Cochabamba",
        sponsorPlacement: undefined,
        sponsorPlacements: [],
        updatedAt: new Date("2026-07-02T12:00:00.000Z"),
      }),
      providerProfile({
        id: "33333333-3333-4333-8333-333333333333",
        city: "Santa Cruz de la Sierra",
        department: "Santa Cruz",
        isOpenNow: false,
        isVerified: false,
        name: "Apoyo Animal Santa Cruz",
        sponsorPlacement: undefined,
        sponsorPlacements: [],
        updatedAt: new Date("2026-07-03T12:00:00.000Z"),
      }),
    ]);

    expect(html).toContain("3 proveedores en cola");
    expect(html).toContain("Clinica Veterinaria San Roque");
    expect(html).toContain("Patitas Cochabamba");
    expect(html).toContain("Apoyo Animal Santa Cruz");
    expect(html).toContain("Santa Cruz de la Sierra");
    expect(html).toContain("Sin insignia");
    expect(html).toContain("0 patrocinios activos");
    expect(html).toContain("Horario no confirmado");
    expect(getProviderQueueItemCount(html)).toBe(3);
    expect(html).not.toMatch(providerWorkflowOpenPattern);
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
});

const createWorkflowOpenPattern =
  /data-workflow-trigger="create"[^>]+aria-expanded="true"/;
const providerWorkflowOpenPattern = /aria-expanded="true"/;

function renderDashboard(
  profiles: readonly AdminResourceProviderProfile[],
  workflowFeedback?: React.ComponentProps<
    typeof AdminResourcesDashboard
  >["workflowFeedback"],
) {
  const viewModel = buildAdminResourceProviderListViewModel(profiles);

  return renderToStaticMarkup(
    <AdminResourcesDashboard
      workflowFeedback={workflowFeedback}
      {...toAdminResourcesDashboardProps(viewModel, viewModel.metrics, {
        displayName: "Admin Rastro",
        role: "admin",
      })}
    />,
  );
}

function getProviderQueueItemCount(html: string) {
  return html.match(/data-provider-queue-item=/g)?.length ?? 0;
}

function providerProfile(
  overrides: Partial<AdminResourceProviderProfile> = {},
): AdminResourceProviderProfile {
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
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
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
    ...overrides,
  };
}
