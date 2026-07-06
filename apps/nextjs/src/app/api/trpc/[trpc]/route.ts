import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

const allowedCorsHeaders =
  "authorization, content-type, trpc-accept, x-trpc-source";
const allowedCorsMethods = "OPTIONS, GET, POST";

export const OPTIONS = (req: NextRequest) => {
  if (isDeniedCorsRequest(req)) {
    return new Response(null, { status: 403 });
  }

  const response = new Response(null, { status: 204 });
  setCorsHeaders(req, response);

  return response;
};

const handler = async (req: NextRequest) => {
  if (isDeniedCorsRequest(req)) {
    return new Response(null, { status: 403 });
  }

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () =>
      createTRPCContext({
        adminEmailList: env.RASTRO_ADMIN_EMAILS,
        auth: auth,
        headers: req.headers,
      }),
    onError({ error, path }) {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  });

  setCorsHeaders(req, response);
  return response;
};

export { handler as GET, handler as POST };

function isDeniedCorsRequest(req: NextRequest) {
  const origin = req.headers.get("origin");

  return Boolean(origin && !getAllowedCorsOrigins(req).has(origin));
}

function setCorsHeaders(req: NextRequest, res: Response) {
  const origin = req.headers.get("origin");

  res.headers.append("Vary", "Origin");

  if (!origin || !getAllowedCorsOrigins(req).has(origin)) {
    return;
  }

  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", allowedCorsMethods);
  res.headers.set("Access-Control-Allow-Headers", allowedCorsHeaders);
}

function getAllowedCorsOrigins(req: NextRequest) {
  return new Set(
    [
      req.nextUrl.origin,
      env.BETTER_AUTH_URL,
      env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined,
      env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
      "https://rastro.bo",
    ].filter((value): value is string => Boolean(value)),
  );
}
