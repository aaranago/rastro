import { describe, expect, it, vi } from "vitest";

import { buildChatScreenViewModel } from "./chat-screen";

vi.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
}));

vi.mock("~/features/chat/chat-model", async () =>
  vi.importActual("./chat-model"),
);

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  FlatList: "FlatList",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Linking: {
    openURL: () => Promise.resolve(),
  },
  Platform: {
    OS: "ios",
  },
  Pressable: "Pressable",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

describe("ChatScreen view model", () => {
  it("surfaces Spanish report-linked chat labels without unsupported chat surfaces", () => {
    const viewModel = buildChatScreenViewModel({
      conversation: {
        blockedMemberships: [],
        createdAt: "2026-06-18T12:00:00.000Z",
        hiddenByMemberIds: [],
        id: "conversation-1",
        messages: [
          {
            conversationId: "conversation-1",
            createdAt: "2026-06-18T12:01:00.000Z",
            id: "message-1",
            senderMemberId: "member-diego",
            text: "Vi a Toby cerca de la plaza.",
          },
        ],
        participants: [
          { displayName: "Camila", memberId: "member-camila" },
          { displayName: "Diego", memberId: "member-diego" },
        ],
        reports: [],
        subject: {
          href: "rastro://reportes/perdidos/lost-report-1",
          id: "lost-report-1",
          kind: "lost-pet-report",
          subtitle: "Sopocachi",
          title: "Toby",
        },
        updatedAt: "2026-06-18T12:01:00.000Z",
      },
      viewerMemberId: "member-camila",
    });

    expect(viewModel.actions).toMatchObject({
      blockLabel: "Bloquear",
      refreshLabel: "Actualizar",
      reportLabel: "Reportar",
      sendLabel: "Enviar",
      subjectLinkLabel: "Ver reporte",
    });
    expect(viewModel.composerPlaceholder).toBe("Escribe un mensaje");

    const renderedCopy = JSON.stringify(viewModel).toLowerCase();

    for (const forbiddenCopy of [
      "archivo",
      "attachment",
      "comentario",
      "comment",
      "dm",
      "grupo",
      "group",
    ]) {
      expect(renderedCopy).not.toContain(forbiddenCopy);
    }
  });
});
