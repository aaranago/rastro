import type {
  AdminResourceProviderListInput,
  AdminSponsorPlacementListInput,
} from "@acme/validators";

import type { SearchParamsRecord } from "./admin-search-params";
import {
  getPositiveIntegerSearchParam as getPositiveIntegerSearchParamBase,
  getSearchParamValues,
  getSortDirectionSearchParam,
  getTrimmedSearchParam,
} from "./admin-search-params";

export interface AdminUrlActiveFilter {
  href: string;
  label: string;
  value: string;
}

export interface AdminUrlFilterOption {
  label: string;
  value: string;
}

export interface AdminUrlAvailableFilter {
  key: string;
  label: string;
  options?: readonly AdminUrlFilterOption[];
  type: "boolean" | "date" | "enum" | "text";
}

const defaultAdminListPage = 1;
const defaultAdminListPageSize = 10;

const providerSortByValues = [
  "category",
  "city",
  "department",
  "mediaState",
  "name",
  "sponsorState",
  "updatedAt",
  "verification",
] as const;

const sponsorSortByValues = [
  "city",
  "department",
  "endsOn",
  "mediaState",
  "providerName",
  "startsOn",
  "state",
  "surface",
] as const;

const resourceProviderCategoryValues = [
  "veterinary",
  "shelter",
  "groomer",
  "pet_food",
  "trainer",
  "pet_store",
  "transport",
  "other",
] as const;

const resourceProviderVerificationValues = ["verified", "unverified"] as const;
const providerSponsorStateValues = [
  "any",
  "active",
  "inactive",
  "none",
] as const;
const sponsorPlacementStateValues = [
  "any",
  "active",
  "expired",
  "scheduled",
] as const;
const sponsorSurfaceValues = [
  "resources_directory",
  "provider_details",
  "launch_home_banner",
  "report_success",
  "contextual_care_resources",
] as const;
const mediaStateValues = ["any", "has_media", "missing_media"] as const;

export function parseAdminResourceProviderListSearchParams(
  searchParams: SearchParamsRecord,
): AdminResourceProviderListInput {
  const input: AdminResourceProviderListInput = {
    page: getPositiveIntegerSearchParam(searchParams, "page"),
    pageSize: getPositiveIntegerSearchParam(searchParams, "pageSize"),
  };
  const search = getSearchParam(searchParams);
  const sortBy = getEnumSearchParam(
    searchParams,
    "sortBy",
    providerSortByValues,
  );
  const sortDirection = getSortDirectionSearchParam(searchParams);
  const filters: NonNullable<AdminResourceProviderListInput["filters"]> = {};

  setResourceProviderSharedFilters(filters, searchParams);
  setStringFilter(
    filters,
    "sponsorState",
    getEnumSearchParam(
      searchParams,
      "sponsorState",
      providerSponsorStateValues,
    ),
  );
  setArrayFilter(
    filters,
    "sponsorSurface",
    getArraySearchParam(searchParams, "sponsorSurface", sponsorSurfaceValues),
  );
  setStringFilter(
    filters,
    "activeOn",
    getDateSearchParam(searchParams, "activeOn"),
  );
  setStringFilter(
    filters,
    "mediaState",
    getEnumSearchParam(searchParams, "mediaState", mediaStateValues),
  );

  if (search) {
    input.search = search;
  }

  if (sortBy) {
    input.sortBy = sortBy;
  }

  if (sortDirection) {
    input.sortDirection = sortDirection;
  }

  if (Object.keys(filters).length > 0) {
    input.filters = filters;
  }

  return input;
}

export function parseAdminSponsorPlacementListSearchParams(
  searchParams: SearchParamsRecord,
): AdminSponsorPlacementListInput {
  const input: AdminSponsorPlacementListInput = {
    page: getPositiveIntegerSearchParam(searchParams, "page"),
    pageSize: getPositiveIntegerSearchParam(searchParams, "pageSize"),
  };
  const search = getSearchParam(searchParams);
  const sortBy = getEnumSearchParam(
    searchParams,
    "sortBy",
    sponsorSortByValues,
  );
  const sortDirection = getSortDirectionSearchParam(searchParams);
  const filters: NonNullable<AdminSponsorPlacementListInput["filters"]> = {};

  setResourceProviderSharedFilters(filters, searchParams);
  setStringFilter(
    filters,
    "state",
    getEnumSearchParam(searchParams, "state", sponsorPlacementStateValues),
  );
  setArrayFilter(
    filters,
    "surface",
    getArraySearchParam(searchParams, "surface", sponsorSurfaceValues),
  );
  setStringFilter(
    filters,
    "activeOn",
    getDateSearchParam(searchParams, "activeOn"),
  );
  setStringFilter(
    filters,
    "startsFrom",
    getDateSearchParam(searchParams, "startsFrom"),
  );
  setStringFilter(
    filters,
    "startsTo",
    getDateSearchParam(searchParams, "startsTo"),
  );
  setStringFilter(
    filters,
    "endsFrom",
    getDateSearchParam(searchParams, "endsFrom"),
  );
  setStringFilter(
    filters,
    "endsTo",
    getDateSearchParam(searchParams, "endsTo"),
  );
  setStringFilter(
    filters,
    "mediaState",
    getEnumSearchParam(searchParams, "mediaState", mediaStateValues),
  );

  if (search) {
    input.search = search;
  }

  if (sortBy) {
    input.sortBy = sortBy;
  }

  if (sortDirection) {
    input.sortDirection = sortDirection;
  }

  if (Object.keys(filters).length > 0) {
    input.filters = filters;
  }

  return input;
}

function buildAdminListHref(input: {
  basePath: string;
  listInput: AdminResourceProviderListInput | AdminSponsorPlacementListInput;
  overrides?: AdminListHrefOverrides;
}) {
  const params = new URLSearchParams();
  const listInput = {
    ...input.listInput,
    ...(input.overrides ?? {}),
    filters: input.overrides?.filters ?? input.listInput.filters,
  };

  if ((listInput.page ?? defaultAdminListPage) > defaultAdminListPage) {
    params.set("page", String(listInput.page));
  }

  params.set(
    "pageSize",
    String(listInput.pageSize ?? defaultAdminListPageSize),
  );

  if (listInput.search) {
    params.set("search", listInput.search);
  }

  if (listInput.sortBy) {
    params.set("sortBy", listInput.sortBy);
  }

  if (listInput.sortDirection) {
    params.set("sortDirection", listInput.sortDirection);
  }

  appendFilterParams(params, listInput.filters);

  const query = params.toString();

  return query ? `${input.basePath}?${query}` : input.basePath;
}

interface AdminListHrefOverrides {
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  search?: string | undefined;
  sortBy?: string | undefined;
  sortDirection?: "asc" | "desc" | undefined;
}

export function buildAdminListSortHref(input: {
  basePath: string;
  defaultDirection: "asc" | "desc";
  listInput: AdminResourceProviderListInput | AdminSponsorPlacementListInput;
  sortBy: string;
}) {
  const currentDirection =
    input.listInput.sortBy === input.sortBy
      ? input.listInput.sortDirection
      : undefined;
  const nextDirection =
    currentDirection === "asc"
      ? "desc"
      : currentDirection === "desc"
        ? "asc"
        : input.defaultDirection;

  return buildAdminListHref({
    basePath: input.basePath,
    listInput: input.listInput,
    overrides: {
      page: 1,
      sortBy: input.sortBy,
      sortDirection: nextDirection,
    },
  });
}

export function buildAdminListPageHref(input: {
  basePath: string;
  listInput: AdminResourceProviderListInput | AdminSponsorPlacementListInput;
  page: number;
}) {
  return buildAdminListHref({
    basePath: input.basePath,
    listInput: input.listInput,
    overrides: {
      page: input.page,
    },
  });
}

export function buildAdminListActiveFilters(input: {
  availableFilters: readonly AdminUrlAvailableFilter[];
  basePath: string;
  listInput: AdminResourceProviderListInput | AdminSponsorPlacementListInput;
}): AdminUrlActiveFilter[] {
  const filters = input.listInput.filters ?? {};
  const activeFilters: AdminUrlActiveFilter[] = [];

  if (input.listInput.search) {
    activeFilters.push({
      href: buildAdminListHref({
        basePath: input.basePath,
        listInput: input.listInput,
        overrides: {
          page: 1,
          search: undefined,
        },
      }),
      label: "Búsqueda",
      value: input.listInput.search,
    });
  }

  for (const filter of input.availableFilters) {
    const value = filters[filter.key as keyof typeof filters];

    if (Array.isArray(value)) {
      for (const item of value) {
        activeFilters.push({
          href: buildAdminListHref({
            basePath: input.basePath,
            listInput: input.listInput,
            overrides: {
              filters: removeArrayFilterValue(filters, filter.key, item),
              page: 1,
            },
          }),
          label: filter.label,
          value: getFilterOptionLabel(filter, item),
        });
      }
      continue;
    }

    if (typeof value === "string" && value.length > 0 && value !== "any") {
      activeFilters.push({
        href: buildAdminListHref({
          basePath: input.basePath,
          listInput: input.listInput,
          overrides: {
            filters: removeFilterValue(filters, filter.key),
            page: 1,
          },
        }),
        label: filter.label,
        value: getFilterOptionLabel(filter, value),
      });
    }
  }

  return activeFilters;
}

export interface AdminUrlFormFieldError {
  field: string;
  message: string;
}

export function getSponsorPlacementMediaFormValues({
  fieldErrors,
  formData,
  getOptionalStringFormValue,
}: {
  fieldErrors: AdminUrlFormFieldError[];
  formData: FormData;
  getOptionalStringFormValue: (
    formData: FormData,
    key: string,
  ) => string | undefined;
}) {
  return {
    imageAssetId: getOptionalStringFormValue(formData, "imageAssetId"),
    imageUrl: getNullableOptionalUrlFormValue({
      fieldErrors,
      formData,
      getOptionalStringFormValue,
      key: "imageUrl",
    }),
    logoAssetId: getOptionalStringFormValue(formData, "logoAssetId"),
    logoUrl: getNullableOptionalUrlFormValue({
      fieldErrors,
      formData,
      getOptionalStringFormValue,
      key: "logoUrl",
    }),
  };
}

export function validateDateOnlyRange({
  endsOn,
  fieldErrors,
  startsOn,
}: {
  endsOn: string;
  fieldErrors: AdminUrlFormFieldError[];
  startsOn: string;
}) {
  if (
    startsOn &&
    endsOn &&
    Date.parse(`${endsOn}T00:00:00.000Z`) <
      Date.parse(`${startsOn}T00:00:00.000Z`)
  ) {
    fieldErrors.push({
      field: "endsOn",
      message: "La fecha final debe ser posterior o igual a la fecha inicial.",
    });
  }
}

function getNullableOptionalUrlFormValue({
  fieldErrors,
  formData,
  getOptionalStringFormValue,
  key,
}: {
  fieldErrors: AdminUrlFormFieldError[];
  formData: FormData;
  getOptionalStringFormValue: (
    formData: FormData,
    key: string,
  ) => string | undefined;
  key: string;
}) {
  if (!formData.has(key)) {
    return undefined;
  }

  const value = getOptionalStringFormValue(formData, key);

  if (!value) {
    return null;
  }

  if (!isValidHttpUrl(value)) {
    fieldErrors.push({
      field: key,
      message: "Ingresa una URL válida.",
    });
    return undefined;
  }

  return value;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getSearchParam(searchParams: SearchParamsRecord) {
  return (
    getTrimmedSearchParam(searchParams, "search") ??
    getTrimmedSearchParam(searchParams, "q")
  );
}

function getPositiveIntegerSearchParam(
  searchParams: SearchParamsRecord,
  key: string,
) {
  return getPositiveIntegerSearchParamBase(
    searchParams,
    key,
    key === "page" ? defaultAdminListPage : defaultAdminListPageSize,
  );
}

function getDateSearchParam(searchParams: SearchParamsRecord, key: string) {
  const value = getTrimmedSearchParam(searchParams, key);

  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function getEnumSearchParam<const TValues extends readonly string[]>(
  searchParams: SearchParamsRecord,
  key: string,
  allowedValues: TValues,
): TValues[number] | undefined {
  const value = getTrimmedSearchParam(searchParams, key);

  return value && allowedValues.includes(value) ? value : undefined;
}

function getArraySearchParam<const TValues extends readonly string[]>(
  searchParams: SearchParamsRecord,
  key: string,
  allowedValues: TValues,
): TValues[number][] | undefined {
  const values = getSearchParamValues(searchParams, key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value): value is TValues[number] => allowedValues.includes(value));

  return values.length > 0 ? [...new Set(values)] : undefined;
}

function setArrayFilter<TFilters extends Record<string, unknown>>(
  filters: TFilters,
  key: keyof TFilters,
  value: unknown[] | undefined,
) {
  if (value && value.length > 0) {
    filters[key] = value as TFilters[keyof TFilters];
  }
}

function setStringFilter<TFilters extends Record<string, unknown>>(
  filters: TFilters,
  key: keyof TFilters,
  value: string | undefined,
) {
  if (value) {
    filters[key] = value as TFilters[keyof TFilters];
  }
}

function setResourceProviderSharedFilters<
  TFilters extends Record<string, unknown>,
>(filters: TFilters, searchParams: SearchParamsRecord) {
  setArrayFilter(
    filters,
    "category",
    getArraySearchParam(
      searchParams,
      "category",
      resourceProviderCategoryValues,
    ),
  );
  setStringFilter(filters, "city", getTrimmedSearchParam(searchParams, "city"));
  setStringFilter(
    filters,
    "department",
    getTrimmedSearchParam(searchParams, "department"),
  );
  setArrayFilter(
    filters,
    "verification",
    getArraySearchParam(
      searchParams,
      "verification",
      resourceProviderVerificationValues,
    ),
  );
}

function appendFilterParams(
  params: URLSearchParams,
  filters: Record<string, unknown> | undefined,
) {
  if (!filters) {
    return;
  }

  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }

    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }
}

function removeFilterValue(filters: object, key: string) {
  const nextFilters: Record<string, unknown> = { ...filters };
  delete nextFilters[key];

  return nextFilters;
}

function removeArrayFilterValue(filters: object, key: string, value: string) {
  const nextFilters: Record<string, unknown> = { ...filters };
  const currentValue = nextFilters[key];

  if (Array.isArray(currentValue)) {
    const nextValue = currentValue.filter((item) => item !== value);

    if (nextValue.length > 0) {
      nextFilters[key] = nextValue;
    } else {
      delete nextFilters[key];
    }
  }

  return nextFilters;
}

function getFilterOptionLabel(filter: AdminUrlAvailableFilter, value: string) {
  return (
    filter.options?.find((option) => option.value === value)?.label ?? value
  );
}
