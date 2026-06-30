import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { RastroFunctionalFixtureManifest } from "./support/rastro-functional-fixture";
import {
  cleanupRastroFunctionalData,
  createRastroFixtureCaller,
  createRastroFunctionalFixture,
  rastroE2EAccounts,
} from "./support/rastro-functional-fixture";

const functionalProjectName = "chromium-390x844-light";
const providerCategories = [
  "veterinary",
  "shelter",
  "groomer",
  "pet_food",
  "trainer",
  "pet_store",
  "transport",
  "other",
] as const;
const sponsorSurfaces = [
  "resources_directory",
  "provider_details",
  "launch_home_banner",
  "report_success",
  "contextual_care_resources",
] as const;
const reportTypes = ["lost_pet", "found_pet", "sighting", "adoption"] as const;

let manifest: RastroFunctionalFixtureManifest | undefined;

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(180_000);

  if (!isFunctionalProject(testInfo)) {
    return;
  }

  manifest = await createRastroFunctionalFixture();
});

test.afterAll(async ({}, testInfo) => {
  if (
    !isFunctionalProject(testInfo) ||
    process.env.RASTRO_E2E_CLEANUP !== "1"
  ) {
    return;
  }

  await cleanupRastroFunctionalData();
});

test.beforeEach(async ({}, testInfo) => {
  test.skip(
    !isFunctionalProject(testInfo),
    "The deep Rastro functional E2E runs once; admin visual smoke covers the viewport/theme matrix.",
  );
});

test("fixture creates every provider, sponsor surface, and report contract", async () => {
  const fixture = requireManifest();
  const viewerCaller = await createRastroFixtureCaller("viewer");

  expect(
    new Set(fixture.providers.map((provider) => provider.category)),
  ).toEqual(new Set(providerCategories));
  expect(
    new Set(fixture.promotions.map((promotion) => promotion.surface)),
  ).toEqual(new Set(sponsorSurfaces));
  expect(new Set(fixture.reports.map((report) => report.type))).toEqual(
    new Set(reportTypes),
  );

  const nearby = await viewerCaller.resources.nearby({
    latitude: fixture.resourceSearch.latitude,
    longitude: fixture.resourceSearch.longitude,
    limit: 100,
    radiusMeters: fixture.resourceSearch.radiusMeters,
    strategy: "postgis_radius",
  });

  for (const provider of fixture.providers) {
    const result = nearby.results.find((item) => item.id === provider.id);

    expect(result, provider.name).toBeDefined();
    expect(result?.approximateLocation?.precision).toBe("approximate");
    expect(result?.logoUrl).toBe(provider.logoUrl);
    expect(result?.photoUrl).toBe(provider.photoUrl);
  }

  const directorySponsor = fixture.promotions.find(
    (promotion) => promotion.surface === "resources_directory",
  );
  const directoryProvider = nearby.results.find(
    (provider) => provider.id === directorySponsor?.providerId,
  );

  expect(directoryProvider?.sponsorPlacement?.eligibleSurfaces).toContain(
    "resources_directory",
  );
  expect(
    directoryProvider?.sponsorPlacement?.safetyPolicy.recoveryPriority
      .canAffect,
  ).toBe(false);
  expect(
    directoryProvider?.sponsorPlacement?.safetyPolicy.pushNotifications,
  ).toEqual({ eligible: false });

  const profileSponsor = fixture.promotions.find(
    (promotion) => promotion.surface === "provider_details",
  );
  const profile = await viewerCaller.resources.detail({
    providerId: requireValue(profileSponsor?.providerId, "profile sponsor"),
  });

  expect(profile.sponsorPlacement?.eligibleSurfaces).toContain(
    "provider_details",
  );
  expect(profile.logoUrl).toContain("provider-logo.png");
  expect(profile.photoUrl).toContain("provider-photo.png");
  expect(JSON.stringify(profile)).not.toContain("Calle E2E");
  expect(JSON.stringify(profile)).not.toContain("Verificación E2E");

  for (const report of fixture.reports) {
    const detail = await viewerCaller.report.detail({ id: report.id });

    expect(detail.type).toBe(report.type);
    expect(detail.title).toBe(report.title);
    expect(detail.owner.isCurrentMember).toBe(false);
    expect(detail.location.precision).toBe("approximate");
    expect(detail.media).toHaveLength(report.mediaUrls.length);

    if (report.contactPreference === "in_app_chat") {
      expect(detail.contact.actions.map((action) => action.kind)).toEqual([
        "in_app_chat",
      ]);
    } else if (report.contactPreference === "whatsapp") {
      expect(detail.contact.actions.map((action) => action.kind)).toEqual([
        "whatsapp",
      ]);
    } else {
      expect(detail.contact.actions.map((action) => action.kind)).toEqual([
        "in_app_chat",
        "whatsapp",
      ]);
    }
  }
});

test("admin can see seeded providers, images, and promotions", async ({
  page,
}, testInfo) => {
  const fixture = requireManifest();

  await signInAsAdmin(page);

  await page.goto("/admin/proveedores?search=Rastro%20E2E&pageSize=50");
  await expect(page.locator("[data-admin-route-shell]")).toBeVisible();
  await expect(page.getByText("Acceso restringido")).toHaveCount(0);

  for (const provider of fixture.providers) {
    await expect(page.getByText(provider.name).first()).toBeVisible();
  }

  await assertNoHorizontalOverflow(page);
  await assertLoadedImages(page);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("admin-proveedores-rastro-e2e.png"),
  });

  await page.goto("/admin/patrocinios?search=E2E&pageSize=50");

  for (const promotion of fixture.promotions) {
    const provider = requireValue(
      fixture.providers.find((item) => item.id === promotion.providerId),
      `provider for ${promotion.surface}`,
    );

    await expect(page.getByText(provider.name).first()).toBeVisible();
    await expect(
      page.getByText(getAdminSponsorSurfaceLabel(promotion.surface)).first(),
    ).toBeVisible();
  }

  await expect(
    page.getByText(/Prioridad de recuperación/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/No afecta prioridad/i).first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await assertLoadedImages(page);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("admin-patrocinios-rastro-e2e.png"),
  });
});

test("public report pages render second-user contact and photos", async ({
  page,
}, testInfo) => {
  const fixture = requireManifest();
  const publicReports = [
    {
      pathPrefix: "/reportes/perdidos",
      report: requireReport(fixture, "lost_pet"),
    },
    {
      pathPrefix: "/adopciones",
      report: requireReport(fixture, "adoption"),
    },
  ];

  for (const { pathPrefix, report } of publicReports) {
    await page.goto(`${pathPrefix}/${report.id}`);
    await expect(
      page.getByRole("heading", { name: report.title }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contacto" })).toBeVisible();

    if (report.contactPreference === "both") {
      await expect(page.getByRole("link", { name: /WhatsApp/i })).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Rastro/i }).first(),
      ).toBeVisible();
    }

    await assertNoHorizontalOverflow(page);
    await assertLoadedImages(page);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(
        `public-${report.type.replace(/_/g, "-")}-rastro-e2e.png`,
      ),
    });
  }
});

test.fixme(
  "second-user chat contact is still route-local and not backend persisted",
  async () => {
    expect(requireManifest().chat.backendPersisted).toBe(false);
  },
);

function isFunctionalProject(testInfo: TestInfo) {
  return testInfo.project.name === functionalProjectName;
}

function requireManifest() {
  if (!manifest) {
    throw new Error("Rastro functional fixture was not created.");
  }

  return manifest;
}

function requireReport(
  fixture: RastroFunctionalFixtureManifest,
  type: (typeof reportTypes)[number],
) {
  const report = fixture.reports.find((candidate) => candidate.type === type);

  if (!report) {
    throw new Error(`Missing report fixture for ${type}`);
  }

  return report;
}

function requireValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${label}`);
  }

  return value;
}

function getAdminSponsorSurfaceLabel(
  surface: RastroFunctionalFixtureManifest["promotions"][number]["surface"],
) {
  switch (surface) {
    case "resources_directory":
      return "Directorio de recursos";
    case "provider_details":
      return "Perfil del proveedor";
    case "launch_home_banner":
      return "Inicio de lanzamiento";
    case "report_success":
      return "Confirmación de reporte";
    case "contextual_care_resources":
      return "Cuidados contextuales";
  }
}

async function signInAsAdmin(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: {
      callbackURL: "/",
      email: rastroE2EAccounts.admin.email,
      password: rastroE2EAccounts.admin.password,
    },
  });

  expect(
    response.ok(),
    `Admin sign-in failed with ${response.status()}: ${await response.text()}`,
  ).toBe(true);
}

async function assertLoadedImages(page: Page) {
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image): image is HTMLImageElement => image.tagName === "IMG")
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute("src") ?? image.outerHTML),
  );

  expect(brokenImages).toEqual([]);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const viewportWidth = documentElement.clientWidth;
    const offenders = Array.from(
      document.body.querySelectorAll<HTMLElement>("*"),
    )
      .filter((element) => {
        const rect = element.getBoundingClientRect();

        return rect.width > 0 && rect.right - viewportWidth > 1;
      })
      .slice(0, 10)
      .map((element) => ({
        className: element.className.toString(),
        tagName: element.tagName.toLowerCase(),
        text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 80),
      }));

    return {
      documentScrollWidth: documentElement.scrollWidth,
      offenders,
      viewportWidth,
    };
  });

  expect(
    overflow.documentScrollWidth,
    JSON.stringify(overflow, null, 2),
  ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}
