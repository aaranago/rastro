import { describe, expect, it, vi } from "vitest";

import {
  openInternalRastroHref,
  resolveInternalRastroHref,
} from "./internal-rastro-links";

describe("internal Rastro links", () => {
  it.each(["/", "/index"])(
    "normalizes %s to the concrete nearby tab route",
    (href) => {
      expect(resolveInternalRastroHref(href)).toBe("/(tabs)/(nearby)");
    },
  );

  it.each(["/", "/index"])(
    "normalizes auth return target %s before opening the sign-in prompt",
    (returnTo) => {
      const openAuthPrompt = vi.fn();
      const openExternalUrl = vi.fn();
      const routerPush = vi.fn();

      openInternalRastroHref({
        href: `rastro://auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
        openAuthPrompt,
        openExternalUrl,
        routerPush,
      });

      expect(openAuthPrompt).toHaveBeenCalledWith({
        returnTo: "/(tabs)/(nearby)",
        sourceHref: `rastro://auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
      });
      expect(routerPush).not.toHaveBeenCalled();
      expect(openExternalUrl).not.toHaveBeenCalled();
    },
  );

  it("routes report chat create/open links inside the app", () => {
    expect(
      resolveInternalRastroHref("rastro://chats/report/report-lost-1"),
    ).toBe("/chats/report/report-lost-1");
  });

  it("keeps report chat links out of external Linking", () => {
    const openExternalUrl = vi.fn();
    const routerPush = vi.fn();

    openInternalRastroHref({
      href: "rastro://chats/report/report-lost-1",
      openExternalUrl,
      routerPush,
    });

    expect(routerPush).toHaveBeenCalledWith("/chats/report/report-lost-1");
    expect(openExternalUrl).not.toHaveBeenCalled();
  });
});
