import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Badge } from "@acme/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";

import { AdminShellFrame } from "./admin-shell-client";

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
      <AdminShellFrame
        displayName={displayName}
        roleLabel={getViewerRoleLabel(props.viewer.role)}
        viewerRole={props.viewer.role}
      >
        {props.children}
      </AdminShellFrame>
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
  return displayName === "Visitante sin sesión"
    ? "Visitante sin sesión"
    : displayName;
}
