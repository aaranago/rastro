import { NextResponse } from "next/server";

import {
  cleanupAbandonedReportMediaUploads,
  createDrizzleReportMediaRepository,
  createS3MediaStorage,
  parseMediaStorageConfig,
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

function mediaStorageEnv(): Record<string, string | undefined> {
  return {
    RASTRO_STORAGE_ACCESS_KEY_ID: env.RASTRO_STORAGE_ACCESS_KEY_ID,
    RASTRO_STORAGE_ALLOWED_MIME_TYPES: env.RASTRO_STORAGE_ALLOWED_MIME_TYPES,
    RASTRO_STORAGE_BUCKET: env.RASTRO_STORAGE_BUCKET,
    RASTRO_STORAGE_DELIVERY_BASE_URL: env.RASTRO_STORAGE_DELIVERY_BASE_URL,
    RASTRO_STORAGE_FORCE_PATH_STYLE: env.RASTRO_STORAGE_FORCE_PATH_STYLE,
    RASTRO_STORAGE_INTERNAL_ENDPOINT: env.RASTRO_STORAGE_INTERNAL_ENDPOINT,
    RASTRO_STORAGE_MAX_IMAGE_BYTES: env.RASTRO_STORAGE_MAX_IMAGE_BYTES,
    RASTRO_STORAGE_PRESIGN_ENDPOINT: env.RASTRO_STORAGE_PRESIGN_ENDPOINT,
    RASTRO_STORAGE_PRESIGN_EXPIRES_SECONDS:
      env.RASTRO_STORAGE_PRESIGN_EXPIRES_SECONDS,
    RASTRO_STORAGE_REGION: env.RASTRO_STORAGE_REGION,
    RASTRO_STORAGE_SECRET_ACCESS_KEY: env.RASTRO_STORAGE_SECRET_ACCESS_KEY,
    RASTRO_STORAGE_TLS: env.RASTRO_STORAGE_TLS,
  };
}

async function handler(request: Request) {
  const expectedSecret = expectedJobSecret();

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Report media cleanup job is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const storageConfig = parseMediaStorageConfig(mediaStorageEnv());
  const mediaRepository = createDrizzleReportMediaRepository(db);
  const mediaStorage = createS3MediaStorage(storageConfig);
  const result = await cleanupAbandonedReportMediaUploads({
    mediaRepository,
    mediaStorage,
  });

  return NextResponse.json(result);
}

export { handler as GET, handler as POST };
