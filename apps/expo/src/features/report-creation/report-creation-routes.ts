import type { Href } from "expo-router";

import type { ReportIntent } from "../../i18n";

const reportCreationHrefs = {
  adoption: "/report-create/adoption",
  found: "/report-create/found",
  lost: "/report-create/lost",
  sighting: "/report-create/sighting",
} as const satisfies Record<ReportIntent, string>;

export function buildReportCreationHref(intent: ReportIntent): Href {
  return reportCreationHrefs[intent] as Href;
}
