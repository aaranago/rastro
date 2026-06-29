import { describe, expect, it } from "vitest";

import {
  adminListDefaultPageSize,
  buildAdminListResult,
  normalizeAdminListInput,
} from "./admin-list-contract";

describe("admin list contract", () => {
  it("defaults shared admin lists to page size 10", () => {
    const normalized = normalizeAdminListInput(undefined, {
      defaultFilters: {},
      defaultSortBy: "createdAt",
    });

    expect(adminListDefaultPageSize).toBe(10);
    expect(normalized).toMatchObject({
      offset: 0,
      page: 1,
      pageSize: 10,
      search: null,
      sortBy: "createdAt",
      sortDirection: "desc",
    });
  });

  it("uses the normalized default page size when building pagination metadata", () => {
    const normalized = normalizeAdminListInput(undefined, {
      defaultFilters: {},
      defaultSortBy: "createdAt",
    });

    expect(
      buildAdminListResult({
        availableFilters: [],
        availableSorts: [],
        items: Array.from({ length: normalized.pageSize }, (_, index) => ({
          id: index,
        })),
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: 11,
      }),
    ).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      page: 1,
      pageCount: 2,
      pageSize: 10,
      total: 11,
    });
  });
});
