import type { Metadata } from "next";
import Image from "next/image";

import { isPublicReportId } from "@acme/validators";

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
    lead: "Abre Rastro para seguir esta adopción, revisar sus datos públicos y contactar de forma segura desde el celular.",
    title: "Sigue esta adopción en Rastro",
  },
  "create-adoption": {
    eyebrow: "Adopciones",
    lead: "Abre Rastro para publicar un caso no monetario y encontrar un hogar responsable en Bolivia.",
    title: "Publica una adopción en Rastro",
  },
  general: {
    eyebrow: "Rastro móvil",
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
    body: "Consulta publicaciones de adopción responsable y conversa con la persona a cargo.",
    title: "Adopciones",
  },
  {
    body: "Encuentra veterinarias, refugios, tiendas y servicios útiles cerca de tu ciudad.",
    title: "Recursos",
  },
];

const installOptions = [
  {
    body: "La publicación en Google Play todavía no está disponible. Conserva el enlace y solicita acceso mientras se habilita la tienda.",
    cta: "Solicitar acceso Android",
    href: "mailto:hola@rastro.bo?subject=Acceso%20Android%20a%20Rastro",
    status: "Disponible pronto",
    title: "Android",
  },
  {
    body: "La distribución para iPhone todavía no está disponible. Puedes pedir aviso y volver al enlace compartido cuando tengas acceso.",
    cta: "Solicitar aviso iPhone",
    href: "mailto:hola@rastro.bo?subject=Acceso%20iPhone%20a%20Rastro",
    status: "Disponible pronto",
    title: "iPhone",
  },
] as const;

const downloadContextAliases: Record<string, DownloadContext> = {
  adopcion: "adoption",
  adopción: "adoption",
  adoption: "adoption",
  "create-adoption": "create-adoption",
  create_adoption: "create-adoption",
  "crear-adopcion": "create-adoption",
  "crear-adopción": "create-adoption",
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
  const openHref = resolveOpenHref(
    getSingleSearchParam(searchParams, "target"),
  );
  const returnLabel =
    returnHref === "/" ? "Volver al inicio" : "Volver al enlace compartido";
  const content = contextContent[context];

  return (
    <main className="bg-background min-h-screen">
      <section className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:py-14">
        <div className="flex flex-col gap-6 lg:pt-24">
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
              Abrir app instalada
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
            <p className="text-primary text-sm font-semibold">Instalación</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Instalar, abrir o solicitar acceso
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              Si ya tienes Rastro instalado, abre la app desde este dispositivo.
              Si todavía no, esta página conserva el enlace compartido y muestra
              el estado de descarga para cada plataforma.
            </p>
          </section>

          <section
            className="grid gap-3 sm:grid-cols-2"
            aria-label="Opciones de instalación"
          >
            {installOptions.map((option) => (
              <article
                className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs"
                key={option.title}
              >
                <p className="text-primary text-xs font-semibold uppercase">
                  {option.status}
                </p>
                <h2 className="mt-2 text-lg font-semibold">{option.title}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {option.body}
                </p>
                <a
                  className="border-border hover:bg-muted mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-semibold"
                  href={option.href}
                >
                  {option.cta}
                </a>
              </article>
            ))}
          </section>

          <section
            className="border-border bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs"
            aria-label="Vista de Rastro"
          >
            <Image
              alt="Pantalla de Rastro con actividad comunitaria, mensajes y actualizaciones"
              className="h-96 w-full object-cover object-top"
              height={2400}
              priority
              src="/rastro-app-activity.png"
              width={1080}
            />
            <div className="p-5">
              <h2 className="text-lg font-semibold">
                Flujo móvil para recuperar y ayudar
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Reportes, conversaciones y recursos se mantienen dentro de
                Rastro para cuidar contactos y zonas aproximadas.
              </p>
            </div>
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

    return isAllowedPublicAppOpenHref(url) ? trimmed : "rastro://";
  } catch {
    return "rastro://";
  }
}

function isAllowedPublicAppOpenHref(url: URL) {
  if (
    url.protocol !== "rastro:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    return false;
  }

  const path = url.pathname.replace(/\/+$/, "");

  if (!path) {
    return publicAppOpenRootHosts.has(url.hostname);
  }

  if (url.hostname === "report-create") {
    return publicReportCreationPaths.has(path);
  }

  if (url.hostname === "adopciones") {
    return isUuidPath(path);
  }

  if (url.hostname === "reportes") {
    return isAllowedReportDetailPath(path);
  }

  if (url.hostname === "chats") {
    return isAllowedPublicReportChatPath(path);
  }

  return false;
}

const publicAppOpenRootHosts = new Set(["", "actividad", "recursos"]);

const publicReportCreationPaths = new Set([
  "/adoption",
  "/found",
  "/lost",
  "/sighting",
]);

const reportDetailPathPattern =
  /^\/(avistamientos|encontrados|perdidos)\/([^/]+)$/;

function isUuidPath(path: string) {
  return isPublicReportId(path.slice(1));
}

function isAllowedReportDetailPath(path: string) {
  const match = reportDetailPathPattern.exec(path);

  return Boolean(match?.[2] && isPublicReportId(match[2]));
}

function isAllowedPublicReportChatPath(path: string) {
  const match = /^\/report\/([^/]+)$/.exec(path);

  return Boolean(match?.[1] && isPublicReportId(match[1]));
}
