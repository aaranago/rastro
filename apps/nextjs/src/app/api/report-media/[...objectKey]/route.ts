import { createS3MediaStorage, parseMediaStorageConfig } from "@acme/api";

import { env } from "~/env";

export const dynamic = "force-dynamic";

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

function responseForUnavailableMedia(status = 404) {
  return Response.json({ error: "Media is not available." }, { status });
}

function normalizeObjectKey(params: { objectKey?: string[] }) {
  const objectKey = params.objectKey?.join("/") ?? "";

  if (
    !objectKey.startsWith("report-media/") &&
    !objectKey.startsWith("admin-media/")
  ) {
    return null;
  }

  return objectKey;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ objectKey?: string[] }> },
) {
  const objectKey = normalizeObjectKey(await context.params);

  if (!objectKey) {
    return responseForUnavailableMedia();
  }

  try {
    const storage = createS3MediaStorage(
      parseMediaStorageConfig(mediaStorageEnv()),
    );
    const object = await storage.getObject({ objectKey });
    const headers = new Headers({
      "cache-control": object.cacheControl ?? "public, max-age=300",
      "content-length": String(object.contentLength),
      "content-type": object.contentType ?? "application/octet-stream",
    });
    const responseBody = new ArrayBuffer(object.body.byteLength);

    if (object.eTag) {
      headers.set("etag", object.eTag);
    }
    new Uint8Array(responseBody).set(object.body);

    return new Response(responseBody, {
      headers,
      status: 200,
    });
  } catch {
    return responseForUnavailableMedia(503);
  }
}
