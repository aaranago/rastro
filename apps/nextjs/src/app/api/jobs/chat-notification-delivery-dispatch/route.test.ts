import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createDrizzleChatNotificationDeliveryRepository: vi.fn(),
  createExpoPushClient: vi.fn(),
  dispatchPendingChatNotificationDeliveries: vi.fn(),
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

describe("chat notification delivery dispatch job route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextEnv();
  });

  it("does not run dispatch when the job secret is missing", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request(
        "http://localhost/api/jobs/chat-notification-delivery-dispatch",
        {
          method: "POST",
        },
      ),
    );

    expect(response.status).toBe(503);
    expect(
      api.dispatchPendingChatNotificationDeliveries,
    ).not.toHaveBeenCalled();
  });

  it("requires the configured bearer token before dispatching", async () => {
    nextEnv.env.RASTRO_JOB_SECRET = "job-secret";
    const { GET } = await import("./route");

    const response = await GET(
      new Request(
        "http://localhost/api/jobs/chat-notification-delivery-dispatch",
        {
          headers: {
            authorization: "Bearer wrong-secret",
          },
          method: "GET",
        },
      ),
    );

    expect(response.status).toBe(401);
    expect(
      api.dispatchPendingChatNotificationDeliveries,
    ).not.toHaveBeenCalled();
  });

  it("runs dispatch with the production repository and Expo push client", async () => {
    nextEnv.env.RASTRO_JOB_SECRET = "job-secret";
    const repository = { repository: true };
    const pushClient = { pushClient: true };
    api.createDrizzleChatNotificationDeliveryRepository.mockReturnValue(
      repository,
    );
    api.createExpoPushClient.mockReturnValue(pushClient);
    api.dispatchPendingChatNotificationDeliveries.mockResolvedValue({
      failed: 0,
      pending: 2,
      requested: 2,
      sent: 2,
      skipped: 0,
    });
    const { POST } = await import("./route");

    const response = await POST(
      new Request(
        "http://localhost/api/jobs/chat-notification-delivery-dispatch?limit=25",
        {
          headers: {
            authorization: "Bearer job-secret",
          },
          method: "POST",
        },
      ),
    );

    const body: unknown = await response.json();

    expect(body).toEqual({
      failed: 0,
      pending: 2,
      requested: 2,
      sent: 2,
      skipped: 0,
    });
    expect(
      api.createDrizzleChatNotificationDeliveryRepository,
    ).toHaveBeenCalledWith({
      marker: "test-db",
    });
    expect(api.createExpoPushClient).toHaveBeenCalledWith();
    expect(api.dispatchPendingChatNotificationDeliveries).toHaveBeenCalledWith({
      chatNotificationRepository: repository,
      limit: 25,
      pushClient,
    });
    expect(JSON.stringify(body)).not.toContain("job-secret");
  });
});
