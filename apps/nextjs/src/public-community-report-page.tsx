import Link from "next/link";
import {
  CalendarIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";

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
      <PublicReportHeader report={report} />

      <article className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:px-8 lg:py-8">
        <section className="min-w-0 lg:col-start-1">
          <PublicPhotoGrid photos={report.photos} />
        </section>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:self-start">
          <ContactCard contactOptions={report.contactOptions} />
          <PrivacyCard location={report.publicLocation} />
          <AppPromptCard prompts={report.appPrompts} />
        </aside>

        <section className="grid min-w-0 gap-4 lg:col-start-1">
          <ReportFactsCard report={report} />
          <ReportDescriptionCard report={report} />
        </section>

        <section className="min-w-0 lg:col-span-2">
          <PublicReportAbuseCard
            isOwner={report.abuseReport.isOwner}
            isSignedIn={isSignedIn}
            reportId={report.abuseReport.reportId}
            returnTo={report.sharePath}
            status={parsePublicReportAbuseStatus(searchParams.reportAbuse)}
          />
        </section>
      </article>
    </main>
  );
}

function PublicReportHeader(props: { report: PublicReportPageContentReport }) {
  return (
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
            href={props.report.appPrompts.openHref}
          >
            Abrir en la app
          </a>
        </nav>
        <a
          className="border-border hover:bg-muted inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-semibold"
          href={props.report.appPrompts.downloadHref}
        >
          Descargar Rastro
        </a>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="border-primary text-primary rounded-md border px-2.5 py-1 text-xs font-semibold uppercase">
            {props.report.statusLabel}
          </span>
          <span className="bg-muted text-muted-foreground rounded-md px-2.5 py-1 text-xs font-medium">
            {props.report.pet.type}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="max-w-4xl text-3xl font-bold tracking-normal [overflow-wrap:anywhere] break-words sm:text-5xl">
            {props.report.title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-lg [overflow-wrap:anywhere] break-words">
            {props.report.pet.type} - {props.report.pet.breed}
          </p>
        </div>
      </div>
    </header>
  );
}

function ContactCard(props: {
  contactOptions: readonly PublicReportPageContactOption[];
}) {
  return (
    <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
      <h2 className="text-xl font-semibold">Contacto</h2>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        Elige la forma más segura para coordinar ayuda.
      </p>
      <div className="mt-4 grid gap-3">
        {props.contactOptions.map((contactOption) => (
          <a
            className={
              contactOption.kind === "whatsapp"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-4 py-3 text-center text-sm font-semibold [overflow-wrap:anywhere] break-words"
                : "border-primary text-primary hover:bg-primary/10 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-4 py-3 text-center text-sm font-semibold [overflow-wrap:anywhere] break-words"
            }
            href={contactOption.href}
            key={contactOption.kind}
          >
            <MessageCircleIcon aria-hidden="true" className="size-4 shrink-0" />
            {contactOption.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function PrivacyCard(props: { location: PublicReportPageLocation }) {
  return (
    <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <ShieldCheckIcon aria-hidden="true" className="text-primary size-5" />
        Privacidad
      </h2>
      <dl className="mt-4 grid gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground flex items-center gap-2">
            <MapPinIcon aria-hidden="true" className="size-4" />
            Ubicación aproximada
          </dt>
          <dd className="mt-1 font-medium [overflow-wrap:anywhere] break-words">
            {props.location.label}
          </dd>
        </div>
        <div className="border-border bg-background rounded-md border p-3">
          <p className="text-muted-foreground text-sm leading-6">
            {props.location.privacyNote} No mostramos coordenadas exactas ni
            direcciones precisas.
          </p>
        </div>
      </dl>
    </section>
  );
}

function AppPromptCard(props: {
  prompts: PublicReportPageContentReport["appPrompts"];
}) {
  return (
    <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
      <h2 className="text-xl font-semibold">Rastro</h2>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        Abre este reporte en la app para responder con más contexto.
      </p>
      <div className="mt-4 grid gap-3">
        <a
          className="border-primary text-primary hover:bg-primary/10 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-4 py-3 text-center text-sm font-semibold [overflow-wrap:anywhere] break-words"
          href={props.prompts.openHref}
        >
          <SmartphoneIcon aria-hidden="true" className="size-4 shrink-0" />
          {props.prompts.openLabel}
          <ExternalLinkIcon aria-hidden="true" className="size-4 shrink-0" />
        </a>
        <a
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-4 py-3 text-center text-sm font-semibold [overflow-wrap:anywhere] break-words"
          href={props.prompts.downloadHref}
        >
          <DownloadIcon aria-hidden="true" className="size-4 shrink-0" />
          {props.prompts.downloadLabel}
        </a>
      </div>
    </section>
  );
}

function ReportFactsCard(props: { report: PublicReportPageContentReport }) {
  return (
    <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
      <h2 className="text-xl font-semibold">Datos del reporte</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarIcon aria-hidden="true" className="size-4" />
            {props.report.event.label}
          </dt>
          <dd className="mt-1 font-medium [overflow-wrap:anywhere] break-words">
            {props.report.event.value}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground flex items-center gap-2 text-sm">
            <MapPinIcon aria-hidden="true" className="size-4" />
            Ubicación
          </dt>
          <dd className="mt-1 font-medium [overflow-wrap:anywhere] break-words">
            {props.report.publicLocation.label}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ReportDescriptionCard(props: {
  report: PublicReportPageContentReport;
}) {
  return (
    <section className="border-border bg-card text-card-foreground rounded-lg border p-5 shadow-xs">
      <h2 className="text-xl font-semibold">{props.report.descriptionLabel}</h2>
      <p className="mt-3 leading-7 [overflow-wrap:anywhere] break-words">
        {props.report.description}
      </p>
    </section>
  );
}
