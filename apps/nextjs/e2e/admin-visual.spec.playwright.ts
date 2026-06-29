import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

type AdminTheme = "dark" | "light";

interface AdminRoute {
  breadcrumb: string;
  path: string;
}

const adminRoutes: readonly AdminRoute[] = [
  { breadcrumb: "Admin", path: "/admin" },
  { breadcrumb: "Moderación", path: "/admin/moderacion" },
  { breadcrumb: "Proveedores", path: "/admin/proveedores" },
  { breadcrumb: "Patrocinios", path: "/admin/patrocinios" },
  { breadcrumb: "Miembros", path: "/admin/miembros" },
  { breadcrumb: "Ajustes", path: "/admin/ajustes" },
  { breadcrumb: "Métricas", path: "/admin/metricas" },
  { breadcrumb: "Auditoría", path: "/admin/auditoria" },
];

const adminNavigationLabels = [
  "Resumen",
  "Moderación",
  "Proveedores",
  "Patrocinios",
  "Miembros",
  "Ajustes",
  "Métricas",
  "Auditoría",
] as const;

const moderationDecisionLabels = [
  /Ocultar publicación/i,
  /Ocultar reporte/i,
  /Restaurar publicación/i,
  /Restaurar reporte/i,
  /Marcar reporte falso/i,
  /Quitar marca falsa/i,
  /Descartar reporte falso/i,
  /Resolver con acción/i,
  /Resolver sin acción/i,
] as const;

test.beforeEach(async ({ page }, testInfo) => {
  const theme = getAdminTheme(testInfo.project.metadata.theme);

  await page.addInitScript((mode) => {
    window.localStorage.setItem("theme-mode", mode);
  }, theme);
});

test.describe("admin route visual smoke", () => {
  for (const route of adminRoutes) {
    test(`${route.path} has stable admin chrome and no visual QA residue`, async ({
      page,
    }, testInfo) => {
      await page.goto(route.path);

      await expect(page.locator("[data-admin-route-shell]")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Ruta de administración" }),
      ).toBeVisible();
      await expect(
        page.getByRole("group", { name: "Cambiar tema de color" }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveClass(
        new RegExp(`\\b${getAdminTheme(testInfo.project.metadata.theme)}\\b`),
      );
      await assertRouteBreadcrumb(page, route);

      if (isMobileProject(testInfo.project.name)) {
        await assertMobileNavigation(page);
      } else {
        await assertDesktopNavigation(page);
      }

      await assertNoHorizontalOverflow(page);
      await assertNoAdminCopyResidue(page);
      await assertNoDisabledModerationDecisionButtons(page);
    });
  }
});

async function assertRouteBreadcrumb(page: Page, route: AdminRoute) {
  const breadcrumbs = page.getByRole("navigation", {
    name: "Ruta de administración",
  });

  if (route.path === "/admin") {
    await expect(breadcrumbs).toContainText("Admin");
    return;
  }

  await expect(breadcrumbs).toContainText("Admin");
  await expect(breadcrumbs).toContainText(route.breadcrumb);
}

async function assertDesktopNavigation(page: Page) {
  const navigation = page.getByRole("navigation", {
    name: "Navegación de administración",
  });

  await expect(navigation).toBeVisible();

  for (const label of adminNavigationLabels) {
    await expect(navigation.getByRole("link", { name: label })).toBeVisible();
  }
}

async function assertMobileNavigation(page: Page) {
  await page.getByRole("button", { name: "Abrir navegación" }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();

  for (const label of adminNavigationLabels) {
    await expect(drawer.getByRole("link", { name: label })).toBeVisible();
  }

  await assertNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Cerrar navegación" }).click();
  await expect(drawer).toBeHidden();
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const viewportWidth = documentElement.clientWidth;
    const offenders = Array.from(body.querySelectorAll<HTMLElement>("*"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();

        return rect.width > 0 && rect.right - viewportWidth > 1;
      })
      .slice(0, 10)
      .map((element) => ({
        className: element.className.toString(),
        tagName: element.tagName.toLowerCase(),
        text: element.textContent.replace(/\s+/g, " ").trim().slice(0, 80),
      }));

    return {
      bodyScrollWidth: body.scrollWidth,
      documentScrollWidth: documentElement.scrollWidth,
      offenders,
      viewportWidth,
    };
  });

  expect(
    overflow.documentScrollWidth,
    JSON.stringify(overflow, null, 2),
  ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  expect(
    overflow.bodyScrollWidth,
    JSON.stringify(overflow, null, 2),
  ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

async function assertNoAdminCopyResidue(page: Page) {
  const bodyText = await page.locator("body").innerText();

  expect(bodyText).not.toMatch(/\bADMIN-/);
  expect(bodyText).not.toMatch(/\bDisponible\b/i);
}

async function assertNoDisabledModerationDecisionButtons(page: Page) {
  const disabledDecisionButtons = await page
    .locator('button:disabled, button[aria-disabled="true"]')
    .evaluateAll(
      (buttons, labels) =>
        buttons
          .map((button) => button.textContent.replace(/\s+/g, " ").trim())
          .filter((text) =>
            labels.some((label) => new RegExp(label, "i").test(text)),
          ),
      moderationDecisionLabels.map((label) => label.source),
    );

  expect(disabledDecisionButtons).toEqual([]);
}

function getAdminTheme(value: unknown): AdminTheme {
  return value === "dark" ? "dark" : "light";
}

function isMobileProject(projectName: string) {
  return projectName.includes("390x844") || projectName.includes("320x568");
}
