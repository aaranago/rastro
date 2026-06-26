import type { AdminSettingsUpdateInput } from "./admin-settings-api-adapter";

export type AdminSettingsFormParseResult =
  | {
      input: AdminSettingsUpdateInput;
      ok: true;
    }
  | {
      ok: false;
      reason: "missing_confirmation";
    };

export function parseAdminSettingsFormData(
  formData: FormData,
): AdminSettingsFormParseResult {
  if (formData.get("confirmSettingsChange") !== "on") {
    return {
      ok: false,
      reason: "missing_confirmation",
    };
  }

  return {
    input: {
      adoptionReviewModeEnabled:
        formData.get("adoptionReviewModeEnabled") === "on",
      verifiedEmailRequiredToPublish:
        formData.get("verifiedEmailRequiredToPublish") === "on",
    },
    ok: true,
  };
}

export async function applyAdminSettingsUpdateFromFormData(
  formData: FormData,
  persistSettings?: (input: AdminSettingsUpdateInput) => Promise<unknown>,
): Promise<boolean> {
  const parsed = parseAdminSettingsFormData(formData);

  if (!parsed.ok) {
    return false;
  }

  try {
    const persist =
      persistSettings ??
      (await import("./admin-settings-api-adapter")).updateAdminSettings;

    await persist(parsed.input);
    return true;
  } catch (error) {
    console.error("Admin settings mutation failed.", error);
    return false;
  }
}
