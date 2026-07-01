import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as DbClientModule from "@acme/db/client";
import { eq } from "@acme/db";
import {
  AlertPushToken,
  ChatNotificationDelivery,
  Report,
  user,
} from "@acme/db/schema";

import type {
  ChatRepository,
  createDrizzleChatRepository,
} from "./chat-repository";

const execFileAsync = promisify(execFile);
const runIntegration =
  process.env.RASTRO_DB_INTEGRATION === "1" && process.env.POSTGRES_URL;
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function databaseUrlFor(databaseName: string) {
  const url = new URL(
    process.env.POSTGRES_URL?.replace(":6543", ":5432") ?? "",
  );
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll(`"`, `""`)}"`;
}

const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("chat repository integration", () => {
  let db: DbClientModule.Database;
  let pool: { end: () => Promise<void> } | null = null;
  let repository: ChatRepository;
  let createChatRepository: typeof createDrizzleChatRepository;
  let tempDatabaseName = "";
  let currentTime = new Date("2026-07-01T12:00:00.000Z");
  const originalPostgresUrl = process.env.POSTGRES_URL;

  beforeAll(async () => {
    tempDatabaseName = `rastro_chat_test_${Date.now()}`;
    const admin = new Client({
      connectionString: databaseUrlFor("postgres"),
    });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${quoteIdentifier(tempDatabaseName)}`);
    await admin.end();

    const tempDatabaseUrl = databaseUrlFor(tempDatabaseName);
    await execFileAsync(
      "pnpm",
      ["-F", "@acme/db", "exec", "drizzle-kit", "migrate"],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          POSTGRES_URL: tempDatabaseUrl,
        },
        timeout: 60_000,
      },
    );

    process.env.POSTGRES_URL = tempDatabaseUrl;

    const dbClientModule = await import("@acme/db/client");
    const chatRepositoryModule = await import("./chat-repository");

    db = dbClientModule.db;
    pool = dbClientModule.pool;
    createChatRepository = chatRepositoryModule.createDrizzleChatRepository;
    repository = createChatRepository(db, { now: () => currentTime });

    await db.insert(user).values([
      {
        email: "caretaker-chat-test@example.invalid",
        id: "member-chat-caretaker",
        name: "Camila",
      },
      {
        email: "contact-chat-test@example.invalid",
        id: "member-chat-contact",
        name: "Diego",
      },
    ]);

    await db.insert(Report).values({
      caretakerId: "member-chat-caretaker",
      color: "marron",
      contactPreference: "in_app_chat",
      createdAt: new Date("2026-07-01T11:00:00.000Z"),
      description: "Toby se perdio cerca de la plaza.",
      eventOccurredAt: new Date("2026-07-01T10:30:00.000Z"),
      id: "11111111-1111-4111-8111-000000000201",
      idempotencyKey: "chat-notification-delivery-report",
      petName: "Toby",
      species: "dog",
      status: "active",
      title: "Toby perdido en Sopocachi",
      type: "lost_pet",
      updatedAt: new Date("2026-07-01T11:00:00.000Z"),
    });
  }, 90_000);

  afterAll(async () => {
    process.env.POSTGRES_URL = originalPostgresUrl;
    await pool?.end();

    if (!tempDatabaseName) {
      return;
    }

    const admin = new Client({
      connectionString: databaseUrlFor("postgres"),
    });
    await admin.connect();
    await admin.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(tempDatabaseName)} WITH (FORCE)`,
    );
    await admin.end();
  }, 30_000);

  it("creates one recipient delivery for a persisted report-linked chat message", async () => {
    currentTime = new Date("2026-07-01T12:00:00.000Z");
    const [pushToken] = await db
      .insert(AlertPushToken)
      .values({
        lastSeenAt: currentTime,
        memberId: "member-chat-caretaker",
        platform: "ios",
        registeredAt: currentTime,
        token: "ExponentPushToken[chat_caretaker_123]",
        updatedAt: currentTime,
      })
      .returning();

    if (!pushToken) {
      throw new Error("Expected push token to be persisted.");
    }

    const conversation = await repository.openReportConversation({
      contactMemberId: "member-chat-contact",
      reportId: "11111111-1111-4111-8111-000000000201",
    });

    currentTime = new Date("2026-07-01T12:05:00.000Z");
    await repository.sendMessage({
      conversationId: conversation.id,
      senderMemberId: "member-chat-contact",
      text: "Lo vi cerca de la plaza.",
    });

    const deliveries = await db
      .select()
      .from(ChatNotificationDelivery)
      .where(eq(ChatNotificationDelivery.conversationId, conversation.id));

    expect(deliveries).toEqual([
      expect.objectContaining({
        body: "Diego: Lo vi cerca de la plaza.",
        deepLink: `rastro://chats/${conversation.id}`,
        pushTokenId: pushToken.id,
        recipientMemberId: "member-chat-caretaker",
        senderMemberId: "member-chat-contact",
        status: "pending",
        title: "Nuevo mensaje en Rastro",
      }),
    ]);
    expect(deliveries[0]?.recipientMemberId).not.toBe(
      deliveries[0]?.senderMemberId,
    );

    await repository.blockMember({
      blockedMemberId: "member-chat-contact",
      blockerMemberId: "member-chat-caretaker",
      conversationId: conversation.id,
    });

    currentTime = new Date("2026-07-01T12:10:00.000Z");
    await repository.sendMessage({
      conversationId: conversation.id,
      senderMemberId: "member-chat-caretaker",
      text: "Cierro este chat.",
    });

    const deliveriesAfterBlockedSend = await db
      .select()
      .from(ChatNotificationDelivery)
      .where(eq(ChatNotificationDelivery.conversationId, conversation.id));

    expect(deliveriesAfterBlockedSend).toHaveLength(1);
  });
});
