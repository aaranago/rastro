import { describe, expect, it } from "vitest";

import {
  getMemberProfileSaveFailureMessage,
  validateMemberProfileSettingsDraft,
} from "./member-profile";

describe("Member profile settings model", () => {
  it("normalizes a valid draft into a backend update input", () => {
    expect(
      validateMemberProfileSettingsDraft({
        defaultContactPreference: "both",
        displayName: " Camila R. ",
        phone: " +591 70123456 ",
        whatsapp: " +591 71234567 ",
      }),
    ).toEqual({
      errors: [],
      input: {
        defaultContactPreference: "both",
        displayName: "Camila R.",
        phone: "+591 70123456",
        whatsapp: "+591 71234567",
      },
      ok: true,
    });
  });

  it("rejects empty display name, unsupported method, and invalid phones in Spanish", () => {
    const result = validateMemberProfileSettingsDraft({
      defaultContactPreference: "sms",
      displayName: "   ",
      phone: "telefono",
      whatsapp: "+591",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      "Ingresa tu nombre público.",
      "Elige un método de contacto válido.",
      "Ingresa un teléfono válido.",
      "Ingresa un WhatsApp válido.",
    ]);
  });

  it("formats backend validation, auth, and offline failures for the form", () => {
    expect(
      getMemberProfileSaveFailureMessage({
        data: { code: "BAD_REQUEST" },
        message: "validation failed",
      }),
    ).toBe("El backend rechazó los datos. Revisa tu nombre y teléfonos.");
    expect(
      getMemberProfileSaveFailureMessage({
        data: { code: "UNAUTHORIZED" },
      }),
    ).toBe("Inicia sesión de nuevo para guardar tus ajustes.");
    expect(
      getMemberProfileSaveFailureMessage(new Error("Network request failed")),
    ).toBe(
      "No pudimos guardar tus ajustes. Revisa tu conexión e intenta de nuevo.",
    );
  });
});
