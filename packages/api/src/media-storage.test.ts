import { describe, expect, it } from "vitest";

import {
  createS3MediaStorage,
  parseMediaStorageConfig,
  redactMediaStorageConfig,
} from "./media-storage";

describe("media storage config", () => {
  it("parses S3/MinIO upload configuration and redacts credentials", () => {
    const config = parseMediaStorageConfig({
      RASTRO_STORAGE_ACCESS_KEY_ID: "minio-rastro",
      RASTRO_STORAGE_ALLOWED_MIME_TYPES: "image/jpeg,image/png,image/webp",
      RASTRO_STORAGE_BUCKET: "rastro-media",
      RASTRO_STORAGE_DELIVERY_BASE_URL: "https://cdn.example.invalid/media",
      RASTRO_STORAGE_FORCE_PATH_STYLE: "true",
      RASTRO_STORAGE_INTERNAL_ENDPOINT: "http://minio:9000",
      RASTRO_STORAGE_MAX_IMAGE_BYTES: "5242880",
      RASTRO_STORAGE_PRESIGN_ENDPOINT: "https://uploads.example.invalid",
      RASTRO_STORAGE_PRESIGN_EXPIRES_SECONDS: "300",
      RASTRO_STORAGE_REGION: "us-east-1",
      RASTRO_STORAGE_SECRET_ACCESS_KEY: "super-secret",
      RASTRO_STORAGE_TLS: "false",
    });

    expect(config).toMatchObject({
      accessKeyId: "minio-rastro",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      bucket: "rastro-media",
      deliveryBaseUrl: "https://cdn.example.invalid/media",
      forcePathStyle: true,
      internalEndpoint: "http://minio:9000",
      maxImageBytes: 5_242_880,
      presignEndpoint: "https://uploads.example.invalid",
      presignExpiresSeconds: 300,
      region: "us-east-1",
      secretAccessKey: "super-secret",
      tls: false,
    });

    const redacted = redactMediaStorageConfig(config);

    expect(redacted).toMatchObject({
      accessKeyId: "[redacted]",
      bucket: "rastro-media",
      secretAccessKey: "[redacted]",
    });
    expect(JSON.stringify(redacted)).not.toContain("super-secret");
    expect(JSON.stringify(redacted)).not.toContain("minio-rastro");
  });

  it("creates presigned PUT instructions with required object metadata headers", async () => {
    const config = parseMediaStorageConfig({
      RASTRO_STORAGE_ACCESS_KEY_ID: "minio-rastro",
      RASTRO_STORAGE_BUCKET: "rastro-media",
      RASTRO_STORAGE_FORCE_PATH_STYLE: "true",
      RASTRO_STORAGE_INTERNAL_ENDPOINT: "http://minio:9000",
      RASTRO_STORAGE_PRESIGN_ENDPOINT: "https://uploads.example.invalid",
      RASTRO_STORAGE_REGION: "us-east-1",
      RASTRO_STORAGE_SECRET_ACCESS_KEY: "super-secret",
    });
    const storage = createS3MediaStorage(config, {
      presignPutObject: (input) => {
        expect(input).toMatchObject({
          bucket: "rastro-media",
          checksumSha256: "sha256-test",
          contentType: "image/webp",
          key: "report-media/member/media/original.webp",
          metadata: {
            height: "900",
            mediaId: "11111111-1111-4111-8111-111111111111",
            sizeBytes: "300000",
            width: "1200",
          },
        });
        expect(input.expiresIn).toBeGreaterThan(0);
        return Promise.resolve(
          "https://uploads.example.invalid/rastro-media/report-media/member/media/original.webp?signature=test",
        );
      },
    });

    const instructions = await storage.createPresignedPut({
      checksumSha256: "sha256-test",
      contentType: "image/webp",
      expiresAt: new Date(Date.now() + 60_000),
      metadata: {
        height: "900",
        mediaId: "11111111-1111-4111-8111-111111111111",
        sizeBytes: "300000",
        width: "1200",
      },
      objectKey: "report-media/member/media/original.webp",
      sizeBytes: 300_000,
    });

    expect(instructions).toMatchObject({
      headers: {
        "content-type": "image/webp",
        "x-amz-checksum-sha256": "sha256-test",
        "x-amz-meta-height": "900",
        "x-amz-meta-media-id": "11111111-1111-4111-8111-111111111111",
        "x-amz-meta-size-bytes": "300000",
        "x-amz-meta-width": "1200",
      },
      method: "PUT",
    });
    expect(JSON.stringify(instructions)).not.toContain("super-secret");
    expect(JSON.stringify(instructions)).not.toContain("minio-rastro");
  });
});
