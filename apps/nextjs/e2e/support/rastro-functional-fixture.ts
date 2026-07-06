/* eslint-disable no-restricted-properties, turbo/no-undeclared-env-vars -- The E2E fixture owns raw process.env bootstrap before app env modules are loaded. */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ContactPreference,
  CreateReportInput,
  LocalSponsorPlacementSurface,
  PetSpecies,
  ReportType,
  ResourceProviderCategory,
} from "@acme/validators";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(fixtureDir, "../../../..");
const defaultManifestPath = join(
  workspaceRoot,
  ".scratch/e2e/rastro-functional/latest-fixture.json",
);

export const rastroE2EAccounts = {
  admin: {
    email:
      process.env.RASTRO_E2E_ADMIN_EMAIL ?? "rastro-e2e-admin@example.invalid",
    name: "Rastro E2E Admin",
    password: "Rastro-E2E-admin-2026!",
  },
  owner: {
    email: "rastro-e2e-owner@example.invalid",
    name: "Rastro E2E Dueña",
    password: "Rastro-E2E-owner-2026!",
  },
  viewer: {
    email: "rastro-e2e-viewer@example.invalid",
    name: "Rastro E2E Vecina",
    password: "Rastro-E2E-viewer-2026!",
  },
} as const;

const allAccounts = [
  rastroE2EAccounts.admin,
  rastroE2EAccounts.owner,
  rastroE2EAccounts.viewer,
] as const;

const providerNamePrefix = "Rastro E2E";
const reportTitlePrefix = "Rastro E2E";
const e2eObjectKeyPrefix = "rastro-e2e/";
const mediaVersion =
  process.env.RASTRO_E2E_MEDIA_VERSION ?? "visible-2026-06-30";
const sopocachi = {
  latitude: -16.5084,
  longitude: -68.1264,
};

const providerCategories = [
  "veterinary",
  "shelter",
  "groomer",
  "pet_food",
  "trainer",
  "pet_store",
  "transport",
  "other",
] as const satisfies readonly ResourceProviderCategory[];

const sponsorSurfaces = [
  "resources_directory",
  "provider_details",
  "launch_home_banner",
  "report_success",
  "contextual_care_resources",
] as const satisfies readonly LocalSponsorPlacementSurface[];

export interface RastroFunctionalFixtureManifest {
  accounts: {
    adminEmail: string;
    ownerEmail: string;
    viewerEmail: string;
  };
  artifacts: {
    manifestPath: string;
    mediaBaseUrl: string;
  };
  chat: {
    backendPersisted: true;
    reportId: string;
    sampleConversationId: string;
    seedMessageText: string;
  };
  providers: RastroProviderManifest[];
  promotions: RastroPromotionManifest[];
  reports: RastroReportManifest[];
  resourceSearch: {
    latitude: number;
    longitude: number;
    label: string;
    radiusMeters: number;
  };
}

export interface RastroProviderManifest {
  category: ResourceProviderCategory;
  id: string;
  logoUrl: string;
  name: string;
  photoUrl: string;
  providerDetailsPromotion?: boolean;
  resourcesDirectoryPromotion?: boolean;
}

export interface RastroPromotionManifest {
  disclosure: string;
  imageUrl: string;
  label: string;
  logoUrl: string;
  placementId: string;
  providerId: string;
  surface: LocalSponsorPlacementSurface;
}

export interface RastroReportManifest {
  contactPreference: ContactPreference;
  id: string;
  mediaUrls: string[];
  title: string;
  type: ReportType;
}

export interface CreateRastroFunctionalFixtureOptions {
  manifestPath?: string;
  mediaBaseUrl?: string;
}

export async function createRastroFunctionalFixture(
  options: CreateRastroFunctionalFixtureOptions = {},
): Promise<RastroFunctionalFixtureManifest> {
  loadRootEnv();
  ensureE2EAdminEmailConfigured();
  assertLocalDatabase();

  const mediaBaseUrl =
    options.mediaBaseUrl ??
    process.env.RASTRO_E2E_MEDIA_BASE_URL ??
    getDefaultMediaBaseUrl();
  const manifestPath = options.manifestPath ?? defaultManifestPath;
  const { db, sql, schema } = await loadDatabase();
  const auth = await createFixtureAuth(db);

  await cleanupRastroFunctionalData();

  const users = await createFixtureUsers({ auth, db, sql });
  const adminCaller = await createCallerForUser(users.admin);
  const ownerCaller = await createCallerForUser(users.owner);
  const viewerCaller = await createCallerForUser(users.viewer);
  const previousSettings = await adminCaller.admin.settings.get();

  await adminCaller.admin.settings.update({
    adoptionReviewModeEnabled: false,
    verifiedEmailRequiredToPublish: false,
  });

  const providers = await createProviders({
    adminCaller,
    mediaBaseUrl,
  });
  const promotions = await createPromotions({
    adminCaller,
    mediaBaseUrl,
    providers,
  });
  await configureViewerAlertFixture({ viewerCaller });
  const reports = await createReports({
    db,
    mediaBaseUrl,
    ownerCaller,
    ownerId: users.owner.id,
    schema,
  });
  const chat = await createPersistedChatFixture({
    reports,
    viewerCaller,
  });

  await adminCaller.admin.settings.update({
    adoptionReviewModeEnabled: previousSettings.adoptionReviewModeEnabled,
    verifiedEmailRequiredToPublish:
      previousSettings.verifiedEmailRequiredToPublish,
  });

  await smokeFixtureContracts({
    providers,
    promotions,
    reports,
    viewerCaller,
  });

  const manifest: RastroFunctionalFixtureManifest = {
    accounts: {
      adminEmail: rastroE2EAccounts.admin.email,
      ownerEmail: rastroE2EAccounts.owner.email,
      viewerEmail: rastroE2EAccounts.viewer.email,
    },
    artifacts: {
      manifestPath,
      mediaBaseUrl,
    },
    chat: {
      backendPersisted: true,
      reportId: chat.reportId,
      sampleConversationId: chat.conversationId,
      seedMessageText: chat.seedMessageText,
    },
    providers,
    promotions,
    reports,
    resourceSearch: {
      latitude: sopocachi.latitude,
      longitude: sopocachi.longitude,
      label: "Sopocachi, La Paz",
      radiusMeters: 15000,
    },
  };

  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}

export async function cleanupRastroFunctionalData() {
  loadRootEnv();
  ensureE2EAdminEmailConfigured();
  assertLocalDatabase();

  const { db, sql, schema } = await loadDatabase();
  const emailList = sql.join(
    allAccounts.map((account) => sql`${account.email}`),
    sql`, `,
  );

  await db.execute(
    sql`delete from ${schema.ReportMedia} where ${schema.ReportMedia.objectKey} like ${`${e2eObjectKeyPrefix}%`}`,
  );
  await db.execute(
    sql`delete from ${schema.Report} where ${schema.Report.title} like ${`${reportTitlePrefix}%`}`,
  );
  await db.execute(
    sql`delete from ${schema.ResourceProvider} where ${schema.ResourceProvider.name} like ${`${providerNamePrefix}%`}`,
  );
  await db.execute(sql`delete from "user" where email in (${emailList})`);
}

export function readRastroFunctionalFixtureManifest(
  manifestPath = defaultManifestPath,
) {
  return JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as RastroFunctionalFixtureManifest;
}

export function getDefaultRastroFixtureManifestPath() {
  return defaultManifestPath;
}

export async function createRastroFixtureCaller(
  account: keyof typeof rastroE2EAccounts,
) {
  loadRootEnv();
  ensureE2EAdminEmailConfigured();
  assertLocalDatabase();

  const { db, sql } = await loadDatabase();
  const email = rastroE2EAccounts[account].email;
  const result = await db.execute<{
    email: string;
    email_verified: boolean;
    id: string;
    name: string;
  }>(
    sql`select id, email, name, email_verified from "user" where email = ${email}`,
  );
  const [user] = rowsFromExecuteResult<{
    email: string;
    email_verified: boolean;
    id: string;
    name: string;
  }>(result);

  if (!user) {
    throw new Error(`Missing Rastro E2E account for caller: ${account}`);
  }

  return createCallerForUser({
    email: user.email,
    emailVerified: user.email_verified,
    id: user.id,
    name: user.name,
  });
}

function loadRootEnv() {
  const envPath = join(workspaceRoot, ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);

    if (!match) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2] ?? "";

    if (!key) {
      continue;
    }

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unquoteEnvValue(rawValue);
  }
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function getDefaultMediaBaseUrl() {
  const appBaseUrl =
    process.env.RASTRO_E2E_APP_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://127.0.0.1:3000";

  return `${appBaseUrl.replace(/\/+$/, "")}/e2e-media`;
}

function ensureE2EAdminEmailConfigured() {
  const email = rastroE2EAccounts.admin.email;
  const current = process.env.RASTRO_ADMIN_EMAILS ?? "";
  const emails = current.split(/[\s,]+/).filter(Boolean);

  if (!emails.includes(email)) {
    process.env.RASTRO_ADMIN_EMAILS = [email, ...emails].join(" ");
  }
}

function assertLocalDatabase() {
  if (process.env.RASTRO_E2E_ALLOW_NONLOCAL_DB === "1") {
    return;
  }

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("POSTGRES_URL is required for the Rastro E2E fixture.");
  }

  if (
    !/(localhost|127\.0\.0\.1|0\.0\.0\.0|postgres|db)(:|\/|$)/i.test(
      connectionString,
    )
  ) {
    throw new Error(
      "Refusing to run Rastro E2E fixture against a non-local POSTGRES_URL. Set RASTRO_E2E_ALLOW_NONLOCAL_DB=1 to override intentionally.",
    );
  }
}

async function loadDatabase() {
  const [{ db }, { sql }, schema] = await Promise.all([
    import("@acme/db/client"),
    import("@acme/db"),
    import("@acme/db/schema"),
  ]);

  return { db, schema, sql };
}

async function createFixtureAuth(db: unknown) {
  const { createDrizzleAuthDatabase, initAuth } = await import("@acme/auth");

  return initAuth({
    baseUrl: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3201",
    database: createDrizzleAuthDatabase(db as never),
    productionUrl: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3201",
    secret: process.env.AUTH_SECRET ?? "rastro-e2e-secret",
  });
}

async function createFixtureUsers({
  auth,
  db,
  sql,
}: {
  auth: Awaited<ReturnType<typeof createFixtureAuth>>;
  db: Awaited<ReturnType<typeof loadDatabase>>["db"];
  sql: Awaited<ReturnType<typeof loadDatabase>>["sql"];
}) {
  for (const account of allAccounts) {
    await auth.api.signUpEmail({
      body: {
        callbackURL: "/",
        email: account.email,
        name: account.name,
        password: account.password,
      },
    });
  }

  const emailList = sql.join(
    allAccounts.map((account) => sql`${account.email}`),
    sql`, `,
  );

  await db.execute(
    sql`update "user" set email_verified = true where email in (${emailList})`,
  );

  const result = await db.execute<{
    email: string;
    email_verified: boolean;
    id: string;
    name: string;
  }>(
    sql`select id, email, name, email_verified from "user" where email in (${emailList})`,
  );
  const users = rowsFromExecuteResult<{
    email: string;
    email_verified: boolean;
    id: string;
    name: string;
  }>(result);
  const userByEmail = new Map(users.map((user) => [user.email, user]));

  return {
    admin: requireFixtureUser(userByEmail, rastroE2EAccounts.admin.email),
    owner: requireFixtureUser(userByEmail, rastroE2EAccounts.owner.email),
    viewer: requireFixtureUser(userByEmail, rastroE2EAccounts.viewer.email),
  };
}

function requireFixtureUser(
  userByEmail: Map<
    string,
    { email: string; email_verified: boolean; id: string; name: string }
  >,
  email: string,
) {
  const user = userByEmail.get(email);

  if (!user) {
    throw new Error(`Rastro E2E user was not created: ${email}`);
  }

  return {
    email: user.email,
    emailVerified: user.email_verified,
    id: user.id,
    name: user.name,
  };
}

async function createCallerForUser(user: {
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
}) {
  const { appRouter, createTRPCContext } = await import("@acme/api");
  const headers = new Headers();
  headers.set("x-trpc-source", "rastro-functional-e2e-fixture");

  const context = await createTRPCContext({
    adminEmailList: process.env.RASTRO_ADMIN_EMAILS,
    auth: {
      api: {
        getSession: () =>
          Promise.resolve({
            session: {
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              id: `e2e-session-${user.id}`,
              token: `e2e-token-${user.id}`,
              updatedAt: new Date(),
              userId: user.id,
            },
            user: {
              email: user.email,
              emailVerified: user.emailVerified,
              id: user.id,
              image: null,
              name: user.name,
            },
          }),
      },
    } as never,
    headers,
  });

  return appRouter.createCaller(context);
}

async function createProviders({
  adminCaller,
  mediaBaseUrl,
}: {
  adminCaller: Awaited<ReturnType<typeof createCallerForUser>>;
  mediaBaseUrl: string;
}) {
  const providers: RastroProviderManifest[] = [];

  for (const [index, category] of providerCategories.entries()) {
    const provider = await adminCaller.resources.admin.createProvider(
      buildProviderInput({
        category,
        index,
        mediaBaseUrl,
      }),
    );
    const verifiedProvider =
      index % 2 === 0
        ? await adminCaller.resources.admin.updateVerification({
            note: `Verificación E2E ${category}.`,
            providerId: provider.id,
            status: "verified",
          })
        : provider;

    providers.push({
      category,
      id: verifiedProvider.id,
      logoUrl: verifiedProvider.logoUrl ?? "",
      name: verifiedProvider.name,
      photoUrl: verifiedProvider.photoUrl ?? "",
    });
  }

  const clinic = providers[0];

  if (clinic) {
    const beforeLogo = clinic.logoUrl;
    const beforePhoto = clinic.photoUrl;
    const updatedClinic = await adminCaller.resources.admin.updateProvider({
      hoursLabel: "Lun - Sab: 08:00 a 18:00. Guardia E2E confirmada.",
      providerId: clinic.id,
      serviceAreaLabel: "Sopocachi, Miraflores, El Alto y Viacha",
    });

    if (
      updatedClinic.logoUrl !== beforeLogo ||
      updatedClinic.photoUrl !== beforePhoto
    ) {
      throw new Error("Provider update dropped logoUrl or photoUrl.");
    }

    clinic.logoUrl = updatedClinic.logoUrl ?? "";
    clinic.photoUrl = updatedClinic.photoUrl ?? "";
  }

  return providers;
}

function buildProviderInput({
  category,
  index,
  mediaBaseUrl,
}: {
  category: ResourceProviderCategory;
  index: number;
  mediaBaseUrl: string;
}) {
  const label = getProviderCategoryLabel(category);
  const city = "La Paz";
  const department = "La Paz";
  const latitude = sopocachi.latitude + index * 0.006;
  const longitude = sopocachi.longitude + index * 0.006;
  const locationCell = "bo-lpb-sopocachi";
  const locationLabel = "Sopocachi, La Paz";

  return {
    category,
    contactOptions: buildProviderContacts(index),
    description:
      category === "veterinary"
        ? `${providerNamePrefix} Clinica veterinaria con logo y foto completa.`
        : `${providerNamePrefix} ${label} con cobertura local verificada.`,
    emergencyAvailable: index % 3 === 0,
    externalLinks: [
      {
        label: "Ficha municipal",
        url: `https://example.com/rastro/e2e/${category}/municipal`,
      },
    ],
    hoursLabel: "Lun - Sab: 08:00 a 18:00",
    isOpenNow: index % 2 === 0,
    location: {
      addressLabel: `${100 + index} Calle E2E, ${locationLabel}`,
      approximateLocationLabel: locationLabel,
      city,
      department,
      exactLatitude: latitude,
      exactLongitude: longitude,
      locationCell,
    },
    logoUrl: `${mediaBaseUrl}/provider-logo.png?provider=${category}&v=${encodeURIComponent(mediaVersion)}`,
    name:
      category === "veterinary"
        ? `${providerNamePrefix} Veterinaria Clinica Dos Imagenes`
        : `${providerNamePrefix} ${label}`,
    photoUrl: `${mediaBaseUrl}/provider-photo.png?provider=${category}&v=${encodeURIComponent(mediaVersion)}`,
    serviceAreaLabel: "Sopocachi, Miraflores, El Alto y Viacha",
    shortDescription:
      "Proveedor local sembrado por E2E para verificar horarios, mapas, fotos, redes, contactos y patrocinios sin afectar prioridad de recuperación.",
    socialLinks: [
      {
        label: "Instagram",
        url: `https://instagram.com/rastro_e2e_${category}`,
      },
      {
        label: "Facebook",
        url: `https://facebook.com/rastro-e2e-${category}`,
      },
    ],
    websiteUrl: `https://example.com/rastro/e2e/${category}`,
  };
}

function buildProviderContacts(index: number) {
  const contacts = [
    {
      kind: "whatsapp" as const,
      label: "WhatsApp institucional",
      value: `+5917000000${index}`,
    },
    {
      kind: "phone" as const,
      label: "Llamar",
      value: `+5912200000${index}`,
    },
    {
      kind: "email" as const,
      label: "Correo",
      value: `proveedor-e2e-${index}@example.invalid`,
    },
    {
      kind: "directions" as const,
      label: "Mapa",
      value: `https://maps.google.com/?q=${sopocachi.latitude},${sopocachi.longitude}`,
    },
    {
      kind: "website" as const,
      label: "Web",
      value: `https://example.com/rastro/e2e/contacto-${index}`,
    },
    {
      kind: "social" as const,
      label: "Instagram",
      value: `https://instagram.com/rastro_e2e_contacto_${index}`,
    },
  ];

  return contacts.slice(0, Math.min(contacts.length, 3 + (index % 4)));
}

async function createPromotions({
  adminCaller,
  mediaBaseUrl,
  providers,
}: {
  adminCaller: Awaited<ReturnType<typeof createCallerForUser>>;
  mediaBaseUrl: string;
  providers: RastroProviderManifest[];
}) {
  const promotions: RastroPromotionManifest[] = [];

  for (const [index, surface] of sponsorSurfaces.entries()) {
    const provider = providers[index];

    if (!provider) {
      throw new Error(`Missing provider for sponsor surface ${surface}`);
    }

    const placement = await adminCaller.resources.admin.createSponsor({
      disclosure:
        "Patrocinado E2E: apoyo local visible sin cambiar prioridad de recuperación.",
      endsOn: dateOnlyFromNow(30),
      imageUrl: `${mediaBaseUrl}/sponsor-banner.png?surface=${surface}&v=${encodeURIComponent(mediaVersion)}`,
      label: `E2E ${getSponsorSurfaceLabel(surface)}`,
      logoUrl: `${mediaBaseUrl}/sponsor-logo.png?surface=${surface}&v=${encodeURIComponent(mediaVersion)}`,
      providerId: provider.id,
      startsOn: dateOnlyFromNow(-1),
      surface,
    });

    if (surface === "resources_directory") {
      provider.resourcesDirectoryPromotion = true;
    }

    if (surface === "provider_details") {
      provider.providerDetailsPromotion = true;
    }

    promotions.push({
      disclosure: placement.disclosure,
      imageUrl: placement.imageUrl ?? "",
      label: placement.label,
      logoUrl: placement.logoUrl ?? "",
      placementId: placement.placementId,
      providerId: placement.providerId,
      surface,
    });
  }

  return promotions;
}

async function createReports({
  db,
  mediaBaseUrl,
  ownerCaller,
  ownerId,
  schema,
}: {
  db: Awaited<ReturnType<typeof loadDatabase>>["db"];
  mediaBaseUrl: string;
  ownerCaller: Awaited<ReturnType<typeof createCallerForUser>>;
  ownerId: string;
  schema: Awaited<ReturnType<typeof loadDatabase>>["schema"];
}) {
  const reports: RastroReportManifest[] = [];
  const reportCases = [
    {
      contactPreference: "both",
      mediaCount: 2,
      petName: "Kira",
      species: "dog",
      title: `${reportTitlePrefix} Mascota Perdida Kira`,
      type: "lost_pet",
    },
    {
      contactPreference: "whatsapp",
      mediaCount: 1,
      petName: "Gato encontrado",
      species: "cat",
      title: `${reportTitlePrefix} Mascota Encontrada Centro`,
      type: "found_pet",
    },
    {
      contactPreference: "in_app_chat",
      mediaCount: 1,
      petName: undefined,
      species: "dog",
      title: `${reportTitlePrefix} Avistamiento Can Zona Sur`,
      type: "sighting",
    },
    {
      contactPreference: "both",
      mediaCount: 1,
      petName: "Luna",
      species: "cat",
      title: `${reportTitlePrefix} Adopción Luna Tranquila`,
      type: "adoption",
    },
  ] as const satisfies readonly {
    contactPreference: ContactPreference;
    mediaCount: number;
    petName?: string;
    species: PetSpecies;
    title: string;
    type: ReportType;
  }[];

  for (const [index, reportCase] of reportCases.entries()) {
    const idempotencyKey = `rastro-e2e-${reportCase.type}-${index}`;
    const media = await createReadyReportMedia({
      db,
      draftId: idempotencyKey,
      mediaBaseUrl,
      ownerId,
      reportType: reportCase.type,
      schema,
      total: reportCase.mediaCount,
    });
    const input: CreateReportInput = {
      contact: {
        preference: reportCase.contactPreference,
        whatsappPhone:
          reportCase.contactPreference === "in_app_chat"
            ? undefined
            : `+5917100000${index}`,
      },
      description:
        "Reporte E2E con datos completos para validar detalle público, contactos, privacidad de ubicación, galería y superficies de promoción.",
      eventOccurredAt: new Date(
        Date.now() - (index + 1) * 60 * 60 * 1000,
      ).toISOString(),
      idempotencyKey,
      location: {
        exactLatitude: sopocachi.latitude + index * 0.002,
        exactLongitude: sopocachi.longitude + index * 0.002,
        exposeExactLocation: false,
        label: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
      },
      media: media.map((item, mediaIndex) => ({
        altText: `Foto E2E ${mediaIndex + 1} para ${reportCase.title}`,
        mediaId: item.id,
      })),
      pet: {
        breed: reportCase.type === "sighting" ? undefined : "Mestizo",
        color: index % 2 === 0 ? "Cafe y blanco" : "Gris claro",
        distinguishingTraits: "Datos sembrados para prueba integral de Rastro.",
        name: reportCase.petName,
        size: index % 2 === 0 ? "Mediano" : "Pequeno",
        species: reportCase.species,
      },
      title: reportCase.title,
      type: reportCase.type,
    };
    const report = await ownerCaller.report.create(input);

    reports.push({
      contactPreference: report.contact.preference,
      id: report.id,
      mediaUrls: media.map((item) => item.url),
      title: report.title,
      type: report.type,
    });
  }

  return reports;
}

async function createPersistedChatFixture({
  reports,
  viewerCaller,
}: {
  reports: RastroReportManifest[];
  viewerCaller: Awaited<ReturnType<typeof createCallerForUser>>;
}) {
  const report = reports.find(
    (candidate) =>
      candidate.contactPreference === "in_app_chat" ||
      candidate.contactPreference === "both",
  );

  if (!report) {
    throw new Error("Missing chat-enabled report fixture.");
  }

  const conversation = await viewerCaller.chat.openReportConversation({
    reportId: report.id,
  });
  const seedMessageText = "Chat E2E persistido desde fixture";

  await viewerCaller.chat.sendMessage({
    conversationId: conversation.id,
    text: seedMessageText,
  });

  return {
    conversationId: conversation.id,
    reportId: report.id,
    seedMessageText,
  };
}

async function configureViewerAlertFixture({
  viewerCaller,
}: {
  viewerCaller: Awaited<ReturnType<typeof createCallerForUser>>;
}) {
  await viewerCaller.alerts.upsertSettings({
    categories: ["lost_pet"],
    radiusMeters: 5000,
  });
  await viewerCaller.alerts.recordLocation({
    label: "Sopocachi, La Paz",
    latitude: sopocachi.latitude,
    locationCell: "bo-lpb-sopocachi",
    longitude: sopocachi.longitude,
  });
}

async function createReadyReportMedia({
  db,
  draftId,
  mediaBaseUrl,
  ownerId,
  reportType,
  schema,
  total,
}: {
  db: Awaited<ReturnType<typeof loadDatabase>>["db"];
  draftId: string;
  mediaBaseUrl: string;
  ownerId: string;
  reportType: ReportType;
  schema: Awaited<ReturnType<typeof loadDatabase>>["schema"];
  total: number;
}) {
  const media = Array.from({ length: total }, (_, index) => {
    const id = randomUUID();
    const asset = index % 2 === 0 ? "report-photo.png" : "report-alt-photo.png";

    return {
      id,
      url: `${mediaBaseUrl}/${asset}?media=${id}&v=${encodeURIComponent(mediaVersion)}`,
    };
  });

  await db.insert(schema.ReportMedia).values(
    media.map((item, index) => ({
      canonicalUrl: item.url,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      height: 720,
      id: item.id,
      kind: "photo" as const,
      mimeType: "image/png",
      objectKey: `${e2eObjectKeyPrefix}${item.id}.png`,
      ownerId,
      position: null,
      reportId: null,
      sizeBytes: 4096 + index,
      status: "ready" as const,
      uploadDraftId: draftId,
      uploadReportType: reportType,
      verifiedAt: new Date(),
      width: 960,
    })),
  );

  return media;
}

async function smokeFixtureContracts({
  providers,
  promotions,
  reports,
  viewerCaller,
}: {
  providers: RastroProviderManifest[];
  promotions: RastroPromotionManifest[];
  reports: RastroReportManifest[];
  viewerCaller: Awaited<ReturnType<typeof createCallerForUser>>;
}) {
  const nearbyProviders = await viewerCaller.resources.nearby({
    latitude: sopocachi.latitude,
    longitude: sopocachi.longitude,
    limit: 100,
    radiusMeters: 15000,
    strategy: "postgis_radius",
  });
  const nearbyProviderIds = new Set(
    nearbyProviders.results.map((provider) => provider.id),
  );

  for (const provider of providers) {
    if (!nearbyProviderIds.has(provider.id)) {
      throw new Error(
        `Provider is missing from nearby search: ${provider.name}`,
      );
    }
  }

  for (const promotion of promotions) {
    if (
      promotion.surface === "resources_directory" &&
      !nearbyProviders.results.some(
        (provider) =>
          provider.id === promotion.providerId &&
          provider.sponsorPlacement?.eligibleSurfaces.includes(
            "resources_directory",
          ),
      )
    ) {
      throw new Error(
        "Resources-directory sponsor is missing from nearby API.",
      );
    }
  }

  const detailProvider = providers.find(
    (provider) => provider.providerDetailsPromotion,
  );

  if (!detailProvider) {
    throw new Error("Missing provider-details promotion fixture.");
  }

  const detail = await viewerCaller.resources.detail({
    providerId: detailProvider.id,
  });

  if (
    !detail.sponsorPlacement?.eligibleSurfaces.includes("provider_details") ||
    !detail.logoUrl ||
    !detail.photoUrl
  ) {
    throw new Error("Provider detail sponsor/logo/photo contract failed.");
  }

  for (const report of reports) {
    const detail = await viewerCaller.report.detail({ id: report.id });

    if (detail.owner.isCurrentMember) {
      throw new Error(
        "Second user should not be the owner of fixture reports.",
      );
    }

    if (detail.media.length !== report.mediaUrls.length) {
      throw new Error(`Report media count mismatch for ${report.title}`);
    }
  }
}

function rowsFromExecuteResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }

  return [];
}

function dateOnlyFromNow(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);

  return date.toISOString().slice(0, 10);
}

function getProviderCategoryLabel(category: ResourceProviderCategory) {
  switch (category) {
    case "veterinary":
      return "Veterinaria";
    case "shelter":
      return "Refugio";
    case "groomer":
      return "Peluquería";
    case "pet_food":
      return "Alimento";
    case "trainer":
      return "Entrenamiento";
    case "pet_store":
      return "Tienda";
    case "transport":
      return "Transporte";
    case "other":
      return "Servicio";
  }
}

function getSponsorSurfaceLabel(surface: LocalSponsorPlacementSurface) {
  switch (surface) {
    case "resources_directory":
      return "Directorio";
    case "provider_details":
      return "Perfil";
    case "launch_home_banner":
      return "Inicio";
    case "report_success":
      return "Reporte";
    case "contextual_care_resources":
      return "Cuidado";
  }
}
