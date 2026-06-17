import type {
  ResourceProviderProfile,
  ResourceProviderSummary,
} from "./resource-types";

const clinicSanRoque: ResourceProviderSummary = {
  id: "clinic-san-roque",
  name: "Clínica Veterinaria San Roque",
  categoryId: "veterinary",
  description: "Veterinaria especializada",
  approximateLocationLabel: "Sopocachi, La Paz",
  distanceMeters: 800,
  isVerified: true,
  emergencyAvailable: true,
  sponsorPlacement: {
    label: "Patrocinado",
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
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

const draMartaGomez: ResourceProviderSummary = {
  id: "dra-marta-gomez",
  name: "Consultorio Dra. Marta Gómez",
  categoryId: "veterinary",
  description: "Consultorio general",
  approximateLocationLabel: "Miraflores, La Paz",
  distanceMeters: 1200,
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

const huellasFelices: ResourceProviderSummary = {
  id: "huellas-felices",
  name: "Huellas Felices",
  categoryId: "shelter",
  description: "Refugio y adopción",
  approximateLocationLabel: "Achumani, La Paz",
  distanceMeters: 3500,
  photoUrl: "https://example.com/huellas-felices.png",
  contactOptions: [
    {
      kind: "whatsapp",
      label: "WhatsApp",
      value: "+591 70000002",
    },
  ],
};

const peludosFelices: ResourceProviderSummary = {
  id: "peludos-felices",
  name: "Peludos Felices",
  categoryId: "groomer",
  description: "Peluquería y baño",
  approximateLocationLabel: "Equipetrol, Santa Cruz",
  serviceAreaLabel: "Atiende Santa Cruz de la Sierra",
  distanceMeters: 4200,
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

const providers = [
  clinicSanRoque,
  draMartaGomez,
  huellasFelices,
  peludosFelices,
] satisfies ResourceProviderSummary[];

const profiles = [
  {
    ...clinicSanRoque,
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
  },
  {
    ...peludosFelices,
    hoursLabel: "Lun - Sáb: 09:00 - 19:00",
    shortDescription:
      "Servicios de peluquería, baño y cuidado básico para perros y gatos.",
  },
] satisfies ResourceProviderProfile[];

export const rastroResourceFixtures = {
  providers,
  profiles,
};
