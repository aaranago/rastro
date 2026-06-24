import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type { NearbySearchLocation } from "../nearby/nearby-types";
import type { ReportLocationDraft } from "../report-creation/report-location-draft";
import { isBoliviaCoordinate } from "../report-creation/report-location-draft";

export type ReportLocationPickerResult =
  | {
      kind: "selected";
      location: ReportLocationDraft;
    }
  | {
      kind: "recoverable";
      message: string;
      title: string;
    };

export interface ReportLocationPickerAdapter {
  resolveCurrentLocation: () => Promise<ReportLocationPickerResult>;
  selectLocation: (
    location: NearbySearchLocation,
  ) => ReportLocationPickerResult;
}

type RecoverableForegroundLocationResult = Exclude<
  Awaited<ReturnType<NearbyLocationAdapter["resolveForegroundLocation"]>>,
  { kind: "available" }
>;

export function createReportLocationPickerAdapter(
  nearbyLocationAdapter: NearbyLocationAdapter,
): ReportLocationPickerAdapter {
  return {
    async resolveCurrentLocation() {
      const result = await nearbyLocationAdapter.resolveForegroundLocation({
        requestPermission: true,
      });

      if (result.kind === "available") {
        return toReportLocationDraftResult(result.location);
      }

      return toRecoverableCurrentLocationResult(result);
    },
    selectLocation(location) {
      return toReportLocationDraftResult(location);
    },
  };
}

function toRecoverableCurrentLocationResult(
  result: RecoverableForegroundLocationResult,
): ReportLocationPickerResult {
  if (
    result.kind === "permission-denied" ||
    result.kind === "permission-required"
  ) {
    return {
      kind: "recoverable",
      message:
        "No tenemos permiso para usar tu ubicacion. Puedes elegir una ciudad, un departamento o un punto manual.",
      title: "Permiso de ubicacion denegado",
    };
  }

  return {
    kind: "recoverable",
    message:
      result.reason === "outside-bolivia"
        ? "No pudimos ubicarte dentro de Bolivia. Puedes elegir una ciudad, un departamento o un punto manual."
        : "No pudimos obtener tu ubicacion actual. Puedes elegir una ciudad, un departamento o un punto manual.",
    title: "Elige una ubicacion manual",
  };
}

function toReportLocationDraftResult(
  location: NearbySearchLocation,
): ReportLocationPickerResult {
  if (!location.coordinates) {
    return {
      kind: "recoverable",
      message:
        "Elige un punto en el mapa o una zona con coordenadas para continuar.",
      title: "Falta elegir un punto",
    };
  }

  if (!isBoliviaCoordinate(location.coordinates)) {
    return {
      kind: "recoverable",
      message:
        "Elige una ubicacion dentro de Bolivia para continuar con el reporte.",
      title: "Elige una ubicacion en Bolivia",
    };
  }

  const administrativeArea = inferAdministrativeArea(location);

  return {
    kind: "selected",
    location: {
      addressLabel: location.label,
      coordinates: location.coordinates,
      department: administrativeArea.department,
      locationCellLabel: location.locationCellLabel,
      municipality: administrativeArea.municipality,
    },
  };
}

function inferAdministrativeArea(location: NearbySearchLocation) {
  if (location.department && location.municipality) {
    return {
      department: location.department,
      municipality: location.municipality,
    };
  }

  const label = `${location.label} ${location.locationCellLabel}`;
  const knownAreas = [
    { department: "La Paz", municipality: "La Paz" },
    {
      department: "Santa Cruz",
      municipality: "Santa Cruz de la Sierra",
    },
    { department: "Cochabamba", municipality: "Cochabamba" },
    { department: "Chuquisaca", municipality: "Sucre" },
    { department: "Tarija", municipality: "Tarija" },
    { department: "Oruro", municipality: "Oruro" },
    { department: "Potosi", municipality: "Potosi" },
    { department: "Beni", municipality: "Trinidad" },
    { department: "Pando", municipality: "Cobija" },
  ] as const;
  const area = knownAreas.find(
    (candidate) =>
      label.includes(candidate.department) ||
      label.includes(candidate.municipality),
  );

  if (area) {
    return area;
  }

  return {
    department: "Bolivia",
    municipality:
      location.manualLocationKind === "map-pin" ? "Punto manual" : "Bolivia",
  };
}
