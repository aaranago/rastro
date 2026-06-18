import type {
  LocalSponsorPlacement,
  ResourceProviderFixture,
  ResourceProviderProfile,
  ResourceProviderSummary,
} from "./resource-types";

const clinicSanRoque: ResourceProviderFixture = {
  id: "clinic-san-roque",
  name: "Clínica Veterinaria San Roque",
  categoryId: "veterinary",
  description: "Veterinaria especializada",
  approximateLocationLabel: "Sopocachi, La Paz",
  serviceAreaLabel: "Atiende La Paz y El Alto",
  distanceMeters: 800,
  exactLocation: {
    addressLabel: "Plaza Abaroa, La Paz",
    countryCode: "BO",
    latitude: -16.5103,
    locationCellLabel: "Sopocachi",
    longitude: -68.1299,
  },
  isVerified: true,
  emergencyAvailable: true,
  sponsorPlacement: {
    kind: "Local Sponsor Placement",
    label: "Patrocinado",
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    eligibleSurfaces: [
      "resources_directory",
      "provider_details",
      "report_success",
      "contextual_care_resources",
    ],
    safetyPolicy: {
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    },
  },
  logoUrl: "https://example.com/san-roque-logo.png",
  photoUrl: "https://example.com/san-roque-photo.png",
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 2 222 1111",
    },
    {
      kind: "whatsapp",
      label: "WhatsApp",
      value: "+591 70000001",
    },
    {
      kind: "directions",
      label: "Cómo llegar",
      value: "geo:-16.5109,-68.1213",
    },
  ],
};

const draMartaGomez: ResourceProviderFixture = {
  id: "dra-marta-gomez",
  name: "Consultorio Dra. Marta Gómez",
  categoryId: "veterinary",
  description: "Consultorio general",
  approximateLocationLabel: "Miraflores, La Paz",
  distanceMeters: 1200,
  exactLocation: {
    addressLabel: "Miraflores, La Paz",
    countryCode: "BO",
    latitude: -16.5006,
    locationCellLabel: "Miraflores",
    longitude: -68.1216,
  },
  isVerified: true,
  isOpenNow: true,
  logoUrl: "https://example.com/dra-marta.png",
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 2 222 3333",
    },
  ],
};

const huellasFelices: ResourceProviderFixture = {
  id: "huellas-felices",
  name: "Huellas Felices",
  categoryId: "shelter",
  description: "Refugio y adopción",
  approximateLocationLabel: "Achumani, La Paz",
  distanceMeters: 3500,
  exactLocation: {
    addressLabel: "Achumani, La Paz",
    countryCode: "BO",
    latitude: -16.5405,
    locationCellLabel: "Achumani",
    longitude: -68.0889,
  },
  photoUrl: "https://example.com/huellas-felices.png",
  contactOptions: [
    {
      kind: "whatsapp",
      label: "WhatsApp",
      value: "+591 70000002",
    },
  ],
};

const peludosFelices: ResourceProviderFixture = {
  id: "peludos-felices",
  name: "Peludos Felices",
  categoryId: "groomer",
  description: "Peluquería y baño",
  approximateLocationLabel: "Equipetrol, Santa Cruz",
  serviceAreaLabel: "Atiende Santa Cruz de la Sierra",
  distanceMeters: 4200,
  exactLocation: {
    addressLabel: "Equipetrol, Santa Cruz de la Sierra",
    countryCode: "BO",
    latitude: -17.7833,
    locationCellLabel: "Equipetrol",
    longitude: -63.1821,
  },
  logoUrl: "https://example.com/peludos-felices-logo.png",
  photoUrl: "https://example.com/peludos-felices.png",
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 3 333 4444",
    },
    {
      kind: "website",
      label: "Web",
      value: "https://peludos.example.com",
    },
  ],
};

const alimentosPatitas: ResourceProviderFixture = {
  id: "alimentos-patitas",
  name: "Alimentos Patitas",
  categoryId: "pet_food",
  description: "Alimento y nutrición",
  approximateLocationLabel: "Queru Queru, Cochabamba",
  serviceAreaLabel: "Atiende Cochabamba",
  exactLocation: {
    addressLabel: "Queru Queru, Cochabamba",
    countryCode: "BO",
    latitude: -17.3895,
    locationCellLabel: "Queru Queru",
    longitude: -66.1568,
  },
  isOpenNow: true,
  photoUrl: "https://example.com/alimentos-patitas.png",
  contactOptions: [
    {
      kind: "whatsapp",
      label: "WhatsApp",
      value: "+591 70000003",
    },
    {
      kind: "directions",
      label: "Cómo llegar",
      value: "geo:-17.3895,-66.1568",
    },
  ],
};

const kawsayEntrenamiento: ResourceProviderFixture = {
  id: "kawsay-entrenamiento",
  name: "Kawsay Entrenamiento",
  categoryId: "trainer",
  description: "Entrenamiento amable",
  approximateLocationLabel: "Tiquipaya, Cochabamba",
  serviceAreaLabel: "Clases en Cochabamba y alrededores",
  exactLocation: {
    addressLabel: "Tiquipaya, Cochabamba",
    countryCode: "BO",
    latitude: -17.3382,
    locationCellLabel: "Tiquipaya",
    longitude: -66.2154,
  },
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 4 444 5555",
    },
  ],
};

const tiendaAndina: ResourceProviderFixture = {
  id: "tienda-andina-mascotas",
  name: "Tienda Andina Mascotas",
  categoryId: "pet_store",
  description: "Accesorios y cuidado",
  approximateLocationLabel: "San Miguel, La Paz",
  exactLocation: {
    addressLabel: "San Miguel, La Paz",
    countryCode: "BO",
    latitude: -16.5413,
    locationCellLabel: "San Miguel",
    longitude: -68.0794,
  },
  logoUrl: "https://example.com/tienda-andina-logo.png",
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 2 222 7777",
    },
  ],
};

const petMovilBolivia: ResourceProviderFixture = {
  id: "pet-movil-bolivia",
  name: "Pet Móvil Bolivia",
  categoryId: "transport",
  description: "Traslado seguro",
  approximateLocationLabel: "Centro, Cochabamba",
  serviceAreaLabel: "Traslados urbanos programados",
  exactLocation: {
    addressLabel: "Centro, Cochabamba",
    countryCode: "BO",
    latitude: -17.3935,
    locationCellLabel: "Centro",
    longitude: -66.157,
  },
  isVerified: true,
  contactOptions: [
    {
      kind: "whatsapp",
      label: "WhatsApp",
      value: "+591 70000004",
    },
  ],
};

const apoyoMascotero: ResourceProviderFixture = {
  id: "apoyo-mascotero",
  name: "Apoyo Mascotero",
  categoryId: "other",
  description: "Orientación comunitaria",
  approximateLocationLabel: "Centro, Tarija",
  serviceAreaLabel: "Red de apoyo en Tarija",
  exactLocation: {
    addressLabel: "Centro, Tarija",
    countryCode: "BO",
    latitude: -21.5317,
    locationCellLabel: "Centro",
    longitude: -64.7312,
  },
  contactOptions: [
    {
      kind: "email",
      label: "Correo",
      value: "apoyo@example.com",
    },
  ],
};

const providers = [
  clinicSanRoque,
  draMartaGomez,
  huellasFelices,
  peludosFelices,
  alimentosPatitas,
  kawsayEntrenamiento,
  tiendaAndina,
  petMovilBolivia,
  apoyoMascotero,
] satisfies ResourceProviderFixture[];

const profiles = [
  {
    ...toPublicProviderSummary(clinicSanRoque),
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    shortDescription:
      "Atención veterinaria general, urgencias y orientación para familias que buscan apoyo cerca de La Paz.",
    websiteUrl: "https://sanroque.example.com",
    socialLinks: [
      {
        label: "Instagram",
        url: "https://instagram.example.com/sanroque",
      },
    ],
    externalLinks: [
      {
        label: "Ficha externa",
        url: "https://sanroque.example.com/ficha",
      },
    ],
  },
  {
    ...toPublicProviderSummary(peludosFelices),
    serviceAreaLabel: "Atiende Santa Cruz de la Sierra",
    hoursLabel: "Lun - Sáb: 09:00 - 19:00",
    shortDescription:
      "Servicios de peluquería, baño y cuidado básico para perros y gatos.",
  },
  {
    ...toPublicProviderSummary(alimentosPatitas),
    serviceAreaLabel: "Atiende Cochabamba",
    hoursLabel: "Lun - Sáb: 08:30 - 20:00",
    shortDescription:
      "Alimentos, orientación nutricional básica y productos de cuidado para mascotas en Cochabamba.",
  },
  {
    ...toPublicProviderSummary(kawsayEntrenamiento),
    serviceAreaLabel: "Clases en Cochabamba y alrededores",
    hoursLabel: "Lun - Vie: 09:00 - 18:00",
    shortDescription:
      "Entrenamiento amable para perros y acompañamiento a familias cuidadoras.",
  },
  {
    ...toPublicProviderSummary(tiendaAndina),
    serviceAreaLabel: "Atiende La Paz",
    hoursLabel: "Lun - Dom: 10:00 - 20:00",
    shortDescription:
      "Accesorios, camas, correas y productos de cuidado cotidiano para mascotas.",
  },
  {
    ...toPublicProviderSummary(petMovilBolivia),
    serviceAreaLabel: "Traslados urbanos programados",
    hoursLabel: "Con reserva: 07:00 - 21:00",
    shortDescription:
      "Traslado programado para mascotas dentro de la ciudad, con énfasis en seguridad y coordinación previa.",
  },
  {
    ...toPublicProviderSummary(apoyoMascotero),
    serviceAreaLabel: "Red de apoyo en Tarija",
    hoursLabel: "Mensajes: 09:00 - 18:00",
    shortDescription:
      "Orientación comunitaria para encontrar apoyo local cuando una mascota necesita ayuda.",
  },
] satisfies ResourceProviderProfile[];

export const rastroResourceFixtures = {
  providers,
  profiles,
};

function toPublicProviderSummary(
  provider: ResourceProviderFixture,
): ResourceProviderSummary {
  const { exactLocation: _exactLocation, ...summary } = provider;

  return {
    ...summary,
    contactOptions: summary.contactOptions.map((contact) => ({ ...contact })),
    sponsorPlacement: cloneLocalSponsorPlacement(summary.sponsorPlacement),
  };
}

function cloneLocalSponsorPlacement(
  placement: LocalSponsorPlacement | undefined,
) {
  if (placement === undefined) {
    return undefined;
  }

  return {
    ...placement,
    eligibleSurfaces: [...placement.eligibleSurfaces],
    safetyPolicy: {
      recoveryPriority: { ...placement.safetyPolicy.recoveryPriority },
      pushNotifications: { ...placement.safetyPolicy.pushNotifications },
    },
  };
}
