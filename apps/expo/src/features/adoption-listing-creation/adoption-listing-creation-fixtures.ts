import type {
  AdoptionListingCreationExactLocation,
  AdoptionListingPetProfileOption,
  AdoptionListingPhoto,
} from "./adoption-listing-creation-types";

export const adoptionListingCreationFixtures = {
  defaultLocation: {
    addressLabel: "Refugio Huellitas, Sopocachi",
    coordinates: {
      latitude: -16.5103,
      longitude: -68.1299,
    },
    department: "La Paz",
    locationCellLabel: "Sopocachi, La Paz",
    municipality: "Nuestra Senora de La Paz",
    neighborhood: "Sopocachi",
  } satisfies AdoptionListingCreationExactLocation,
  petProfiles: [
    {
      breed: "Mestizo",
      description: "Gatita tranquila, sociable y acostumbrada a interiores.",
      id: "pet-nala",
      name: "Nala",
      photos: [
        {
          alt: "Foto de Nala",
          id: "photo-nala-1",
          status: "ready",
          thumbUri: "file:///adoption-nala-thumb.jpg",
          uri: "file:///adoption-nala.jpg",
        },
      ],
      type: "Gato",
    },
    {
      breed: "Cruce pequeno",
      description: "Jugueton, carinoso y con energia para paseos cortos.",
      id: "pet-max",
      name: "Max",
      photos: [
        {
          alt: "Foto de Max",
          id: "photo-max-1",
          status: "ready",
          thumbUri: "file:///adoption-max-thumb.jpg",
          uri: "file:///adoption-max.jpg",
        },
      ],
      type: "Perro",
    },
  ] satisfies AdoptionListingPetProfileOption[],
  photoSamples: [
    {
      alt: "Foto para adopcion",
      id: "adoption-listing-photo-sample-1",
      mediaId: "adoption-listing-media-sample-1",
      status: "ready",
      thumbUri: "file:///adoption-listing-photo-sample-1-thumb.jpg",
      uri: "file:///adoption-listing-photo-sample-1.jpg",
    },
    {
      alt: "Foto adicional para adopcion",
      id: "adoption-listing-photo-sample-2",
      mediaId: "adoption-listing-media-sample-2",
      status: "ready",
      thumbUri: "file:///adoption-listing-photo-sample-2-thumb.jpg",
      uri: "file:///adoption-listing-photo-sample-2.jpg",
    },
  ] satisfies AdoptionListingPhoto[],
};
