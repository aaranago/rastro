import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminModerationDashboard } from "./admin-moderation-dashboard";

const adminDashboardViewModel = {
  flaggedItems: [
    {
      accusedMember: {
        displayName: "Mateo R.",
        id: "member-mateo",
        status: "active",
      },
      department: "La Paz",
      detail: "La zona no coincide con el reporte y hay mensajes repetidos.",
      id: "review-lost-1",
      newestReportLabel: "Hace 18 min",
      reasonLabel: "Ubicacion incorrecta",
      reportCount: 4,
      reporterLabel: "3 miembros",
      target: {
        href: "/admin/reportes/perdidos/luna-centro",
        id: "lost-luna-centro",
        locationLabel: "Centro, La Paz",
        status: "visible",
        title: "Luna perdida cerca de la plaza",
        type: "lost_pet_report",
      },
    },
    {
      accusedMember: {
        displayName: "Carla P.",
        id: "member-carla",
        status: "banned",
      },
      department: "Cochabamba",
      detail: "Publicacion duplicada con datos de contacto inseguros.",
      id: "review-adoption-1",
      newestReportLabel: "Hace 1 h",
      reasonLabel: "Spam",
      reportCount: 2,
      reporterLabel: "Ana S.",
      target: {
        href: "/admin/adopciones/michi-norte",
        id: "adoption-michi-norte",
        locationLabel: "Queru Queru, Cochabamba",
        status: "hidden",
        title: "Michi busca nuevo hogar",
        type: "adoption_listing",
      },
    },
    {
      accusedMember: {
        displayName: "Luis V.",
        id: "member-luis",
        status: "active",
      },
      department: "Santa Cruz",
      detail: "El chat insiste en pagos fuera de Rastro.",
      id: "review-chat-1",
      newestReportLabel: "Hace 2 h",
      reasonLabel: "Estafa",
      reportCount: 1,
      reporterLabel: "Marta G.",
      target: {
        href: "/admin/chats/chat-42",
        id: "chat-42",
        locationLabel: "Equipetrol, Santa Cruz",
        status: "visible",
        title: "Chat sobre Toby",
        type: "in_app_chat",
      },
    },
    {
      accusedMember: {
        displayName: "Vet Norte",
        id: "provider-vet-norte",
        status: "active",
      },
      department: "La Paz",
      detail: "Perfil reportado por posible suplantacion.",
      id: "review-provider-1",
      newestReportLabel: "Ayer",
      reasonLabel: "Suplantacion de identidad",
      reportCount: 3,
      reporterLabel: "2 miembros",
      target: {
        href: "/admin/recursos/vet-norte",
        id: "provider-vet-norte",
        locationLabel: "Achumani, La Paz",
        status: "visible",
        title: "Vet Norte 24 horas",
        type: "resource_provider_profile",
      },
    },
  ],
  metrics: [
    {
      city: "La Paz",
      department: "La Paz",
      hiddenCount: 3,
      pendingCount: 7,
      reportCount: 18,
    },
    {
      city: "Cochabamba",
      department: "Cochabamba",
      hiddenCount: 1,
      pendingCount: 4,
      reportCount: 9,
    },
  ],
  settings: {
    reviewModeEnabled: true,
    verifiedEmailRequiredToPublish: false,
  },
  viewer: {
    displayName: "Admin Rastro",
    role: "admin",
  },
} as const;

describe("AdminModerationDashboard", () => {
  it("renders an admin moderation dashboard with queues, controls, settings, and Bolivia metrics", () => {
    const html = renderToStaticMarkup(
      <AdminModerationDashboard {...adminDashboardViewModel} />,
    );

    expect(html).toContain("Moderación Rastro");
    expect(html).toContain("Contenido reportado");
    expect(html).toContain("Reporte de mascota perdida");
    expect(html).toContain("Publicación de adopción");
    expect(html).toContain("Chat en Rastro");
    expect(html).toContain("Perfil de proveedor de recursos");
    expect(html).toContain("Ocultar reporte");
    expect(html).toContain("Restaurar publicación");
    expect(html).toContain("moderationReason");
    expect(html).toContain("moderationNote");
    expect(html).toContain("Gestionar miembro");
    expect(html).toContain("/admin/miembros?memberId=member-mateo");
    expect(html).toContain("Review Mode para adopciones");
    expect(html).toContain("Correo verificado requerido para publicar");
    expect(html).toContain("Métricas de abuso por ciudad");
    expect(html).toContain("La Paz");
    expect(html).toContain("Cochabamba");
    expect(html).not.toMatch(/marketplace|seller|comprar|vender/i);
  });

  it("renders an access-denied surface without admin queues for non-admin members", () => {
    const html = renderToStaticMarkup(
      <AdminModerationDashboard
        {...adminDashboardViewModel}
        viewer={{
          displayName: "Ana miembro",
          role: "member",
        }}
      />,
    );

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Solo administradores de Rastro");
    expect(html).not.toContain("Cola de revisión");
    expect(html).not.toContain("Suspender miembro");
    expect(html).not.toContain("Métricas de abuso por ciudad");
  });
});
