import { describe, expect, it } from "vitest";

import { MemberProfile } from "./schema";

describe("member profile schema", () => {
  it("stores backend-owned contact defaults keyed by member id", () => {
    expect(MemberProfile.memberId).toBeDefined();
    expect(MemberProfile.defaultContactPreference).toBeDefined();
    expect(MemberProfile.phone).toBeDefined();
    expect(MemberProfile.whatsapp).toBeDefined();
    expect(MemberProfile.defaultContactPreference.default).toBe("in_app_chat");

    expect(MemberProfile.memberId.primary).toBe(true);
  });

  it("uses Date values for timestamp update hooks", () => {
    expect(MemberProfile.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
