import { buildApproximatePublicReportLocation } from "@acme/validators";

export interface ReportLocationDraft {
  addressLabel: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  department: string;
  locationCellLabel: string;
  municipality: string;
  neighborhood?: string;
}

export interface ReportLocationPublishInput {
  addressLabel: string;
  countryCode: "BO";
  latitude: number;
  locationCellLabel: string;
  longitude: number;
}

export interface ReportCreateLocationInput {
  approximateLatitude?: number;
  approximateLongitude?: number;
  exactLatitude: number;
  exactLongitude: number;
  exposeExactLocation: boolean;
  label: string;
  locationCell: string;
}

export interface ReportCreateLocationSource {
  addressLabel?: string;
  latitude: number;
  locationCellLabel: string;
  longitude: number;
}

const boliviaLatitudeBounds = {
  max: -9,
  min: -23,
};

const boliviaLongitudeBounds = {
  max: -57,
  min: -70.5,
};

// Rounded Natural Earth 10m admin-0 Bolivia ring for an app geofence.
// This is not a legal boundary; it blocks obvious cross-border report pins.
const boliviaBorderRing = [
  { latitude: -11.50472, longitude: -65.29247 },
  { latitude: -11.51744, longitude: -65.22265 },
  { latitude: -11.61552, longitude: -65.16744 },
  { latitude: -11.74181, longitude: -65.1962 },
  { latitude: -11.77313, longitude: -65.1515 },
  { latitude: -11.69055, longitude: -65.11341 },
  { latitude: -11.75308, longitude: -65.06556 },
  { latitude: -11.98428, longitude: -65.00944 },
  { latitude: -12.03255, longitude: -64.7925 },
  { latitude: -12.14458, longitude: -64.73953 },
  { latitude: -12.10438, longitude: -64.68992 },
  { latitude: -12.18096, longitude: -64.66486 },
  { latitude: -12.23946, longitude: -64.48939 },
  { latitude: -12.37361, longitude: -64.48978 },
  { latitude: -12.45733, longitude: -64.39573 },
  { latitude: -12.54414, longitude: -63.93906 },
  { latitude: -12.45722, longitude: -63.81499 },
  { latitude: -12.47541, longitude: -63.65774 },
  { latitude: -12.70196, longitude: -63.31791 },
  { latitude: -12.63375, longitude: -63.13668 },
  { latitude: -12.65266, longitude: -63.07503 },
  { latitude: -12.84387, longitude: -62.98801 },
  { latitude: -12.84604, longitude: -62.92889 },
  { latitude: -13.00065, longitude: -62.78983 },
  { latitude: -12.965, longitude: -62.68663 },
  { latitude: -13.03, longitude: -62.64168 },
  { latitude: -13.06845, longitude: -62.47213 },
  { latitude: -13.12654, longitude: -62.42412 },
  { latitude: -13.1502, longitude: -62.11468 },
  { latitude: -13.24896, longitude: -62.10941 },
  { latitude: -13.45608, longitude: -61.87232 },
  { latitude: -13.54062, longitude: -61.83635 },
  { latitude: -13.5061, longitude: -61.59711 },
  { latitude: -13.54816, longitude: -61.50342 },
  { latitude: -13.4937, longitude: -61.34772 },
  { latitude: -13.51985, longitude: -61.14911 },
  { latitude: -13.46455, longitude: -61.04723 },
  { latitude: -13.53525, longitude: -61.02201 },
  { latitude: -13.55292, longitude: -60.89674 },
  { latitude: -13.79786, longitude: -60.47263 },
  { latitude: -13.98328, longitude: -60.38719 },
  { latitude: -14.11723, longitude: -60.47351 },
  { latitude: -14.27835, longitude: -60.46434 },
  { latitude: -14.35711, longitude: -60.39135 },
  { latitude: -14.5326, longitude: -60.33843 },
  { latitude: -14.54283, longitude: -60.3692 },
  { latitude: -14.63006, longitude: -60.29172 },
  { latitude: -15.08337, longitude: -60.2698 },
  { latitude: -15.09887, longitude: -60.58224 },
  { latitude: -15.47828, longitude: -60.2464 },
  { latitude: -16.26479, longitude: -60.16069 },
  { latitude: -16.33125, longitude: -58.46472 },
  { latitude: -16.2804, longitude: -58.34974 },
  { latitude: -16.47315, longitude: -58.34266 },
  { latitude: -16.68368, longitude: -58.48028 },
  { latitude: -17.23745, longitude: -58.39914 },
  { latitude: -17.49676, longitude: -58.01018 },
  { latitude: -17.53345, longitude: -57.80073 },
  { latitude: -17.67752, longitude: -57.7859 },
  { latitude: -17.82511, longitude: -57.69681 },
  { latitude: -17.84609, longitude: -57.73009 },
  { latitude: -18.18364, longitude: -57.55108 },
  { latitude: -18.23956, longitude: -57.4668 },
  { latitude: -18.25609, longitude: -57.56674 },
  { latitude: -18.91042, longitude: -57.78233 },
  { latitude: -18.922, longitude: -57.73179 },
  { latitude: -19.04457, longitude: -57.71583 },
  { latitude: -19.05925, longitude: -57.789 },
  { latitude: -19.72991, longitude: -58.12464 },
  { latitude: -19.98012, longitude: -57.85975 },
  { latitude: -20.16512, longitude: -58.1588 },
  { latitude: -19.82137, longitude: -58.17528 },
  { latitude: -19.28673, longitude: -59.08954 },
  { latitude: -19.2981, longitude: -60.00638 },
  { latitude: -19.64588, longitude: -61.7532 },
  { latitude: -20.10415, longitude: -61.94425 },
  { latitude: -20.55311, longitude: -62.26883 },
  { latitude: -21.06657, longitude: -62.2757 },
  { latitude: -22.23446, longitude: -62.65036 },
  { latitude: -22.1309, longitude: -62.78348 },
  { latitude: -22.00088, longitude: -62.81856 },
  { latitude: -21.99747, longitude: -63.63939 },
  { latitude: -22.05059, longitude: -63.74042 },
  { latitude: -22.00181, longitude: -63.93317 },
  { latitude: -22.54069, longitude: -64.25083 },
  { latitude: -22.87194, longitude: -64.32529 },
  { latitude: -22.75194, longitude: -64.35573 },
  { latitude: -22.64291, longitude: -64.45371 },
  { latitude: -22.54234, longitude: -64.42828 },
  { latitude: -22.42566, longitude: -64.53133 },
  { latitude: -22.34318, longitude: -64.57202 },
  { latitude: -22.27549, longitude: -64.54277 },
  { latitude: -22.20655, longitude: -64.59621 },
  { latitude: -22.09658, longitude: -65.02037 },
  { latitude: -22.11405, longitude: -65.74461 },
  { latitude: -21.94455, longitude: -65.93269 },
  { latitude: -21.91799, longitude: -66.04653 },
  { latitude: -21.83293, longitude: -66.09449 },
  { latitude: -21.78694, longitude: -66.22246 },
  { latitude: -22.07705, longitude: -66.3076 },
  { latitude: -22.22505, longitude: -66.7359 },
  { latitude: -22.42762, longitude: -66.78509 },
  { latitude: -22.52457, longitude: -67.03273 },
  { latitude: -22.63939, longitude: -67.02663 },
  { latitude: -22.82222, longitude: -67.1939 },
  { latitude: -22.88868, longitude: -67.77144 },
  { latitude: -22.81871, longitude: -67.88709 },
  { latitude: -22.5473, longitude: -67.85919 },
  { latitude: -22.33409, longitude: -67.95189 },
  { latitude: -22.10289, longitude: -67.96063 },
  { latitude: -21.95396, longitude: -68.09623 },
  { latitude: -21.78962, longitude: -68.1076 },
  { latitude: -21.57186, longitude: -68.19844 },
  { latitude: -21.28433, longitude: -68.20754 },
  { latitude: -20.9598, longitude: -68.41631 },
  { latitude: -20.91392, longitude: -68.55511 },
  { latitude: -20.74287, longitude: -68.57279 },
  { latitude: -20.62473, longitude: -68.48096 },
  { latitude: -20.51683, longitude: -68.68554 },
  { latitude: -20.42123, longitude: -68.76541 },
  { latitude: -20.36429, longitude: -68.75768 },
  { latitude: -20.32863, longitude: -68.67852 },
  { latitude: -20.15097, longitude: -68.72627 },
  { latitude: -20.10663, longitude: -68.79259 },
  { latitude: -20.05557, longitude: -68.58834 },
  { latitude: -19.92039, longitude: -68.54157 },
  { latitude: -19.84432, longitude: -68.56111 },
  { latitude: -19.71554, longitude: -68.70322 },
  { latitude: -19.43463, longitude: -68.44763 },
  { latitude: -19.06793, longitude: -68.9085 },
  { latitude: -18.94649, longitude: -68.98961 },
  { latitude: -18.86732, longitude: -68.95145 },
  { latitude: -18.14024, longitude: -69.15544 },
  { latitude: -18.03998, longitude: -69.08172 },
  { latitude: -17.97621, longitude: -69.30241 },
  { latitude: -17.75938, longitude: -69.35941 },
  { latitude: -17.6214, longitude: -69.49712 },
  { latitude: -17.36912, longitude: -69.5226 },
  { latitude: -17.2883, longitude: -69.66649 },
  { latitude: -17.18556, longitude: -69.6228 },
  { latitude: -17.06299, longitude: -69.40602 },
  { latitude: -16.72875, longitude: -69.18236 },
  { latitude: -16.67025, longitude: -69.03707 },
  { latitude: -16.45414, longitude: -69.02787 },
  { latitude: -16.32898, longitude: -68.83349 },
  { latitude: -16.21002, longitude: -68.98204 },
  { latitude: -16.2312, longitude: -69.12081 },
  { latitude: -16.19503, longitude: -69.18487 },
  { latitude: -15.62628, longitude: -69.43002 },
  { latitude: -15.35084, longitude: -69.29117 },
  { latitude: -15.23333, longitude: -69.1481 },
  { latitude: -14.98177, longitude: -69.38431 },
  { latitude: -14.80152, longitude: -69.37054 },
  { latitude: -14.75067, longitude: -69.26763 },
  { latitude: -14.57425, longitude: -69.23466 },
  { latitude: -14.57756, longitude: -69.1704 },
  { latitude: -14.50304, longitude: -69.16427 },
  { latitude: -14.37902, longitude: -68.99025 },
  { latitude: -14.2459, longitude: -69.01015 },
  { latitude: -14.19123, longitude: -68.86445 },
  { latitude: -14.0393, longitude: -68.90576 },
  { latitude: -13.97222, longitude: -68.98297 },
  { latitude: -13.75311, longitude: -69.01596 },
  { latitude: -13.66661, longitude: -69.10159 },
  { latitude: -13.63498, longitude: -69.02384 },
  { latitude: -13.50145, longitude: -68.97075 },
  { latitude: -12.86795, longitude: -68.98095 },
  { latitude: -12.71054, longitude: -68.76613 },
  { latitude: -12.66579, longitude: -68.74296 },
  { latitude: -12.62021, longitude: -68.79342 },
  { latitude: -12.50249, longitude: -68.68425 },
  { latitude: -10.9523, longitude: -69.57763 },
  { latitude: -10.99468, longitude: -68.80466 },
  { latitude: -11.01194, longitude: -68.75763 },
  { latitude: -11.14061, longitude: -68.77593 },
  { latitude: -11.1125, longitude: -68.61573 },
  { latitude: -10.97897, longitude: -68.29332 },
  { latitude: -10.66694, longitude: -68.04377 },
  { latitude: -10.7055, longitude: -67.72173 },
  { latitude: -10.50179, longitude: -67.58463 },
  { latitude: -10.37249, longitude: -67.34284 },
  { latitude: -10.31885, longitude: -67.32351 },
  { latitude: -10.32671, longitude: -67.18471 },
  { latitude: -10.25694, longitude: -67.0643 },
  { latitude: -9.90792, longitude: -66.64262 },
  { latitude: -9.78452, longitude: -66.08699 },
  { latitude: -9.78441, longitude: -65.80642 },
  { latitude: -9.73305, longitude: -65.78856 },
  { latitude: -9.83723, longitude: -65.58398 },
  { latitude: -9.68013, longitude: -65.41623 },
  { latitude: -9.84126, longitude: -65.29911 },
  { latitude: -9.96725, longitude: -65.33683 },
  { latitude: -10.20682, longitude: -65.28482 },
  { latitude: -10.46809, longitude: -65.44998 },
  { latitude: -10.62581, longitude: -65.43569 },
  { latitude: -10.69805, longitude: -65.38107 },
  { latitude: -10.79924, longitude: -65.40474 },
  { latitude: -10.8505, longitude: -65.32712 },
  { latitude: -10.96967, longitude: -65.2996 },
  { latitude: -11.17802, longitude: -65.39815 },
  { latitude: -11.21885, longitude: -65.36001 },
  { latitude: -11.27755, longitude: -65.38727 },
  { latitude: -11.32778, longitude: -65.32645 },
  { latitude: -11.38235, longitude: -65.35477 },
  { latitude: -11.4764, longitude: -65.31955 },
  { latitude: -11.50472, longitude: -65.29247 },
] as const;

export function validateReportLocationDraft(
  location: ReportLocationDraft | undefined,
): string[] {
  if (!location) {
    return ["Selecciona una ubicacion."];
  }

  const errors: string[] = [];

  if (location.addressLabel.trim().length === 0) {
    errors.push("Selecciona una direccion.");
  }

  if (location.locationCellLabel.trim().length === 0) {
    errors.push("Selecciona una zona aproximada.");
  }

  if (!isBoliviaCoordinate(location.coordinates)) {
    errors.push("Selecciona una ubicacion dentro de Bolivia.");
  }

  return errors;
}

export function toReportLocationPublishInput(
  location: ReportLocationDraft,
): ReportLocationPublishInput {
  const errors = validateReportLocationDraft(location);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  return {
    addressLabel: location.addressLabel.trim(),
    countryCode: "BO",
    latitude: location.coordinates.latitude,
    locationCellLabel: location.locationCellLabel.trim(),
    longitude: location.coordinates.longitude,
  };
}

export function toReportCreateLocationInput({
  exposeExactLocation,
  location,
}: {
  exposeExactLocation: boolean;
  location: ReportCreateLocationSource;
}): ReportCreateLocationInput {
  const addressLabel = location.addressLabel?.trim() ?? "";
  const locationCell = location.locationCellLabel.trim();
  const label = addressLabel.length > 0 ? addressLabel : locationCell;

  if (!isBoliviaCoordinate(location)) {
    throw new Error("Selecciona una ubicacion dentro de Bolivia.");
  }

  if (label.length === 0 || locationCell.length === 0) {
    throw new Error("Selecciona una ubicacion valida.");
  }

  return {
    ...(exposeExactLocation
      ? {}
      : buildApproximatePublicReportLocation({
          exactLatitude: location.latitude,
          exactLongitude: location.longitude,
        })),
    exactLatitude: location.latitude,
    exactLongitude: location.longitude,
    exposeExactLocation,
    label,
    locationCell,
  };
}

export function isBoliviaCoordinate(location: {
  latitude: number;
  longitude: number;
}) {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= boliviaLatitudeBounds.min &&
    location.latitude <= boliviaLatitudeBounds.max &&
    location.longitude >= boliviaLongitudeBounds.min &&
    location.longitude <= boliviaLongitudeBounds.max &&
    isCoordinateInsideRing(location, boliviaBorderRing)
  );
}

function isCoordinateInsideRing(
  location: { latitude: number; longitude: number },
  ring: readonly { latitude: number; longitude: number }[],
) {
  if (ring.length < 3) {
    return false;
  }

  let isInside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; ) {
    const current = ring[index];
    const previous = ring[previousIndex];

    if (!current || !previous) {
      return false;
    }

    const crossesLatitude =
      current.latitude > location.latitude !==
      previous.latitude > location.latitude;

    if (crossesLatitude) {
      const longitudeAtLatitude =
        ((previous.longitude - current.longitude) *
          (location.latitude - current.latitude)) /
          (previous.latitude - current.latitude) +
        current.longitude;

      if (location.longitude < longitudeAtLatitude) {
        isInside = !isInside;
      }
    }

    previousIndex = index;
    index += 1;
  }

  return isInside;
}
