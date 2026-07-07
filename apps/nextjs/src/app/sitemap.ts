import type { MetadataRoute } from "next";

import { toCanonicalPublicUrl } from "~/public-web-url";

const staticPublicRoutes = [
  { path: "/", priority: 1 },
  { path: "/descargar", priority: 0.9 },
  { path: "/privacidad", priority: 0.4 },
  { path: "/terminos", priority: 0.4 },
  { path: "/eliminar-cuenta", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return staticPublicRoutes.map((route) => ({
    changeFrequency: "monthly",
    priority: route.priority,
    url: toCanonicalPublicUrl(route.path),
  }));
}
