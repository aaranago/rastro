import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Badge } from "@acme/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";

import {
  AdminHeaderThemeToggle,
  AdminNavigationWithPathname,
} from "./admin-shell-client";

export type AdminShellViewerRole = "admin" | "member" | "visitor";

export interface AdminShellViewer {
  displayName: string;
  role: AdminShellViewerRole;
}

export function AdminShell(props: {
  children: React.ReactNode;
  viewer: AdminShellViewer;
}) {
  const displayName = getViewerDisplayName(props.viewer.displayName);

  return (
    <div
      className="bg-muted/30 text-foreground min-h-screen overflow-x-hidden"
      data-admin-route-shell
    >
      <AdminShellRouteStyles />
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-border bg-background/95 border-b px-4 py-4 lg:sticky lg:top-0 lg:min-h-screen lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0">
              <p className="text-primary text-sm font-semibold">
                Administración Rastro
              </p>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-normal">
                Operación es-BO
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Panel interno para moderación, proveedores y seguridad.
              </p>
            </div>
            <AdminNavigationWithPathname />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-border bg-background/95 sticky top-0 z-20 border-b px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                  Administración Rastro
                </p>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <Badge
                    variant={
                      props.viewer.role === "admin" ? "default" : "secondary"
                    }
                  >
                    {getViewerRoleLabel(props.viewer.role)}
                  </Badge>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-muted-foreground text-sm">Tema</span>
                <AdminHeaderThemeToggle />
              </div>
            </div>
          </header>

          <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            {props.children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminAccessDenied(props: { viewer: AdminShellViewer }) {
  const displayName = getViewerDisplayName(props.viewer.displayName);

  return (
    <section
      aria-labelledby="admin-access-denied-heading"
      className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-2xl items-center"
    >
      <Card className="w-full rounded-lg">
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            Acceso restringido
          </Badge>
          <CardTitle
            className="text-2xl tracking-normal"
            id="admin-access-denied-heading"
          >
            Solo administradores de Rastro pueden entrar al panel
          </CardTitle>
          <CardDescription>
            Esta área permite revisar reportes, proveedores de recursos,
            patrocinios locales, miembros y métricas operativas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Sesión actual</AlertTitle>
            <AlertDescription>
              <p>
                {displayName} está identificado como{" "}
                {getViewerRoleLabel(props.viewer.role).toLowerCase()}.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}

function AdminShellRouteStyles() {
  return (
    <style>
      {`body:has([data-admin-route-shell]) > div.absolute.right-4.bottom-4 { display: none !important; }`}
    </style>
  );
}

function getViewerRoleLabel(role: AdminShellViewerRole) {
  if (role === "admin") {
    return "Administrador";
  }

  return role === "member" ? "Miembro" : "Visitante";
}

function getViewerDisplayName(displayName: string) {
  return displayName === "Visitante sin sesion"
    ? "Visitante sin sesión"
    : displayName;
}
