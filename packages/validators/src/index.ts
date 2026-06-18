import { z } from "zod/v4";

export const unused = z.string().describe(
  `This lib is currently not used as we use drizzle-zod for simple schemas
   But as your application grows and you need other validators to share
   with back and frontend, you can put them in here
  `,
);

export interface PublicLostReportShareTargetInput {
  publicWebBaseUrl: string;
  reportId: string;
  title: string;
}

export interface PublicLostReportShareTarget {
  appDeepLink: string;
  message: string;
  path: string;
  title: string;
  webUrl: string;
}

const publicLostReportPathPrefix = "/reportes/perdidos";

export function publicLostReportPathForId(reportId: string) {
  return `${publicLostReportPathPrefix}/${encodeURIComponent(reportId)}`;
}

export function buildPublicLostReportShareTarget({
  publicWebBaseUrl,
  reportId,
  title,
}: PublicLostReportShareTargetInput): PublicLostReportShareTarget {
  const path = publicLostReportPathForId(reportId);
  const webUrl = `${publicWebBaseUrl.replace(/\/+$/, "")}${path}`;
  const shareTitle = `Mascota perdida: ${title}`;

  return {
    appDeepLink: `rastro://${path.replace(/^\//, "")}`,
    message: `Ayuda a encontrar a ${title} en Rastro: ${webUrl}`,
    path,
    title: shareTitle,
    webUrl,
  };
}
