import { z } from "zod/v4";

export const adminListMaxPageSize = 100;
export const adminListDefaultPage = 1;
export const adminListDefaultPageSize = 10;

export const adminListSortDirectionSchema = z.enum(["asc", "desc"]);

export type AdminListSortDirection = z.infer<
  typeof adminListSortDirectionSchema
>;

export const adminListBaseInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).optional(),
  search: z.string().trim().max(160).optional(),
  sortBy: z.string().trim().min(1).max(80).optional(),
  sortDirection: adminListSortDirectionSchema.optional(),
});

export interface AdminListInput<
  TFilters extends object = Record<string, never>,
  TSortBy extends string = string,
> {
  filters?: TFilters;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: TSortBy;
  sortDirection?: AdminListSortDirection;
}

export interface NormalizedAdminListInput<
  TFilters extends object = Record<string, never>,
  TSortBy extends string = string,
> {
  filters: TFilters;
  offset: number;
  page: number;
  pageSize: number;
  search: string | null;
  sortBy: TSortBy;
  sortDirection: AdminListSortDirection;
}

export interface AdminListSortOption<TSortBy extends string = string> {
  defaultDirection: AdminListSortDirection;
  label: string;
  value: TSortBy;
}

export interface AdminListFilterOption<TFilterKey extends string = string> {
  key: TFilterKey;
  label: string;
  options?: readonly {
    count?: number;
    label: string;
    value: string;
  }[];
  type: "boolean" | "date" | "enum" | "text";
}

export interface AdminListResult<
  TItem,
  TAvailableFilters = readonly AdminListFilterOption[],
  TSortBy extends string = string,
> {
  availableFilters: TAvailableFilters;
  availableSorts: readonly AdminListSortOption<TSortBy>[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: TItem[];
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

export function normalizeAdminListInput<
  TFilters extends object,
  TSortBy extends string,
>(
  input: AdminListInput<TFilters, TSortBy> | undefined,
  options: {
    defaultFilters: TFilters;
    defaultSortBy: TSortBy;
    defaultSortDirection?: AdminListSortDirection;
  },
): NormalizedAdminListInput<TFilters, TSortBy> {
  const page = Math.max(input?.page ?? adminListDefaultPage, 1);
  const pageSize = clampAdminListPageSize(input?.pageSize);
  const search = input?.search?.trim();

  return {
    filters: {
      ...options.defaultFilters,
      ...(input?.filters ?? {}),
    },
    offset: (page - 1) * pageSize,
    page,
    pageSize,
    search: search && search.length > 0 ? search : null,
    sortBy: input?.sortBy ?? options.defaultSortBy,
    sortDirection:
      input?.sortDirection ?? options.defaultSortDirection ?? "desc",
  };
}

export function clampAdminListPageSize(pageSize: number | undefined) {
  return Math.min(
    Math.max(pageSize ?? adminListDefaultPageSize, 1),
    adminListMaxPageSize,
  );
}

export function buildAdminListResult<
  TItem,
  TAvailableFilters,
  TSortBy extends string,
>({
  availableFilters,
  availableSorts,
  items,
  page,
  pageSize,
  total,
}: {
  availableFilters: TAvailableFilters;
  availableSorts: readonly AdminListSortOption<TSortBy>[];
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
}): AdminListResult<TItem, TAvailableFilters, TSortBy> {
  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    availableFilters,
    availableSorts,
    hasNextPage: page < pageCount,
    hasPreviousPage: page > 1,
    items,
    page,
    pageCount,
    pageSize,
    total,
  };
}

export type AdminListComparable =
  | boolean
  | Date
  | number
  | string
  | null
  | undefined;

export interface AdminListSortSpec<TItem> {
  direction?: AdminListSortDirection;
  getValue: (item: TItem) => AdminListComparable;
}

export function compareAdminListItems<TItem>(
  left: TItem,
  right: TItem,
  specs: readonly AdminListSortSpec<TItem>[],
) {
  for (const spec of specs) {
    const comparison = compareComparableValues(
      spec.getValue(left),
      spec.getValue(right),
    );

    if (comparison !== 0) {
      return spec.direction === "desc" ? -comparison : comparison;
    }
  }

  return 0;
}

function compareComparableValues(
  left: AdminListComparable,
  right: AdminListComparable,
) {
  const normalizedLeft = normalizeComparableValue(left);
  const normalizedRight = normalizeComparableValue(right);

  if (normalizedLeft.rank !== normalizedRight.rank) {
    return normalizedLeft.rank - normalizedRight.rank;
  }

  return compareNormalizedComparableValues(
    normalizedLeft.value,
    normalizedRight.value,
  );
}

function normalizeComparableValue(value: AdminListComparable) {
  if (value === null || value === undefined) {
    return {
      rank: 4,
      value: 0,
    };
  }

  if (value instanceof Date) {
    return {
      rank: 0,
      value: value.getTime(),
    };
  }

  return normalizePrimitiveComparableValue(value);
}

function normalizePrimitiveComparableValue(value: boolean | number | string) {
  if (typeof value === "boolean") {
    return {
      rank: 1,
      value: Number(value),
    };
  }

  if (typeof value === "number") {
    return {
      rank: 2,
      value,
    };
  }

  return {
    rank: 3,
    value,
  };
}

function compareNormalizedComparableValues(
  left: number | string,
  right: number | string,
) {
  if (left === right) {
    return 0;
  }

  if (typeof left === "number" && typeof right === "number") {
    return Math.sign(left - right);
  }

  return String(left).localeCompare(String(right));
}
