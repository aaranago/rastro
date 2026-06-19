import type { ShellModelSession } from "./shell-model";

export interface ShellAuthSessionState {
  data:
    | {
        session?: unknown;
        user?: {
          email?: string;
          id: string;
          name?: string | null;
        } | null;
      }
    | null
    | undefined;
  error: unknown;
  isPending: boolean;
  refetch?: () => void;
}

export interface ShellAuthCredentials {
  email: string;
  name?: string;
  password: string;
}

export const shellSocialAuthProviders = ["google", "facebook"] as const;

export type ShellSocialAuthProvider = (typeof shellSocialAuthProviders)[number];

export interface ShellSocialAuthAction {
  label: string;
  provider: ShellSocialAuthProvider;
}

export type ShellAuthActionResult =
  | {
      ok: true;
    }
  | {
      message?: string;
      ok: false;
      reason?: "canceled" | "failed" | "unavailable";
    };

export type ShellAuthCredentialsResult =
  | {
      credentials: ShellAuthCredentials;
      ok: true;
    }
  | {
      ok: false;
      reason: "missing-credentials";
    };

export interface ShellAuthAdapter {
  availableSocialAuthProviders: readonly ShellSocialAuthProvider[];
  createAccountWithEmail: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  initiateAccountDeletion: () => Promise<ShellAuthActionResult>;
  requestPasswordResetForEmail: (
    email: string,
  ) => Promise<ShellAuthActionResult>;
  signInWithEmail: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  signInWithSocialProvider: (
    provider: ShellSocialAuthProvider,
  ) => Promise<ShellAuthActionResult>;
  signOut: () => Promise<ShellAuthActionResult>;
  useSession: () => ShellAuthSessionState;
}

export function deriveShellSessionFromAuthState(
  authState: ShellAuthSessionState,
): ShellModelSession {
  const user = authState.data?.user;

  if (authState.isPending && !user) {
    return { kind: "loading" };
  }

  return user
    ? {
        email: user.email,
        id: user.id,
        kind: "member",
        name: user.name,
      }
    : { kind: "visitor" };
}

export function prepareShellAuthCredentials({
  email,
  name,
  password,
}: ShellAuthCredentials): ShellAuthCredentialsResult {
  const displayName = name?.trim();
  const hasDisplayName =
    typeof displayName === "string" && displayName.length > 0;
  const credentials = {
    email: email.trim().toLowerCase(),
    name: hasDisplayName ? displayName : undefined,
    password,
  };

  if (!credentials.email || !credentials.password.trim()) {
    return {
      ok: false,
      reason: "missing-credentials",
    };
  }

  return {
    credentials,
    ok: true,
  };
}
