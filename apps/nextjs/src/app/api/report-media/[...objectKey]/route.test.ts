import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createS3MediaStorage: vi.fn(),
  parseMediaStorageConfig: vi.fn(),
}));
const nextEnv = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
}));

vi.mock("@acme/api", () => api);
vi.mock("~/env", () => nextEnv);

function resetNextEnv() {
  for (const key of Object.keys(nextEnv.env)) {
    delete nextEnv.env[key];
  }
}

describe("report media delivery route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextEnv();
  });

  it("streams report media through the server-side storage adapter", async () => {
    nextEnv.env.RASTRO_STORAGE_BUCKET = "rastro-media";
    const storage = {
      getObject: vi.fn().mockResolvedValue({
        body: new Uint8Array([0x52, 0x41, 0x53, 0x54, 0x52, 0x4f]),
        cacheControl: "public, max-age=60",
        contentLength: 6,
        contentType: "image/webp",
        eTag: '"rastro"',
        metadata: {},
      }),
    };
    api.parseMediaStorageConfig.mockReturnValue({ bucket: "rastro-media" });
    api.createS3MediaStorage.mockReturnValue(storage);
    const { GET } = await import("./route");

    const response = await GET(
      new Request(
        "http://localhost/api/report-media/report-media/member/original.webp",
      ),
      {
        params: Promise.resolve({
          objectKey: ["report-media", "member", "original.webp"],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    expect(response.headers.get("etag")).toBe('"rastro"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0x52, 0x41, 0x53, 0x54, 0x52, 0x4f]),
    );
    expect(api.parseMediaStorageConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        RASTRO_STORAGE_BUCKET: "rastro-media",
      }),
    );
    expect(api.createS3MediaStorage).toHaveBeenCalledWith({
      bucket: "rastro-media",
    });
    expect(storage.getObject).toHaveBeenCalledWith({
      objectKey: "report-media/member/original.webp",
    });
  });

  it("streams admin-managed media through the server-side storage adapter", async () => {
    nextEnv.env.RASTRO_STORAGE_BUCKET = "rastro-media";
    const storage = {
      getObject: vi.fn().mockResolvedValue({
        body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        cacheControl: "public, max-age=120",
        contentLength: 4,
        contentType: "image/png",
        eTag: '"admin-media"',
        metadata: {},
      }),
    };
    api.parseMediaStorageConfig.mockReturnValue({ bucket: "rastro-media" });
    api.createS3MediaStorage.mockReturnValue(storage);
    const { GET } = await import("./route");

    const response = await GET(
      new Request(
        "http://localhost/api/report-media/admin-media/admin/provider_logo/asset/original.png",
      ),
      {
        params: Promise.resolve({
          objectKey: [
            "admin-media",
            "admin",
            "provider_logo",
            "asset",
            "original.png",
          ],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    );
    expect(storage.getObject).toHaveBeenCalledWith({
      objectKey: "admin-media/admin/provider_logo/asset/original.png",
    });
  });

  it("does not proxy arbitrary bucket keys", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/report-media/private/file.webp"),
      {
        params: Promise.resolve({
          objectKey: ["private", "file.webp"],
        }),
      },
    );

    expect(response.status).toBe(404);
    expect(api.parseMediaStorageConfig).not.toHaveBeenCalled();
    expect(api.createS3MediaStorage).not.toHaveBeenCalled();
  });
});
