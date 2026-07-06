import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSession } from "~/auth/server";
import { PublicCommunityReportPageContent } from "~/public-community-report-page";
import {
  buildPublicFoundReportMetadata,
  getPublicFoundReportViewModel,
} from "~/public-community-reports";

type PublicFoundReportSearchParams = Record<
  string,
  string | string[] | undefined
>;

interface PublicFoundReportPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<PublicFoundReportSearchParams>;
}

export async function generateMetadata(
  props: PublicFoundReportPageProps,
): Promise<Metadata> {
  const { reportId } = await props.params;
  const metadata = await buildPublicFoundReportMetadata(reportId);

  if (!metadata) {
    return {
      title: "Reporte de mascota encontrada no encontrado | Rastro",
    };
  }

  return metadata;
}

export default async function PublicFoundReportPage(
  props: PublicFoundReportPageProps,
) {
  const { reportId } = await props.params;
  const searchParamsPromise: Promise<PublicFoundReportSearchParams> =
    props.searchParams ?? Promise.resolve({});
  const [report, session, searchParams] = await Promise.all([
    getPublicFoundReportViewModel(reportId),
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
