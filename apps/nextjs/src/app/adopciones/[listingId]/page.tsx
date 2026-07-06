import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DownloadIcon,
  ExternalLinkIcon,
  MessageCircleIcon,
  SmartphoneIcon,
} from "lucide-react";

import { getSession } from "~/auth/server";
import {
  buildPublicAdoptionListingMetadata,
  getPublicAdoptionListingViewModel,
} from "~/public-adoption-listings";
import { PublicPhotoGrid } from "~/public-photo-grid";
import {
  parsePublicReportAbuseStatus,
  PublicReportAbuseCard,
} from "~/public-report-abuse";

type PublicAdoptionListingSearchParams = Record<
  string,
  string | string[] | undefined
>;

interface PublicAdoptionListingPageProps {
  params: Promise<{
    listingId: string;
  }>;
  searchParams?: Promise<PublicAdoptionListingSearchParams>;
}

export async function generateMetadata(
  props: PublicAdoptionListingPageProps,
): Promise<Metadata> {
  const { listingId } = await props.params;
  const metadata = await buildPublicAdoptionListingMetadata(listingId);

  if (!metadata) {
    return {
      title: "Adopción no encontrada | Rastro",
    };
  }

  return metadata;
}

export default async function PublicAdoptionListingPage(
  props: PublicAdoptionListingPageProps,
) {
  const { listingId } = await props.params;
  const searchParamsPromise: Promise<PublicAdoptionListingSearchParams> =
    props.searchParams ?? Promise.resolve({});
  const [listing, session, searchParams] = await Promise.all([
    getPublicAdoptionListingViewModel(listingId),
    getSession(),
    searchParamsPromise,
  ]);

  if (!listing) {
    notFound();
  }

  return (
    <main className="bg-background min-h-screen">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link className="text-primary text-xl font-bold" href="/">
            Rastro
          </Link>
          <nav
            aria-label="Navegación pública"
            className="hidden items-center gap-5 text-sm font-medium md:flex"
          >
            <Link className="hover:text-primary" href="/#reportes">
              Reportes
            </Link>
            <Link className="hover:text-primary" href="/#recursos">
              Recursos
            </Link>
            <a
              className="text-primary hover:text-primary/80"
              href={listing.appPrompts.openHref}
            >
              Abrir en la app
            </a>
          </nav>
          <a
            className="border-border hover:bg-muted inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-semibold"
            href={listing.appPrompts.downloadHref}
          >
            Descargar Rastro
          </a>
        </div>

        <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-6 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="border-primary text-primary rounded-md border px-2.5 py-1 text-xs font-semibold uppercase">
              {listing.statusLabel}
            </span>
            <span className="bg-muted text-muted-foreground rounded-md px-2.5 py-1 text-xs font-medium">
              {listing.pet.type}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="max-w-4xl text-3xl font-bold tracking-normal [overflow-wrap:anywhere] break-words sm:text-5xl">
              {listing.title}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-lg [overflow-wrap:anywhere] break-words">
              {listing.pet.type} - {listing.pet.breed}
            </p>
          </div>
        </div>
      </header>

      <article className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:px-8 lg:py-8">
        <section className="min-w-0 lg:col-start-1">
          <PublicPhotoGrid photos={listing.photos} />
        </section>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:self-start">
          <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">
              {listing.abuseReport.isOwner ? "Tu adopción" : "Contacto"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {listing.abuseReport.isOwner
                ? "Gestiona actualizaciones, mensajes y cierre desde Rastro."
                : "Coordina la adopción de forma segura."}
            </p>
            <div className="mt-4 grid gap-3">
              {listing.contactOptions.length > 0 ? (
                listing.contactOptions.map((contactOption) => (
                  <a
                    className={
                      contactOption.kind === "whatsapp"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-4 py-3 text-center text-sm font-semibold [overflow-wrap:anywhere] break-words"
                        : "border-primary text-primary hover:bg-primary/10 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-4 py-3 text-center text-sm font-semibold [overflow-wrap:anywhere] break-words"
                    }
                    href={contactOption.href}
                    key={contactOption.kind}
                  >
                    <MessageCircleIcon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                    />
                    {contactOption.label}
                  </a>
                ))
              ) : (
                <a
                  className="border-primary text-primary hover:bg-primary/10 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-4 py-3 text-center text-sm font-semibold"
                  href={listing.appPrompts.downloadHref}
                >
                  <SmartphoneIcon
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  {listing.abuseReport.isOwner
                    ? "Gestionar en Rastro"
                    : "Contactar en Rastro"}
                </a>
              )}
            </div>
          </div>

          <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">Rastro</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Abre esta adopción en la app para responder con más contexto.
            </p>
            <div className="mt-4 grid gap-3">
              <a
                className="border-primary text-primary hover:bg-primary/10 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-4 py-3 text-center text-sm font-semibold"
                href={listing.appPrompts.openHref}
              >
                <SmartphoneIcon aria-hidden="true" className="size-4 shrink-0" />
                {listing.appPrompts.openLabel}
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              </a>
              <a
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-4 py-3 text-center text-sm font-semibold"
                href={listing.appPrompts.downloadHref}
              >
                <DownloadIcon aria-hidden="true" className="size-4 shrink-0" />
                {listing.appPrompts.downloadLabel}
              </a>
            </div>
          </div>
        </aside>

        <section className="grid min-w-0 gap-5 lg:col-start-1">
          <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">Datos de adopción</h2>
            <dl className="mt-4 grid gap-4">
              <div className="min-w-0">
                <dt className="text-muted-foreground text-sm">
                  {listing.publishedAt.label}
                </dt>
                <dd className="mt-1 font-medium [overflow-wrap:anywhere] break-words">
                  {listing.publishedAt.value}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground text-sm">Ubicación</dt>
                <dd className="mt-1 font-medium [overflow-wrap:anywhere] break-words">
                  {listing.publicLocation.label}
                </dd>
                <dd className="text-muted-foreground mt-1 text-sm">
                  {listing.publicLocation.privacyNote}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Descripción</dt>
                <dd className="mt-1 leading-7 [overflow-wrap:anywhere] break-words">
                  {listing.description}
                </dd>
              </div>
            </dl>
          </div>

          <PublicReportAbuseCard
            isOwner={listing.abuseReport.isOwner}
            isSignedIn={Boolean(session)}
            reportId={listing.abuseReport.reportId}
            returnTo={listing.sharePath}
            status={parsePublicReportAbuseStatus(searchParams.reportAbuse)}
          />
        </section>
      </article>
    </main>
  );
}
