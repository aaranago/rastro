import { NextResponse } from "next/server";

import {
  createDrizzleAlertRepository,
  createExpoPushClient,
  dispatchPendingAlertDeliveries,
} from "@acme/api";
import { db } from "@acme/db/client";

import { env } from "~/env";

export const dynamic = "force-dynamic";

function expectedJobSecret() {
  const secret = env.RASTRO_JOB_SECRET?.trim();
  if (!secret) {
    return null;
  }

  return secret;
}

async function handler(request: Request) {
  const expectedSecret = expectedJobSecret();

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Alert delivery dispatch job is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await dispatchPendingAlertDeliveries({
    alertRepository: createDrizzleAlertRepository(db),
    limit: parseLimit(request),
    pushClient: createExpoPushClient(),
  });

  return NextResponse.json(result);
}

function parseLimit(request: Request) {
  const value = new URL(request.url).searchParams.get("limit");

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export { handler as GET, handler as POST };
