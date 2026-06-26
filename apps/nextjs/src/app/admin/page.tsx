import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";

import { adminNavigationItems } from "~/admin-ui/admin-navigation";

export const metadata: Metadata = {
  title: "Overview admin | Rastro",
};

const availableSections = adminNavigationItems.filter(
  (item) => item.status === "available" && item.href !== "/admin",
);
const plannedSections = adminNavigationItems.filter(
  (item) => item.status === "planned",
);

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Badge className="w-fit" variant="secondary">
            Fundación admin
          </Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            Panel de administración
          </h2>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 sm:text-base">
            Punto de entrada para moderación, Resource Providers, patrocinios,
            miembros y métricas operativas de Rastro en Bolivia.
          </p>
        </div>
      </section>

      <Alert>
        <AlertTitle>Rutas planificadas marcadas explícitamente</AlertTitle>
        <AlertDescription>
          <p>
            Las secciones con etiqueta Planificado todavía no tienen CRUD
            productivo en esta ola. No ejecutan acciones ni prometen cambios de
            datos.
          </p>
        </AlertDescription>
      </Alert>

      <section
        aria-labelledby="admin-available-sections"
        className="grid gap-4"
      >
        <div>
          <h3
            className="text-xl font-semibold tracking-normal"
            id="admin-available-sections"
          >
            Secciones disponibles
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Rutas reales que ya existen en el panel.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {availableSections.map((section) => (
            <Card className="rounded-lg" key={section.href}>
              <CardHeader>
                <Badge className="w-fit">{section.statusLabel}</Badge>
                <CardTitle className="text-2xl tracking-normal">
                  {section.label}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm">
                  Mejoras de persistencia o layout continúan en{" "}
                  {section.issueId}.
                </p>
                <Button asChild className="w-fit">
                  <Link href={section.href}>Abrir {section.label}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-planned-sections" className="grid gap-4">
        <div>
          <h3
            className="text-xl font-semibold tracking-normal"
            id="admin-planned-sections"
          >
            Secciones planificadas
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Visibles en navegación para orientar el mapa del dashboard, pero sin
            acciones productivas todavía.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plannedSections.map((section) => (
            <Card className="rounded-lg" key={section.href}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{section.statusLabel}</Badge>
                  <Badge variant="outline">{section.issueId}</Badge>
                </div>
                <CardTitle className="text-xl tracking-normal">
                  {section.label}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Todavía no disponible. Esta tarjeta no ejecuta CRUD ni cambia
                  datos.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
