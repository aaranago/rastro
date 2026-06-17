import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import type {
  ShellAuthActionResult,
  ShellAuthAdapter,
  ShellAuthCredentials,
} from "~/features/shell/shell-auth";
import { getBaseUrl } from "./base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "expo",
      storagePrefix: "expo",
      storage: SecureStore,
    }),
  ],
});

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return undefined;
}

function normalizeAuthActionResult(result: {
  error?: { message?: string } | null;
}): ShellAuthActionResult {
  if (result.error) {
    return {
      message: result.error.message,
      ok: false,
    };
  }

  return { ok: true };
}

async function runAuthAction(
  action: () => Promise<{ error?: { message?: string } | null }>,
): Promise<ShellAuthActionResult> {
  try {
    return normalizeAuthActionResult(await action());
  } catch (error) {
    return {
      message: getErrorMessage(error),
      ok: false,
    };
  }
}

export const shellAuthAdapter: ShellAuthAdapter = {
  createAccountWithEmail: ({ email, name, password }: ShellAuthCredentials) =>
    runAuthAction(() =>
      authClient.signUp.email({
        email,
        name: name ?? email,
        password,
      }),
    ),
  signInWithEmail: ({ email, password }: ShellAuthCredentials) =>
    runAuthAction(() =>
      authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      }),
    ),
  useSession: () => authClient.useSession(),
};
