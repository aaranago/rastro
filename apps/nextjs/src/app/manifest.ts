import type { MetadataRoute } from "next";

import { toCanonicalPublicUrl } from "~/public-web-url";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    categories: ["social", "utilities"],
    description:
      "Red de recuperación de mascotas en Bolivia para reportes, adopciones responsables y recursos locales.",
    dir: "ltr",
    display: "standalone",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    id: toCanonicalPublicUrl("/"),
    lang: "es-BO",
    name: "Rastro",
    scope: "/",
    short_name: "Rastro",
    start_url: "/",
    theme_color: "#ffffff",
  };
}
