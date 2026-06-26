import { describe, expect, it, vi } from "vitest";

import {
  applyAdminSettingsUpdateFromFormData,
  parseAdminSettingsFormData,
} from "./admin-settings-actions";

describe("admin settings actions", () => {
  it("requires explicit confirmation before persisting settings", async () => {
    const persistSettings = vi.fn();
    const formData = new FormData();
    formData.set("adoptionReviewModeEnabled", "on");

    expect(parseAdminSettingsFormData(formData)).toEqual({
      ok: false,
      reason: "missing_confirmation",
    });
    await expect(
      applyAdminSettingsUpdateFromFormData(formData, persistSettings),
    ).resolves.toBe(false);
    expect(persistSettings).not.toHaveBeenCalled();
  });

  it("maps checked switches to persisted settings input", async () => {
    const persistSettings = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("adoptionReviewModeEnabled", "on");
    formData.set("confirmSettingsChange", "on");

    await expect(
      applyAdminSettingsUpdateFromFormData(formData, persistSettings),
    ).resolves.toBe(true);
    expect(persistSettings).toHaveBeenCalledWith({
      adoptionReviewModeEnabled: true,
      verifiedEmailRequiredToPublish: false,
    });
  });
});
