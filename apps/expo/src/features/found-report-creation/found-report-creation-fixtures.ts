import type {
  FoundReportExactFoundLocation,
  FoundReportPhoto,
} from "./found-report-creation-types";

export const foundReportCreationFixtures = {
  defaultLocation: {
    addressLabel: "Jardin Botanico de La Paz",
    coordinates: {
      latitude: -16.5022,
      longitude: -68.1213,
    },
    department: "La Paz",
    locationCellLabel: "Miraflores, La Paz",
    municipality: "La Paz",
    neighborhood: "Miraflores",
  } satisfies FoundReportExactFoundLocation,
  photoSamples: [
    {
      alt: "Foto de mascota encontrada",
      id: "found-report-photo-sample-1",
      status: "ready",
      thumbUri: "file:///found-report-photo-sample-1-thumb.jpg",
      uri: "file:///found-report-photo-sample-1.jpg",
    },
    {
      alt: "Foto adicional de mascota encontrada",
      id: "found-report-photo-sample-2",
      status: "ready",
      thumbUri: "file:///found-report-photo-sample-2-thumb.jpg",
      uri: "file:///found-report-photo-sample-2.jpg",
    },
  ] satisfies FoundReportPhoto[],
};
