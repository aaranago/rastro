import type {
  PublicReportPageContactOption,
  PublicReportPageLocation,
  PublicReportPagePet,
  PublicReportPagePhoto,
} from "./public-report-detail-mapping";
import { PublicPhotoGrid } from "~/public-photo-grid";
import {
  parsePublicReportAbuseStatus,
  PublicReportAbuseCard,
} from "~/public-report-abuse";

export type PublicCommunityReportSearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface PublicReportPageContentReport {
  abuseReport: {
    isOwner: boolean;
    reportId: string;
  };
  appPrompts: {
    downloadHref: string;
    downloadLabel: string;
    openHref: string;
    openLabel: string;
  };
  contactOptions: PublicReportPageContactOption[];
  description: string;
  descriptionLabel: string;
  event: {
    label: string;
    value: string;
  };
  pet: PublicReportPagePet;
  photos: PublicReportPagePhoto[];
  publicLocation: PublicReportPageLocation;
  sharePath: string;
  statusLabel: string;
  title: string;
}

export function PublicCommunityReportPageContent({
  isSignedIn,
  report,
  searchParams,
}: {
  isSignedIn: boolean;
  report: PublicReportPageContentReport;
  searchParams: PublicCommunityReportSearchParams;
}) {
  return (
    <main className="bg-background min-h-screen">
      <article className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:py-12">
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-primary text-sm font-semibold">
              {report.statusLabel}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
              {report.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              {report.pet.type} - {report.pet.breed}
            </p>
          </div>

          <PublicPhotoGrid photos={report.photos} />
        </section>

        <section className="flex flex-col gap-5">
          <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">Datos del reporte</h2>
            <dl className="mt-4 grid gap-4">
              <div>
                <dt className="text-muted-foreground text-sm">
                  {report.event.label}
                </dt>
                <dd className="mt-1 font-medium">{report.event.value}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Ubicación</dt>
                <dd className="mt-1 font-medium">
                  {report.publicLocation.label}
                </dd>
                <dd className="text-muted-foreground mt-1 text-sm">
                  {report.publicLocation.privacyNote}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">
                  {report.descriptionLabel}
                </dt>
                <dd className="mt-1 leading-7">{report.description}</dd>
              </div>
            </dl>
          </div>

          <div className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
            <h2 className="text-xl font-semibold">Contacto</h2>
            <div className="mt-4 grid gap-3">
              {report.contactOptions.map((contactOption) => (
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
            isOwner={report.abuseReport.isOwner}
            isSignedIn={isSignedIn}
            reportId={report.abuseReport.reportId}
            returnTo={report.sharePath}
            status={parsePublicReportAbuseStatus(searchParams.reportAbuse)}
          />

          <div className="bg-primary text-primary-foreground rounded-lg p-5">
            <h2 className="text-xl font-semibold">Rastro</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                className="bg-background text-foreground rounded-md px-4 py-3 text-center text-sm font-semibold"
                href={report.appPrompts.openHref}
              >
                {report.appPrompts.openLabel}
              </a>
              <a
                className="border-primary-foreground/60 rounded-md border px-4 py-3 text-center text-sm font-semibold"
                href={report.appPrompts.downloadHref}
              >
                {report.appPrompts.downloadLabel}
              </a>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
