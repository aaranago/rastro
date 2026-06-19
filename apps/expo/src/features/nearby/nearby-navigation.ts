import type { NearbyPublicReportKind } from "./nearby-types";

export interface NearbyReportRouteTarget {
  href: string;
  id: string;
  reportKind: NearbyPublicReportKind;
}

export function buildNearbyReportRouteTarget({
  id,
  reportKind,
}: {
  id: string;
  reportKind: NearbyPublicReportKind;
}): NearbyReportRouteTarget {
  return {
    href: buildNearbyReportHref({ id, reportKind }),
    id,
    reportKind,
  };
}

function buildNearbyReportHref({
  id,
  reportKind,
}: {
  id: string;
  reportKind: NearbyPublicReportKind;
}) {
  const encodedId = encodeURIComponent(id.trim());

  switch (reportKind) {
    case "adoption-listing":
      return `/adopciones/${encodedId}`;
    case "found-pet-report":
      return `/reportes/encontrados/${encodedId}`;
    case "sighting-report":
      return `/reportes/avistamientos/${encodedId}`;
    case "lost-pet-report":
      return `/reportes/perdidos/${encodedId}`;
  }
}
