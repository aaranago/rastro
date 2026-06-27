import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Button } from "@acme/ui/button";

export default function AdminNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Alert>
        <AlertTitle>Ruta admin no encontrada</AlertTitle>
        <AlertDescription>
          <p>
            Esta sección no existe o fue movida. Vuelve al resumen operativo
            para continuar con moderación, proveedores, patrocinios, miembros o
            ajustes.
          </p>
        </AlertDescription>
      </Alert>
      <Button asChild className="w-fit">
        <Link href="/admin">Volver al resumen</Link>
      </Button>
    </div>
  );
}
