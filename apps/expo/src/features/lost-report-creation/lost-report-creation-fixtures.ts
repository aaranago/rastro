import type {
  LostReportExactLocation,
  LostReportPetProfileOption,
  LostReportPhoto,
} from "./lost-report-creation-types";

export const lostReportCreationFixtures = {
  defaultLocation: {
    addressLabel: "Calle Aspiazu y Ecuador",
    coordinates: {
      latitude: -16.5108,
      longitude: -68.1261,
    },
    department: "La Paz",
    locationCellLabel: "Sopocachi, La Paz",
    municipality: "Nuestra Senora de La Paz",
    neighborhood: "Sopocachi",
  } satisfies LostReportExactLocation,
  petProfiles: [
    {
      breed: "Siamés",
      description: "Mancha blanca en el pecho, collar rojo y muy tranquila.",
      id: "pet-luna",
      name: "Luna",
      photos: [
        {
          alt: "Foto de Luna",
          id: "photo-luna-1",
          status: "ready",
          thumbUri:
            "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=360&auto=format&fit=crop",
          uri: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1200&auto=format&fit=crop",
        },
      ],
      type: "Gato",
    },
    {
      breed: "Mestizo",
      description: "Patas blancas, hocico negro y responde a silbidos.",
      id: "pet-tito",
      name: "Tito",
      photos: [
        {
          alt: "Foto de Tito",
          id: "photo-tito-1",
          status: "ready",
          thumbUri:
            "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=360&auto=format&fit=crop",
          uri: "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=1200&auto=format&fit=crop",
        },
      ],
      type: "Perro",
    },
  ] satisfies LostReportPetProfileOption[],
  photoSamples: [
    {
      alt: "Foto adicional para reporte de pérdida",
      id: "lost-report-photo-sample-1",
      mediaId: "lost-report-media-sample-1",
      status: "ready",
      thumbUri:
        "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=360&auto=format&fit=crop",
      uri: "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=1200&auto=format&fit=crop",
    },
    {
      alt: "Foto de mascota para reporte de pérdida",
      id: "lost-report-photo-sample-2",
      mediaId: "lost-report-media-sample-2",
      status: "ready",
      thumbUri:
        "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=360&auto=format&fit=crop",
      uri: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=1200&auto=format&fit=crop",
    },
  ] satisfies LostReportPhoto[],
};
