import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  cleanupAbandonedReportMediaUploads: vi.fn(),
  createDrizzleReportMediaRepository: vi.fn(),
  createS3MediaStorage: vi.fn(),
  parseMediaStorageConfig: vi.fn(),
}));
const nextEnv = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
}));

vi.mock("@acme/api", () => api);
vi.mock("@acme/db/client", () => ({
  db: { marker: "test-db" },
}));
vi.mock("~/env", () => nextEnv);

function resetNextEnv() {
  for (const key of Object.keys(nextEnv.env)) {
    delete nextEnv.env[key];
  }
}

describe("report media cleanup job route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextEnv();
  });

  it("does not run cleanup when the job secret is missing", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/jobs/report-media-cleanup", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(503);
    expect(api.cleanupAbandonedReportMediaUploads).not.toHaveBeenCalled();
  });

  it("requires the configured bearer token before running cleanup", async () => {
    nextEnv.env.RASTRO_JOB_SECRET = "job-secret";
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/jobs/report-media-cleanup", {
        headers: {
          authorization: "Bearer wrong-secret",
        },
        method: "GET",
      }),
    );

    expect(response.status).toBe(401);
    expect(api.cleanupAbandonedReportMediaUploads).not.toHaveBeenCalled();
  });

  it("runs cleanup with the production repository and storage adapter", async () => {
    nextEnv.env.RASTRO_JOB_SECRET = "job-secret";
    nextEnv.env.RASTRO_STORAGE_BUCKET = "rastro-media";
    const repository = { repository: true };
    const storage = { storage: true };
    api.createDrizzleReportMediaRepository.mockReturnValue(repository);
    api.createS3MediaStorage.mockReturnValue(storage);
    api.parseMediaStorageConfig.mockReturnValue({ bucket: "rastro-media" });
    api.cleanupAbandonedReportMediaUploads.mockResolvedValue({
      deletedObjects: 1,
      removedMedia: 1,
    });
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/jobs/report-media-cleanup", {
        headers: {
          authorization: "Bearer job-secret",
        },
        method: "POST",
      }),
    );

    const body: unknown = await response.json();

    expect(body).toEqual({
      deletedObjects: 1,
      removedMedia: 1,
    });
    expect(api.parseMediaStorageConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        RASTRO_STORAGE_BUCKET: "rastro-media",
      }),
    );
    expect(api.createDrizzleReportMediaRepository).toHaveBeenCalledWith({
      marker: "test-db",
    });
    expect(api.createS3MediaStorage).toHaveBeenCalledWith({
      bucket: "rastro-media",
    });
    expect(api.cleanupAbandonedReportMediaUploads).toHaveBeenCalledWith({
      mediaRepository: repository,
      mediaStorage: storage,
    });
    expect(JSON.stringify(body)).not.toContain("job-secret");
  });
});
