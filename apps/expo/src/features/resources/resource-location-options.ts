import type { ResourceSearchLocation } from "./resource-types";

export type ManualResourceSearchLocation = Extract<
  ResourceSearchLocation,
  { kind: "manual" }
>;

export interface ResourceManualLocationOption {
  keywords: readonly string[];
  location: ManualResourceSearchLocation;
}

export const resourceManualLocationOptions = [
  manualLocation({
    coordinate: { latitude: -16.510231, longitude: -68.123881 },
    keywords: ["sopocachi", "plaza abaroa", "la paz centro"],
    label: "Sopocachi, La Paz",
    locationCellLabel: "Sopocachi",
  }),
  manualLocation({
    coordinate: { latitude: -16.5006, longitude: -68.1216 },
    keywords: ["miraflores", "hospital", "la paz"],
    label: "Miraflores, La Paz",
    locationCellLabel: "Miraflores",
  }),
  manualLocation({
    coordinate: { latitude: -16.5405, longitude: -68.0889 },
    keywords: ["achumani", "zona sur", "la paz"],
    label: "Achumani, La Paz",
    locationCellLabel: "Achumani",
  }),
  manualLocation({
    coordinate: { latitude: -16.5413, longitude: -68.0794 },
    keywords: ["san miguel", "zona sur", "la paz"],
    label: "San Miguel, La Paz",
    locationCellLabel: "San Miguel",
  }),
  manualLocation({
    coordinate: { latitude: -16.4897, longitude: -68.1193 },
    keywords: ["ciudad de la paz", "la paz bolivia", "centro la paz"],
    label: "La Paz",
    locationCellLabel: "La Paz",
  }),
  manualLocation({
    coordinate: { latitude: -16.5048, longitude: -68.1627 },
    keywords: ["el alto", "ciudad satelite", "la paz"],
    label: "El Alto, La Paz",
    locationCellLabel: "El Alto",
  }),
  manualLocation({
    coordinate: { latitude: -17.3895, longitude: -66.1568 },
    keywords: ["cochabamba", "queru queru", "cercado"],
    label: "Queru Queru, Cochabamba",
    locationCellLabel: "Queru Queru",
  }),
  manualLocation({
    coordinate: { latitude: -17.3382, longitude: -66.2154 },
    keywords: ["tiquipaya", "cochabamba"],
    label: "Tiquipaya, Cochabamba",
    locationCellLabel: "Tiquipaya",
  }),
  manualLocation({
    coordinate: { latitude: -17.7833, longitude: -63.1821 },
    keywords: ["santa cruz", "santa cruz de la sierra", "equipetrol"],
    label: "Equipetrol, Santa Cruz",
    locationCellLabel: "Equipetrol",
  }),
  manualLocation({
    coordinate: { latitude: -21.5317, longitude: -64.7312 },
    keywords: ["tarija", "centro tarija"],
    label: "Centro, Tarija",
    locationCellLabel: "Centro",
  }),
] satisfies readonly ResourceManualLocationOption[];

export const defaultResourceSearchLocation = resourceManualLocationOptions[0]
  ?.location ?? {
  coordinate: { latitude: -16.510231, longitude: -68.123881 },
  countryCode: "BO",
  kind: "manual",
  label: "Sopocachi, La Paz",
  locationCellLabel: "Sopocachi",
  manualLocationKind: "place",
};

export function getResourceManualLocationMatches(
  query: string,
  options: readonly ResourceManualLocationOption[] = resourceManualLocationOptions,
) {
  const normalizedQuery = normalizeResourceSearchText(query);

  if (normalizedQuery.length === 0) {
    return options.slice(0, 5);
  }

  return options
    .map((option) => ({
      option,
      score: getLocationMatchScore(normalizedQuery, option),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((match) => match.option)
    .slice(0, 5);
}

export function resolveResourceManualLocationSearch(
  query: string,
  options: readonly ResourceManualLocationOption[] = resourceManualLocationOptions,
) {
  const [firstMatch] = getResourceManualLocationMatches(query, options);

  return firstMatch;
}

function manualLocation(input: {
  coordinate: ManualResourceSearchLocation["coordinate"];
  keywords: readonly string[];
  label: string;
  locationCellLabel: string;
}): ResourceManualLocationOption {
  return {
    keywords: input.keywords,
    location: {
      coordinate: input.coordinate,
      countryCode: "BO",
      kind: "manual",
      label: input.label,
      locationCellLabel: input.locationCellLabel,
      manualLocationKind: "place",
    },
  };
}

function getLocationMatchScore(
  normalizedQuery: string,
  option: ResourceManualLocationOption,
) {
  const haystacks = [
    option.location.label,
    option.location.locationCellLabel,
    ...option.keywords,
  ]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeResourceSearchText);

  if (haystacks.some((value) => value === normalizedQuery)) {
    return 100;
  }

  if (haystacks.some((value) => value.startsWith(normalizedQuery))) {
    return 80;
  }

  if (haystacks.some((value) => value.includes(normalizedQuery))) {
    return 60;
  }

  const queryParts = normalizedQuery.split(/\s+/).filter(Boolean);
  const allPartsMatch =
    queryParts.length > 0 &&
    queryParts.every((part) => haystacks.some((value) => value.includes(part)));

  return allPartsMatch ? 40 : 0;
}

function normalizeResourceSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
