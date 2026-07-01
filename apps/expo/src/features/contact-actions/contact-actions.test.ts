import { describe, expect, it } from "vitest";

import { runPublicContactAction } from "./contact-actions";

describe("public contact actions", () => {
  it("opens WhatsApp with the exposed public contact URL without requiring another phone number", async () => {
    const openedUrls: string[] = [];

    const result = await runPublicContactAction(
      {
        href: "https://wa.me/59170123456?text=Hola",
        kind: "whatsapp",
        label: "Escribir por WhatsApp",
        phoneNumber: "+591 70123456",
      },
      {
        openURL: (url) => {
          openedUrls.push(url);
        },
      },
    );

    expect(openedUrls).toEqual(["https://wa.me/59170123456?text=Hola"]);
    expect(result).toMatchObject({
      kind: "success",
      label: "WhatsApp abierto.",
    });
  });

  it("routes in-app chat through the injected chat opener instead of WhatsApp", async () => {
    const openedUrls: string[] = [];
    const openedChats: string[] = [];

    const result = await runPublicContactAction(
      {
        href: "rastro://chats/report/lost-report-1",
        kind: "in-app-chat",
        label: "Enviar mensaje en Rastro",
      },
      {
        openChat: ({ href }) => {
          openedChats.push(href);
        },
        openURL: (url) => {
          openedUrls.push(url);
        },
      },
    );

    expect(openedChats).toEqual(["rastro://chats/report/lost-report-1"]);
    expect(openedUrls).toEqual([]);
    expect(result).toMatchObject({
      kind: "success",
      label: "Chat abierto en Rastro.",
    });
  });

  it("rejects malformed WhatsApp actions instead of opening arbitrary URLs", async () => {
    const openedUrls: string[] = [];

    const result = await runPublicContactAction(
      {
        href: "https://example.com/59170123456",
        kind: "whatsapp",
        label: "Escribir por WhatsApp",
        phoneNumber: "+591 70123456",
      },
      {
        openURL: (url) => {
          openedUrls.push(url);
        },
      },
    );

    expect(openedUrls).toEqual([]);
    expect(result).toMatchObject({
      kind: "error",
      label: "No se pudo abrir WhatsApp.",
    });
  });
});
