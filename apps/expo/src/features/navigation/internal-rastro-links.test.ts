import { describe, expect, it, vi } from "vitest";

import {
  openInternalRastroHref,
  resolveInternalRastroHref,
} from "./internal-rastro-links";

describe("internal Rastro links", () => {
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
