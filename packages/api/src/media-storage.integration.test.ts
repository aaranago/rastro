import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import {
  createS3MediaStorage,
  parseOptionalMediaStorageConfig,
} from "./media-storage";

const storageConfig =
  process.env.RASTRO_STORAGE_INTEGRATION === "1"
    ? parseOptionalMediaStorageConfig(process.env)
    : null;

if (!storageConfig) {
  describe.skip("media storage integration", () => {
    it("requires RASTRO_STORAGE_INTEGRATION=1 and storage env", () => {
      expect(storageConfig).toBeNull();
    });
  });
} else {
  describe("media storage integration", () => {
    const storage = createS3MediaStorage(storageConfig);
    const uploadedObjectKeys: string[] = [];

    afterAll(async () => {
      await Promise.all(
        uploadedObjectKeys.map((objectKey) =>
          storage.deleteObject({ objectKey }),
        ),
      );
    });

    it("uploads through a presigned PUT and reads object metadata with HEAD", async () => {
      const mediaId = randomUUID();
      const objectKey = `integration-test/${mediaId}/original.webp`;
      const bytes = new Uint8Array([0x52, 0x41, 0x53, 0x54, 0x52, 0x4f]);
      const upload = await storage.createPresignedPut({
        contentType: "image/webp",
        expiresAt: new Date(Date.now() + 60_000),
        metadata: {
          height: "1",
          mediaId,
          sizeBytes: String(bytes.byteLength),
          width: "1",
        },
        objectKey,
        sizeBytes: bytes.byteLength,
      });

      const response = await fetch(upload.url, {
        body: bytes,
        headers: upload.headers,
        method: upload.method,
      });
      uploadedObjectKeys.push(objectKey);

      expect(response.ok).toBe(true);

      const head = await storage.headObject({ objectKey });
      expect(head).toMatchObject({
        contentLength: bytes.byteLength,
        contentType: "image/webp",
        metadata: {
          height: "1",
          mediaid: mediaId,
          sizebytes: String(bytes.byteLength),
          width: "1",
        },
      });
    });
  });
}
