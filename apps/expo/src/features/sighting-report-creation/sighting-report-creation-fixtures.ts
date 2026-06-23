import type {
  SightingReportExactSightingLocation,
  SightingReportPhoto,
} from "./sighting-report-creation-types";

export const sightingReportCreationFixtures = {
  defaultLocation: {
    addressLabel: "Plaza Abaroa, La Paz",
    coordinates: {
      latitude: -16.5103,
      longitude: -68.1299,
    },
    department: "La Paz",
    locationCellLabel: "Sopocachi, La Paz",
    municipality: "La Paz",
    neighborhood: "Sopocachi",
  } satisfies SightingReportExactSightingLocation,
  photoSamples: [
    {
      alt: "Foto opcional de mascota vista",
      id: "sighting-report-photo-sample-1",
      mediaId: "sighting-report-media-sample-1",
      status: "ready",
      thumbUri: "file:///sighting-report-photo-sample-1-thumb.jpg",
      uri: "file:///sighting-report-photo-sample-1.jpg",
    },
    {
      alt: "Foto adicional de avistamiento",
      id: "sighting-report-photo-sample-2",
      mediaId: "sighting-report-media-sample-2",
      status: "ready",
      thumbUri: "file:///sighting-report-photo-sample-2-thumb.jpg",
      uri: "file:///sighting-report-photo-sample-2.jpg",
    },
  ] satisfies SightingReportPhoto[],
};
