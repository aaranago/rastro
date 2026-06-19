import type { Href } from "expo-router";

export interface OpenInternalRastroHrefInput {
  href: string;
  onOpenHref?: (href: string) => void;
  openExternalUrl: (href: string) => Promise<void> | void;
  routerPush: (href: Href) => void;
}

export function openInternalRastroHref({
  href,
  onOpenHref,
  openExternalUrl,
  routerPush,
}: OpenInternalRastroHrefInput) {
  if (onOpenHref) {
    onOpenHref(href);
    return;
  }

  const routerHref = resolveInternalRastroHref(href);

  if (routerHref) {
    routerPush(routerHref);
    return;
  }

  void openExternalUrl(href);
}

export function resolveInternalRastroHref(href: string): Href | null {
  if (href.startsWith("/")) {
    return href as Href;
  }

  if (authSignInDeepLinkPattern.test(href)) {
    return "/(tabs)/(profile)" as Href;
  }

  const reportUpdateHref = resolveReportUpdateHref(href);

  if (reportUpdateHref) {
    return reportUpdateHref;
  }

  for (const pattern of internalDeepLinkPatterns) {
    if (pattern.test(href)) {
      return href.replace("rastro://", "/") as Href;
    }
  }

  return null;
}

function resolveReportUpdateHref(href: string): Href | null {
  const match = reportUpdateDeepLinkPattern.exec(href);
  const reportKind = match?.[1];
  const reportId = match?.[2];

  if (!reportKind || !reportId) {
    return null;
  }

  return `/reportes/${reportKind}/${reportId}` as Href;
}

const authSignInDeepLinkPattern = /^rastro:\/\/auth\/sign-in(?:\?.*)?$/;
const reportUpdateDeepLinkPattern =
  /^rastro:\/\/reportes\/(avistamientos|encontrados|perdidos)\/([^/?#]+)\/actualizar(?:[?#].*)?$/;

const internalDeepLinkPatterns = [
  /^rastro:\/\/adopciones\/[^/]+$/,
  /^rastro:\/\/chats\/[^/]+$/,
  /^rastro:\/\/reportes\/avistamientos\/[^/]+$/,
  /^rastro:\/\/reportes\/encontrados\/[^/]+$/,
  /^rastro:\/\/reportes\/perdidos\/[^/]+$/,
] as const;
