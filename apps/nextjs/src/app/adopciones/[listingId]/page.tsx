import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
      <article className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:py-12">
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-primary text-sm font-semibold">
              {listing.statusLabel}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
              {listing.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              {listing.pet.type} - {listing.pet.breed}
            </p>
          </div>

          <PublicPhotoGrid photos={listing.photos} />
        </section>

        <section className="flex flex-col gap-5">
          <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">Datos de adopción</h2>
            <dl className="mt-4 grid gap-4">
              <div>
                <dt className="text-muted-foreground text-sm">
                  {listing.publishedAt.label}
                </dt>
                <dd className="mt-1 font-medium">
                  {listing.publishedAt.value}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Ubicación</dt>
                <dd className="mt-1 font-medium">
                  {listing.publicLocation.label}
                </dd>
                <dd className="text-muted-foreground mt-1 text-sm">
                  {listing.publicLocation.privacyNote}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Descripción</dt>
                <dd className="mt-1 leading-7">{listing.description}</dd>
              </div>
            </dl>
          </div>

          <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">Contacto</h2>
            <div className="mt-4 grid gap-3">
              {listing.contactOptions.map((contactOption) => (
                <a
                  className="border-primary text-primary hover:bg-primary/10 rounded-md border px-4 py-3 text-center text-sm font-semibold"
                  href={contactOption.href}
                  key={contactOption.kind}
                >
                  {contactOption.label}
                </a>
              ))}
            </div>
          </div>

          <PublicReportAbuseCard
            isOwner={listing.abuseReport.isOwner}
            isSignedIn={Boolean(session)}
            reportId={listing.abuseReport.reportId}
            returnTo={listing.sharePath}
            status={parsePublicReportAbuseStatus(searchParams.reportAbuse)}
          />

          <div className="bg-primary text-primary-foreground rounded-lg p-5">
            <h2 className="text-xl font-semibold">Rastro</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                className="bg-background text-foreground rounded-md px-4 py-3 text-center text-sm font-semibold"
                href={listing.appPrompts.openHref}
              >
                {listing.appPrompts.openLabel}
              </a>
              <a
                className="border-primary-foreground/60 rounded-md border px-4 py-3 text-center text-sm font-semibold"
                href={listing.appPrompts.downloadHref}
              >
                {listing.appPrompts.downloadLabel}
              </a>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
