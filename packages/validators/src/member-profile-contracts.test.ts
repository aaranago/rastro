import { describe, expect, it } from "vitest";

import {
  memberProfileGetInputSchema,
  memberProfileOutputSchema,
  memberProfileUpdateInputSchema,
} from "./index";

describe("member profile validation contracts", () => {
  it("validates member profile read and update payloads", () => {
    expect(memberProfileGetInputSchema.parse({})).toEqual({});
    expect(
      memberProfileUpdateInputSchema.parse({
        defaultContactPreference: "both",
        displayName: "  Camila R.  ",
        phone: " +591 2 222 1111 ",
        whatsapp: " +591 70000001 ",
      }),
    ).toEqual({
      defaultContactPreference: "both",
      displayName: "Camila R.",
      phone: "+591 2 222 1111",
      whatsapp: "+591 70000001",
    });
    expect(
      memberProfileUpdateInputSchema.parse({
        defaultContactPreference: "in_app_chat",
        displayName: "Camila R.",
        phone: "",
        whatsapp: "",
      }),
    ).toEqual({
      defaultContactPreference: "in_app_chat",
      displayName: "Camila R.",
      phone: null,
      whatsapp: null,
    });
    expect(
      memberProfileOutputSchema.safeParse({
        defaultContactPreference: "whatsapp",
        displayName: "Camila R.",
        memberId: "member-camila",
        phone: "+591 2 222 1111",
        whatsapp: "+591 70000001",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid identity, contact, and client-owned member fields", () => {
    expect(
      memberProfileGetInputSchema.safeParse({
        memberId: "member-attacker",
      }),
    ).toMatchObject({ success: false });

    const invalidInputs = [
      {
        defaultContactPreference: "in_app_chat",
        displayName: "",
      },
      {
        defaultContactPreference: "phone",
        displayName: "Camila R.",
      },
      {
        defaultContactPreference: "in_app_chat",
        displayName: "Camila R.",
        phone: "not a phone",
      },
      {
        defaultContactPreference: "in_app_chat",
        displayName: "Camila R.",
        whatsapp: "123",
      },
      {
        defaultContactPreference: "whatsapp",
        displayName: "Camila R.",
        whatsapp: "",
      },
      {
        defaultContactPreference: "in_app_chat",
        displayName: "Camila R.",
        memberId: "member-attacker",
      },
    ];

    for (const input of invalidInputs) {
      expect(memberProfileUpdateInputSchema.safeParse(input)).toMatchObject({
        success: false,
      });
    }
  });
});
