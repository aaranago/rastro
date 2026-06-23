import { describe, expect, it } from "vitest";

import { getNativeMapProviderState } from "./map-provider-config";

describe("getNativeMapProviderState", () => {
  it("does not block native maps based on JS manifest env drift", () => {
    expect(getNativeMapProviderState()).toEqual({ kind: "ready" });
  });
});
