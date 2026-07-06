import { NextResponse } from "next/server";

import { env } from "~/env";

const maxJobLimit = 100;

export function validateJobRequest(
  request: Request,
  options: { unconfiguredMessage: string },
) {
  const expectedSecret = env.RASTRO_JOB_SECRET?.trim();

  if (!expectedSecret) {
    return NextResponse.json(
      { error: options.unconfiguredMessage },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export function parseJobLimit(request: Request) {
  const value = new URL(request.url).searchParams.get("limit");

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.min(parsed, maxJobLimit);
}
