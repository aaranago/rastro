import { describe, expect, it } from "vitest";

import {
  buildChatConversationDeepLink,
  buildChatMessageNotification,
} from "./chat-repository";

describe("chat repository", () => {
  it("builds new-message notification content with a direct chat deep link", () => {
    expect(
      buildChatMessageNotification({
        conversationId: "55555555-5555-4555-8555-555555555555",
        messageText: "Lo vi cerca de la plaza.",
        senderDisplayName: "Diego",
      }),
    ).toEqual({
      body: "Diego: Lo vi cerca de la plaza.",
      deepLink: "rastro://chats/55555555-5555-4555-8555-555555555555",
      title: "Nuevo mensaje en Rastro",
    });
  });

  it("encodes chat deep link path segments", () => {
    expect(buildChatConversationDeepLink("chat id/with spaces")).toBe(
      "rastro://chats/chat%20id%2Fwith%20spaces",
    );
  });
});
