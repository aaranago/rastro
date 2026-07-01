import type { Href } from "expo-router";

import { mobileHomeHref, mobileHomePath } from "./home-route";

export interface OpenInternalRastroHrefInput {
  href: string;
  onOpenHref?: (href: string) => void;
  openAuthPrompt?: (request: InternalAuthPromptRequest) => void;
  openExternalUrl: (href: string) => Promise<void> | void;
  routerPush: (href: Href) => void;
}

export interface InternalAuthPromptRequest {
  returnTo?: string;
  sourceHref: string;
}

export function openInternalRastroHref({
  href,
  onOpenHref,
  openAuthPrompt,
  openExternalUrl,
  routerPush,
}: OpenInternalRastroHrefInput) {
  if (onOpenHref) {
    onOpenHref(href);
    return;
  }

  const authPromptRequest = resolveInternalAuthPromptRequest(href);

  if (authPromptRequest) {
    openAuthPrompt?.(authPromptRequest);
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
  if (isMobileRootHref(href)) {
    return mobileHomeHref;
  }

  if (href.startsWith("/")) {
    return href as Href;
  }

  if (resolveInternalAuthPromptRequest(href)) {
    return null;
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

function resolveInternalAuthPromptRequest(
  href: string,
): InternalAuthPromptRequest | null {
  const url = parseInternalUrl(href);

  if (url?.hostname !== "auth" || url.pathname !== "/sign-in") {
    return null;
  }

  const returnTo = normalizeAuthReturnTo(url.searchParams.get("returnTo"));

  return {
    ...(returnTo ? { returnTo } : {}),
    sourceHref: href,
  };
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

function parseInternalUrl(href: string): URL | null {
  try {
    const url = new URL(href);

    return url.protocol === "rastro:" ? url : null;
  } catch {
    return null;
  }
}

function normalizeAuthReturnTo(value: string | null): string | undefined {
  const returnTo = value?.trim();

  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return undefined;
  }

  if (isMobileRootHref(returnTo)) {
    return mobileHomePath;
  }

  return authReturnToAliases[returnTo] ?? returnTo;
}

const authReturnToAliases: Record<string, string> = {
  "/actividad": "/(tabs)/(activity)",
  "/cerca": "/(tabs)/(nearby)",
  "/perfil": "/(tabs)/(profile)",
  "/recursos": "/(tabs)/(resources)",
};

function isMobileRootHref(value: string) {
  return value === "/" || value === "/index";
}

const reportUpdateDeepLinkPattern =
  /^rastro:\/\/reportes\/(avistamientos|encontrados|perdidos)\/([^/?#]+)\/actualizar(?:[?#].*)?$/;

const internalDeepLinkPatterns = [
  /^rastro:\/\/adopciones\/[^/]+$/,
  /^rastro:\/\/chats\/report\/[^/]+$/,
  /^rastro:\/\/chats\/[^/]+$/,
  /^rastro:\/\/reportes\/avistamientos\/[^/]+$/,
  /^rastro:\/\/reportes\/encontrados\/[^/]+$/,
  /^rastro:\/\/reportes\/perdidos\/[^/]+$/,
] as const;
