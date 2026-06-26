import { describe, expect, it } from "vitest";

import {
  toReportCreateLocationInput,
  toReportLocationPublishInput,
  validateReportLocationDraft,
} from "./report-location-draft";

describe("Report location draft contract", () => {
  it("trims a Bolivia exact location draft into mobile publish input", () => {
    const publishInput = toReportLocationPublishInput({
      addressLabel: "  Plaza Abaroa, La Paz  ",
      coordinates: {
        latitude: -16.5103,
        longitude: -68.1299,
      },
      department: " La Paz ",
      locationCellLabel: "  Sopocachi  ",
      municipality: " La Paz ",
      neighborhood: " San Pedro ",
    });

    expect(publishInput).toEqual({
      addressLabel: "Plaza Abaroa, La Paz",
      countryCode: "BO",
      latitude: -16.5103,
      locationCellLabel: "Sopocachi",
      longitude: -68.1299,
    });
  });

  it("rejects coordinates outside Bolivia bounds", () => {
    expect(() =>
      toReportLocationPublishInput({
        addressLabel: "Plaza Abaroa, La Paz",
        coordinates: {
          latitude: -8.5,
          longitude: -68.1299,
        },
        department: "La Paz",
        locationCellLabel: "Sopocachi",
        municipality: "La Paz",
      }),
    ).toThrow("Selecciona una ubicacion dentro de Bolivia.");
  });

  it("rejects map pins inside the bounding box but outside Bolivia before mobile publish", () => {
    expect(() =>
      toReportLocationPublishInput({
        addressLabel: "Arica, Chile",
        coordinates: {
          latitude: -18.4783,
          longitude: -70.3126,
        },
        department: "Arica",
        locationCellLabel: "Arica",
        municipality: "Arica",
      }),
    ).toThrow("Selecciona una ubicacion dentro de Bolivia.");
  });

  it("rejects map pins inside the bounding box but outside Bolivia before backend create", () => {
    expect(
      validateReportLocationDraft({
        addressLabel: "Tacna, Peru",
        coordinates: {
          latitude: -18.0066,
          longitude: -70.2463,
        },
        department: "Tacna",
        locationCellLabel: "Tacna",
        municipality: "Tacna",
      }),
    ).toContain("Selecciona una ubicacion dentro de Bolivia.");

    expect(() =>
      toReportCreateLocationInput({
        exposeExactLocation: true,
        location: {
          addressLabel: "Tacna, Peru",
          latitude: -18.0066,
          locationCellLabel: "Tacna",
          longitude: -70.2463,
        },
      }),
    ).toThrow("Selecciona una ubicacion dentro de Bolivia.");
  });

  it("accepts Bolivian border cities inside the country geofence", () => {
    const borderCities = [
      {
        label: "Cobija",
        latitude: -11.0267,
        longitude: -68.7692,
      },
      {
        label: "Puerto Suarez",
        latitude: -18.9667,
        longitude: -57.8,
      },
    ] as const;

    expect(
      borderCities.flatMap(({ label, latitude, longitude }) =>
        validateReportLocationDraft({
          addressLabel: `${label}, Bolivia`,
          coordinates: { latitude, longitude },
          department: label,
          locationCellLabel: label,
          municipality: label,
        }),
      ),
    ).not.toContain("Selecciona una ubicacion dentro de Bolivia.");
  });

  it("maps mobile publish location to backend report.create location with exact-public visibility", () => {
    expect(
      toReportCreateLocationInput({
        exposeExactLocation: true,
        location: {
          addressLabel: "  ",
          latitude: -16.5103,
          locationCellLabel: "  Sopocachi  ",
          longitude: -68.1299,
        },
      }),
    ).toEqual({
      exactLatitude: -16.5103,
      exactLongitude: -68.1299,
      exposeExactLocation: true,
      label: "Sopocachi",
      locationCell: "Sopocachi",
    });
  });

  it("adds a 300 m approximate public location when exact visibility is off", () => {
    expect(
      toReportCreateLocationInput({
        exposeExactLocation: false,
        location: {
          addressLabel: "Plaza Abaroa",
          latitude: -16.510231,
          locationCellLabel: "Sopocachi",
          longitude: -68.123881,
        },
      }),
    ).toEqual({
      approximateLatitude: -16.51051,
      approximateLongitude: -68.124602,
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
      exposeExactLocation: false,
      label: "Plaza Abaroa",
      locationCell: "Sopocachi",
    });
  });
});
