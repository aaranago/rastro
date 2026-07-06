import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSession } from "~/auth/server";
import { PublicCommunityReportPageContent } from "~/public-community-report-page";
import {
  buildPublicSightingReportMetadata,
  getPublicSightingReportViewModel,
} from "~/public-community-reports";

type PublicSightingReportSearchParams = Record<
  string,
  string | string[] | undefined
>;

interface PublicSightingReportPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<PublicSightingReportSearchParams>;
}

export async function generateMetadata(
  props: PublicSightingReportPageProps,
): Promise<Metadata> {
  const { reportId } = await props.params;
  const metadata = await buildPublicSightingReportMetadata(reportId);

  if (!metadata) {
    return {
      title: "Avistamiento no encontrado | Rastro",
    };
  }

  return metadata;
}

export default async function PublicSightingReportPage(
  props: PublicSightingReportPageProps,
) {
  const { reportId } = await props.params;
  const searchParamsPromise: Promise<PublicSightingReportSearchParams> =
    props.searchParams ?? Promise.resolve({});
  const [report, session, searchParams] = await Promise.all([
    getPublicSightingReportViewModel(reportId),
    getSession(),
    searchParamsPromise,
  ]);

  if (!report) {
    notFound();
  }

  return (
    <PublicCommunityReportPageContent
      isSignedIn={Boolean(session)}
      report={report}
      searchParams={searchParams}
    />
  );
}
