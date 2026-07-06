import Image from "next/image";
import Link from "next/link";

import { buildAppDownloadPath } from "~/public-report-detail-mapping";

export default function PublicNotFound() {
  return (
    <main className="bg-background min-h-screen">
      <section className="container grid gap-8 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] lg:items-center lg:py-16">
        <div>
          <p className="text-primary text-sm font-semibold uppercase">
            Enlace no disponible
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
            Reporte o adopcion no disponible
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-8">
            Puede haber sido cerrado, moderado, retirado o movido. Vuelve al
            inicio de Rastro o abre la app para revisar reportes, adopciones y
            recursos locales.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="bg-primary text-primary-foreground rounded-md px-5 py-3 text-center text-sm font-semibold"
              href="/"
            >
              Volver al inicio
            </Link>
            <Link
              className="border-border bg-card text-card-foreground hover:bg-muted rounded-md border px-5 py-3 text-center text-sm font-semibold"
              href={buildAppDownloadPath()}
            >
              Abrir o instalar Rastro
            </Link>
          </div>
        </div>

        <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
          <Image
            alt="Pantalla de Rastro con actividad comunitaria y reportes"
            className="h-96 w-full object-cover object-top"
            height={2400}
            src="/rastro-app-activity.png"
            width={1080}
          />
        </div>
      </section>
    </main>
  );
}
