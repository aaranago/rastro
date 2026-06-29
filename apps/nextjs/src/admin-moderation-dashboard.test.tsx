import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AdminModerationDashboard,
  AdminModerationReviewDetail,
} from "./admin-moderation-dashboard";

const adminDashboardFlaggedItems = [
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
    reviewKind: "report",
    target: {
      falseReportState: "not_false",
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
    reviewKind: "report",
    target: {
      falseReportState: "not_false",
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
    reviewKind: "report",
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
    providerReviewStatus: "pending",
    reasonLabel: "Suplantacion de identidad",
    reportCount: 3,
    reporterLabel: "2 miembros",
    reviewKind: "resource_provider",
    target: {
      href: "/admin/recursos/vet-norte",
      id: "provider-vet-norte",
      locationLabel: "Achumani, La Paz",
      status: "visible",
      title: "Vet Norte 24 horas",
      type: "resource_provider_profile",
    },
  },
] as const;

const adminDashboardQueues = [
  {
    availableSorts: [
      {
        defaultDirection: "desc",
        label: "Actualizado",
        value: "updatedAt",
      },
      {
        defaultDirection: "asc",
        label: "Título",
        value: "title",
      },
    ],
    description: "Cola persistida de reportes.",
    emptyDescription: "Sin reportes.",
    filteredEmptyDescription: "Sin reportes filtrados.",
    id: "reports",
    items: adminDashboardFlaggedItems.slice(0, 3),
    page: 2,
    pageSize: 2,
    tableCaption: "Reportes moderados",
    title: "Reportes",
    total: 5,
  },
  {
    availableSorts: [
      {
        defaultDirection: "desc",
        label: "Último reporte",
        value: "lastReportedAt",
      },
    ],
    description: "Cola persistida de proveedores.",
    emptyDescription: "Sin proveedores.",
    filteredEmptyDescription: "Sin proveedores filtrados.",
    id: "resource-providers",
    items: [adminDashboardFlaggedItems[3]],
    page: 1,
    pageSize: 10,
    tableCaption: "Proveedores moderados",
    title: "Proveedores",
    total: 1,
  },
] as const;

const adminDashboardViewModel = {
  listHrefForPage: (
    queue: { id: string; pageSize: number },
    page: number,
  ) =>
    `/admin/moderacion?queue=${queue.id}&page=${page}&pageSize=${queue.pageSize}`,
  listHrefForSort: (
    queue: { id: string; pageSize: number },
    sort: { value: string },
    direction: "asc" | "desc",
  ) =>
    `/admin/moderacion?queue=${queue.id}&pageSize=${queue.pageSize}&sortBy=${sort.value}&sortDirection=${direction}`,
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
  queues: adminDashboardQueues,
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
  it("renders an admin moderation dashboard with server-backed queues, navigation, settings, and Bolivia metrics", () => {
    const html = renderToStaticMarkup(
      <AdminModerationDashboard {...adminDashboardViewModel} />,
    );

    expect(html).toContain("Moderación Rastro");
    expect(html).toContain("Contenido reportado");
    expect(html).toContain("Filtros de revisión");
    expect(html).toContain('name="targetType"');
    expect(html).toContain('name="risk"');
    expect(html).toContain("Reportes");
    expect(html).toContain("Proveedores");
    expect(html).toContain("3 de 5 revisiones");
    expect(html).toContain("1 de 1 revisiones");
    expect(html).toContain("Mostrando 3-4 de 5");
    expect(html).toContain("Página 2 de 3");
    expect(html).toContain(
      "/admin/moderacion?queue=reports&amp;page=1&amp;pageSize=2",
    );
    expect(html).toContain(
      "/admin/moderacion?queue=reports&amp;page=3&amp;pageSize=2",
    );
    expect(html).toContain(
      "/admin/moderacion?queue=reports&amp;pageSize=2&amp;sortBy=updatedAt&amp;sortDirection=desc",
    );
    expect(html).toContain("Reporte de mascota perdida");
    expect(html).toContain("Publicación de adopción");
    expect(html).toContain("Chat en Rastro");
    expect(html).toContain("Perfil de proveedor de recursos");
    expect(html).toContain("/admin/moderacion/review-lost-1");
    expect(html).toContain("Abrir revisión");
    expect(html).toContain("Gestionar miembro");
    expect(html).not.toContain("Marcar reporte falso");
    expect(html).not.toContain("Quitar marca falsa");
    expect(html).not.toContain("Descartar reporte falso");
    expect(html).not.toContain("Resolver con acción");
    expect(html).not.toContain("Resolver sin acción");
    expect(html).toContain("/admin/miembros?memberId=member-mateo");
    expect(html).toContain("Modo de revisión para adopciones");
    expect(html).toContain("Correo verificado requerido para publicar");
    expect(html).toContain("Métricas de abuso por ciudad");
    expect(html).toContain("La Paz");
    expect(html).toContain("Cochabamba");
    expect(html).not.toMatch(/marketplace|seller|comprar|vender/i);
  });

  it("renders active moderation filters without client-side filtering the server rows", () => {
    const html = renderToStaticMarkup(
      <AdminModerationDashboard
        {...adminDashboardViewModel}
        filters={{
          city: "Achumani, La Paz",
          department: "La Paz",
          reason: "Suplantacion de identidad",
          risk: "high",
          targetType: "resource_provider_profile",
        }}
      />,
    );

    expect(html).toContain("Tipo: Perfil de proveedor de recursos");
    expect(html).toContain("Riesgo: Alto riesgo");
    expect(html).toContain("3 de 5 revisiones");
    expect(html).toContain("1 de 1 revisiones");
    expect(html).toContain("Vet Norte 24 horas");
    expect(html).toContain("Luna perdida cerca de la plaza");
    expect(html).toContain("Michi busca nuevo hogar");
  });

  it("renders a focused moderation review detail with evidence, history, and confirmation", () => {
    const detailHtml = renderToStaticMarkup(
      <AdminModerationReviewDetail
        formAction={undefined}
        item={adminDashboardFlaggedItems[0]}
        returnTo="/admin/moderacion/review-lost-1"
        settings={adminDashboardViewModel.settings}
        viewer={adminDashboardViewModel.viewer}
      />,
    );

    expect(detailHtml).toContain("Revisión de moderación");
    expect(detailHtml).toContain("Evidencia");
    expect(detailHtml).toContain("Historial");
    expect(detailHtml).toContain("Luna perdida cerca de la plaza");
    expect(detailHtml).toContain("Alto riesgo");
    expect(detailHtml).toContain("Confirmo ocultar reporte");
    expect(detailHtml).toContain("Marcar reporte falso");
    expect(detailHtml).toContain("Confirmo marcar este reporte como falso");
    expect(detailHtml).toContain('value="/admin/moderacion/review-lost-1"');
    expect(detailHtml).not.toContain('disabled=""');
  });

  it("renders enabled provider resolution forms in the detail surface", () => {
    const detailHtml = renderToStaticMarkup(
      <AdminModerationReviewDetail
        formAction={undefined}
        item={adminDashboardFlaggedItems[3]}
        returnTo="/admin/moderacion/review-provider-1"
        settings={adminDashboardViewModel.settings}
        viewer={adminDashboardViewModel.viewer}
      />,
    );

    expect(detailHtml).toContain("Resolver reporte de proveedor");
    expect(detailHtml).toContain("Descartar reporte falso");
    expect(detailHtml).toContain("Resolver con acción");
    expect(detailHtml).toContain("Resolver sin acción");
    expect(detailHtml).toContain('name="providerResolutionStatus"');
    expect(detailHtml).not.toContain('disabled=""');
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
