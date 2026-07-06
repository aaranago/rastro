import type { Metadata } from "next";

import type { AppDownloadContext } from "~/public-report-detail-mapping";
import {
  appDownloadHref,
  appDownloadPath,
  publicWebBaseUrl,
} from "~/public-report-detail-mapping";

type DownloadContext = AppDownloadContext;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface DownloadPageProps {
  searchParams?: SearchParams;
}

const metadataDescription =
  "Instala o abre Rastro para seguir reportes, adopciones y recursos locales de mascotas en Bolivia.";

export const metadata: Metadata = {
  alternates: {
    canonical: appDownloadHref,
  },
  description: metadataDescription,
  openGraph: {
    description: metadataDescription,
    locale: "es_BO",
    siteName: "Rastro",
    title: "Descargar Rastro",
    type: "website",
    url: appDownloadHref,
  },
  title: "Descargar Rastro | Rastro",
};

const contextContent = {
  adoption: {
    eyebrow: "Adopciones",
    lead: "Abre Rastro para seguir esta adopcion, revisar sus datos publicos y contactar de forma segura desde el celular.",
    title: "Sigue esta adopcion en Rastro",
  },
  "create-adoption": {
    eyebrow: "Adopciones",
    lead: "Abre Rastro para publicar un caso no monetario y encontrar un hogar responsable en Bolivia.",
    title: "Publica una adopcion en Rastro",
  },
  general: {
    eyebrow: "Rastro movil",
    lead: "Abre Rastro para seguir reportes, adopciones y recursos locales de mascotas en Bolivia desde el celular.",
    title: "Descargar Rastro",
  },
  "lost-report": {
    eyebrow: "Reportes",
    lead: "Abre Rastro para crear una alerta con zona, fotos y contacto seguro para que la comunidad pueda ayudarte.",
    title: "Reporta una mascota perdida",
  },
  report: {
    eyebrow: "Reportes compartidos",
    lead: "Abre Rastro para ver el reporte, revisar la zona aproximada y contactar sin perder el enlace compartido.",
    title: "Sigue este reporte en Rastro",
  },
  resource: {
    eyebrow: "Recursos locales",
    lead: "Abre Rastro para encontrar proveedores, refugios y servicios cercanos con contexto local de Bolivia.",
    title: "Encuentra recursos en Rastro",
  },
} satisfies Record<
  DownloadContext,
  { eyebrow: string; lead: string; title: string }
>;

const useCases = [
  {
    body: "Revisa fotos, zona aproximada, estado del caso y opciones de contacto para ayudar a reunir mascotas.",
    title: "Reportes",
  },
  {
    body: "Consulta publicaciones de adopcion responsable y conversa con la persona a cargo.",
    title: "Adopciones",
  },
  {
    body: "Encuentra veterinarias, refugios, tiendas y servicios utiles cerca de tu ciudad.",
    title: "Recursos",
  },
];

const downloadContextAliases: Record<string, DownloadContext> = {
  adopcion: "adoption",
  adoption: "adoption",
  "create-adoption": "create-adoption",
  create_adoption: "create-adoption",
  "crear-adopcion": "create-adoption",
  "crear-reporte": "lost-report",
  "lost-report": "lost-report",
  lost_report: "lost-report",
  report: "report",
  reporte: "report",
  resource: "resource",
  recurso: "resource",
};

export default async function DownloadPage(props: DownloadPageProps) {
  const searchParams = await (props.searchParams ?? Promise.resolve({}));
  const context = resolveDownloadContext(
    getSingleSearchParam(searchParams, "context"),
  );
  const returnHref = resolveReturnHref(
    getSingleSearchParam(searchParams, "returnTo"),
  );
  const openHref = resolveOpenHref(getSingleSearchParam(searchParams, "target"));
  const returnLabel =
    returnHref === "/" ? "Volver al inicio" : "Volver al enlace compartido";
  const content = contextContent[context];

  return (
    <main className="bg-background min-h-screen">
      <section className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:py-14">
        <div className="flex flex-col justify-center gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-primary text-sm font-semibold">
              {content.eyebrow}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
              {content.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg leading-8">
              {content.lead}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="bg-primary text-primary-foreground rounded-md px-5 py-3 text-center text-sm font-semibold"
              href={openHref}
            >
              Abrir en Rastro
            </a>
            <a
              className="border-border bg-card text-card-foreground hover:bg-muted rounded-md border px-5 py-3 text-center text-sm font-semibold"
              href={returnHref}
            >
              {returnLabel}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <p className="text-primary text-sm font-semibold">Instalacion</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Instalar o abrir Rastro
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              Si ya tienes Rastro instalado, abre la app desde este dispositivo.
              Si todavia no, esta pagina conserva el enlace compartido mientras
              la descarga publica queda disponible.
            </p>
          </section>

          <section className="grid gap-3" aria-label="Contextos de Rastro">
            {useCases.map((useCase) => (
              <article
                className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
                key={useCase.title}
              >
                <h2 className="text-lg font-semibold">{useCase.title}</h2>
                <p className="text-muted-foreground mt-2 leading-7">
                  {useCase.body}
                </p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function getSingleSearchParam(
  params: Awaited<SearchParams>,
  key: string,
): string | undefined {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

function resolveDownloadContext(value: string | undefined): DownloadContext {
  const normalized = value?.trim().toLowerCase();

  return normalized
    ? (downloadContextAliases[normalized] ?? "general")
    : "general";
}

function resolveReturnHref(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "/";
  }

  try {
    const url = new URL(trimmed, publicWebBaseUrl);

    if (
      url.origin !== publicWebBaseUrl ||
      url.pathname.replace(/\/+$/, "") === appDownloadPath ||
      (trimmed.startsWith("//") && !trimmed.startsWith("///"))
    ) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function resolveOpenHref(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "rastro://";
  }

  try {
    const url = new URL(trimmed);

    return url.protocol === "rastro:" ? trimmed : "rastro://";
  } catch {
    return "rastro://";
  }
}
