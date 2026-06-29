export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function getSingleSearchParam(
  searchParams: SearchParamsRecord,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value;
}

export function getSearchParamValues(
  searchParams: SearchParamsRecord,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

export function getTrimmedSearchParam(
  searchParams: SearchParamsRecord,
  key: string,
) {
  const value = getSingleSearchParam(searchParams, key)?.trim();

  return value && value.length > 0 ? value : undefined;
}

export function getPositiveIntegerSearchParam(
  searchParams: SearchParamsRecord,
  key: string,
  fallback: number,
) {
  const value = Number(getSingleSearchParam(searchParams, key) ?? fallback);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(Math.trunc(value), 1);
}

export function getSortDirectionSearchParam(searchParams: SearchParamsRecord) {
  const value = getSingleSearchParam(searchParams, "sortDirection");

  return value === "asc" || value === "desc" ? value : undefined;
}

export function buildAdminQueryHref(input: {
  basePath: string;
  page: number;
  pageSize: number;
  searchParam?: {
    key: string;
    value: string | undefined;
  };
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  writeFilters?: (params: URLSearchParams) => void;
}) {
  const params = new URLSearchParams();

  if (input.searchParam?.value) {
    params.set(input.searchParam.key, input.searchParam.value);
  }

  input.writeFilters?.(params);

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  params.set("pageSize", String(input.pageSize));

  if (input.sortBy) {
    params.set("sortBy", input.sortBy);
  }

  if (input.sortDirection) {
    params.set("sortDirection", input.sortDirection);
  }

  const query = params.toString();

  return query ? `${input.basePath}?${query}` : input.basePath;
}
