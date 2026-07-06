import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdminDataListColumn } from "./admin-data-list";
import { AdminDataList } from "./admin-data-list";

interface TestRow {
  email: string;
  id: string;
  name: string;
}

const columns = [
  {
    cell: (row: TestRow) => row.name,
    header: "Nombre",
    id: "name",
    rowHeader: true,
  },
  {
    cell: (row: TestRow) => row.email,
    header: "Correo",
    id: "email",
  },
] as const;

describe("AdminDataList", () => {
  it("renders an empty state", () => {
    const html = renderToStaticMarkup(
      <AdminDataList
        columns={columns}
        emptyState={{
          description: "La lista se llenará cuando existan registros.",
          title: "Sin registros",
        }}
        getRowKey={(row) => row.id}
        id="test-empty"
        rows={[]}
        tableCaption="Registros de prueba"
        title="Registros"
      />,
    );

    expect(html).toContain('data-admin-data-list-state="ready"');
    expect(html).toContain("Sin registros");
    expect(html).toContain("La lista se llenará");
  });

  it("renders a filtered empty state with active filter badges", () => {
    const html = renderToStaticMarkup(
      <AdminDataList
        activeFilters={[{ label: "Correo", value: "camila@example.com" }]}
        columns={columns}
        emptyState={{
          title: "Sin registros",
        }}
        filteredEmptyState={{
          description: "Ajusta los filtros activos.",
          title: "Sin resultados",
        }}
        getRowKey={(row) => row.id}
        id="test-filtered-empty"
        rows={[]}
        tableCaption="Registros de prueba"
        title="Registros"
      />,
    );

    expect(html).toContain('aria-label="Filtros activos"');
    expect(html).toContain("Correo: camila@example.com");
    expect(html).toContain("Sin resultados");
    expect(html).toContain("Ajusta los filtros activos.");
  });

  it("renders loading rows", () => {
    const html = renderToStaticMarkup(
      <AdminDataList
        columns={columns}
        emptyState={{ title: "Sin registros" }}
        getRowKey={(row) => row.id}
        id="test-loading"
        loadingRowCount={3}
        rows={[]}
        state="loading"
        tableCaption="Registros de prueba"
        title="Registros"
      />,
    );

    expect(html).toContain('data-admin-data-list-state="loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
  });

  it("renders table, mobile cards, and pagination controls", () => {
    const html = renderToStaticMarkup(
      <AdminDataList
        activeFilters={[{ label: "Estado", value: "Activo" }]}
        columns={columns}
        emptyState={{ title: "Sin registros" }}
        getRowKey={(row) => row.id}
        id="test-pagination"
        pagination={{
          hrefForPage: (page) => `/admin/prueba?page=${page}`,
          page: 2,
          pageSize: 10,
          totalItems: 23,
        }}
        renderMobileCard={(row) => (
          <article>
            {row.name} - {row.email}
          </article>
        )}
        rows={[
          {
            email: "camila@example.com",
            id: "member-camila",
            name: "Camila R.",
          },
        ]}
        tableCaption="Registros de prueba"
        title="Registros"
        totalLabel="23 total"
      />,
    );

    expect(html).toContain("Registros de prueba");
    expect(html).toContain("Camila R.");
    expect(html).toContain("23 total");
    expect(html).toContain("Mostrando 11-20 de 23");
    expect(html).toContain("/admin/prueba?page=1");
    expect(html).toContain("/admin/prueba?page=3");
  });

  it("renders sortable column headers with hrefs, stable labels, and aria-sort", () => {
    const sortableColumns: readonly AdminDataListColumn<TestRow>[] = [
      {
        cell: (row) => row.name,
        header: "Nombre",
        id: "name",
        rowHeader: true,
        sort: {
          href: "/admin/prueba?sort=name&direction=asc",
          label: "Nombre",
        },
      },
      {
        cell: (row) => row.email,
        header: "Correo",
        id: "email",
        sort: {
          current: "descending",
          href: "/admin/prueba?sort=email&direction=asc",
          label: "Correo",
        },
      },
    ];

    const html = renderToStaticMarkup(
      <AdminDataList
        columns={sortableColumns}
        emptyState={{ title: "Sin registros" }}
        getRowKey={(row) => row.id}
        id="test-sort"
        rows={[
          {
            email: "camila@example.com",
            id: "member-camila",
            name: "Camila R.",
          },
        ]}
        tableCaption="Registros de prueba"
        title="Registros"
      />,
    );

    expect(html).toContain('aria-sort="none"');
    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain('href="/admin/prueba?sort=name&amp;direction=asc"');
    expect(html).toContain('href="/admin/prueba?sort=email&amp;direction=asc"');
    expect(html).toContain('aria-label="Ordenar por Nombre"');
    expect(html).toContain(
      'aria-label="Correo, ordenado descendente. Cambiar orden"',
    );
  });

  it("keeps pagination hrefs stable when page links are available", () => {
    const html = renderToStaticMarkup(
      <AdminDataList
        columns={columns}
        emptyState={{ title: "Sin registros" }}
        getRowKey={(row) => row.id}
        id="test-pagination-hrefs"
        pagination={{
          hrefForPage: (page) => `/admin/prueba?page=${page}&status=active`,
          page: 2,
          pageSize: 5,
          totalItems: 11,
        }}
        rows={[
          {
            email: "camila@example.com",
            id: "member-camila",
            name: "Camila R.",
          },
        ]}
        tableCaption="Registros de prueba"
        title="Registros"
      />,
    );

    expect(html).toContain("Mostrando 6-10 de 11");
    expect(html).toContain('href="/admin/prueba?page=1&amp;status=active"');
    expect(html).toContain('href="/admin/prueba?page=3&amp;status=active"');
  });

  it("keeps long table and mobile text breakable", () => {
    const longValue = "rastro-admin-dashboard-long-unbroken-text-value-".repeat(
      8,
    );

    const html = renderToStaticMarkup(
      <AdminDataList
        columns={[
          {
            cell: () => longValue,
            header: "Identificador largo",
            id: "long-id",
            rowHeader: true,
          },
          {
            cell: () => `${longValue}@example.test`,
            header: "Correo largo",
            id: "long-email",
          },
        ]}
        emptyState={{ title: "Sin registros" }}
        getRowKey={(row) => row.id}
        id="test-long-text"
        rows={[
          {
            email: `${longValue}@example.test`,
            id: "member-long",
            name: longValue,
          },
        ]}
        tableCaption="Registros de prueba"
        title="Registros"
      />,
    );

    expect(html).toContain(longValue);
    expect(html).toContain("table-fixed");
    expect(html).toContain("data-admin-data-list-table-scroll");
    expect(html).toMatch(/data-slot="table-cell"[^>]*break-words/);
    expect(html).toContain('class="mt-1 min-w-0 break-words"');
  });

  it("renders compact row actions without requiring mutation forms in desktop cells", () => {
    const html = renderToStaticMarkup(
      <AdminDataList
        columns={columns}
        emptyState={{ title: "Sin registros" }}
        getRowKey={(row) => row.id}
        id="test-row-actions"
        rowActions={{
          header: "Acciones",
          render: (row) => (
            <>
              <a href={`/admin/prueba/${row.id}`}>Abrir</a>
              <button type="button">Marcar</button>
            </>
          ),
        }}
        rows={[
          {
            email: "camila@example.com",
            id: "member-camila",
            name: "Camila R.",
          },
        ]}
        tableCaption="Registros de prueba"
        title="Registros"
      />,
    );

    expect(html).toContain('data-admin-data-list-cell="actions"');
    expect(html).toContain('href="/admin/prueba/member-camila"');
    expect(html).toContain('<button type="button">Marcar</button>');
    expect(html).not.toContain("<form");
  });
});
