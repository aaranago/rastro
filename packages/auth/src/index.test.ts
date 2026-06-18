import { describe, expect, it } from "vitest";

import { createAuthOptions } from "./index";

describe("createAuthOptions", () => {
  it("builds the shared Rastro v1 auth configuration", () => {
    const config = createAuthOptions({
      baseUrl: "http://localhost:3000",
      productionUrl: "https://rastro.bo",
      secret: "test-secret",
      requireEmailVerification: true,
      socialProviders: {
        google: {
          clientId: "google-client-id",
          clientSecret: "google-client-secret",
        },
        facebook: {
          clientId: "facebook-client-id",
          clientSecret: "facebook-client-secret",
        },
        apple: {
          clientId: "apple-client-id",
          clientSecret: "apple-client-secret",
          appBundleIdentifier: "bo.rastro.app",
        },
      },
      trustedOrigins: ["rastro://"],
    });

    expect(config.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true,
    });
    expect(config.socialProviders).toMatchObject({
      google: {
        clientId: "google-client-id",
        clientSecret: "google-client-secret",
        redirectURI: "https://rastro.bo/api/auth/callback/google",
      },
      facebook: {
        clientId: "facebook-client-id",
        clientSecret: "facebook-client-secret",
        redirectURI: "https://rastro.bo/api/auth/callback/facebook",
      },
      apple: {
        clientId: "apple-client-id",
        clientSecret: "apple-client-secret",
        appBundleIdentifier: "bo.rastro.app",
        redirectURI: "https://rastro.bo/api/auth/callback/apple",
      },
    });
    expect(config.socialProviders).not.toHaveProperty("discord");
    expect(config.trustedOrigins).toEqual(
      expect.arrayContaining(["expo://", "rastro://"]),
    );
  });

  it("does not enable social providers with incomplete credentials", () => {
    const config = createAuthOptions({
      baseUrl: "http://localhost:3000",
      productionUrl: "https://rastro.bo",
      secret: "test-secret",
      socialProviders: {
        google: {
          clientId: "google-client-id",
        },
        facebook: {
          clientSecret: "facebook-client-secret",
        },
      },
    });

    expect(config.socialProviders).not.toHaveProperty("google");
    expect(config.socialProviders).not.toHaveProperty("facebook");
  });
});
