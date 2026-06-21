import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";

import createExpoConfig from "./app.config";

describe("Expo app config", () => {
  it("declares one preferred application scheme for React Navigation linking", () => {
    const config = createExpoConfig({
      config: {} as ExpoConfig,
    } as ConfigContext);

    expect(config.scheme).toBe("rastro");
    expect(config.android?.package).toBe("bo.rastro.app");
  });

  it("pins social auth providers explicitly for EAS build profiles", () => {
    const easConfig = JSON.parse(
      readFileSync(join(__dirname, "eas.json"), "utf8"),
    ) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    for (const profile of ["development", "preview", "production"]) {
      expect(
        easConfig.build[profile]?.env?.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS,
      ).toBe("google,facebook");
    }
  });
});
