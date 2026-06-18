import type { PetProfileSummary } from "./pet-profile-types";

export const petProfileFixtures = {
  profiles: [
    {
      id: "pet-luna",
      caretakerMemberId: "member-camila",
      name: "Luna",
      type: "Gato",
      breed: "Siames",
      description: "Mancha blanca en el pecho, collar rojo y muy tranquila.",
      photos: [
        {
          id: "photo-luna-1",
          uri: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1200&auto=format&fit=crop",
          thumbUri:
            "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=360&auto=format&fit=crop",
          alt: "Foto de Luna",
          status: "ready",
        },
      ],
      relatedRecords: [
        {
          id: "lost-luna",
          kind: "lost-report",
          status: "active",
          title: "Luna perdida en Sopocachi",
          updatedAtLabel: "Actualizado hace 20 min",
        },
        {
          id: "found-luna-closed",
          kind: "found-report",
          status: "closed",
          title: "Reporte cerrado de Luna",
          outcomeLabel: "Reunida",
        },
      ],
      updatedAtLabel: "Actualizado hoy",
    },
    {
      id: "pet-tito",
      caretakerMemberId: "member-camila",
      name: "Tito",
      type: "Perro",
      breed: "Mestizo",
      description: "Patas blancas, hocico negro y responde a silbidos.",
      photos: [],
      relatedRecords: [],
      updatedAtLabel: "Sin reportes activos",
    },
  ] satisfies PetProfileSummary[],
};

export const draftPhotoSamples = [
  {
    uri: "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=1200&auto=format&fit=crop",
    thumbUri:
      "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=360&auto=format&fit=crop",
  },
  {
    uri: "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=1200&auto=format&fit=crop",
    thumbUri:
      "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=360&auto=format&fit=crop",
  },
  {
    uri: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=1200&auto=format&fit=crop",
    thumbUri:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=360&auto=format&fit=crop",
  },
] as const;
