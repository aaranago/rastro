import Image from "next/image";

import { buildAppDownloadPath } from "~/public-report-detail-mapping";

import { AuthShowcase } from "./_components/auth-showcase";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const primaryActions = [
  {
    href: buildAppDownloadPath({
      context: "lost-report",
      target: "rastro://report-create/lost",
    }),
    label: "Reportar mascota perdida",
    tone: "primary",
  },
  {
    href: buildAppDownloadPath({
      context: "create-adoption",
      target: "rastro://report-create/adoption",
    }),
    label: "Publicar adopcion",
    tone: "secondary",
  },
  {
    href: buildAppDownloadPath({
      context: "resource",
      target: "rastro://recursos",
    }),
    label: "Buscar recursos locales",
    tone: "secondary",
  },
] as const;

const publicSections = [
  {
    cta: "Abrir reportes en la app",
    heading: "Reportes comunitarios",
    href: buildAppDownloadPath({
      context: "report",
      target: "rastro://actividad",
    }),
    text: "Perdidos, encontrados y avistamientos se organizan por ubicacion aproximada para cuidar datos sensibles.",
  },
  {
    cta: "Abrir adopciones",
    heading: "Adopciones responsables",
    href: buildAppDownloadPath({
      context: "adoption",
      target: "rastro://adopciones",
    }),
    text: "Las publicaciones de adopcion se mantienen fuera de compras, ventas o subastas.",
  },
  {
    cta: "Ver recursos locales",
    heading: "Recursos en Bolivia",
    href: buildAppDownloadPath({
      context: "resource",
      target: "rastro://recursos",
    }),
    text: "El directorio prioriza ayuda practica: veterinarias, hogares temporales, rescate y transporte.",
  },
] as const;

const getSingleSearchParam = (params: Awaited<SearchParams>, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

export default async function HomePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const authStatus = getSingleSearchParam(searchParams, "auth");
  const authReturnTo = getSingleSearchParam(searchParams, "returnTo");

  return (
    <main className="min-h-screen">
      <section className="border-border bg-card border-b">
        <div className="container grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
          <div className="max-w-3xl">
            <p className="text-primary text-sm font-semibold uppercase">
              Red de recuperacion en Bolivia
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-normal sm:text-6xl">
              Rastro
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
              Reportes, adopciones y recursos locales para reunir mascotas con
              sus familias y coordinar ayuda comunitaria sin exponer datos
              sensibles.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {primaryActions.map((action) => (
                <a
                  aria-label={action.label}
                  className={
                    action.tone === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 w-full items-center justify-center rounded-md px-5 py-3 text-sm font-semibold sm:w-auto"
                      : "border-border bg-background text-foreground hover:bg-muted inline-flex min-h-11 w-full items-center justify-center rounded-md border px-5 py-3 text-sm font-semibold sm:w-auto"
                  }
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>

          <div className="border-border bg-background rounded-lg border p-5 shadow-xs">
            <p className="text-muted-foreground text-sm font-medium">
              Funciones en la app
            </p>
            <div className="mt-4 grid gap-4">
              {publicSections.map((section) => (
                <a
                  className="border-border hover:bg-muted/60 block rounded-md border p-4 transition"
                  href={section.href}
                  key={section.heading}
                >
                  <h2 className="text-base font-semibold">{section.heading}</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {section.text}
                  </p>
                  <p className="text-primary mt-3 text-sm font-semibold">
                    {section.cta}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container grid gap-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            Vista real de Rastro
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Casos, mensajes y recursos en un solo flujo movil
          </h2>
          <p className="text-muted-foreground mt-3 leading-7">
            La app muestra actividad comunitaria, reportes y servicios con
            zonas aproximadas para coordinar ayuda sin publicar coordenadas
            exactas.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Image
            alt="Pantalla de actividad de Rastro con coincidencias, mensajes y actualizaciones"
            className="border-border bg-card h-96 w-full rounded-lg border object-cover object-top shadow-xs"
            height={2400}
            src="/rastro-app-activity.png"
            width={1080}
          />
          <Image
            alt="Pantalla de recursos de Rastro con mapa y proveedor local seleccionado"
            className="border-border bg-card h-96 w-full rounded-lg border object-cover object-top shadow-xs"
            height={2400}
            src="/rastro-app-resources.png"
            width={1080}
          />
        </div>
      </section>

      <section className="container py-10" aria-labelledby="member-access">
        <div className="mb-5 max-w-4xl">
          <p className="text-muted-foreground text-sm font-medium">
            Acceso para miembros
          </p>
          <h2 id="member-access" className="text-2xl font-semibold">
            Gestiona tus reportes y contactos
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Inicia sesion para responder mensajes, revisar tus publicaciones y
            mantener actualizada tu informacion.
          </p>
        </div>

        <AuthShowcase returnTo={authReturnTo} status={authStatus} />
      </section>
    </main>
  );
}
