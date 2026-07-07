import Image from "next/image";
import { BellIcon, MapIcon, UsersRoundIcon } from "lucide-react";

import { PublicLegalFooter } from "~/public-legal-links";
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
    label: "Publicar adopción",
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
    Icon: BellIcon,
    cta: "Abrir reportes en la app",
    heading: "Reportes comunitarios",
    href: buildAppDownloadPath({
      context: "report",
      target: "rastro://actividad",
    }),
    text: "Perdidos, encontrados y avistamientos se organizan por ubicación aproximada para cuidar datos sensibles.",
  },
  {
    Icon: UsersRoundIcon,
    cta: "Abrir Rastro",
    heading: "Adopciones responsables",
    href: buildAppDownloadPath({
      context: "adoption",
      target: "rastro://",
    }),
    text: "Las publicaciones de adopción se mantienen fuera de compras, ventas o subastas.",
  },
  {
    Icon: MapIcon,
    cta: "Ver recursos locales",
    heading: "Recursos en Bolivia",
    href: buildAppDownloadPath({
      context: "resource",
      target: "rastro://recursos",
    }),
    text: "El directorio prioriza ayuda práctica: veterinarias, hogares temporales, rescate y transporte.",
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
  const [primaryAction, ...secondaryActions] = primaryActions;

  return (
    <main className="bg-background min-h-screen">
      <section className="border-border/70 bg-card border-b">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:px-8 lg:py-12">
          <div className="max-w-2xl min-w-0">
            <p className="text-primary text-sm font-semibold uppercase">
              Red de recuperación en Bolivia
            </p>
            <h1 className="mt-3 text-5xl font-extrabold tracking-normal sm:text-6xl">
              Rastro
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
              Reportes, adopciones y recursos locales para reunir mascotas con
              sus familias y coordinar ayuda comunitaria sin exponer datos
              sensibles.
            </p>

            <div className="mt-8 grid gap-4">
              <a
                aria-label={primaryAction.label}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 py-3 text-sm font-semibold sm:w-fit sm:min-w-64"
                href={primaryAction.href}
              >
                {primaryAction.label}
              </a>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {secondaryActions.map((action) => (
                  <a
                    aria-label={action.label}
                    className="text-primary hover:text-primary/80 inline-flex min-h-9 items-center text-sm font-semibold"
                    href={action.href}
                    key={action.href}
                  >
                    {action.label}
                    <span aria-hidden="true" className="ml-2">
                      &gt;
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[0.9fr_1fr_0.9fr] lg:items-center">
            <PhoneScreenshot
              alt="Pantalla de actividad de Rastro con coincidencias, mensajes y actualizaciones"
              priority
              src="/rastro-app-activity.png"
            />
            <PhoneScreenshot
              alt="Pantalla de recursos de Rastro con mapa y proveedor local seleccionado"
              className="hidden sm:block"
              src="/rastro-app-resources.png"
            />
            <PhoneScreenshot
              alt="Pantalla de acceso de Rastro para gestionar reportes y contactos"
              className="hidden lg:block"
              priority
              src="/rastro-app-activity.png"
            />
          </div>
        </div>

        <div
          id="reportes"
          className="border-border bg-background scroll-mt-6 border-t"
        >
          <div className="mx-auto grid w-full max-w-7xl gap-3 px-5 py-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {publicSections.map((section) => (
              <a
                className="hover:bg-muted/70 flex min-w-0 items-start gap-3 rounded-md px-3 py-3 transition"
                href={section.href}
                id={
                  section.heading === "Recursos en Bolivia"
                    ? "recursos"
                    : undefined
                }
                key={section.heading}
              >
                <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
                  <section.Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {section.heading}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm leading-5">
                    {section.text}
                  </span>
                  <span className="text-primary mt-1 block text-sm font-semibold">
                    {section.cta}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8"
        aria-labelledby="member-access"
      >
        <div className="max-w-xl">
          <p className="text-muted-foreground text-sm font-medium">
            Acceso para miembros
          </p>
          <h2 id="member-access" className="mt-2 text-2xl font-semibold">
            Gestiona tus reportes y contactos
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Inicia sesión para responder mensajes, revisar tus publicaciones y
            mantener actualizada tu información.
          </p>
        </div>

        <AuthShowcase returnTo={authReturnTo} status={authStatus} />
      </section>
      <PublicLegalFooter />
    </main>
  );
}

function PhoneScreenshot(props: {
  alt: string;
  className?: string;
  priority?: boolean;
  src: string;
}) {
  return (
    <div
      className={[
        "border-border bg-background relative mx-auto aspect-[9/20] w-full max-w-[13rem] overflow-hidden rounded-lg border shadow-xs sm:max-w-[15rem] lg:max-w-[17rem]",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        alt={props.alt}
        className="object-cover object-top"
        fill
        priority={props.priority}
        sizes="(min-width: 1024px) 17rem, (min-width: 640px) 15rem, 13rem"
        src={props.src}
      />
    </div>
  );
}
