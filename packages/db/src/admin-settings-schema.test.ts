import { describe, expect, it } from "vitest";

import { AdminSettings } from "./schema";

describe("admin settings schema", () => {
  it("stores global publish gates with safe product defaults", () => {
    expect(AdminSettings.id).toBeDefined();
    expect(AdminSettings.adoptionReviewModeEnabled.default).toBe(false);
    expect(AdminSettings.verifiedEmailRequiredToPublish.default).toBe(false);
    expect(AdminSettings.updatedByAdminId).toBeDefined();
  });

  it("uses Date values for timestamp update hooks", () => {
    expect(AdminSettings.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
