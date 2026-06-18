import { describe, expect, it, vi } from "vitest";

import { buildResourceProviderProfileHref } from "./resource-provider-profile-screen";

vi.mock("expo-image", () => ({
  Image: "Image",
}));

vi.mock("react-native", () => ({
  Linking: {
    openURL: () => Promise.resolve(),
  },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

describe("Resource Provider profile screen routing", () => {
  it("builds the Recursos stack href used by search result cards", () => {
    expect(buildResourceProviderProfileHref("clinic-san-roque")).toBe(
      "/proveedores/clinic-san-roque",
    );
    expect(buildResourceProviderProfileHref("dra marta gómez")).toBe(
      "/proveedores/dra%20marta%20g%C3%B3mez",
    );
  });
});
