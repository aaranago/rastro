import type { MetadataRoute } from "next";

import {
  getCanonicalPublicWebBaseUrl,
  toCanonicalPublicUrl,
} from "~/public-web-url";

export default function robots(): MetadataRoute.Robots {
  return {
    host: getCanonicalPublicWebBaseUrl(),
    rules: {
      allow: "/",
      disallow: ["/admin", "/api"],
      userAgent: "*",
    },
    sitemap: toCanonicalPublicUrl("/sitemap.xml"),
  };
}
