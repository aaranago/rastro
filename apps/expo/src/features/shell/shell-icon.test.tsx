import { describe, expect, it, vi } from "vitest";

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("react-native", () => ({
  Platform: {
    OS: "android",
  },
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
}));

vi.mock("../icons/safe-material-community-icon", () => ({
  SafeMaterialCommunityIcon: "SafeMaterialCommunityIcon",
}));

import { ShellIcon } from "./shell-icon";

describe("ShellIcon", () => {
  it.each([
    ["person.crop.circle.fill", "account-circle"],
    ["person.crop.circle", "account-circle-outline"],
    ["person.crop.circle.badge.checkmark", "account-check"],
    ["key.fill", "key"],
    ["rectangle.portrait.and.arrow.right", "logout"],
    ["takeoutbag.and.cup.and.straw.fill", "storefront"],
    ["trash.fill", "delete"],
    ["tray.fill", "tray-full"],
  ])("maps %s to a visible Android vector icon", (sfSymbol, materialName) => {
    const icon = ShellIcon({
      color: "#147869",
      name: sfSymbol,
      size: 24,
    });

    expect(icon.type).toBe("SafeMaterialCommunityIcon");
    expect((icon.props as { name: string }).name).toBe(materialName);
  });
});
