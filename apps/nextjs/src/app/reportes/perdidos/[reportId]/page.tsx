import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSession } from "~/auth/server";
import { PublicCommunityReportPageContent } from "~/public-community-report-page";
import {
  buildPublicLostReportMetadata,
  getPublicLostReportViewModel,
} from "~/public-lost-reports";

type PublicLostReportSearchParams = Record<
  string,
  string | string[] | undefined
>;

interface PublicLostReportPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<PublicLostReportSearchParams>;
}

export async function generateMetadata(
  props: PublicLostReportPageProps,
): Promise<Metadata> {
  const { reportId } = await props.params;
  const metadata = await buildPublicLostReportMetadata(reportId);

  if (!metadata) {
    return {
      title: "Reporte no encontrado | Rastro",
    };
  }

  return metadata;
}

export default async function PublicLostReportPage(
  props: PublicLostReportPageProps,
) {
  const { reportId } = await props.params;
  const searchParamsPromise: Promise<PublicLostReportSearchParams> =
    props.searchParams ?? Promise.resolve({});
  const [report, session, searchParams] = await Promise.all([
    getPublicLostReportViewModel(reportId),
    getSession(),
    searchParamsPromise,
  ]);

  if (!report) {
    notFound();
  }

  return (
    <PublicCommunityReportPageContent
      isSignedIn={Boolean(session)}
      report={{
        ...report,
        descriptionLabel: "Descripción",
        event: report.lastSeen,
      }}
      searchParams={searchParams}
    />
  );
}
